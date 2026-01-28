import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Neighborhood, neighborhoodsData } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';

interface NeighborhoodsStore {
  neighborhoods: Neighborhood[];
  isLoading: boolean;
  isSynced: boolean;
  addNeighborhood: (neighborhood: Omit<Neighborhood, 'id'>) => Promise<void>;
  updateNeighborhood: (id: string, updates: Partial<Neighborhood>) => Promise<void>;
  removeNeighborhood: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  syncFromSupabase: () => Promise<void>;
  getActiveNeighborhoods: () => Neighborhood[];
}

export const useNeighborhoodsStore = create<NeighborhoodsStore>()(
  persist(
    (set, get) => ({
      neighborhoods: neighborhoodsData,
      isLoading: false,
      isSynced: false,

      addNeighborhood: async (neighborhood) => {
        const newNeighborhood: Neighborhood = {
          ...neighborhood,
          id: `neighborhood-${Date.now()}`,
        };

        // Update local state
        set((state) => ({
          neighborhoods: [...state.neighborhoods, newNeighborhood],
        }));

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('neighborhoods'))
            .insert({
              id: newNeighborhood.id,
              name: newNeighborhood.name,
              delivery_fee: newNeighborhood.deliveryFee,
              is_active: newNeighborhood.isActive,
            });
        } catch (err) {
          console.error('Error saving neighborhood:', err);
        }
      },

      updateNeighborhood: async (id, updates) => {
        // Update local state
        set((state) => ({
          neighborhoods: state.neighborhoods.map((nb) =>
            nb.id === id ? { ...nb, ...updates } : nb
          ),
        }));

        // Sync to Supabase
        try {
          const payload: any = {};
          if (updates.name) payload.name = updates.name;
          if (updates.deliveryFee) payload.delivery_fee = updates.deliveryFee;
          if (typeof updates.isActive === 'boolean') payload.is_active = updates.isActive;

          await ((supabase as any)
            .from('neighborhoods'))
            .update(payload)
            .eq('id', id);
        } catch (err) {
          console.error('Error updating neighborhood:', err);
        }
      },

      removeNeighborhood: async (id) => {
        // Update local state
        set((state) => ({
          neighborhoods: state.neighborhoods.filter((nb) => nb.id !== id),
        }));

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('neighborhoods'))
            .delete()
            .eq('id', id);
        } catch (err) {
          console.error('Error deleting neighborhood:', err);
        }
      },

      toggleActive: async (id) => {
        const neighborhood = get().neighborhoods.find((nb) => nb.id === id);
        if (!neighborhood) return;

        const newActiveStatus = !neighborhood.isActive;

        // Update local state
        set((state) => ({
          neighborhoods: state.neighborhoods.map((nb) =>
            nb.id === id ? { ...nb, isActive: newActiveStatus } : nb
          ),
        }));

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('neighborhoods'))
            .update({ is_active: newActiveStatus })
            .eq('id', id);
        } catch (err) {
          console.error('Error toggling neighborhood:', err);
        }
      },

      syncFromSupabase: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await ((supabase as any)
            .from('neighborhoods'))
            .select('id, name, delivery_fee, is_active');

          if (error) {
            console.error('Failed to sync neighborhoods:', error);
            set({ isLoading: false });
            return;
          }

          if (data) {
            const neighborhoods: Neighborhood[] = data.map((row: any) => ({
              id: row.id,
              name: row.name,
              deliveryFee: row.delivery_fee,
              isActive: row.is_active,
            }));

            set({
              neighborhoods,
              isSynced: true,
              isLoading: false,
            });
          }
        } catch (err) {
          console.error('Error syncing from Supabase:', err);
          set({ isLoading: false });
        }
      },

      getActiveNeighborhoods: () => get().neighborhoods.filter((nb) => nb.isActive),
    }),
    {
      name: 'forneiro-eden-neighborhoods',
      version: 2,
    }
  )
);
