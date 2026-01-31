import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useNeighborhoodsStore } from '@/store/useNeighborhoodsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Product, Order, Neighborhood } from '@/data/products';

/**
 * Hook que sincroniza os dados da aplicação com o Supabase em tempo real
 * Escuta mudanças em produtos, pedidos, bairros e configurações
 */
export const useRealtimeSync = () => {
  useEffect(() => {
    // Sincronizar Produtos (Catálogo)
    const productsChannel = supabase
      .channel('products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          const catalogStore = useCatalogStore.getState();
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            catalogStore.upsertProduct(payload.new as Product);
          } else if (payload.eventType === 'DELETE') {
            catalogStore.removeProduct((payload.old as Product).id);
          }
        }
      )
      .subscribe();

    // Sincronizar Pedidos
    const ordersChannel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const ordersStore = useOrdersStore.getState();
          
          if (payload.eventType === 'INSERT') {
            // Adicionar novo pedido
            const order = payload.new as Omit<Order, 'id' | 'createdAt'>;
            ordersStore.addOrder(order);
          } else if (payload.eventType === 'UPDATE') {
            // Atualizar status do pedido
            const newData = payload.new as Order;
            ordersStore.updateOrderStatus(newData.id, newData.status as any);
          } else if (payload.eventType === 'DELETE') {
            ordersStore.removeOrder((payload.old as Order).id);
          }
        }
      )
      .subscribe();

    // Sincronizar Bairros
    const neighborhoodsChannel = supabase
      .channel('neighborhoods')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'neighborhoods' },
        (payload) => {
          const neighborhoodsStore = useNeighborhoodsStore.getState();
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            neighborhoodsStore.upsertNeighborhood(payload.new as Neighborhood);
          } else if (payload.eventType === 'DELETE') {
            neighborhoodsStore.removeNeighborhood((payload.old as Neighborhood).id);
          }
        }
      )
      .subscribe();

    // Sincronizar Configurações
    const settingsChannel = supabase
      .channel('settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          const settingsStore = useSettingsStore.getState();
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newData = payload.new as { key: string; value: any };
            settingsStore.setSetting(newData.key as any, newData.value);
          }
        }
      )
      .subscribe();

    // Cleanup: Desinscrever de todos os canais ao desmontar
    return () => {
      productsChannel.unsubscribe();
      ordersChannel.unsubscribe();
      neighborhoodsChannel.unsubscribe();
      settingsChannel.unsubscribe();
    };
  }, []);
};
