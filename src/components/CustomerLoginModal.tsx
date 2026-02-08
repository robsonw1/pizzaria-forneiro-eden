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
import { LogIn, Mail } from 'lucide-react';

interface CustomerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CustomerLoginModal({
  isOpen,
  onClose,
  onSuccess,
}: CustomerLoginModalProps) {
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loginCustomer = useLoyaltyStore((s) => s.loginCustomer);

  const formatCpf = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 3) formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length > 6) formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    if (cleaned.length > 9) formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
    return formatted;
  };

  const handleCpfInput = (value: string) => {
    setCpf(formatCpf(value));
  };

  const handleLogin = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Informe um email válido');
      return;
    }

    if (!cpf.trim() || cpf.replace(/\D/g, '').length !== 11) {
      toast.error('Informe um CPF válido');
      return;
    }

    setIsLoading(true);
    try {
      const success = await loginCustomer(email, cpf.replace(/\D/g, ''));

      if (success) {
        toast.success('✅ Bem-vindo! Dados carregados com sucesso');
        setEmail('');
        setCpf('');
        onClose();
        onSuccess?.();
      } else {
        toast.error('❌ Email ou CPF inválidos. Dados não encontrados.');
      }
    } catch (error) {
      console.error('Erro de login:', error);
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setCpf('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-4">
            <LogIn className="w-8 h-8 text-primary" />
            <DialogTitle>Acessar Sua Conta</DialogTitle>
          </div>
          <DialogDescription className="text-center pt-2">
            Informe seus dados para ver seus pontos e benefícios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email *</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="flex items-center gap-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-cpf">CPF *</Label>
            <Input
              id="login-cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => handleCpfInput(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-xs text-muted-foreground">
            <p>💡 Use o mesmo email e CPF que utilizou no cadastro após a compra.</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Conectando...' : 'Entrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
