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
        'approved': 'confirmado',
        'pending': 'pendente',
        'in_process': 'processando',
        'rejected': 'rejeitado',
        'cancelled': 'cancelado',
        'refunded': 'reembolsado'
      };

      const mappedStatus = statusMap[status] || status;
      console.log(`📋 Order ${orderId} payment status: ${status} → ${mappedStatus}`);

      // ============================================================
      // 🔄 UPDATE ORDER STATUS NO BANCO
      // ============================================================
      if (orderId) {
        try {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_status: mpStatus,
              payment_confirmed_at: status === 'approved' ? new Date().toISOString() : null,
              mercado_pago_id: paymentId.toString(),
            })
            .eq('id', orderId);

          if (updateError) {
            console.error(`❌ Erro ao atualizar order ${orderId}:`, updateError);
          } else {
            console.log(`✅ Order ${orderId} atualizado com status: ${mpStatus}`);
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
