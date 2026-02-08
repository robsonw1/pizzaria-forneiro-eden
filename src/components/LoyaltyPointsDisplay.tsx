import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { Gift, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface LoyaltyPointsDisplayProps {
  maxPointsToSpend?: number;
  onPointsSelected?: (discount: number, pointsUsed: number) => void;
}

export function LoyaltyPointsDisplay({
  maxPointsToSpend = Infinity,
  onPointsSelected,
}: LoyaltyPointsDisplayProps) {
  const [pointsToUse, setPointsToUse] = useState(0);
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const redeemPoints = useLoyaltyStore((s) => s.redeemPoints);

  if (!currentCustomer || !currentCustomer.isRegistered) {
    return null;
  }

  const points = currentCustomer.totalPoints;
  const maxPoints = Math.min(points, maxPointsToSpend);
  
  // 100 pontos = R$ 5
  const discountPerPoint = 5 / 100; 
  const potentialDiscount = pointsToUse * discountPerPoint;

  const handleUsePoints = () => {
    if (pointsToUse === 0) {
      toast.error('Selecione quantos pontos deseja usar');
      return;
    }

    if (pointsToUse > points) {
      toast.error('Você não tem pontos suficientes');
      return;
    }

    onPointsSelected?.(potentialDiscount, pointsToUse);
    setPointsToUse(0);
  };

  const handleClearPoints = () => {
    setPointsToUse(0);
    onPointsSelected?.(0, 0);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              <span className="font-semibold">Seus Pontos de Fidelidade</span>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {points} pontos
            </Badge>
          </div>

          {/* Points Info */}
          <div className="bg-white dark:bg-secondary/30 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo disponível:</span>
              <span className="font-semibold text-primary">{points} pontos</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor em reais:</span>
              <span className="font-semibold">R$ {(points / 100 * 5).toFixed(2)}</span>
            </div>
          </div>

          {/* Points Slider */}
          {points > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Usar pontos no pedido:</label>
                <input
                  type="number"
                  min="0"
                  max={maxPoints}
                  value={pointsToUse}
                  onChange={(e) => setPointsToUse(Math.min(parseInt(e.target.value) || 0, maxPoints))}
                  className="w-20 px-2 py-1 border rounded text-sm text-center"
                  placeholder="0"
                />
              </div>

              <Slider
                min={0}
                max={maxPoints}
                step={10}
                value={[pointsToUse]}
                onValueChange={(value) => setPointsToUse(value[0])}
                className="py-4"
              />

              {/* Discount Preview */}
              {pointsToUse > 0 && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Desconto com {pointsToUse} pontos:</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        -R$ {potentialDiscount.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClearPoints}
                  className="flex-1"
                  disabled={pointsToUse === 0}
                >
                  Limpar
                </Button>
                <Button
                  onClick={handleUsePoints}
                  className="flex-1 bg-primary"
                  disabled={pointsToUse === 0 || pointsToUse > points}
                >
                  Usar {pointsToUse > 0 ? pointsToUse : 'pontos'}
                </Button>
              </div>
            </div>
          )}

          {points === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3 text-center">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                Faça compras para acumular pontos e ganhar descontos!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
