import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';

/**
 * Hook que sincroniza dados de loyalty do cliente em tempo real
 * Escuta mudanças na tabela de customers, transactions e coupons
 * Com fallback de polling a cada 5 segundos
 */
export const useLoyaltyRealtimeSync = () => {
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const getTransactionHistory = useLoyaltyStore((s) => s.getTransactionHistory);
  const getCoupons = useLoyaltyStore((s) => s.getCoupons);
  const refreshCurrentCustomer = useLoyaltyStore((s) => s.refreshCurrentCustomer);

  useEffect(() => {
    if (!currentCustomer?.id) {
      console.log('❌ Nenhum cliente logado para sincronizar');
      return;
    }

    let isMounted = true;
    let pollingInterval: NodeJS.Timeout | null = null;
    const customerId = currentCustomer.id;

    console.log('🔄 Iniciando realtime sync para cliente:', customerId);

    try {
      // Subscribe to customer changes
      const customerChannel = supabase.channel(`customer_${customerId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'customers',
            filter: `id=eq.${customerId}`
          },
          async (payload: any) => {
            if (!isMounted) return;
            console.log('👤 Customer atualizado via REALTIME:', {
              totalPoints: payload.new.total_points,
              totalSpent: payload.new.total_spent,
              totalPurchases: payload.new.total_purchases
            });
            
            const mapCustomerFromDB = (dbData: any) => ({
              id: dbData.id,
              email: dbData.email,
              cpf: dbData.cpf,
              name: dbData.name,
              phone: dbData.phone,
              totalPoints: dbData.total_points || 0,
              totalSpent: dbData.total_spent || 0,
              totalPurchases: dbData.total_purchases || 0,
              isRegistered: dbData.is_registered || false,
              registeredAt: dbData.registered_at,
              createdAt: dbData.created_at,
              lastPurchaseAt: dbData.last_purchase_at,
            });

            useLoyaltyStore.setState(state => ({
              ...state,
              currentCustomer: mapCustomerFromDB(payload.new),
              points: payload.new.total_points || 0
            }));
          }
        )
        .subscribe((status) => {
          console.log('👤 Subscription status (customers):', status);
        });

      // Subscribe to transactions changes
      const transactionsChannel = supabase.channel(`transactions_${customerId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'loyalty_transactions',
            filter: `customer_id=eq.${customerId}`
          },
          async (payload: any) => {
            if (!isMounted) return;
            console.log('📊 Transaction atualizada via REALTIME:', payload.new);
            
            const transactions = await getTransactionHistory(customerId);
            useLoyaltyStore.setState(state => ({
              ...state,
              transactions
            }));
          }
        )
        .subscribe((status) => {
          console.log('📊 Subscription status (transactions):', status);
        });

      // Subscribe to coupons changes
      const couponsChannel = supabase.channel(`coupons_${customerId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'loyalty_coupons',
            filter: `customer_id=eq.${customerId}`
          },
          async (payload: any) => {
            if (!isMounted) return;
            console.log('🎁 Coupon atualizado via REALTIME:', payload.new);
            
            const coupons = await getCoupons(customerId);
            useLoyaltyStore.setState(state => ({
              ...state,
              coupons
            }));
          }
        )
        .subscribe((status) => {
          console.log('🎁 Subscription status (coupons):', status);
        });

      // FALLBACK: Polling a cada 5 segundos como garantia
      // Se o realtime falhar, isso garante sincronização
      pollingInterval = setInterval(async () => {
        if (!isMounted) return;
        console.log('⏱️ Polling de sincronização...');
        await refreshCurrentCustomer();
      }, 5000);

      console.log('✅ Realtime sync iniciado com polling fallback');

      return () => {
        isMounted = false;
        if (pollingInterval) clearInterval(pollingInterval);
        supabase.removeChannel(customerChannel);
        supabase.removeChannel(transactionsChannel);
        supabase.removeChannel(couponsChannel);
        console.log('🛑 Realtime sync finalizado');
      };
    } catch (error) {
      console.error('❌ Erro ao iniciar realtime sync:', error);
      return () => {};
    }
  }, [currentCustomer?.id, getTransactionHistory, getCoupons, refreshCurrentCustomer]);
};
