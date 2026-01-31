import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Neighborhood } from '@/data/products';
import { useNeighborhoodsStore } from '@/store/useNeighborhoodsStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NeighborhoodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  neighborhood?: Neighborhood | null;
}

export function NeighborhoodFormDialog({
  open,
  onOpenChange,
  neighborhood,
}: NeighborhoodFormDialogProps) {
  const addNeighborhood = useNeighborhoodsStore((s) => s.addNeighborhood);
  const updateNeighborhood = useNeighborhoodsStore((s) => s.updateNeighborhood);

  const isEdit = !!neighborhood;

  const [name, setName] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (neighborhood) {
      setName(neighborhood.name);
      setDeliveryFee(String(neighborhood.deliveryFee));
      setIsActive(neighborhood.isActive);
    } else {
      setName('');
      setDeliveryFee('');
      setIsActive(true);
    }
  }, [open, neighborhood]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Por favor, informe o nome do bairro');
      return;
    }

    const fee = parseFloat(deliveryFee.replace(',', '.'));
    if (isNaN(fee) || fee < 0) {
      toast.error('Por favor, informe uma taxa válida');
      return;
    }

    try {
      if (isEdit && neighborhood) {
        updateNeighborhood(neighborhood.id, {
          name: trimmedName,
          deliveryFee: fee,
          isActive,
        });

        // Salvar no Supabase
        await (supabase as any)
          .from('neighborhoods')
          .update({
            name: trimmedName,
            delivery_fee: fee,
            is_active: isActive,
          })
          .eq('id', neighborhood.id);

        toast.success('Bairro atualizado com sucesso!');
      } else {
        const newNeighborhood = {
          id: `neighborhood-${Date.now()}`,
          name: trimmedName,
          deliveryFee: fee,
          isActive,
        };

        addNeighborhood(newNeighborhood);

        // Salvar no Supabase
        await (supabase as any)
          .from('neighborhoods')
          .insert({
            id: newNeighborhood.id,
            name: trimmedName,
            delivery_fee: fee,
            is_active: isActive,
          });

        toast.success('Bairro adicionado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar bairro:', error);
      toast.error('Erro ao salvar bairro');
      return;
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Bairro' : 'Novo Bairro'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nb-name">Nome do Bairro</Label>
            <Input
              id="nb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Centro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nb-fee">Taxa de Entrega (R$)</Label>
            <Input
              id="nb-fee"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="Ex.: 5.00"
              type="text"
              inputMode="decimal"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="nb-active">Disponível para entregas</Label>
            <Switch
              id="nb-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="btn-cta" onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
