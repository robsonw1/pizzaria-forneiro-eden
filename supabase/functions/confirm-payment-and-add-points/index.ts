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

    // 2️⃣ Adicionar pontos - SEMPRE, a menos que pointsRedeemed > 0
    if (finalCustomerId && amount > 0) {
      // Se cliente NÃO usou desconto de pontos, adiciona novos pontos
      const shouldAddPoints = !pointsRedeemed || pointsRedeemed === 0;
      
      if (shouldAddPoints) {
        console.log('[CONFIRM-PAYMENT] ✅ Cliente NÃO usou desconto - adicionando pontos...');
        
        try {
          // Buscar configurações
          const { data: settingsData } = await supabase
            .from('loyalty_settings')
            .select('points_per_real, points_expiration_days')
            .single();

          const pointsPerReal = settingsData?.points_per_real ?? 1;
          const expirationDays = settingsData?.points_expiration_days ?? 365;
          const pointsEarned = Math.floor(amount * pointsPerReal);

          console.log('[CONFIRM-PAYMENT] Configurações de pontos:', { pointsPerReal, expirationDays, pointsEarned });

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

          const newTotalPoints = (customerData.total_points || 0) + pointsEarned;
          const newTotalSpent = (customerData.total_spent || 0) + amount;
          const newTotalPurchases = (customerData.total_purchases || 0) + 1;
          const localISO = getLocalISOString();
          
          const expiresAtDate = new Date();
          expiresAtDate.setDate(expiresAtDate.getDate() + expirationDays);
          const expiresAtISO = expiresAtDate.toISOString();

          console.log('[CONFIRM-PAYMENT] Atualizando cliente com novos totais...', {
            totalPoints: newTotalPoints,
            totalSpent: newTotalSpent,
            totalPurchases: newTotalPurchases
          });

          // Atualizar cliente
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

          // Registrar transação
          const { error: transactionError, data: transactionData } = await supabase.from('loyalty_transactions').insert([{
            customer_id: finalCustomerId,
            order_id: orderId,
            points_earned: pointsEarned,
            transaction_type: 'purchase',
            description: `Compra no valor de R$ ${amount.toFixed(2)}`,
            created_at: localISO,
            expires_at: expiresAtISO,
          }]);

          if (transactionError) {
            console.error('[CONFIRM-PAYMENT] ⚠️ Erro ao registrar transação:', transactionError);
            // Não falhar - cliente foi atualizado
          } else {
            console.log('[CONFIRM-PAYMENT] ✅ Transação registrada com sucesso', transactionData);
          }

          console.log('[CONFIRM-PAYMENT] Pontos adicionados com sucesso! ✅', {
            pointsEarned,
            totalPoints: newTotalPoints
          });

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `Pagamento confirmado! ${pointsEarned} pontos adicionados.`,
              pointsEarned,
              totalPoints: newTotalPoints
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (pointsError) {
          console.error('[CONFIRM-PAYMENT] Erro ao adicionar pontos:', pointsError);
          // Não falhar - pedido já foi confirmado
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Pagamento confirmado. Erro ao adicionar pontos.' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        console.log('[CONFIRM-PAYMENT] ⏹️ Cliente usou desconto - NÃO adicionando pontos');
      }
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
