import { create } from "zustand";
import type { Product } from "@/data/products";
import { getAllProducts } from "@/data/products";

type CatalogState = {
  /** Map by product id for fast updates (includes base + custom). */
  productsById: Record<string, Product>;
  /** Maintains the base seed ids to allow future merges if needed. */
  seedIds: string[];
};

type CatalogActions = {
  toggleActive: (id: string) => void;
  upsertProduct: (product: Product) => void;
  removeProduct: (id: string) => void;

  getAll: () => Product[];
  getByCategory: (category: Product["category"]) => Product[];
  getAllPizzas: () => Product[];
  getPromotionalPizzas: () => Product[];
};

const seedProducts = (): CatalogState => {
  const all = getAllProducts();
  const productsById: Record<string, Product> = {};
  for (const p of all) productsById[p.id] = p;
  return { productsById, seedIds: all.map((p) => p.id) };
};

export const useCatalogStore = create<CatalogState & CatalogActions>()((set, get) => ({
  ...seedProducts(),

  toggleActive: (id) =>
    set((state) => {
      const existing = state.productsById[id];
      if (!existing) return state;
      return {
        ...state,
        productsById: {
          ...state.productsById,
          [id]: { ...existing, isActive: !existing.isActive },
        },
      };
    }),

  upsertProduct: (product) =>
    set((state) => ({
      ...state,
      productsById: { ...state.productsById, [product.id]: product },
    })),

  removeProduct: (id) =>
    set((state) => {
      const next = { ...state.productsById };
      delete next[id];
      return { ...state, productsById: next };
    }),

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
}));
