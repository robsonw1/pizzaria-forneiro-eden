import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  orderId: string;
  customerId?: string;
  amount: number;
  pointsRedeemed?: number;
}

const getLocalISOString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${date}T${hours}:${minutes}:${seconds}`;
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[CONFIRM-PAYMENT] Iniciando processamento...');
    const body = await req.json() as RequestBody;
    const { orderId, customerId, amount, pointsRedeemed = 0 } = body;

    console.log('[CONFIRM-PAYMENT] Body recebido:', { orderId, customerId, amount, pointsRedeemed });

    if (!orderId || !amount) {
      return new Response(
        JSON.stringify({ error: 'orderId and amount são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[CONFIRM-PAYMENT] Cliente Supabase criado');

    // 0️⃣ Buscar a ordem
    console.log(`[CONFIRM-PAYMENT] Buscando ordem ${orderId}...`);
    const { data: orderData, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderFetchError || !orderData) {
      console.error('[CONFIRM-PAYMENT] Erro ao buscar ordem:', orderFetchError);
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CONFIRM-PAYMENT] Ordem encontrada:', { id: orderData.id, status: orderData.status });

    // Se pedido já foi confirmado, retornar sucesso
    if (orderData.status === 'confirmed') {
      console.log('[CONFIRM-PAYMENT] Pedido já estava confirmado - retornando sucesso');
      return new Response(
        JSON.stringify({ success: true, message: 'Pedido já estava confirmado.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Usar customer_id do pedido
    const finalCustomerId = customerId || orderData.customer_id;
    console.log('[CONFIRM-PAYMENT] Customer ID final:', finalCustomerId);

    // 1️⃣ Atualizar status do pedido
    console.log('[CONFIRM-PAYMENT] Atualizando status para confirmed...');
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', orderId);

    if (updateError) {
      console.error('[CONFIRM-PAYMENT] Erro ao atualizar status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao confirmar pedido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CONFIRM-PAYMENT] Status atualizado para confirmed ✅');

    // 2️⃣ Mover pending_points para o saldo total do cliente
    if (finalCustomerId && orderData.pending_points > 0) {
      console.log('[CONFIRM-PAYMENT] ✅ Movendo pending_points para total_points...');
      
      try {
        // Buscar configurações de expiração
        const { data: settingsData } = await supabase
          .from('loyalty_settings')
          .select('points_expiration_days')
          .single();

        const expirationDays = settingsData?.points_expiration_days ?? 365;
        const pendingPoints = orderData.pending_points;

        console.log('[CONFIRM-PAYMENT] Pending points a mover:', { pendingPoints, expirationDays });

          // Buscar dados do cliente
          const { data: customerData } = await supabase
            .from('customers')
            .select('total_points, total_spent, total_purchases')
            .eq('id', finalCustomerId)
            .single();

          if (!customerData) {
            console.warn('[CONFIRM-PAYMENT] Cliente não encontrado no sistema de lealdade');
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Pagamento confirmado. Cliente não encontrado para adicionar pontos.' 
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Mover pending_points para total_points
          const newTotalPoints = (customerData.total_points || 0) + pendingPoints;
          const newTotalSpent = (customerData.total_spent || 0) + amount;
          const newTotalPurchases = (customerData.total_purchases || 0) + 1;
          const localISO = getLocalISOString();
          
          const expiresAtDate = new Date();
          expiresAtDate.setDate(expiresAtDate.getDate() + expirationDays);
          const expiresAtISO = expiresAtDate.toISOString();

          console.log('[CONFIRM-PAYMENT] Atualizando cliente com novos totais...', {
            pendingPointsMovidos: pendingPoints,
            totalPoints: newTotalPoints,
            totalSpent: newTotalSpent,
            totalPurchases: newTotalPurchases
          });

          // Atualizar cliente COM os pending_points
          const { error: updateError, data: updateData } = await supabase
            .from('customers')
            .update({
              total_points: newTotalPoints,
              total_spent: newTotalSpent,
              total_purchases: newTotalPurchases,
              last_purchase_at: localISO,
            })
            .eq('id', finalCustomerId);

          if (updateError) {
            console.error('[CONFIRM-PAYMENT] ❌ Erro ao atualizar cliente:', updateError);
            throw new Error(`Erro ao atualizar cliente: ${updateError.message}`);
          }

          console.log('[CONFIRM-PAYMENT] ✅ Cliente atualizado com sucesso', updateData);

          // Registrar transação com os pending_points
          const { error: transactionError, data: transactionData } = await supabase.from('loyalty_transactions').insert([{
            customer_id: finalCustomerId,
            order_id: orderId,
            points_earned: pendingPoints,
            transaction_type: 'purchase',
            description: `Compra no valor de R$ ${amount.toFixed(2)} (${pendingPoints} pontos)`,
            created_at: localISO,
            expires_at: expiresAtISO,
          }]);

          if (transactionError) {
            console.error('[CONFIRM-PAYMENT] ⚠️ Erro ao registrar transação:', transactionError);
            // Não falhar - cliente foi atualizado
          } else {
            console.log('[CONFIRM-PAYMENT] ✅ Transação registrada com sucesso', transactionData);
          }

          console.log('[CONFIRM-PAYMENT] Pontos movidos com sucesso! ✅', {
            pendingPointsMovidos: pendingPoints,
            totalPoints: newTotalPoints
          });

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `Pagamento confirmado! ${pendingPoints} pontos adicionados ao saldo.`,
              pointsEarned: pendingPoints,
              totalPoints: newTotalPoints
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      } catch (pointsError) {
        console.error('[CONFIRM-PAYMENT] Erro ao mover pontos:', pointsError);
        // Não falhar - pedido já foi confirmado
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Pagamento confirmado. Erro ao mover pontos.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('[CONFIRM-PAYMENT] ⏹️ Nenhum pending_points para mover');
    }


    console.log('[CONFIRM-PAYMENT] Processamento concluído com sucesso ✅');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pagamento confirmado com sucesso.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[CONFIRM-PAYMENT] Erro crítico:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
