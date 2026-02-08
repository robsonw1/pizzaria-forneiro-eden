import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';

/**
 * Hook que sincroniza dados de loyalty do cliente em tempo real
 * Escuta mudanças na tabela de customers, transactions e coupons
 */
export const useLoyaltyRealtimeSync = () => {
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const getTransactionHistory = useLoyaltyStore((s) => s.getTransactionHistory);
  const getCoupons = useLoyaltyStore((s) => s.getCoupons);

  useEffect(() => {
    if (!currentCustomer?.id) return;

    let isMounted = true;
    const customerId = currentCustomer.id;

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
            console.log('👤 Customer updated:', payload.new);
            
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
          console.log('Customer subscription status:', status);
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
            console.log('📊 Transaction updated:', payload.new);
            
            const transactions = await getTransactionHistory(customerId);
            useLoyaltyStore.setState(state => ({
              ...state,
              transactions
            }));
          }
        )
        .subscribe((status) => {
          console.log('Transactions subscription status:', status);
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
            console.log('🎁 Coupon updated:', payload.new);
            
            const coupons = await getCoupons(customerId);
            useLoyaltyStore.setState(state => ({
              ...state,
              coupons
            }));
          }
        )
        .subscribe((status) => {
          console.log('Coupons subscription status:', status);
        });

      return () => {
        isMounted = false;
        supabase.removeChannel(customerChannel);
        supabase.removeChannel(transactionsChannel);
        supabase.removeChannel(couponsChannel);
      };
    } catch (error) {
      console.error('Erro ao iniciar realtime sync:', error);
      return () => {};
    }
  }, [currentCustomer?.id, getTransactionHistory, getCoupons]);
};
