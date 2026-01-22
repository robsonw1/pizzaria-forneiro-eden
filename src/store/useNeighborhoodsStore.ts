import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Neighborhood, neighborhoodsData } from '@/data/products';

interface NeighborhoodsStore {
  neighborhoods: Neighborhood[];
  addNeighborhood: (neighborhood: Omit<Neighborhood, 'id'>) => void;
  updateNeighborhood: (id: string, updates: Partial<Neighborhood>) => void;
  removeNeighborhood: (id: string) => void;
  toggleActive: (id: string) => void;
  getActiveNeighborhoods: () => Neighborhood[];
}

export const useNeighborhoodsStore = create<NeighborhoodsStore>()(
  persist(
    (set, get) => ({
      neighborhoods: neighborhoodsData,

      addNeighborhood: (neighborhood) =>
        set((state) => ({
          neighborhoods: [
            ...state.neighborhoods,
            {
              ...neighborhood,
              id: `neighborhood-${Date.now()}`,
            },
          ],
        })),

      updateNeighborhood: (id, updates) =>
        set((state) => ({
          neighborhoods: state.neighborhoods.map((nb) =>
            nb.id === id ? { ...nb, ...updates } : nb
          ),
        })),

      removeNeighborhood: (id) =>
        set((state) => ({
          neighborhoods: state.neighborhoods.filter((nb) => nb.id !== id),
        })),

      toggleActive: (id) =>
        set((state) => ({
          neighborhoods: state.neighborhoods.map((nb) =>
            nb.id === id ? { ...nb, isActive: !nb.isActive } : nb
          ),
        })),

      getActiveNeighborhoods: () => get().neighborhoods.filter((nb) => nb.isActive),
    }),
    {
      name: 'forneiro-eden-neighborhoods',
      version: 1,
    }
  )
);
