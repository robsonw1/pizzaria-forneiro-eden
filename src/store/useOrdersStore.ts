import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order } from '@/data/products';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

interface OrdersStore {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  removeOrder: (id: string) => void;
  getOrderById: (id: string) => Order | undefined;
  getOrdersByDateRange: (startDate: Date, endDate: Date) => Order[];
  getStats: (startDate: Date, endDate: Date) => {
    totalOrders: number;
    totalRevenue: number;
    avgTicket: number;
    deliveredOrders: number;
    cancelledOrders: number;
  };
}

export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (orderData) => {
        const newOrder: Order = {
          ...orderData,
          id: `PED-${String(Date.now()).slice(-6)}`,
          createdAt: new Date(),
        };
        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));
        return newOrder;
      },

      updateOrderStatus: (id, status) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, status } : order
          ),
        })),

      removeOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id),
        })),

      getOrderById: (id) => get().orders.find((order) => order.id === id),

      getOrdersByDateRange: (startDate, endDate) => {
        const orders = get().orders;
        return orders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= startDate && orderDate <= endDate;
        });
      },

      getStats: (startDate, endDate) => {
        const filteredOrders = get().getOrdersByDateRange(startDate, endDate);
        const completedOrders = filteredOrders.filter(
          (o) => o.status !== 'cancelled' && o.status !== 'pending'
        );
        const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
        
        return {
          totalOrders: filteredOrders.length,
          totalRevenue,
          avgTicket: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
          deliveredOrders: filteredOrders.filter((o) => o.status === 'delivered').length,
          cancelledOrders: filteredOrders.filter((o) => o.status === 'cancelled').length,
        };
      },
    }),
    {
      name: 'forneiro-eden-orders',
      version: 1,
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Convert date strings back to Date objects
          if (parsed.state?.orders) {
            parsed.state.orders = parsed.state.orders.map((order: any) => ({
              ...order,
              createdAt: new Date(order.createdAt),
            }));
          }
          return parsed;
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
