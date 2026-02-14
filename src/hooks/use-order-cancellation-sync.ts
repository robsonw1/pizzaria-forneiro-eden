import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * 🔴 REALTIME: Monitorar cancelamentos de pedidos em tempo real
 * Sincroniza pontos do cliente IMEDIATAMENTE quando um pedido é cancelado
 * Previne que cliente veja seus pontos desatualizados
 */
export function useOrderCancellationSync(
  isOpen: boolean,
  customerEmail: string | undefined,
  onCancellation: () => Promise<void>
) {
  useEffect(() => {
    if (!isOpen || !customerEmail) return;

    console.log('🔴 Setting up Realtime order cancellation sync for email:', customerEmail);

    const channel = supabase.channel(`order-cancellation-${customerEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_email=eq.${encodeURIComponent(customerEmail)}`
        },
        async (payload: any) => {
          const order = payload.new;
          
          // Se pedido foi cancelado, sincronizar pontos IMEDIATAMENTE
          if (order.status === 'cancelled') {
            console.log('🔴 [CANCELAMENTO] Pedido cancelado detectado em tempo real:', {
              orderId: order.id,
              status: order.status,
              pointsRedeemed: order.points_redeemed,
              pendingPoints: order.pending_points,
              timestamp: new Date().toISOString()
            });

            // Executar callback para sincronizar pontos
            try {
              await onCancellation();
              console.log('✅ Pontos sincronizados após cancelamento');
            } catch (error) {
              console.error('❌ Erro ao sincronizar pontos após cancelamento:', error);
            }
            
            toast.info('⏮️ Pedido cancelado. Pontos de fidelidade foram atualizados.', {
              duration: 4000
            });
          }
        }
      )
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription ativo para cancelamentos de pedidos');
        }
      });

    return () => {
      console.log('🔴 Unsubscribing from realtime order cancellation sync');
      supabase.removeChannel(channel);
    };
  }, [isOpen, customerEmail, onCancellation]);
}
