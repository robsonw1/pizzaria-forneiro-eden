import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';

/**
 * Hook que sincroniza dados de loyalty do cliente em tempo real
 * Escuta mudanças na tabela de customers, transactions e coupons
 */
export const useLoyaltyRealtimeSync = () => {
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const loginCustomer = useLoyaltyStore((s) => s.loginCustomer);
  const getTransactionHistory = useLoyaltyStore((s) => s.getTransactionHistory);
  const getCoupons = useLoyaltyStore((s) => s.getCoupons);
  const getReferrals = useLoyaltyStore((s) => s.getReferrals);

  useEffect(() => {
    if (!currentCustomer) return;

    let isMounted = true;

    // Subscribe to customer changes
    const customersSubscription = (supabase as any)
      .from(`customers:id=eq.${currentCustomer.id}`)
      .on('*', async (payload: any) => {
        if (!isMounted) return;
        console.log('Customer updated:', payload);

        // Recarregar dados do cliente
        const { data, error } = await (supabase as any)
          .from('customers')
          .select('*')
          .eq('id', currentCustomer.id)
          .single();

        if (!error && data) {
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

          const useLoyalty = useLoyaltyStore.getState();
          useLoyalty.setCurrentCustomer(mapCustomerFromDB(data));
        }
      })
      .subscribe();

    // Subscribe to transactions changes
    const transactionsSubscription = (supabase as any)
      .from(`loyalty_transactions:customer_id=eq.${currentCustomer.id}`)
      .on('*', async (payload: any) => {
        if (!isMounted) return;
        console.log('Transaction updated:', payload);

        // Recarregar histórico de transações
        const transactions = await getTransactionHistory(currentCustomer.id);
        if (transactions.length > 0) {
          const useLoyalty = useLoyaltyStore.getState();
          useLoyalty.transactions = transactions;
        }
      })
      .subscribe();

    // Subscribe to coupons changes
    const couponsSubscription = (supabase as any)
      .from(`loyalty_coupons:customer_id=eq.${currentCustomer.id}`)
      .on('*', async (payload: any) => {
        if (!isMounted) return;
        console.log('Coupon updated:', payload);

        // Recarregar cupons
        const coupons = await getCoupons(currentCustomer.id);
        if (coupons) {
          const useLoyalty = useLoyaltyStore.getState();
          useLoyalty.coupons = coupons;
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      customersSubscription?.unsubscribe();
      transactionsSubscription?.unsubscribe();
      couponsSubscription?.unsubscribe();
    };
  }, [currentCustomer, getTransactionHistory, getCoupons, getReferrals]);
};
