/**
 * TESTES DE SEGURANÇA E FUNCIONALIDADE - Sistema de Pontos
 * Execute no console do navegador enquanto está no checkout
 */

// ✅ TESTE 1: Validar email está sendo preenchido automaticamente
function testEmailPrefill() {
  console.log('=== TESTE 1: Email Prefill ===');
  const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement || 
                     document.querySelector('input[placeholder*="email" i]') as HTMLInputElement;
  
  if (emailInput?.value) {
    console.log('✅ PASSOU: Email preenchido =', emailInput.value);
    return true;
  } else {
    console.error('❌ FALHOU: Email não foi preenchido automaticamente');
    return false;
  }
}

// ✅ TESTE 2: Validar que pending_points são calculados
async function testPendingPointsCalculation() {
  console.log('=== TESTE 2: Pending Points Calculation ===');
  
  // Criar um pedido de teste com 100 reais
  const totalPrice = 100;
  const expectedPending = Math.round(totalPrice); // 1 real = 1 point
  
  console.log(`Total do pedido: R$ ${totalPrice}`);
  console.log(`Pending points esperados: ${expectedPending}`);
  
  // Verificar no Supabase (você precisa fazer isso no SQL Editor)
  console.log('✅ INSTRUÇÃO: Após criar um pedido de R$ 100, execute no SQL Editor:');
  console.log(`SELECT id, total, pending_points FROM orders WHERE total = 100 LIMIT 1;`);
  console.log('Expected: pending_points = 100');
}

// ✅ TESTE 3: Validar synchronization de points_redeemed
async function testPointsRedeemSync() {
  console.log('=== TESTE 3: Points Redeem Synchronization ===');
  
  console.log('INSTRUÇÕES DE TESTE:');
  console.log('1. Faça login no checkout');
  console.log('2. Mova o slider para usar 50 pontos');
  console.log('3. Execute no SQL Editor:');
  console.log(`   SELECT id, points_redeemed, points_discount FROM orders WHERE customer_name = 'SEU NOME' ORDER BY created_at DESC LIMIT 1;`);
  console.log('4. Esperado: points_redeemed = 50, points_discount = 50 (ou cálculo configurado)');
}

// ✅ TESTE 4: Detectar tentativa de fraude
async function testFraudDetection() {
  console.log('=== TESTE 4: Fraud Detection ===');
  
  console.log('TESTE DE FRAUDE:');
  console.log('1. Abra dois navegadores com a mesma conta');
  console.log('2. Navegador A: Mova slider para 100 pontos');
  console.log('3. Navegador B: Mova slider para 100 pontos também');
  console.log('4. Navegador A: Clique "Confirmar Pagamento"');
  console.log('5. Verificar no console se há mensagem de FRAUDE DETECTADA');
  console.log('6. Esperado: Navegador B recebe avisos de sincronização em tempo real');
}

// ✅ TESTE 5: Validar realtime points sync
function testRealtimeSync() {
  console.log('=== TESTE 5: Realtime Sync ===');
  
  // Ver se há listener ativo
  const logsWithRealtime = console.log.toString().includes('realtime');
  console.log('📡 Se abrir DevTools (F12) > Console, você deve ver logs:');
  console.log('   - "🔴 Setting up Realtime points sync..."');
  console.log('   - Quando outro navegador usa pontos: "🔄 Pontos sincronizados em tempo real"');
}

// ✅ TESTE 6: Validar Edge Function logging
async function testEdgeFunctionLogs() {
  console.log('=== TESTE 6: Edge Function Logs ===');
  
  console.log('PASSOS:');
  console.log('1. Vá ao Supabase Dashboard > Functions > confirm-payment-and-add-points');
  console.log('2. Clique em "Invocations"');
  console.log('3. Crie um novo pedido e clique "Confirmar Pagamento" no admin');
  console.log('4. Procure por logs detalhados:');
  console.log('   ✅ "[CONFIRM-PAYMENT] Ordem encontrada: { id, status, customer_id, email, pending_points }"');
  console.log('   ✅ "🔒 VALIDAÇÃO DE SEGURANÇA: points_redeemed não foi alterado"');
  console.log('   ✅ "[CONFIRM-PAYMENT] Cliente encontrado: { customerId, totalPoints, totalSpent }"');
  console.log('   ✅ "[CONFIRM-PAYMENT] ✅ Cliente atualizado com sucesso"');
  console.log('   ✅ "[CONFIRM-PAYMENT] ✅ Transação registrada com sucesso"');
  console.log('');
  console.log('⚠️ Se ver erro, significa algo não está sincronizado!');
}

// ✅ TESTE 7: SQL Verification Queries
function testSQLQueries() {
  console.log('=== TESTE 7: SQL Verification ===');
  
  console.log('Execute TODAS estas queries no Supabase SQL Editor:');
  console.log('');
  console.log('1️⃣ Verificar pending_points foram criados:');
  console.log(`
SELECT 
  id,
  customer_name,
  total,
  pending_points,
  points_redeemed,
  points_discount,
  status
FROM orders
WHERE customer_name = 'NOME DO CLIENTE'
ORDER BY created_at DESC
LIMIT 5;
---
Esperado: pending_points > 0 para pedidos criados
  `);
  
  console.log('2️⃣ Verificar pontos foram movidos para o cliente:');
  console.log(`
SELECT 
  name,
  total_points,
  total_spent,
  total_purchases,
  email
FROM customers
WHERE name = 'NOME DO CLIENTE'
ORDER BY created_at DESC
LIMIT 1;
---
Esperado: total_points aumentou após confirmar pagamento
  `);
  
  console.log('3️⃣ Verificar transações de lealdade:');
  console.log(`
SELECT 
  customer_id,
  order_id,
  points_earned,
  points_spent,
  transaction_type,
  description,
  created_at
FROM loyalty_transactions
WHERE description LIKE '%Robson%' OR description LIKE '%SEU CLIENTE%'
ORDER BY created_at DESC
LIMIT 10;
---
Esperado: Uma transação por pedido confirmado
  `);
  
  console.log('4️⃣ Verificar se email está sendo salvo:');
  console.log(`
SELECT 
  id,
  customer_name,
  email,
  payment_method,
  status
FROM orders
ORDER BY created_at DESC
LIMIT 10;
---
Esperado: email NÃO NULL para pedidos novos
  `);
}

// EXECUTAR TODOS OS TESTES
function runAllTests() {
  console.clear();
  console.log('🚀 INICIANDO BATERIA COMPLETA DE TESTES\n');
  
  const results = [];
  results.push(testEmailPrefill());
  testPendingPointsCalculation();
  testPointsRedeemSync();
  testFraudDetection();
  testRealtimeSync();
  testEdgeFunctionLogs();
  testSQLQueries();
  
  console.log('\n✅ TESTES CONCLÍCLOS - Verifique os SQL num por um no Supabase');
}

// Exportar para rodar no console
if (typeof window !== 'undefined') {
  (window as any).TESTS = {
    testEmailPrefill,
    testPendingPointsCalculation,
    testPointsRedeemSync,
    testFraudDetection,
    testRealtimeSync,
    testEdgeFunctionLogs,
    testSQLQueries,
    runAllTests
  };
  
  console.log('✅ Testes carregados! Execute: window.TESTS.runAllTests()');
}

export {
  testEmailPrefill,
  testPendingPointsCalculation,
  testPointsRedeemSync,
  testFraudDetection,
  testRealtimeSync,
  testEdgeFunctionLogs,
  testSQLQueries,
  runAllTests
};
