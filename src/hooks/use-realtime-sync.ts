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
    let isMounted = true;

    // Função para carregar dados iniciais
    const loadInitialData = async () => {
      if (!isMounted) return;
      
      try {
        // Delay mínimo para garantir que localStorage foi carregado
        await new Promise(resolve => setTimeout(resolve, 100));

        // Carregar produtos
        const { data: products } = await (supabase as any)
          .from('products')
          .select('*');
        
        if (products && isMounted) {
          const catalogStore = useCatalogStore.getState();
          for (const product of products) {
            catalogStore.upsertProduct(parseProductFromSupabase(product));
          }
        }

        // Carregar settings - IMPORTANTE: isso sobrescreve o localStorage
        const { data: settingsData } = await (supabase as any)
          .from('settings')
          .select('*')
          .eq('id', 'store-settings')
          .single();
        
        if (settingsData && isMounted) {
          const settingsStore = useSettingsStore.getState();
          // Mapear as colunas da tabela para o formato do store
          settingsStore.updateSettings({
            name: settingsData.store_name,
            phone: settingsData.store_phone,
            address: settingsData.store_address,
            printnode_printer_id: settingsData.printnode_printer_id,
            print_mode: settingsData.print_mode,
          });
          console.log('✅ Settings carregados do Supabase:', settingsData);
        }

        // Carregar bairros
        const { data: neighborhoods } = await (supabase as any)
          .from('neighborhoods')
          .select('*');
        
        if (neighborhoods && isMounted) {
          const neighborhoodsStore = useNeighborhoodsStore.getState();
          for (const neighborhood of neighborhoods) {
            neighborhoodsStore.upsertNeighborhood(neighborhood as Neighborhood);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    };

    loadInitialData();

    // Sincronizar Produtos (Catálogo)
    const productsChannel = supabase
      .channel('realtime:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (!isMounted) return;
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
      .channel('realtime:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (!isMounted) return;
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
      .channel('realtime:neighborhoods')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'neighborhoods' },
        (payload) => {
          if (!isMounted) return;
          const neighborhoodsStore = useNeighborhoodsStore.getState();
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            neighborhoodsStore.upsertNeighborhood(payload.new as Neighborhood);
          } else if (payload.eventType === 'DELETE') {
            neighborhoodsStore.removeNeighborhood((payload.old as Neighborhood).id);
          }
        }
      )
      .subscribe();

    // Sincronizar Configurações - Escuta ANY mudança na tabela
    const settingsChannel = supabase
      .channel('realtime:settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        async (payload) => {
          if (!isMounted) return;
          
          console.log('⚡ Settings mudou no Supabase:', payload);
          
          try {
            // Recarregar os settings quando qualquer mudança ocorrer
            const { data: settingsData } = await (supabase as any)
              .from('settings')
              .select('value')
              .eq('id', 'store-settings')
              .single();
            
            if (settingsData?.value && isMounted) {
              const settingsStore = useSettingsStore.getState();
              settingsStore.updateSettings(settingsData.value);
              console.log('✅ Settings atualizado em tempo real:', settingsData.value);
            }
          } catch (error) {
            console.error('❌ Erro ao sincronizar settings:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Settings channel status:', status);
      });

    // Cleanup: Desinscrever de todos os canais ao desmontar
    return () => {
      isMounted = false;
      productsChannel.unsubscribe();
      ordersChannel.unsubscribe();
      neighborhoodsChannel.unsubscribe();
      settingsChannel.unsubscribe();
    };
  }, []);
};
