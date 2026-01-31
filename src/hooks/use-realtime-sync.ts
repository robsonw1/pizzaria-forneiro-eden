import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useNeighborhoodsStore } from '@/store/useNeighborhoodsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Product, Order, Neighborhood } from '@/data/products';

/**
 * Converte os dados do Supabase (JSON) para o formato Product esperado
 */
const parseProductFromSupabase = (supabaseData: any): Product => {
  const data = supabaseData.data || {};
  return {
    id: supabaseData.id,
    name: supabaseData.name || data.name,
    description: data.description || '',
    ingredients: data.ingredients || [],
    category: data.category || 'combos',
    price: data.price || undefined,
    priceSmall: data.price_small || undefined,
    priceLarge: data.price_large || undefined,
    image: data.image,
    isPopular: data.is_popular || false,
    isNew: data.is_new || false,
    isVegetarian: data.is_vegetarian || false,
    isActive: data.is_active !== false,
    isCustomizable: data.is_customizable || false,
  };
};

/**
 * Hook que sincroniza os dados da aplicação com o Supabase em tempo real
 * Carrega os dados iniciais e escuta mudanças em produtos, pedidos, bairros e configurações
 */
export const useRealtimeSync = () => {
  useEffect(() => {
    // Flag para garantir que carregamos dados do Supabase mesmo que localStorage tenha dados
    let isInitialLoadComplete = false;

    // Função para carregar dados iniciais
    const loadInitialData = async () => {
      try {
        // Aumentar delay para garantir que localStorage foi carregado
        await new Promise(resolve => setTimeout(resolve, 300));

        // Carregar produtos
        const { data: products } = await (supabase as any)
          .from('products')
          .select('*');
        
        if (products) {
          const catalogStore = useCatalogStore.getState();
          for (const product of products) {
            catalogStore.upsertProduct(parseProductFromSupabase(product));
          }
        }

        // Carregar settings - IMPORTANTE: isso sobrescreve o localStorage
        const { data: settings } = await (supabase as any)
          .from('settings')
          .select('*');
        
        if (settings && settings.length > 0) {
          const settingsStore = useSettingsStore.getState();
          // Reconstruir o objeto de settings a partir dos dados do Supabase
          const settingsData: any = {};
          for (const setting of settings) {
            settingsData[(setting as any).key] = (setting as any).value;
          }
          // Atualizar tudo de uma vez para sobrescrever localStorage
          settingsStore.updateSettings(settingsData);
        }

        // Carregar bairros
        const { data: neighborhoods } = await (supabase as any)
          .from('neighborhoods')
          .select('*');
        
        if (neighborhoods) {
          const neighborhoodsStore = useNeighborhoodsStore.getState();
          for (const neighborhood of neighborhoods) {
            neighborhoodsStore.upsertNeighborhood(neighborhood as Neighborhood);
          }
        }

        isInitialLoadComplete = true;
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        isInitialLoadComplete = true;
      }
    };

    loadInitialData();

    // Sincronizar Produtos (Catálogo)
    const productsChannel = supabase
      .channel('products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          const catalogStore = useCatalogStore.getState();
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const product = parseProductFromSupabase(payload.new);
            catalogStore.upsertProduct(product);
          } else if (payload.eventType === 'DELETE') {
            const oldProduct = payload.old as any;
            catalogStore.removeProduct(oldProduct.id);
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
        async (payload) => {
          const settingsStore = useSettingsStore.getState();
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Carregar todos os settings do banco para manter integridade dos dados
            const { data: allSettings } = await (supabase as any)
              .from('settings')
              .select('*');
            
            if (allSettings && allSettings.length > 0) {
              const settingsData: any = {};
              for (const setting of allSettings) {
                settingsData[(setting as any).key] = (setting as any).value;
              }
              // Atualizar com todos os dados
              settingsStore.updateSettings(settingsData);
            }
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
