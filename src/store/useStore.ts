import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, Neighborhood, neighborhoodsData } from '@/data/products';
import { useLoyaltySettingsStore } from './useLoyaltySettingsStore';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
}

interface CheckoutStore {
  customer: {
    name: string;
    phone: string;
    email: string;
    cpf: string;
  };
  address: {
    zipCode: string;
    city: string;
    neighborhood: string;
    street: string;
    number: string;
    complement: string;
    reference: string;
  };
  deliveryType: 'delivery' | 'pickup';
  paymentMethod: 'pix' | 'card' | 'cash';
  observations: string;
  selectedNeighborhood: Neighborhood | null;
  needsChange: boolean;
  changeAmount: string;
  saveAsDefault: boolean;
  pointsToRedeem: number;
  setCustomer: (customer: Partial<CheckoutStore['customer']>) => void;
  setAddress: (address: Partial<CheckoutStore['address']>) => void;
  setDeliveryType: (type: 'delivery' | 'pickup') => void;
  setPaymentMethod: (method: 'pix' | 'card' | 'cash') => void;
  setObservations: (obs: string) => void;
  setSelectedNeighborhood: (neighborhood: Neighborhood | null) => void;
  setNeedsChange: (needs: boolean) => void;
  setChangeAmount: (amount: string) => void;
  setSaveAsDefault: (save: boolean) => void;
  setPointsToRedeem: (points: number) => void;
  calculatePointsDiscount: () => number;
  getDeliveryFee: () => number;
  reset: () => void;
}

interface UIStore {
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  selectedProduct: Product | null;
  isProductModalOpen: boolean;
  setCartOpen: (open: boolean) => void;
  setCheckoutOpen: (open: boolean) => void;
  setSelectedProduct: (product: Product | null) => void;
  setProductModalOpen: (open: boolean) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => set((state) => ({
        items: [...state.items, { ...item, id: `${item.product.id}-${Date.now()}` }]
      })),
      
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id)
      })),
      
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((item) =>
          item.id === id 
            ? { ...item, quantity, totalPrice: (item.totalPrice / item.quantity) * quantity }
            : item
        )
      })),
      
      clearCart: () => set({ items: [] }),
      
      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.totalPrice, 0);
      },
      
      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'forneiro-eden-cart',
    }
  )
);

export const useCheckoutStore = create<CheckoutStore>((set, get) => ({
  customer: {
    name: '',
    phone: '',
    email: '',
    cpf: '',
  },
  address: {
    zipCode: '',
    city: '',
    neighborhood: '',
    street: '',
    number: '',
    complement: '',
    reference: '',
  },
  deliveryType: 'delivery',
  paymentMethod: 'pix',
  observations: '',
  selectedNeighborhood: null,
  needsChange: false,
  changeAmount: '',
  saveAsDefault: false,
  pointsToRedeem: 0,

  setCustomer: (customer) => set((state) => ({
    customer: { ...state.customer, ...customer }
  })),

  setAddress: (address) => set((state) => ({
    address: { ...state.address, ...address }
  })),

  setDeliveryType: (type) => set({ deliveryType: type }),
  
  setPaymentMethod: (method) => set({ paymentMethod: method, needsChange: false, changeAmount: '' }),
  
  setObservations: (obs) => set({ observations: obs }),
  
  setSelectedNeighborhood: (neighborhood) => set({ 
    selectedNeighborhood: neighborhood,
    address: { ...get().address, neighborhood: neighborhood?.name || '' }
  }),

  setNeedsChange: (needs) => set({ needsChange: needs, changeAmount: needs ? get().changeAmount : '' }),

  setChangeAmount: (amount) => set({ changeAmount: amount }),
  
  setSaveAsDefault: (save) => set({ saveAsDefault: save }),
  
  setPointsToRedeem: (points) => set({ pointsToRedeem: Math.max(0, points) }),
  
  calculatePointsDiscount: () => {
    const points = get().pointsToRedeem;
    const settings = useLoyaltySettingsStore.getState().settings;
    const minPoints = settings?.minPointsToRedeem ?? 50;
    const discountPer100Points = settings?.discountPer100Points ?? 5;
    
    // Só calcula desconto se atingiu o mínimo
    if (points < minPoints) {
      return 0;
    }
    
    return (points / 100) * discountPer100Points;
  },
  
  getDeliveryFee: () => {
    const { deliveryType, selectedNeighborhood } = get();
    if (deliveryType === 'pickup') return 0;
    return selectedNeighborhood?.deliveryFee || 0;
  },

  reset: () => set({
    customer: { name: '', phone: '', email: '', cpf: '' },
    address: { zipCode: '', city: '', neighborhood: '', street: '', number: '', complement: '', reference: '' },
    deliveryType: 'delivery',
    paymentMethod: 'pix',
    observations: '',
    selectedNeighborhood: null,
    needsChange: false,
    changeAmount: '',
    saveAsDefault: false,
    pointsToRedeem: 0,
  }),
}));

export const useUIStore = create<UIStore>((set) => ({
  isCartOpen: false,
  isCheckoutOpen: false,
  selectedProduct: null,
  isProductModalOpen: false,

  setCartOpen: (open) => set({ isCartOpen: open }),
  setCheckoutOpen: (open) => set({ isCheckoutOpen: open }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setProductModalOpen: (open) => set({ isProductModalOpen: open }),
}));
