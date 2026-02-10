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
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { toast } from 'sonner';
import { Gift, Star, Sparkles, TrendingUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PostCheckoutLoyaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  pointsEarned?: number;
}

export function PostCheckoutLoyaltyModal({
  isOpen,
  onClose,
  email,
  pointsEarned = 0,
}: PostCheckoutLoyaltyModalProps) {
  const [step, setStep] = useState<'auth' | 'welcome' | 'form' | 'success'>('auth');
  const [currentEmail, setCurrentEmail] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastCustomerId, setLastCustomerId] = useState<string | null>(null);

  const registerCustomer = useLoyaltyStore((s) => s.registerCustomer);
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const isRemembered = useLoyaltyStore((s) => s.isRemembered);

  const handleClose = () => {
    // Reset internal state quando fecha, mas não toca no loyalty store se estiver logado
    if (!isRemembered) {
      setStep('auth');
      setCurrentEmail('');
      setFormData({ name: '', cpf: '', phone: '' });
      setLastCustomerId(null);
    }
    onClose();
  };

  const handleGoogleSuccess = (googleEmail: string) => {
    setCurrentEmail(googleEmail);
    setStep('form');
    toast.success('✅ Email do Google preenchido!');
  };

  const handleRegister = async () => {
    if (!formData.name.trim() || !formData.cpf.trim()) {
      toast.error('Preencha o nome e CPF');
      return;
    }

    if (!currentEmail.trim() || !currentEmail.includes('@')) {
      toast.error('Informe um email válido');
      return;
    }

    if (!formData.phone.trim() || formData.phone.length < 14) {
      toast.error('Preencha o telefone válido (mínimo 11 dígitos)');
      return;
    }

    setIsLoading(true);
    try {
      const success = await registerCustomer(
        currentEmail,
        formData.cpf.replace(/\D/g, ''),
        formData.name,
        formData.phone.replace(/\D/g, '')
      );

      if (success) {
        toast.success('✅ Cadastro realizado! Você ganhou 50 pontos + 10% de desconto!');
        setFormData({ name: '', cpf: '', phone: '' });
        setLastCustomerId(null);
        onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* TELA DE SUCESSO - Cliente logado com rememberMe */}
        {isRemembered && currentCustomer ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                <DialogTitle>Parabéns!</DialogTitle>
              </div>
              <DialogDescription className="text-center pt-2">
                Pontos adicionados com sucesso
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Seus pontos</p>
                <p className="text-5xl font-bold text-primary">{pointsEarned}+</p>
              </div>

              <div className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Seu saldo atual</p>
                    <p className="text-lg font-bold">{currentCustomer.totalPoints} pontos</p>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Total Gasto</p>
                    <p className="font-semibold text-sm">R$ {currentCustomer.totalSpent.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Compras</p>
                    <p className="font-semibold text-sm">{currentCustomer.totalPurchases}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-xs text-muted-foreground">
                <p>💡 Você está com login ativo! Continue acumulando pontos em cada compra e desbloqueie descontos exclusivos.</p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Continuar Comprando
              </Button>
            </DialogFooter>
          </>
        ) : step === 'auth' ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Gift className="w-8 h-8 text-primary" />
                <DialogTitle>Ganhe Pontos com Cada Compra!</DialogTitle>
              </div>
              <DialogDescription className="text-center pt-2">
                Escolha como deseja prosseguir
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <GoogleAuthButton onSuccess={handleGoogleSuccess} loading={isLoading} />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>

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

              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-muted-foreground">
                  ✨ <span className="font-semibold text-foreground">Ou entre na sua conta</span> para garantir os pontos e ganhar descontos exclusivos!
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                Agora Não
              </Button>
              <Button onClick={() => setStep('form')} className="flex-1">
                Cadastro Manual
              </Button>
            </DialogFooter>
          </>
        ) : step === 'welcome' ? (
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
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

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
                <Label htmlFor="phone">Telefone/WhatsApp *</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 11) value = value.slice(0, 11);
                    if (value.length <= 2) {
                      setFormData({ ...formData, phone: value });
                    } else if (value.length <= 7) {
                      setFormData({ ...formData, phone: `(${value.slice(0, 2)}) ${value.slice(2)}` });
                    } else {
                      setFormData({ ...formData, phone: `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}` });
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
