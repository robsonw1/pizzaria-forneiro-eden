import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

interface OrdersStore {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  removeOrder: (id: string) => Promise<void>;
  getOrderById: (id: string) => Order | undefined;
  getOrdersByDateRange: (startDate: Date, endDate: Date) => Order[];
  syncOrdersFromSupabase: () => Promise<void>;
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

      addOrder: async (orderData) => {
        const newOrder: Order = {
          ...orderData,
          id: `PED-${String(Date.now()).slice(-6)}`,
          createdAt: new Date(),
        };

        try {
          // Salvar no Supabase
          const { error } = await supabase.from('orders').insert({
            id: newOrder.id,
            customer_name: newOrder.customer.name,
            customer_phone: newOrder.customer.phone,
            customer_email: newOrder.customer.email,
            street: newOrder.address.street,
            number: newOrder.address.number,
            complement: newOrder.address.complement,
            reference: newOrder.address.reference,
            neighborhood: newOrder.address.neighborhood,
            city: newOrder.address.city,
            zip_code: newOrder.address.zipCode,
            delivery_type: newOrder.deliveryType,
            delivery_fee: newOrder.deliveryFee,
            payment_method: newOrder.paymentMethod,
            subtotal: newOrder.subtotal,
            total: newOrder.total,
            status: newOrder.status,
            notes: newOrder.observations,
          });

          if (error) throw error;

          // Salvar itens do pedido
          const orderItems = newOrder.items.map((item) => ({
            order_id: newOrder.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            size: item.size,
            price: item.totalPrice / item.quantity,
            total_price: item.totalPrice,
            custom_ingredients: item.customIngredients?.join(','),
            paid_ingredients: item.paidIngredients?.join(','),
          }));

          if (orderItems.length > 0) {
            await supabase.from('order_items').insert(orderItems);
          }

          // Tentar imprimir pedido automaticamente (sem esperar)
          // Isso ocorre assincronamente para não bloquear o fluxo
          supabase.functions
            .invoke('printorder', {
              body: {
                orderId: newOrder.id,
                tenantId: undefined, // Implementar multi-tenancy depois
              },
            })
            .catch((error) => {
              console.log(
                'PrintNode não configurado ou erro ao imprimir:',
                error
              );
              // Não lançar erro, deixar o pedido ser criado mesmo se impressão falhar
            });
        } catch (error) {
          console.error('Erro ao salvar pedido no Supabase:', error);
        }

        // Salvar localmente também
        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));

        return newOrder;
      },

      updateOrderStatus: async (id, status) => {
        try {
          // Atualizar no Supabase
          const { error } = await supabase.from('orders')
            .update({ status })
            .eq('id', id);

          if (error) throw error;
        } catch (error) {
          console.error('Erro ao atualizar status no Supabase:', error);
        }

        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, status } : order
          ),
        }));
      },

      removeOrder: async (id) => {
        try {
          // Deletar do Supabase
          await supabase.from('order_items').delete().eq('order_id', id);
          const { error } = await supabase.from('orders').delete().eq('id', id);

          if (error) throw error;
        } catch (error) {
          console.error('Erro ao deletar pedido do Supabase:', error);
        }

        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id),
        }));
      },

      getOrderById: (id) => get().orders.find((order) => order.id === id),

      getOrdersByDateRange: (startDate, endDate) => {
        const orders = get().orders;
        return orders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= startDate && orderDate <= endDate;
        });
      },

      syncOrdersFromSupabase: async () => {
        try {
          const { data, error } = await supabase.from('orders')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          if (data) {
            const orders: Order[] = data.map((row: any) => ({
              id: row.id,
              customer: {
                name: row.customer_name,
                phone: row.customer_phone,
                email: row.customer_email,
              },
              address: {
                zipCode: row.zip_code,
                city: row.city,
                neighborhood: row.neighborhood,
                street: row.street,
                number: row.number,
                complement: row.complement,
                reference: row.reference,
              },
              deliveryType: row.delivery_type,
              deliveryFee: row.delivery_fee,
              paymentMethod: row.payment_method,
              items: [],
              subtotal: row.subtotal,
              total: row.total,
              status: row.status,
              observations: row.notes,
              createdAt: new Date(row.created_at),
            }));

            set(() => ({
              orders,
            }));
          }
        } catch (error) {
          console.error('Erro ao sincronizar pedidos do Supabase:', error);
        }
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
