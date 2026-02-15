import { useState, useEffect } from 'react';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface Order {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
  total: number;
  createdAt: string;
  items?: Array<{ name: string; quantity: number }>;
  deliveryType?: 'delivery' | 'pickup';
  pointsRedeemed?: number;
}

interface CustomerOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusConfig = {
  pending: {
    label: 'Pendente',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
  },
  confirmed: {
    label: 'Confirmado',
    icon: CheckCircle,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  preparing: {
    label: 'Preparando',
    icon: Package,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
  },
  delivering: {
    label: 'Em Entrega',
    icon: Truck,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
  },
  delivered: {
    label: 'Entregue',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
  },
};

export function CustomerOrdersDrawer({
  isOpen,
  onClose,
}: CustomerOrdersDrawerProps) {
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentCustomer?.email) return;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        console.log('[ORDERS] 🔍 Buscando pedidos do cliente:', currentCustomer.email);
        const { data, error } = await (supabase as any)
          .from('orders')
          .select('id, status, total, created_at, delivery_type, points_redeemed, items:order_items(*)')
          .eq('email', currentCustomer.email)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[ORDERS] ❌ Erro ao buscar pedidos:', error);
          return;
        }

        if (!data) {
          console.log('[ORDERS] Nenhum pedido encontrado');
          setOrders([]);
          return;
        }

        // Mapear dados do BD para formato esperado
        const mappedOrders = (data as any[]).map((order: any) => ({
          id: order.id,
          status: order.status || 'pending',
          total: order.total || 0,
          createdAt: order.created_at,
          items: order.items || [],
          deliveryType: order.delivery_type || 'delivery',
          pointsRedeemed: order.points_redeemed || 0,
        }));

        console.log('[ORDERS] ✅ Pedidos carregados:', mappedOrders.length);
        setOrders(mappedOrders);
      } catch (error) {
        console.error('[ORDERS] ❌ Erro ao buscar pedidos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // 🔴 REALTIME: Monitorar atualizações de status dos pedidos
    console.log('[ORDERS] 🔴 Ativando Realtime listener para pedidos...');
    const channel = supabase.channel(`orders-${currentCustomer.email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `email=eq.${currentCustomer.email}`,
        },
        (payload: any) => {
          console.log('[ORDERS] 🔄 Atualização em tempo real:', {
            event: payload.eventType,
            orderId: payload.new?.id || payload.old?.id,
            status: payload.new?.status || payload.old?.status,
          });

          // Se for INSERT ou UPDATE, refazer busca completa
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            fetchOrders();
          } else if (payload.eventType === 'DELETE') {
            // Se for DELETE, remover do estado
            setOrders((prev) =>
              prev.filter((order) => order.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          console.log('[ORDERS] ✅ Realtime subscription ativo para pedidos');
        }
      });

    return () => {
      console.log('[ORDERS] 🔴 Unsubscribing from realtime');
      supabase.removeChannel(channel);
    };
  }, [isOpen, currentCustomer?.email]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getStatusConfig = (status: Order['status']) => {
    return statusConfig[status] || statusConfig.pending;
  };

  const getStatusIcon = (status: Order['status']) => {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Meus Pedidos
          </SheetTitle>
          <SheetDescription>
            Acompanhe o status dos seus pedidos em tempo real
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Carregando pedidos...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum pedido realizado ainda</p>
              <p className="text-xs text-muted-foreground mt-1">
                Faça seu primeiro pedido e acompanhe aqui!
              </p>
            </div>
          ) : (
            (orders ?? []).map((order, index) => {
              const config = getStatusConfig(order.status);
              const orderDate = new Date(order.createdAt);

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border transition-all hover:shadow-md ${config.bgColor}`}
                >
                  {/* Header: ID e Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">Pedido {order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(orderDate, 'dd MMM yyyy, HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                    <Badge
                      className={`flex items-center gap-1 ${config.color}`}
                      variant="secondary"
                    >
                      {getStatusIcon(order.status)}
                      {config.label}
                    </Badge>
                  </div>

                  <Separator className="my-3" />

                  {/* Items Summary */}
                  {order.items && order.items.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Itens:
                      </p>
                      <div className="space-y-1">
                        {order.items.slice(0, 2).map((item: any, idx: number) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            {item.quantity}x {item.name || item.product_name || 'Item'}
                          </p>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-xs text-muted-foreground italic">
                            +{order.items.length - 2} item(ns)
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Type & Points */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {order.deliveryType === 'delivery' ? (
                        <>
                          <Truck className="w-4 h-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Entrega</span>
                        </>
                      ) : (
                        <>
                          <Package className="w-4 h-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Retirada</span>
                        </>
                      )}
                    </div>
                    {order.pointsRedeemed && order.pointsRedeemed > 0 && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        -{order.pointsRedeemed} pontos
                      </span>
                    )}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Total:</span>
                    <span className="font-bold text-primary">
                      {formatPrice(order.total)}
                    </span>
                  </div>

                  {/* Status Timeline */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="space-y-2">
                      {order.status === 'cancelled' && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          ⚠️ Este pedido foi cancelado
                        </p>
                      )}
                      {order.status === 'delivered' && (
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                          ✅ Pedido entregue
                        </p>
                      )}
                      {order.status === 'delivering' && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                          🚗 Saiu para entrega! Acompanhe com o estabelecimento
                        </p>
                      )}
                      {order.status === 'preparing' && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          👨‍🍳 Seu pedido está sendo preparado
                        </p>
                      )}
                      {order.status === 'confirmed' && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          ✓ Pagamento confirmado! Entrando na fila
                        </p>
                      )}
                      {order.status === 'pending' && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                          ⏳ Aguardando confirmação de pagamento
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
