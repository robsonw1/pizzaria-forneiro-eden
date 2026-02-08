import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { Users, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ReferralCodeInputProps {
  customerId?: string;
  onReferralApplied?: () => void;
}

export function ReferralCodeInput({ customerId, onReferralApplied }: ReferralCodeInputProps) {
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const registerReferralCode = useLoyaltyStore((s) => s.registerReferralCode);

  const handleApplyCode = async () => {
    if (!referralCode.trim()) {
      toast.error('Digite um código de referência');
      return;
    }

    if (!customerId) {
      toast.error('Erro: Cliente não identificado');
      return;
    }

    setIsLoading(true);
    try {
      const success = await registerReferralCode(referralCode.toUpperCase(), customerId);

      if (success) {
        setIsApplied(true);
        toast.success('Código aplicado! Você ganhará 50 pontos na próxima compra');
        onReferralApplied?.();
      } else {
        toast.error('Código inválido ou expirado');
        setReferralCode('');
      }
    } catch (error) {
      console.error('Erro ao aplicar código:', error);
      toast.error('Erro ao aplicar código');
    } finally {
      setIsLoading(false);
    }
  };

  if (!customerId) {
    return null;
  }

  if (isApplied) {
    return (
      <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">Código aplicado!</p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Você ganhará 50 pontos na primeira compra
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Tem um código de referência?
            </p>
          </div>

          <p className="text-sm text-blue-800 dark:text-blue-200">
            Use um código de referência e ganhe 50 pontos na primeira compra!
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Seu código aqui (ex: REF12AB34)"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              className="font-mono text-sm uppercase"
              onKeyPress={(e) => e.key === 'Enter' && handleApplyCode()}
            />
            <Button
              onClick={handleApplyCode}
              disabled={isLoading || !referralCode.trim()}
              className="shrink-0"
            >
              {isLoading ? 'Validando...' : 'Aplicar'}
            </Button>
          </div>

          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Você precisa fazer uma compra para receber os pontos
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
