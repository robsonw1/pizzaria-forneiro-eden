// @ts-nocheck
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useNeighborhoodsStore } from '@/store/useNeighborhoodsStore';
import { useTheme } from './use-theme';

export const useSyncStores = () => {
  const { setTheme } = useTheme();
  const upsertProduct = useCatalogStore((s) => s.upsertProduct);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const addOrder = useOrdersStore((s) => s.addOrder);
  const updateNeighborhood = useNeighborhoodsStore((s) => s.updateNeighborhood);

  useEffect(() => {
    const syncData = async () => {
      try {
        // Sync products from Supabase
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*');
        
        if (productsError) {
          console.error('Products sync error:', productsError);
          return;
        }
        
        if (products && Array.isArray(products)) {
          products.forEach((product: any) => {
            try {
              upsertProduct({
                id: product.id || '',
                name: product.name || '',
                description: product.description || '',
                price: product.price || 0,
                category: product.category || 'combos',
                isActive: product.is_active !== false,
                image: product.image || '',
                ingredients: product.ingredients || [],
              });
            } catch (e) {
              console.error('Error upserting product:', e);
            }
          });
        }

        // Sync settings from Supabase
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .single();
        
        if (!settingsError && settingsData) {
          try {
            updateSettings({
              storeName: (settingsData as any).store_name || '',
              phone: (settingsData as any).phone || '',
              address: (settingsData as any).address || '',
              theme: (settingsData as any).theme || 'dark',
              openingTime: (settingsData as any).opening_time || '18:00',
              closingTime: (settingsData as any).closing_time || '23:00',
            });
            
            // Set theme from Supabase
            if ((settingsData as any).theme) {
              setTheme((settingsData as any).theme);
            }
          } catch (e) {
            console.error('Error updating settings:', e);
          }
        }

        // Sync neighborhoods from Supabase
        const { data: neighborhoods, error: neighborhoodsError } = await supabase
          .from('neighborhoods')
          .select('*');
        
        if (neighborhoodsError) {
          console.error('Neighborhoods sync error:', neighborhoodsError);
        }
        
        if (neighborhoods && Array.isArray(neighborhoods)) {
          neighborhoods.forEach((neighborhood: any) => {
            try {
              updateNeighborhood(neighborhood.id, {
                name: neighborhood.name || '',
                deliveryFee: neighborhood.delivery_fee || 0,
                isActive: neighborhood.is_active !== false,
              });
            } catch (e) {
              console.error('Error updating neighborhood:', e);
            }
          });
        }

        // Sync orders from Supabase
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (ordersError) {
          console.error('Orders sync error:', ordersError);
        }
        
        if (orders && Array.isArray(orders)) {
          orders.forEach((order: any) => {
            try {
              addOrder({
                customerName: order.customer_name || '',
                phone: order.phone || '',
                address: order.address || '',
                neighborhood: order.neighborhood || '',
                items: order.items || [],
                total: order.total || 0,
                status: order.status || 'pending',
                notes: order.notes || '',
              });
            } catch (e) {
              console.error('Error adding order:', e);
            }
          });
        }
      } catch (error) {
        console.error('Error syncing stores:', error);
      }
    };

    syncData();
  }, [upsertProduct, updateSettings, addOrder, updateNeighborhood, setTheme]);
};

