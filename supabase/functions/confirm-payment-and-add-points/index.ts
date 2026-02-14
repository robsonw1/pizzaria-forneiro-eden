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
    console.log('[CONFIRM-PAYMENT] ===== INICIANDO PROCESSAMENTO =====');
    
    // 🔍 Parse body carefully with detailed error handling
    let body: RequestBody;
    try {
      const rawBody = await req.json();
      body = rawBody as RequestBody;
      console.log('[CONFIRM-PAYMENT] ✅ Body parseado com sucesso:', JSON.stringify(body));
    } catch (parseError) {
      console.error('[CONFIRM-PAYMENT] ❌ ERRO ao fazer parse do body:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        body: await req.text(),
      });
      return new Response(
        JSON.stringify({ error: 'Erro ao processar dados da requisição' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, customerId, amount, pointsRedeemed = 0 } = body;

    console.log('[CONFIRM-PAYMENT] 📨 Parâmetros extraídos:', JSON.stringify({ orderId, customerId, amount, pointsRedeemed }));

    // VALIDAÇÃO 1: Verificar parâmetros obrigatórios
    if (!orderId) {
      console.error('[CONFIRM-PAYMENT] ❌ ERRO: orderId ausente ou vazio');
      return new Response(
        JSON.stringify({ error: 'orderId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount === undefined || amount === null || amount === 0) {
      console.error('[CONFIRM-PAYMENT] ❌ ERRO: amount ausente, null ou 0', { amount });
      return new Response(
        JSON.stringify({ error: 'amount é obrigatório e deve ser > 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CONFIRM-PAYMENT] ✅ Validação de parâmetros passou');

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[CONFIRM-PAYMENT] ❌ ERRO: Variáveis de ambiente não configuradas');
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[CONFIRM-PAYMENT] ✅ Cliente Supabase criado');

    // 0️⃣ Buscar a ordem
    console.log(`[CONFIRM-PAYMENT] 🔍 Buscando ordem: ${orderId}`);
    const { data: orderData, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderFetchError) {
      console.error('[CONFIRM-PAYMENT] ❌ ERRO ao buscar ordem:', {
        code: orderFetchError.code,
        message: orderFetchError.message,
        details: orderFetchError.details,
        hint: (orderFetchError as any).hint,
      });
      
      return new Response(
        JSON.stringify({ 
          error: `Pedido não encontrado: ${orderFetchError.message}`,
          details: orderFetchError.details 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!orderData) {
      console.error('[CONFIRM-PAYMENT] ❌ Ordem retornou null mesmo sem erro');
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado na base de dados' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CONFIRM-PAYMENT] ✅ Ordem encontrada - DADOS COMPLETOS:', { 
      id: orderData.id, 
      status: orderData.status,
      customer_id: orderData.customer_id,
      email: orderData.email,
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone,
      pending_points: orderData.pending_points,
      points_redeemed: orderData.points_redeemed,
      total: orderData.total,
      created_at: orderData.created_at
    });

    // Se pedido já foi confirmado, retornar sucesso
    if (orderData.status === 'confirmed') {
      console.log('[CONFIRM-PAYMENT] Pedido já estava confirmado - retornando sucesso');
      return new Response(
        JSON.stringify({ success: true, message: 'Pedido já estava confirmado.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔒 VALIDAÇÃO DE SEGURANÇA: Verificar se points_redeemed foi alterado fraudulentamente
    const reportedPointsRedeemed = pointsRedeemed ?? 0;
    const actualPointsRedeemed = orderData.points_redeemed ?? 0;
    
    if (reportedPointsRedeemed !== actualPointsRedeemed) {
      console.error('[CONFIRM-PAYMENT] ⚠️ FRAUDE DETECTADA: points_redeemed alterado!', {
        reportado: reportedPointsRedeemed,
        actual: actualPointsRedeemed,
        orderId: orderId
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Tentativa de fraude detectada: pontos alterados após criação do pedido',
          security: true 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Usar customer_id do pedido
    const finalCustomerId = customerId || orderData.customer_id;
    console.log('[CONFIRM-PAYMENT] 🔎 Resolvendo customer_id:', {
      customerId_fromRequest: customerId,
      customer_id_fromOrder: orderData.customer_id,
      finalCustomerId: finalCustomerId,
      email_fromOrder: orderData.email
    });
    
    if (!finalCustomerId && !orderData.email) {
      console.error('[CONFIRM-PAYMENT] ❌ ERRO CRÍTICO: Não há customer_id nem email para identificar cliente!', {
        finalCustomerId,
        email: orderData.email
      });
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível identificar o cliente (sem customer_id ou email)' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // 2️⃣ Resolver customer_id se necessário (via email)
    let resolvedCustomerId = finalCustomerId;
    if (!resolvedCustomerId && orderData.email) {
      console.log('[CONFIRM-PAYMENT] 🔎 Buscando customer por email:', orderData.email);
      const { data: customerByEmail, error: emailSearchError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', orderData.email)
        .single();
      
      if (emailSearchError) {
        console.warn('[CONFIRM-PAYMENT] ⚠️ Erro ao buscar customer por email:', {
          email: orderData.email,
          error: emailSearchError.code,
          message: emailSearchError.message
        });
      } else if (customerByEmail?.id) {
        resolvedCustomerId = customerByEmail.id;
        console.log('[CONFIRM-PAYMENT] ✅ Customer encontrado via email:', resolvedCustomerId);
      } else {
        console.warn('[CONFIRM-PAYMENT] ⚠️ Customer não encontrado na tabela (pode ser novo cliente):', orderData.email);
      }
    } else if (resolvedCustomerId) {
      console.log('[CONFIRM-PAYMENT] ✅ Usando customer_id do pedido:', resolvedCustomerId);
    }

    // 🔴 CRÍTICO: Buscar dados do cliente ANTES de fazer qualquer atualização
    let customerData = null;
    if (resolvedCustomerId) {
      console.log('[CONFIRM-PAYMENT] 🔎 Buscando dados do cliente:', resolvedCustomerId);
      const { data: fetchedCustomer } = await supabase
        .from('customers')
        .select('total_points, total_spent, total_purchases')
        .eq('id', resolvedCustomerId)
        .single();
      
      if (fetchedCustomer) {
        customerData = fetchedCustomer;
        console.log('[CONFIRM-PAYMENT] ✅ Dados do cliente obtidos:', {
          totalPoints: customerData.total_points,
          totalSpent: customerData.total_spent
        });
      }
    }

    // 2.5️⃣ DÉBITO IMEDIATO: Se cliente usou pontos, subtrair de total_points PRIMEIRO
    const pointsRedeemedInOrder = orderData.points_redeemed || 0;
    if (resolvedCustomerId && customerData && pointsRedeemedInOrder > 0) {
      console.log('[CONFIRM-PAYMENT] 💰 DEBITANDO PONTOS RESGASTADOS...');
      console.log('[CONFIRM-PAYMENT] Cliente USOU ' + pointsRedeemedInOrder + ' pontos - NÃO pode ganhar novos pontos nesta compra');
      
      const newTotalPointsAfterDebit = Math.max(0, (customerData.total_points || 0) - pointsRedeemedInOrder);
      const newTotalSpent = (customerData.total_spent || 0) + amount;
      const newTotalPurchases = (customerData.total_purchases || 0) + 1;
      const localISO = getLocalISOString();

      console.log('[CONFIRM-PAYMENT] ✅ Calculando novo saldo após débito...', {
        pointsAntesDeDebito: customerData.total_points,
        pontosDeBitados: pointsRedeemedInOrder,
        novoSaldo: newTotalPointsAfterDebit,
        totalGasto: newTotalSpent
      });

      // Atualizar cliente com o débito dos pontos
      const { error: debitError } = await supabase
        .from('customers')
        .update({
          total_points: newTotalPointsAfterDebit,
          total_spent: newTotalSpent,
          total_purchases: newTotalPurchases,
          last_purchase_at: localISO,
        })
        .eq('id', resolvedCustomerId);

      if (debitError) {
        console.error('[CONFIRM-PAYMENT] ❌ ERRO ao debitar pontos:', debitError);
        throw new Error(`Erro ao debitar pontos do cliente: ${debitError.message}`);
      }

      console.log('[CONFIRM-PAYMENT] ✅ Pontos debitados com sucesso!', {
        cliente: resolvedCustomerId,
        pontosDeBitados: pointsRedeemedInOrder,
        novoSaldo: newTotalPointsAfterDebit
      });

      // Registrar transação de débito
      const { error: debitTransError } = await supabase.from('loyalty_transactions').insert([{
        customer_id: resolvedCustomerId,
        order_id: orderId,
        points_spent: pointsRedeemedInOrder,
        transaction_type: 'redemption',
        description: `Resgate de ${pointsRedeemedInOrder} pontos - Desconto na compra de R$ ${amount.toFixed(2)}`,
        created_at: localISO,
      }]);

      if (debitTransError) {
        console.warn('[CONFIRM-PAYMENT] ⚠️ Erro ao registrar transação de débito:', debitTransError);
      } else {
        console.log('[CONFIRM-PAYMENT] ✅ Transação de débito registrada com sucesso');
      }

      // Após debitar, retornar sucesso
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Pagamento confirmado! ${pointsRedeemedInOrder} pontos debitados da conta.`,
          pointsDeducted: pointsRedeemedInOrder,
          newBalance: newTotalPointsAfterDebit
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3️⃣ Mover pending_points para o saldo total do cliente
    if (resolvedCustomerId && orderData.pending_points > 0) {
      console.log('[CONFIRM-PAYMENT] ✅ Movendo pending_points para total_points...');
      console.log('[CONFIRM-PAYMENT] 💰 REGRA: Cliente NÃO usou pontos no resgate - pode ganhar novos pontos');
      
      try {
        // Buscar configurações de expiração
        const { data: settingsData } = await supabase
          .from('loyalty_settings')
          .select('points_expiration_days')
          .single();

        const expirationDays = settingsData?.points_expiration_days ?? 365;
        const pendingPoints = orderData.pending_points;

        console.log('[CONFIRM-PAYMENT] Pending points a mover:', { pendingPoints, expirationDays });

        // Buscar dados do cliente se ainda não temos
        if (!customerData && resolvedCustomerId) {
          const { data: fetchedCustomer } = await supabase
            .from('customers')
            .select('total_points, total_spent, total_purchases')
            .eq('id', resolvedCustomerId)
            .single();

          customerData = fetchedCustomer;
        }

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

          console.log('[CONFIRM-PAYMENT] Cliente encontrado:', {
            customerId: resolvedCustomerId,
            totalPoints: customerData.total_points,
            totalSpent: customerData.total_spent
          });

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
            .eq('id', resolvedCustomerId);

          if (updateError) {
            console.error('[CONFIRM-PAYMENT] ❌ Erro ao atualizar cliente:', updateError);
            throw new Error(`Erro ao atualizar cliente: ${updateError.message}`);
          }

          console.log('[CONFIRM-PAYMENT] ✅ Cliente atualizado com sucesso', updateData);

          // Registrar transação com os pending_points
          const { error: transactionError, data: transactionData } = await supabase.from('loyalty_transactions').insert([{
            customer_id: resolvedCustomerId,
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
      console.log('[CONFIRM-PAYMENT] REGRA: Cliente USOU pontos no resgate - NÃO ganha novos pontos', {
        pointsRedeemed: orderData.points_redeemed,
        pendingPoints: orderData.pending_points,
        rule: 'Cliente usou pontos do desconto, não pode ganhar novos pontos nesta compra'
      });
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    console.error('[CONFIRM-PAYMENT] ❌ ERRO CRÍTICO:', {
      message: errorMessage,
      name: errorName,
      stack: errorStack,
      error: error
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        errorType: errorName,
        stack: errorStack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
