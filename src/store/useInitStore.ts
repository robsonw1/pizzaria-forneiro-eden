import { useEffect } from 'react';
import { useCatalogStore } from './useCatalogStore';
import { useOrdersStore } from './useOrdersStore';
import { useNeighborhoodsStore } from './useNeighborhoodsStore';
import { useSettingsStore } from './useSettingsStore';

/**
 * Hook para sincronizar stores com Supabase quando a app inicia
 * Use este hook no componente App.tsx
 */
export const useInitStore = () => {
  const syncCatalog = useCatalogStore((state) => state.syncFromSupabase);
  const syncOrders = useOrdersStore((state) => state.syncFromSupabase);
  const syncNeighborhoods = useNeighborhoodsStore((state) => state.syncFromSupabase);
  const syncSettings = useSettingsStore((state) => state.syncFromSupabase);

  useEffect(() => {
    const initStores = async () => {
      // Sincroniza todos os dados em paralelo
      await Promise.all([
        syncCatalog(),
        syncOrders(),
        syncNeighborhoods(),
        syncSettings(),
      ]);
    };

    initStores();
  }, []);
};
