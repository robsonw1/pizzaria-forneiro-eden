import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { toast } from 'sonner';
import { Gift, Star, Users } from 'lucide-react';

interface PostCheckoutLoyaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function PostCheckoutLoyaltyModal({
  isOpen,
  onClose,
  email,
}: PostCheckoutLoyaltyModalProps) {
  const [step, setStep] = useState<'welcome' | 'form' | 'referral'>('welcome');
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
  });
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastCustomerId, setLastCustomerId] = useState<string | null>(null);

  const registerCustomer = useLoyaltyStore((s) => s.registerCustomer);
  const registerReferralCode = useLoyaltyStore((s) => s.registerReferralCode);
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);

  const handleRegister = async () => {
    if (!formData.name.trim() || !formData.cpf.trim()) {
      toast.error('Preencha o nome e CPF');
      return;
    }

    setIsLoading(true);
    try {
      const success = await registerCustomer(
        email,
        formData.cpf.replace(/\D/g, ''),
        formData.name,
        formData.phone || undefined
      );

      if (success) {
        if (currentCustomer?.id) {
          setLastCustomerId(currentCustomer.id);
          toast.success('✅ Cadastro realizado! Você ganhou 50 pontos + 10% de desconto!');
          setFormData({ name: '', cpf: '', phone: '' });
          setStep('referral');
        } else {
          toast.error('Erro ao recuperar dados do cliente');
        }
      } else {
        toast.error('Erro ao registrar. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao registrar cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) {
      toast.error('Digite um código de referência');
      return;
    }

    if (!lastCustomerId) {
      toast.error('Erro: cliente não identificado');
      return;
    }

    setIsLoading(true);
    try {
      await registerReferralCode(referralCode, lastCustomerId);
      toast.success('✅ Código de referência aplicado! Você ganhará 50 pontos na primeira compra.');
      setReferralCode('');
      setLastCustomerId(null);
      setStep('welcome');
      onClose();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Código de referência inválido ou já utilizado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipReferral = () => {
    setReferralCode('');
    setLastCustomerId(null);
    setStep('welcome');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {step === 'welcome' ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Gift className="w-8 h-8 text-primary" />
                <DialogTitle>Ganhe Pontos com Cada Compra!</DialogTitle>
              </div>
              <DialogDescription className="text-center pt-2">
                Cadastre-se agora e receba presentes exclusivos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold text-sm">50 Pontos de Bônus</p>
                    <p className="text-xs text-muted-foreground">
                      R$ 2,50 em desconto na sua próxima compra
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold text-sm">10% de Desconto</p>
                    <p className="text-xs text-muted-foreground">
                      Aproveite agora neste pedido!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold text-sm">1% de Pontos</p>
                    <p className="text-xs text-muted-foreground">
                      Ganhe em cada compra (100 pontos = R$ 5)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                Agora Não
              </Button>
              <Button onClick={() => setStep('form')} className="flex-1">
                Cadastrar Agora
              </Button>
            </DialogFooter>
          </>
        ) : step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Seus Dados</DialogTitle>
              <DialogDescription>
                Preencha para ganhar seus pontos de bônus
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 11) value = value.slice(0, 11);
                    if (value.length <= 3) {
                      setFormData({ ...formData, cpf: value });
                    } else if (value.length <= 6) {
                      setFormData({
                        ...formData,
                        cpf: `${value.slice(0, 3)}.${value.slice(3)}`,
                      });
                    } else if (value.length <= 9) {
                      setFormData({
                        ...formData,
                        cpf: `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`,
                      });
                    } else {
                      setFormData({
                        ...formData,
                        cpf: `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`,
                      });
                    }
                  }}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Email: <strong>{email}</strong>
              </p>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('welcome')}
                disabled={isLoading}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleRegister}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Cadastrando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </>
        ) : step === 'referral' ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Users className="w-8 h-8 text-primary" />
                <DialogTitle>Indique e Ganhe!</DialogTitle>
              </div>
              <DialogDescription className="text-center pt-2">
                Tem um código de referência? Aplique agora
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <Gift className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold text-sm">50 Pontos de Bônus</p>
                    <p className="text-xs text-muted-foreground">
                      Ganhe na sua primeira compra usando o código
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral">Código de Referência (opcional)</Label>
                <Input
                  id="referral"
                  placeholder="Cole o código aqui"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && referralCode.trim()) {
                      handleApplyReferral();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para continuar sem código
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSkipReferral}
                disabled={isLoading}
                className="flex-1"
              >
                Agora Não
              </Button>
              <Button
                onClick={handleApplyReferral}
                disabled={isLoading || !referralCode.trim()}
                className="flex-1"
              >
                {isLoading ? 'Aplicando...' : 'Aplicar Código'}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
