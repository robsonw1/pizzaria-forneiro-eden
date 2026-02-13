import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

// Helper para obter hora local em formato ISO string sem timezone
const getLocalISOString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${date}T${hours}:${minutes}:${seconds}`;
};

interface OrdersStore {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>, autoprint?: boolean) => Promise<Order>;
  addOrderToStoreOnly: (orderData: Order) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  updateOrderPrintedAt: (id: string, printedAt: string) => Promise<void>;
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

      addOrder: async (orderData, autoprint = false) => {
        const newOrder: Order = {
          ...orderData,
          id: `PED-${String(Date.now()).slice(-6)}`,
          createdAt: new Date(),
        };

        try {
          // Salvar no Supabase com hora local correta
          const localISO = getLocalISOString();
          
          // Store payment_method as metadata in address JSONB
          const addressWithMetadata = {
            ...newOrder.address,
            paymentMethod: newOrder.paymentMethod, // Store internally for later retrieval
          };
          
          const { error } = await supabase.from('orders').insert([
            {
              id: newOrder.id,
              customer_name: newOrder.customer.name,
              customer_phone: newOrder.customer.phone,
              email: newOrder.customer.email,
              delivery_fee: newOrder.deliveryFee,
              status: newOrder.status,
              total: newOrder.total,
              points_discount: newOrder.pointsDiscount || 0,
              points_redeemed: newOrder.pointsRedeemed || 0,
              payment_method: newOrder.paymentMethod,
              created_at: localISO,
              address: addressWithMetadata,
            },
          ] as any);

          if (error) {
            console.error('❌ Erro ao inserir order:', error);
            throw error;
          }
          console.log('✅ Order inserida com sucesso:', newOrder.id, 'em', localISO);

          // Salvar itens do pedido - APENAS os campos que existem na tabela order_items
          const orderItems = newOrder.items.map((item) => ({
            order_id: newOrder.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            size: item.size,
            total_price: item.totalPrice,
            item_data: JSON.stringify({
              pizzaType: item.isHalfHalf ? 'meia-meia' : 'inteira',
              customIngredients: item.customIngredients || [],
              paidIngredients: item.paidIngredients || [],
              extras: item.extras?.map(e => e.name) || [],
              drink: item.drink?.name,
              border: item.border?.name,
              notes: newOrder.observations,
            }),
          }));

          if (orderItems.length > 0) {
            const { error: itemsError } = await supabase.from('order_items').insert(orderItems as any);
            if (itemsError) {
              console.error('❌ Erro ao inserir order_items:', itemsError);
              throw itemsError;
            }
            console.log('✅ Order items inseridos com sucesso:', orderItems.length);
          }

          // Tentar imprimir pedido automaticamente via Edge Function com RETRY (apenas se autoprint = true)
          if (autoprint) {
            console.log('🖨️ Auto-print HABILITADO. Iniciando impressão para:', newOrder.id);
            
            const invokePrintWithRetry = async () => {
              for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                  console.log(`Tentativa ${attempt}/5 de invocar printorder...`);
                  const { data, error } = await supabase.functions.invoke('printorder', {
                    body: { orderId: newOrder.id },
                  });

                  if (error) {
                    console.error(`Tentativa ${attempt}: Erro -`, error.message || error);
                    if (attempt < 5) {
                      await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
                      continue;
                    }
                    throw error;
                  }

                  console.log(`Printorder sucesso na tentativa ${attempt}`);
                  
                  // Se printorder funcionou, marcar como impresso com hora local
                  const printedAtLocal = getLocalISOString();
                  
                  const { error: updateError } = await (supabase as any)
                    .from('orders')
                    .update({ printed_at: printedAtLocal })
                    .eq('id', newOrder.id);
                    
                  if (!updateError) {
                    console.log('Status de impressão atualizado');
                  }
                  return;
                } catch (err) {
                  console.error(`Tentativa ${attempt} falhou:`, err);
                  if (attempt === 5) {
                    console.error('Falha: não foi possível invocar printorder após 5 tentativas');
                  }
                }
              }
            };

            // Invocar assincronamente (não bloqueia)
            invokePrintWithRetry();
          } else {
            console.log('Auto-print desabilitado para este pagamento');
          }
        } catch (error) {
          console.error('Erro ao salvar pedido no Supabase:', error);
        }

        // Salvar localmente também
        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));

        return newOrder;
      },

      addOrderToStoreOnly: (orderData) => {
        // Apenas adicionar à store local, sem persistir no BD
        // Usado para sincronização realtime onde o pedido já foi salvo no BD
        const newOrder: Order = {
          ...orderData,
          createdAt: orderData.createdAt instanceof Date ? orderData.createdAt : new Date(orderData.createdAt),
        };
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

      updateOrderPrintedAt: async (id, printedAt) => {
        try {
          // Atualizar no Supabase
          const { error } = await (supabase as any).from('orders')
            .update({ printed_at: printedAt })
            .eq('id', id);

          if (error) throw error;
        } catch (error) {
          console.error('Erro ao atualizar printed_at no Supabase:', error);
        }

        // Atualizar localmente IMEDIATAMENTE
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, printedAt } : order
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
            console.log(`🔄 Sincronizando ${data.length} pedidos do Supabase`);
            
            // Buscar também os itens de cada pedido
            const ordersWithItems = await Promise.all(
              data.map(async (row: any) => {
                const { data: items } = await supabase.from('order_items')
                  .select('*')
                  .eq('order_id', row.id);

                // Parse createdAt - manter o ISO string original do banco
                // A conversão de horário já é feita implicitamente pelo JavaScript
                const createdAtDate = new Date(row.created_at);
                
                // Extrair payment_method da metadata do address
                const paymentMethodFromMetadata = (row.address as any)?.paymentMethod || 'pix';
                
                // Preparar address sem metadata interna
                const displayAddress = row.address ? {
                  city: row.address.city || '',
                  neighborhood: row.address.neighborhood || '',
                  street: row.address.street || '',
                  number: row.address.number || '',
                  complement: row.address.complement || '',
                  reference: row.address.reference || '',
                } : {
                  city: '',
                  neighborhood: '',
                  street: '',
                  number: '',
                  complement: '',
                  reference: '',
                };
                
                // Construir objeto de pedido com TODOS os dados do banco
                const syncedOrder: Order = {
                  id: row.id,
                  customer: {
                    name: row.customer_name,
                    phone: row.customer_phone,
                  },
                  address: displayAddress,
                  deliveryType: 'delivery' as const,
                  deliveryFee: row.delivery_fee,
                  paymentMethod: paymentMethodFromMetadata as any,
                  items: items?.map((item: any) => ({
                    id: item.id || `item-${Date.now()}-${Math.random()}`,
                    product: { id: item.product_id, name: item.product_name } as any,
                    quantity: item.quantity,
                    size: item.size,
                    totalPrice: item.total_price,
                  })) || [],
                  subtotal: row.total,
                  total: row.total,
                  pointsDiscount: row.points_discount || 0,
                  pointsRedeemed: row.points_redeemed || 0,
                  status: row.status as any,
                  observations: '',
                  createdAt: createdAtDate,
                  // ✅ Sincronizar printed_at: só setá se realmente houver um valor (não null, não vazio)
                  printedAt: row.printed_at && row.printed_at !== null && row.printed_at !== '' 
                    ? new Date(row.printed_at).toISOString() 
                    : undefined,
                };
                
                return syncedOrder;
              })
            );

            set(() => ({
              orders: ordersWithItems as Order[],
            }));
            console.log(`✅ ${ordersWithItems.length} pedidos sincronizados com itens`);
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
