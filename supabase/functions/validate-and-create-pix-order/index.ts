import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Obter token de acesso (tenant ou fallback do sistema)
async function getAccessToken(supabase: any): Promise<string> {
  const fallbackToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');

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
    const { paymentId, orderPayload } = await req.json();

    if (!paymentId || !orderPayload) {
      return new Response(
        JSON.stringify({ success: false, error: 'paymentId and orderPayload are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // ============================================================
    // 1. VALIDAR PAGAMENTO NO MERCADO PAGO
    // ============================================================
    let accessToken;
    try {
      accessToken = await getAccessToken(supabase);
    } catch (error) {
      console.error('❌ Erro ao obter token:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao obter credenciais' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.text();
      console.error(`❌ Mercado Pago API error: ${paymentResponse.status}`, errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao validar pagamento no Mercado Pago',
          details: errorData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await paymentResponse.json();
    console.log('💳 Payment validation check:', {
      paymentId: paymentData.id,
      status: paymentData.status,
      orderId: paymentData.external_reference
    });

    // ============================================================
    // 2. VALIDAR SE O PAGAMENTO FOI APROVADO
    // ============================================================
    if (paymentData.status !== 'approved') {
      console.warn(`⚠️ Pagamento ${paymentId} não foi aprovado. Status: ${paymentData.status}`);
      
      const statusMap: Record<string, string> = {
        'pending': 'Aguardando confirmação',
        'in_process': 'Em processamento',
        'rejected': 'Rejeitado',
        'cancelled': 'Cancelado',
        'refunded': 'Reembolsado'
      };

      const message = statusMap[paymentData.status] || `Status desconhecido: ${paymentData.status}`;
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Pagamento não foi confirmado. Status: ${message}`,
          status: paymentData.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // 3. PAGAMENTO APROVADO - CRIAR PEDIDO
    // ============================================================
    console.log(`✅ Pagamento ${paymentId} aprovado! Criando pedido...`);

    const orderId = orderPayload.id;

    // Criar o pedido no banco de dados
    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        ...orderPayload,
        status: 'confirmed', // PIX aprovado = pedido confirmado
        payment_status: 'approved',
        payment_confirmed_at: new Date().toISOString(),
        mercado_pago_id: paymentId.toString(),
      }])
      .select();

    if (orderError) {
      console.error(`❌ Erro ao criar pedido ${orderId}:`, orderError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao criar pedido no banco',
          details: orderError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Pedido ${orderId} criado com sucesso!`, createdOrder);

    // ============================================================
    // 4. RETORNAR SUCESSO
    // ============================================================
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pagamento validado e pedido criado com sucesso!',
        paymentId: paymentData.id,
        status: paymentData.status,
        orderId: orderId,
        order: createdOrder?.[0]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Validation error:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
