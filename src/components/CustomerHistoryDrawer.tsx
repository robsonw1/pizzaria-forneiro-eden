import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TrendingUp } from 'lucide-react';

interface CustomerHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerHistoryDrawer({
  isOpen,
  onClose,
}: CustomerHistoryDrawerProps) {
  const transactions = useLoyaltyStore((s) => s.transactions);

  const getTransactionEmoji = (type: string) => {
    switch (type) {
      case 'purchase':
        return '🛒';
      case 'signup_bonus':
        return '🎁';
      case 'redemption':
        return '💰';
      default:
        return '📌';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'Compra';
      case 'signup_bonus':
        return 'Bônus de Cadastro';
      case 'redemption':
        return 'Resgate';
      default:
        return 'Movimentação';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Histórico de Pontos
          </SheetTitle>
          <SheetDescription>
            Últimas movimentações de pontos da sua conta
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhuma movimentação registrada
              </p>
            </div>
          ) : (
            (transactions ?? []).map((transaction) => 
              !transaction?.id ? null : (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <span className="text-lg">
                      {getTransactionEmoji(transaction.transactionType)}
                    </span>
                    {getTransactionLabel(transaction.transactionType)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(transaction.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {transaction.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {transaction.description}
                    </p>
                  )}
                </div>
                <div
                  className={`text-right font-bold text-sm font-mono ${
                    transaction.pointsEarned
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {transaction.pointsEarned ? '+' : '-'}
                  {transaction.pointsEarned || transaction.pointsSpent}
                </div>
              </div>
            )
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
