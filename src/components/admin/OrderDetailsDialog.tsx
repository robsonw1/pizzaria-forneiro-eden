import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Order } from '@/data/products';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  delivering: 'Em Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  preparing: 'bg-orange-500',
  delivering: 'bg-purple-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
};

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function OrderDetailsDialog({ open, onOpenChange, order }: OrderDetailsDialogProps) {
  const updateOrderStatus = useOrdersStore((s) => s.updateOrderStatus);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  // 🔴 REALTIME: Monitorar mudanças no status da ordem para refrescar UI
  useEffect(() => {
    if (!open || !order?.id) return;

    console.log('🔴 [ADMIN] Setting up Realtime order status sync for order:', order.id);

    const channel = supabase.channel(`order-status-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`
        },
        (payload: any) => {
          const updatedOrder = payload.new;
          console.log('🔴 [ADMIN] Ordem atualizada em tempo real:', {
            orderId: updatedOrder.id,
            status: updatedOrder.status,
            pointsRedeemed: updatedOrder.points_redeemed,
            pendingPoints: updatedOrder.pending_points,
            timestamp: new Date().toISOString()
          });

          // Se cancelado, mostrar notificação com detalhes dos pontos
          if (updatedOrder.status === 'cancelled') {
            const pointsReverted = updatedOrder.points_redeemed || 0;
            const pointsLost = updatedOrder.pending_points || 0;
            
            let message = '⏮️ Pedido foi cancelado. ';
            if (pointsReverted > 0) {
              message += `+${pointsReverted} pontos restaurados. `;
            }
            if (pointsLost > 0) {
              message += `${pointsLost} pontos pendentes removidos.`;
            }
            
            toast.info(message || 'Pedido foi cancelado.', {
              duration: 5000
            });
            // Fechar o diálogo após 2 segundos
            setTimeout(() => onOpenChange(false), 2000);
          }
        }
      )
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [ADMIN] Realtime subscription ativo para status de pedidos');
        }
      });

    return () => {
      console.log('🔴 [ADMIN] Unsubscribing from realtime order status sync');
      supabase.removeChannel(channel);
    };
  }, [open, order?.id, onOpenChange]);

  if (!order) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    updateOrderStatus(order.id, newStatus);
    
    // 🔴 SE CANCELADO: Fazer refresh dos pontos do cliente após reversão automática
    if (newStatus === 'cancelled' && order.customer?.email) {
      console.log('[ADMIN] 🔄 Pedido cancelado! Sincronizando pontos do cliente...', order.customer.email);
      
      // Buscar ID do cliente e fazer refresh
      const findOrCreateCustomer = useLoyaltyStore.getState().findOrCreateCustomer;
      const refreshCurrentCustomer = useLoyaltyStore.getState().refreshCurrentCustomer;
      
      findOrCreateCustomer(order.customer.email).then((customer) => {
        if (customer?.id) {
          refreshCurrentCustomer(customer.id).then(() => {
            console.log('[ADMIN] ✅ Pontos sincronizados após cancelamento');
          }).catch((error) => {
            console.error('[ADMIN] ⚠️ Erro ao sincronizar pontos:', error);
          });
        }
      });
      
      toast.success(`Pedido cancelado! Pontos foram revertidos automaticamente.`);
    } else {
      toast.success(`Status alterado para "${statusLabels[newStatus]}"`);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order) return;

    setIsConfirmingPayment(true);
    try {
      // 🔍 VALIDAÇÕES DE SEGURANÇA
      console.log('[ADMIN] ===== INICIANDO CONFIRMAÇÃO DE PAGAMENTO =====');
      console.log('[ADMIN] Dados do pedido:', {
        orderId: order.id,
        customerName: order.customer?.name,
        customerEmail: order.customer?.email,
        total: order.total,
        pointsRedeemed: order.pointsRedeemed,
        paymentMethod: order.paymentMethod,
        status: order.status
      });

      // Validar que o pedido tem ID e valor
      if (!order.id || typeof order.id !== 'string') {
        console.error('[ADMIN] ❌ Order ID inválido:', order.id);
        toast.error('Erro: ID do pedido inválido');
        setIsConfirmingPayment(false);
        return;
      }

      // Validar que tem um valor
      const totalAmount = parseFloat(String(order.total));
      if (isNaN(totalAmount) || totalAmount <= 0) {
        console.error('[ADMIN] ❌ Valor inválido:', order.total);
        toast.error('Erro: Valor do pedido inválido');
        setIsConfirmingPayment(false);
        return;
      }

      // 🔑 LOG: Informar a regra de pontos
      const rule = (order.pointsRedeemed || 0) > 0 
        ? 'Cliente USOU pontos - NÃO ganhará novos pontos'
        : 'Cliente NÃO usou pontos - GANHARÁ novos pontos';
      
      console.log('[ADMIN] 💰 REGRA DE PONTOS:', rule, {
        pointsRedeemed: order.pointsRedeemed,
        total: order.total
      });

      console.log('[ADMIN] ✅ Validações passaram, chamando Edge Function com email:', order.customer?.email);

      const { data, error } = await supabase.functions.invoke('confirm-payment-and-add-points', {
        body: {
          orderId: order.id,
          customerId: undefined,
          amount: totalAmount,
          pointsRedeemed: order.pointsRedeemed || 0,
        },
      });

      if (error) {
        console.error('[ADMIN] ❌ Erro da Edge Function:', {
          message: error.message,
          status: error.status,
          fullError: error
        });
        
        // Try to extract detailed error from response
        let errorDetail = error.message || 'Erro desconhecido';
        if (error.message?.includes('orderId')) {
          errorDetail = 'ID do pedido não encontrado';
        } else if (error.message?.includes('amount')) {
          errorDetail = 'Valor do pedido não foi especificado';
        } else if (error.message?.includes('cliente')) {
          errorDetail = 'Cliente não encontrado. Verifique se o email foi salvo.';
        }
        
        toast.error(`Erro ao confirmar: ${errorDetail}`);
        
        setIsConfirmingPayment(false);
        return;
      }

      if (!data) {
        console.error('[ADMIN] ❌ Nenhuma resposta da Edge Function');
        toast.error('Erro: Nenhuma resposta do servidor');
        setIsConfirmingPayment(false);
        return;
      }

      if (!data.success) {
        console.error('[ADMIN] ❌ Edge Function retornou success: false', data);
        toast.error(`Erro ao confirmar: ${data.error || 'Tente novamente'}`);
        setIsConfirmingPayment(false);
        return;
      }

      console.log('[ADMIN] ✅ Pagamento confirmado com sucesso:', data);

      // Atualizar status do pedido no store
      await updateOrderStatus(order.id, 'confirmed');
      
      // 💰 Para Cartão e Dinheiro: Pontos processados pelo Edge Function
      if (order.paymentMethod === 'card' || order.paymentMethod === 'cash') {
        const pointsRedeemed = order.pointsRedeemed || 0;
        const rule = pointsRedeemed > 0 
          ? 'Cliente USOU pontos - NÃO ganha novos'
          : 'Cliente NÃO usou pontos - GANHA novos';
        console.log(`[ADMIN] 💰 Pontos processados via Edge Function (${order.paymentMethod}):`, rule);
      }
      
      toast.success(data?.message || 'Pagamento confirmado e pontos adicionados!');
      onOpenChange(false);
      
    } catch (error) {
      console.error('[ADMIN] ❌ Erro ao confirmar pagamento:', {
        message: error instanceof Error ? error.message : String(error),
        error: error
      });
      toast.error(`Erro ao confirmar pagamento: ${error instanceof Error ? error.message : 'Tente novamente'}`);
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Pedido {order.id}
            <Badge variant="default" className={`${statusColors[order.status]} text-white`}>
              {statusLabels[order.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Change */}
          <div className="space-y-2">
            <Label>Alterar Status</Label>
            <Select value={order.status} onValueChange={(v) => handleStatusChange(v as OrderStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Confirm Payment Button - For Cash and Card payments that are still pending */}
          {order.status === 'pending' && order.paymentMethod !== 'pix' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <div className="text-sm">
                <p className="font-semibold text-yellow-900">Pagamento Pendente</p>
                <p className="text-yellow-800 text-xs mt-1">
                  Clique abaixo para confirmar que o pagamento foi recebido e adicionar pontos de lealdade ao cliente.
                </p>
              </div>
              <Button
                onClick={handleConfirmPayment}
                disabled={isConfirmingPayment}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isConfirmingPayment ? 'Confirmando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          )}

          <Separator />

          {/* Customer Info */}
          <div>
            <h4 className="font-semibold mb-2">Dados do Cliente</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span> {order.customer.name}
              </div>
              <div>
                <span className="text-muted-foreground">Telefone:</span> {order.customer.phone}
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Info */}
          <div>
            <h4 className="font-semibold mb-2">
              {order.deliveryType === 'delivery' ? 'Endereco de Entrega' : 'Retirada no Local'}
            </h4>
            {order.deliveryType === 'delivery' ? (
              <div className="text-sm space-y-1">
                <p>
                  {order.address.street}, {order.address.number}
                  {order.address.complement && ` - ${order.address.complement}`}
                </p>
                <p>
                  {order.address.neighborhood} - {order.address.city}
                </p>
                {order.address.reference && (
                  <p className="text-muted-foreground">
                    Referencia: {order.address.reference}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cliente ira retirar o pedido no estabelecimento
              </p>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h4 className="font-semibold mb-2">Itens do Pedido</h4>
            <div className="space-y-2">
              {(order.items ?? []).map((item, index) => {
                if (!item || !item.product) return null;
                return (
                  <div
                    key={index}
                    className="flex justify-between items-start p-2 bg-secondary/50 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {item.quantity}x {item.product?.name}
                        {item.size && ` (${item.size === 'broto' ? 'Broto' : 'Grande'})`}
                      </p>
                      {item.isHalfHalf && item.secondHalf && (
                        <p className="text-muted-foreground">
                          Meia: {item.secondHalf?.name}
                        </p>
                      )}
                      {item.border && (
                        <p className="text-muted-foreground">
                          Borda: {item.border?.name}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-muted-foreground italic">
                          Obs: {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-medium">{formatPrice(item.totalPrice)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.deliveryType === 'delivery' && (
              <div className="flex justify-between text-sm">
                <span>Taxa de Entrega</span>
                <span>{formatPrice(order.deliveryFee)}</span>
              </div>
            )}
            {order.pointsDiscount && order.pointsDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Desconto (Pontos Lealdade: {order.pointsRedeemed})</span>
                <span>-{formatPrice(order.pointsDiscount)}</span>
              </div>
            )}
            {order.appliedCoupon && order.couponDiscount && order.couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-purple-600 font-medium">
                <span>Desconto (Cupom {order.appliedCoupon})</span>
                <span>-{formatPrice(order.couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>

          <Separator />

          {/* Payment & Date */}
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Pagamento:</span>
              <Badge variant="outline">
                {order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod === 'card' ? 'Cartao' : 'Dinheiro'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Data:</span>
              {format(new Date(order.createdAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
            </div>
          </div>

          {order.observations && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-1">Observacoes</h4>
                <p className="text-sm text-muted-foreground">{order.observations}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
