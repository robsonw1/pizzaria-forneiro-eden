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
    const { orderId, customerId, amount, pointsRedeemed = 0 } = (await req.json()) as RequestBody;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
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

    console.log('🔄 Confirmando pagamento e adicionando pontos...', { orderId, customerId, amount });

    // 1️⃣ Atualizar status do pedido para 'confirmado'
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'confirmado' })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Erro ao atualizar status do pedido:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao confirmar pedido' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Status do pedido atualizado para confirmado');

    // 2️⃣ Adicionar pontos se cliente existe
    if (customerId && amount > 0) {
      try {
        // Buscar configurações de pontos
        const { data: settingsData } = await supabase
          .from('loyalty_settings')
          .select('points_per_real, points_expiration_days')
          .single();

        const pointsPerReal = settingsData?.points_per_real ?? 1;
        const expirationDays = settingsData?.points_expiration_days ?? 365;

        // Se cliente redimiu pontos nesta compra, não ganha pontos
        if (pointsRedeemed > 0) {
          console.log('⏭️ Pontos não adicionados (cliente usou desconto de pontos)');
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Pagamento confirmado. Pontos não adicionados (desconto utilizado).' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const pointsEarned = Math.floor(amount * pointsPerReal);

        // Buscar dados atuais do cliente
        const { data: customerData, error: fetchError } = await supabase
          .from('customers')
          .select('total_points, total_spent, total_purchases, last_purchase_at')
          .eq('id', customerId)
          .single();

        if (fetchError) {
          console.warn('⚠️ Cliente não encontrado em loyalty_transactions. Criando nova entrada...');
          // Se cliente não existe ainda, será criado pela primeira vez
          // Isso pode acontecer se cliente não estava logado
        }

        const newTotalPoints = (customerData?.total_points || 0) + pointsEarned;
        const newTotalSpent = (customerData?.total_spent || 0) + amount;
        const newTotalPurchases = (customerData?.total_purchases || 0) + 1;
        const localISO = getLocalISOString();

        // Calcular data de expiração
        const expiresAtDate = new Date();
        expiresAtDate.setDate(expiresAtDate.getDate() + expirationDays);
        const expiresAtISO = expiresAtDate.toISOString();

        // Atualizar totais do cliente
        await supabase
          .from('customers')
          .update({
            total_points: newTotalPoints,
            total_spent: newTotalSpent,
            total_purchases: newTotalPurchases,
            last_purchase_at: localISO,
          })
          .eq('id', customerId);

        // Registrar transação de pontos
        await supabase.from('loyalty_transactions').insert([{
          customer_id: customerId,
          order_id: orderId,
          points_earned: pointsEarned,
          transaction_type: 'purchase',
          description: `Compra no valor de R$ ${amount.toFixed(2)} - ${pointsEarned} pontos`,
          created_at: localISO,
          expires_at: expiresAtISO,
        }]);

        console.log(`✅ ${pointsEarned} pontos adicionados ao cliente ${customerId}`);
        console.log(`   Total de pontos: ${newTotalPoints}`);

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
        console.error('⚠️ Erro ao adicionar pontos (não bloqueante):', pointsError);
        // Não falhar se pontos não forem adicionados - pedido já foi confirmado
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Pagamento confirmado. Erro ao adicionar pontos (tente recarregar).',
            error: 'points_error'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pagamento confirmado com sucesso.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro crítico:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
