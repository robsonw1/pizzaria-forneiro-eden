import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { toast } from 'sonner';
import { MapPin, Edit2 } from 'lucide-react';

interface DeliveryAddressDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeliveryAddressDialog({
  isOpen,
  onClose,
}: DeliveryAddressDialogProps) {
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const saveDefaultAddress = useLoyaltyStore((s) => s.saveDefaultAddress);

  const [formData, setFormData] = useState({
    street: currentCustomer?.street || '',
    number: currentCustomer?.number || '',
    complement: currentCustomer?.complement || '',
    neighborhood: currentCustomer?.neighborhood || '',
    city: currentCustomer?.city || '',
    zipCode: currentCustomer?.zipCode || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.street.trim() || !formData.number.trim() || !formData.neighborhood.trim()) {
      toast.error('Preencha rua, número e bairro obrigatoriamente');
      return;
    }

    setIsLoading(true);
    try {
      const success = await saveDefaultAddress(formData);
      if (success) {
        toast.success('✅ Endereço salvo com sucesso!');
        onClose();
      } else {
        toast.error('Erro ao salvar endereço');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar endereço');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <DialogTitle>Meu Endereço de Entrega</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Salve seu endereço padrão para agilizar seus pedidos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="zipCode">CEP</Label>
            <Input
              id="zipCode"
              placeholder="00000-000"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">Rua *</Label>
            <Input
              id="street"
              placeholder="Rua/Avenida"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="number">Número *</Label>
              <Input
                id="number"
                placeholder="123"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                placeholder="Apto, sala..."
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro *</Label>
            <Input
              id="neighborhood"
              placeholder="Bairro"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade *</Label>
            <Input
              id="city"
              placeholder="Cidade"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-xs text-muted-foreground">
            <p>💡 Este endereço será usado como padrão em todos os seus pedidos de entrega.</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Salvando...' : 'Salvar Endereço'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
