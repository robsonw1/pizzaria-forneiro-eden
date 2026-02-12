import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { Gift, TrendingUp, Zap, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface CustomerLoyaltyProfileProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
}

export function CustomerLoyaltyProfile({
  isOpen,
  onClose,
  email,
}: CustomerLoyaltyProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const getTransactionHistory = useLoyaltyStore((s) => s.getTransactionHistory);
  const transactions = useLoyaltyStore((s) => s.transactions);
  const getCustomerByEmail = useLoyaltyStore((s) => s.getCustomerByEmail);
  const setCurrentCustomer = useLoyaltyStore((s) => s.setCurrentCustomer);

  useEffect(() => {
    const loadCustomer = async () => {
      if (isOpen && email) {
        setIsLoading(true);
        try {
          const customer = await getCustomerByEmail(email);
          if (customer) {
            setCurrentCustomer(customer);
            await getTransactionHistory(customer.id);
          }
        } catch (error) {
          console.error('Erro ao carregar perfil:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadCustomer();
  }, [isOpen, email, getCustomerByEmail, setCurrentCustomer, getTransactionHistory]);

  if (!currentCustomer) {
    return null;
  }

  const pointsValue = (currentCustomer.totalPoints / 100) * 5;
  const nextMilestone = Math.ceil((currentCustomer.totalPoints + 1) / 100) * 100;
  const pointsUntilNext = nextMilestone - currentCustomer.totalPoints;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Meu Perfil de Fidelidade</DialogTitle>
          <DialogDescription>
            Veja seus pontos, histórico de compras e descontos disponíveis
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* Customer Info */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-semibold">
                    {currentCustomer.name || 'Não informado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold text-sm break-all">
                    {currentCustomer.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-semibold">
                    {currentCustomer.phone || 'Não informado'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Loyalty Points */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    Seus Pontos
                  </CardTitle>
                  <Badge variant="default" className="text-lg px-3 py-1">
                    {currentCustomer.totalPoints}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Points Main Display */}
                <div className="bg-white dark:bg-secondary/30 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Saldo em Reais:</span>
                    <span className="text-3xl font-bold text-primary">
                      R$ {pointsValue.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    100 pontos = R$ 5 de desconto
                  </p>
                </div>

                {/* Next Milestone */}
                {currentCustomer.totalPoints < 100 && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Próximo desconto:</p>
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {pointsUntilNext} pontos faltando
                        </p>
                      </div>
                      <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {currentCustomer.totalPurchases}
                    </p>
                    <p className="text-xs text-muted-foreground">Compras</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">
                      R$ {currentCustomer.totalSpent.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total gasto</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            {transactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Histórico Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(transactions ?? []).slice(0, 5).map((transaction) => {
                      if (!transaction?.id) return null;
                      return (
                      <div
                        key={transaction.id}
                        className="flex items-start justify-between p-3 border-l-4"
                        style={{
                          borderColor:
                            transaction.transactionType === 'purchase'
                              ? '#3b82f6'
                              : transaction.transactionType === 'redemption'
                              ? '#ef4444'
                              : '#22c55e',
                        }}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.createdAt), 'dd MMM yyyy HH:mm', {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        {transaction.pointsEarned && (
                          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                            +{transaction.pointsEarned}
                          </Badge>
                        )}
                        {transaction.pointsSpent && (
                          <Badge variant="secondary" className="ml-2 bg-red-100 text-red-800">
                            -{transaction.pointsSpent}
                          </Badge>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {transactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma transação registrada ainda.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={onClose} className="flex-1">
            Fechar
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
