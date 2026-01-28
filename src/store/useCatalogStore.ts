import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/data/products";
import { getAllProducts } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

type CatalogState = {
  /** Map by product id for fast updates (includes base + custom). */
  productsById: Record<string, Product>;
  /** Maintains the base seed ids to allow future merges if needed. */
  seedIds: string[];
  /** Track if data is synced from Supabase */
  isSynced: boolean;
  isLoading: boolean;
};

type CatalogActions = {
  toggleActive: (id: string) => Promise<void>;
  upsertProduct: (product: Product) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  syncFromSupabase: () => Promise<void>;
  
  getAll: () => Product[];
  getByCategory: (category: Product["category"]) => Product[];
  getAllPizzas: () => Product[];
  getPromotionalPizzas: () => Product[];
};

const seedProducts = (): Omit<CatalogState, 'isSynced' | 'isLoading'> => {
  const all = getAllProducts();
  const productsById: Record<string, Product> = {};
  for (const p of all) productsById[p.id] = p;
  return { productsById, seedIds: all.map((p) => p.id) };
};

export const useCatalogStore = create<CatalogState & CatalogActions>()(
  persist(
    (set, get) => ({
      ...seedProducts(),
      isSynced: false,
      isLoading: false,

      toggleActive: async (id) => {
        const existing = get().productsById[id];
        if (!existing) return;
        
        const updated = { ...existing, isActive: !existing.isActive };
        
        // Update local state
        set((state) => ({
          ...state,
          productsById: {
            ...state.productsById,
            [id]: updated,
          },
        }));

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('products'))
            .upsert({ id, name: existing.name, data: updated })
            .select();
        } catch (err) {
          console.error('Error syncing to Supabase:', err);
        }
      },

      upsertProduct: async (product) => {
        // Update local state
        set((state) => ({
          ...state,
          productsById: { ...state.productsById, [product.id]: product },
        }));

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('products'))
            .upsert({ id: product.id, name: product.name, data: product })
            .select();
        } catch (err) {
          console.error('Error syncing to Supabase:', err);
        }
      },

      removeProduct: async (id) => {
        // Update local state
        set((state) => {
          const next = { ...state.productsById };
          delete next[id];
          return { ...state, productsById: next };
        });

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('products'))
            .delete()
            .eq('id', id);
        } catch (err) {
          console.error('Error deleting from Supabase:', err);
        }
      },

      syncFromSupabase: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await ((supabase as any)
            .from('products'))
            .select('id, data');
          
          if (error) {
            console.error('Failed to sync products:', error);
            return;
          }

          // Merge Supabase data with local products
          const productsById = { ...get().productsById };
          
          if (data) {
            for (const row of data) {
              if (row.data) {
                productsById[row.id] = row.data as Product;
              }
            }
          }

          set({
            productsById,
            isSynced: true,
            isLoading: false,
          });
        } catch (err) {
          console.error('Error syncing from Supabase:', err);
          set({ isLoading: false });
        }
      },

      getAll: () => Object.values(get().productsById),

      getByCategory: (category) =>
        Object.values(get().productsById)
          .filter((p) => p.category === category)
          .sort((a, b) => {
            // Active first, then alphabetical
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            return a.name.localeCompare(b.name, "pt-BR");
          }),

      getAllPizzas: () => {
        const pizzas = [
          "promocionais",
          "tradicionais",
          "premium",
          "especiais",
          "doces",
        ] as const;
        return Object.values(get().productsById)
          .filter((p) => pizzas.includes(p.category as any))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      },

      getPromotionalPizzas: () =>
        Object.values(get().productsById)
          .filter((p) => p.category === "promocionais")
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    }),
    {
      name: "forneiro-eden-catalog",
      version: 2,
    }
  )
);
