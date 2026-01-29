import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

interface OrdersStore {
  orders: Order[];
  isLoading: boolean;
  isSynced: boolean;
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  removeOrder: (id: string) => Promise<void>;
  syncFromSupabase: () => Promise<void>;
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
      isLoading: false,
      isSynced: false,

      addOrder: async (orderData) => {
        const newOrder: Order = {
          ...orderData,
          id: `PED-${String(Date.now()).slice(-6)}`,
          createdAt: new Date(),
        };
        
        // Update local state
        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));

        // Save to Supabase
        try {
          const orderPayload = {
            id: newOrder.id,
            customer_name: newOrder.customer.name,
            customer_phone: newOrder.customer.phone,
            customer_email: newOrder.customer.email || null,
            delivery_fee: newOrder.deliveryFee,
            payment_method: newOrder.paymentMethod,
            delivery_type: newOrder.deliveryType,
            subtotal: newOrder.subtotal,
            status: newOrder.status,
            total: newOrder.total,
            created_at: newOrder.createdAt.toISOString(),
          };

          await ((supabase as any)
            .from('orders'))
            .insert(orderPayload);

          // Save order items
          if (newOrder.items && newOrder.items.length > 0) {
            const itemsToInsert = newOrder.items.map((item) => ({
              order_id: newOrder.id,
              product_id: item.product.id,
              product_name: item.product.name,
              quantity: item.quantity,
              size: item.size || null,
              total_price: item.totalPrice,
              item_data: JSON.stringify(item),
            }));

            await ((supabase as any)
              .from('order_items'))
              .insert(itemsToInsert);
          }
        } catch (err) {
          console.error('Error saving order to Supabase:', err);
        }

        return newOrder;
      },

      updateOrderStatus: async (id, status) => {
        // Update local state
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, status } : order
          ),
        }));

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('orders'))
            .update({ status })
            .eq('id', id);
        } catch (err) {
          console.error('Error updating order status:', err);
        }
      },

      removeOrder: async (id) => {
        // Update local state
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id),
        }));

        // Sync to Supabase
        try {
          await ((supabase as any)
            .from('orders'))
            .delete()
            .eq('id', id);
        } catch (err) {
          console.error('Error deleting order:', err);
        }
      },

      syncFromSupabase: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await ((supabase as any)
            .from('orders'))
            .select(`
              id,
              customer_name,
              customer_phone,
              customer_email,
              delivery_fee,
              payment_method,
              delivery_type,
              subtotal,
              status,
              total,
              created_at,
              order_items (
                product_id,
                product_name,
                quantity,
                size,
                total_price,
                item_data
              )
            `)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Failed to sync orders:', error);
            set({ isLoading: false });
            return;
          }

          if (data) {
            const orders: Order[] = data.map((row: any) => ({
              id: row.id,
              customer: {
                name: row.customer_name,
                phone: row.customer_phone,
                email: row.customer_email,
              },
              address: {
                zipCode: '',
                city: 'São Paulo',
                neighborhood: '',
                street: '',
                number: '',
                complement: '',
                reference: '',
              },
              deliveryType: (row.delivery_type || 'delivery') as 'delivery' | 'pickup',
              deliveryFee: row.delivery_fee || 0,
              paymentMethod: (row.payment_method || 'pix') as 'pix' | 'card' | 'cash',
              subtotal: row.subtotal || row.total,
              status: row.status as OrderStatus,
              total: row.total,
              observations: '',
              createdAt: new Date(row.created_at),
              items: row.order_items.map((item: any) => {
                try {
                  return JSON.parse(item.item_data);
                } catch {
                  return {
                    product: { id: item.product_id, name: item.product_name },
                    quantity: item.quantity,
                    size: item.size,
                    totalPrice: item.total_price,
                  };
                }
              }),
            })) as any;

            set({
              orders,
              isSynced: true,
              isLoading: false,
            });
          }
        } catch (err) {
          console.error('Error syncing from Supabase:', err);
          set({ isLoading: false });
        }
      },

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
      version: 2,
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
