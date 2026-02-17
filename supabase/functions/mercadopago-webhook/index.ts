import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate webhook signature
async function validateWebhookSignature(body: string, signature: string): Promise<boolean> {
  const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    console.warn('MERCADO_PAGO_WEBHOOK_SECRET not configured, skipping signature validation');
    return true; // Allow if secret not configured (for testing)
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(body + webhookSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return computedSignature === signature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

// Obter token de acesso (tenant ou fallback do sistema)
async function getAccessToken(supabase: any): Promise<string> {
  const fallbackToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');

  // Tentar buscar token do primeiro/único tenant
  try {
    const { data } = await supabase
      .from('tenants')
      .select('id, mercadopago_access_token')
      .limit(1)
      .single();

    if (data?.mercadopago_access_token) {
      console.log(`✅ Usando token do tenant: ${data.id}`);
      return data.mercadopago_access_token;
    }
  } catch (error) {
    console.warn('⚠️ Nenhum tenant encontrado ou sem token configurado:', error);
  }

  if (!fallbackToken) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
  }

  console.log('⚠️ Usando token do sistema (fallback)');
  return fallbackToken;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const body = await req.text();
    const signature = req.headers.get('x-signature') || '';
    
    // Validate signature
    const isValid = await validateWebhookSignature(body, signature);
    if (!isValid) {
      console.warn('❌ Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payloadData = JSON.parse(body);
    console.log('📨 Webhook received:', JSON.stringify(payloadData, null, 2));

    // Handle payment notification
    if (payloadData.type === 'payment' && payloadData.data?.id) {
      const paymentId = payloadData.data.id;
      
      // Obter token de acesso (tenta do cliente, fallback para sistema)
      let accessToken;
      try {
        accessToken = await getAccessToken(supabase);
      } catch (error) {
        console.error('❌ Erro ao obter token de acesso:', error);
        return new Response(JSON.stringify({ error: 'No access token available' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Get payment details from Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!paymentResponse.ok) {
        throw new Error(`Failed to fetch payment details: ${paymentResponse.statusText}`);
      }

      const paymentData = await paymentResponse.json();
      console.log('💳 Payment data:', JSON.stringify(paymentData, null, 2));

      const orderId = paymentData.external_reference;
      const status = paymentData.status;
      const mpStatus = paymentData.status;

      // Map Mercado Pago status to our status
      const statusMap: Record<string, string> = {
        'approved': 'confirmed',
        'pending': 'pending',
        'in_process': 'processing',
        'rejected': 'rejected',
        'cancelled': 'cancelled',
        'refunded': 'refunded'
      };

      const mappedStatus = statusMap[status] || status;
      console.log(`📋 Order ${orderId} payment status: ${status} → ${mappedStatus}`);

      // ============================================================
      // ✅ SE PAGAMENTO APROVADO: Tentar criar pedido completo
      // ============================================================
      if (status === 'approved' && orderId) {
        try {
          // 1️⃣ Verificar se pedido já existe
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('id', orderId)
            .single();

          if (!existingOrder) {
            // 2️⃣ Tentar recuperar dados do pending_pix_order
            console.log(`🔍 Procurando dados do pedido em pending_pix_orders...`);
            const { data: pendingOrder } = await supabase
              .from('pending_pix_orders')
              .select('order_payload, customer_name, customer_phone, customer_email, customer_id')
              .eq('id', orderId)
              .single();

            if (pendingOrder?.order_payload) {
              // 3️⃣ Criar ordem completa com dados do pending
              console.log(`✅ Dados encontrados! Criando pedido completo...`);
              
              const { error: createError } = await supabase
                .from('orders')
                .insert([{
                  ...pendingOrder.order_payload,
                  id: orderId,
                  status: 'confirmed',
                  payment_status: 'approved',
                  payment_confirmed_at: new Date().toISOString(),
                  mercado_pago_id: paymentId.toString(),
                }]);

              if (createError) {
                console.error(`❌ Erro ao criar pedido ${orderId}:`, createError);
              } else {
                console.log(`✅ Pedido ${orderId} criado com sucesso pelo webhook!`);
                
                // 4️⃣ Limpar pending_pix_order
                try {
                  await supabase
                    .from('pending_pix_orders')
                    .delete()
                    .eq('id', orderId);
                  console.log(`✅ Pedido removido de pending_pix_orders`);
                } catch (error) {
                  console.warn(`⚠️ Falha ao limpar pending_pix_order:`, error);
                }
              }
            } else {
              console.warn(`⚠️ Pedido pendente não encontrado para ${orderId}. Será criado apenas registro de pagamento.`);
            }
          } else {
            console.log(`✅ Pedido ${orderId} já existe. Apenas atualizando status de pagamento...`);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar pedido aprovado ${orderId}:`, error);
        }
      }

      // ============================================================
      // 🔄 UPDATE ORDER STATUS NO BANCO (se existir)
      // ============================================================
      if (orderId) {
        try {
          // Se PIX foi aprovado, muda status para "confirmado" automaticamente
          const shouldAutoConfirm = status === 'approved';
          
          const updateData: any = {
            payment_status: mpStatus,
            payment_confirmed_at: status === 'approved' ? new Date().toISOString() : null,
            mercado_pago_id: paymentId.toString(),
          };

          // PIX aprovado: mudar para "confirmed" automatically
          if (shouldAutoConfirm) {
            updateData.status = 'confirmed';
            updateData.auto_confirmed_by_pix = true;
            console.log(`🤖 PIX aprovado! Alterando automaticamente status para "confirmed"...`);
          }

          const { error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId);

          if (updateError) {
            console.error(`❌ Erro ao atualizar order ${orderId}:`, updateError);
          } else {
            console.log(`✅ Order ${orderId} atualizado com status: ${mpStatus}${shouldAutoConfirm ? ' + Auto-confirmado' : ''}`);
            
            // 📱 Enviar notificação WhatsApp se PIX foi aprovado
            if (shouldAutoConfirm) {
              try {
                // Buscar dados do pedido para notificação
                const { data: orderData } = await supabase
                  .from('orders')
                  .select('id, customer_name, customer_phone, tenant_id')
                  .eq('id', orderId)
                  .single();

                if (orderData?.customer_phone && orderData?.tenant_id) {
                  // Chamar edge function de notificação (assíncrono)
                  console.log(`📲 Enviando notificação de confirmação para ${orderData.customer_phone}`);
                  
                  // Realizar a chamada assincronamente sem aguardar
                  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-notification`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    },
                    body: JSON.stringify({
                      orderId: orderId,
                      status: 'confirmed',
                      phone: orderData.customer_phone,
                      customerName: orderData.customer_name || 'Cliente',
                      tenantId: orderData.tenant_id,
                    }),
                  }).catch((err) => {
                    console.warn(`⚠️ Falha ao enviar notificação WhatsApp via webhook:`, err);
                  });
                }
              } catch (notificationError) {
                console.warn(`⚠️ Erro ao processar notificação:`, notificationError);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Exception ao atualizar order ${orderId}:`, error);
        }
      }

      // ============================================================
      // 📧 NOTIFICAÇÕES - TODO para desenvolvimentos futuros
      // ============================================================
      // Se rejection, notificar admin
      if (status === 'rejected') {
        console.warn(`⚠️ Pagamento rejeitado - Order ${orderId}. Considerar notificação ao admin.`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('❌ Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
