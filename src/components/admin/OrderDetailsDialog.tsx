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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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

  if (!order) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    updateOrderStatus(order.id, newStatus);
    toast.success(`Status alterado para "${statusLabels[newStatus]}"`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Pedido {order.id}
            <Badge className={`${statusColors[order.status]} text-white`}>
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

          <Separator />

          {/* Customer Info */}
          <div>
            <h4 className="font-semibold mb-2">Dados do Cliente</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>{' '}
                {order.customer.name}
              </div>
              <div>
                <span className="text-muted-foreground">Telefone:</span>{' '}
                {order.customer.phone}
              </div>
              {order.customer.email && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Email:</span>{' '}
                  {order.customer.email}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Delivery Info */}
          <div>
            <h4 className="font-semibold mb-2">
              {order.deliveryType === 'delivery' ? 'Endereço de Entrega' : 'Retirada no Local'}
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
                <p>CEP: {order.address.zipCode}</p>
                {order.address.reference && (
                  <p className="text-muted-foreground">
                    Referência: {order.address.reference}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cliente irá retirar o pedido no estabelecimento
              </p>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h4 className="font-semibold mb-2">Itens do Pedido</h4>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-start p-2 bg-secondary/50 rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {item.quantity}x {item.product.name}
                      {item.size && ` (${item.size === 'broto' ? 'Broto' : 'Grande'})`}
                    </p>
                    {item.isHalfHalf && item.secondHalf && (
                      <p className="text-muted-foreground">
                        Meia: {item.secondHalf.name}
                      </p>
                    )}
                    {item.border && (
                      <p className="text-muted-foreground">
                        Borda: {item.border.name}
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
              ))}
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
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>

          <Separator />

          {/* Payment & Date */}
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Pagamento:</span>{' '}
              <Badge variant="outline">
                {order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Data:</span>{' '}
              {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>

          {order.observations && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-1">Observações</h4>
                <p className="text-sm text-muted-foreground">{order.observations}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
