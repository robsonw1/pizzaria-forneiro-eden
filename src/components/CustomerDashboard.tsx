import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, LogOut, Sparkles, TrendingUp } from 'lucide-react';

interface CustomerDashboardProps {
  onLogout?: () => void;
}

export function CustomerDashboard({ onLogout }: CustomerDashboardProps) {
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const coupons = useLoyaltyStore((s) => s.coupons);
  const transactions = useLoyaltyStore((s) => s.transactions);
  const logout = useLoyaltyStore((s) => s.logoutCustomer);

  if (!currentCustomer) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum cliente conectado</p>
      </div>
    );
  }

  // Determinar tier baseado em pontos
  const getTier = (points: number) => {
    if (points >= 500) return { name: 'Ouro', color: 'bg-yellow-500', icon: '👑' };
    if (points >= 250) return { name: 'Prata', color: 'bg-slate-400', icon: '🥈' };
    return { name: 'Bronze', color: 'bg-amber-700', icon: '🥉' };
  };

  const tier = getTier(currentCustomer.totalPoints);
  const pointsValue = (currentCustomer.totalPoints / 100) * 5; // 100 pontos = R$ 5

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  return (
    <div className="space-y-6">
      {/* Header com dados do cliente */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{currentCustomer.name || 'Cliente'}</h2>
            <p className="text-sm text-muted-foreground">{currentCustomer.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-3xl">{tier.icon}</span>
          <Badge className="text-lg px-3 py-1" variant="secondary">
            {tier.name}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Saldo de Pontos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentCustomer.totalPoints}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ R$ {pointsValue.toFixed(2)} em desconto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Total Gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {currentCustomer.totalSpent.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentCustomer.totalPurchases} compras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Cupons Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {coupons.filter((c) => c.isActive && !c.isUsed).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              cupons ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cupons */}
      {coupons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Seus Cupons
            </CardTitle>
            <CardDescription>
              Cupons gerados automaticamente ao atingir 100 pontos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={`p-4 rounded-lg border-2 border-dashed ${
                    coupon.isUsed
                      ? 'bg-muted opacity-50'
                      : 'bg-primary/5 border-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-lg">
                        {coupon.couponCode}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {coupon.discountPercentage}% de desconto
                      </p>
                    </div>
                    <Badge
                      variant={coupon.isUsed ? 'secondary' : 'default'}
                    >
                      {coupon.isUsed ? 'Usado' : 'Ativo'}
                    </Badge>
                  </div>
                  {coupon.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Expira em:{' '}
                      {new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Transações */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Histórico
            </CardTitle>
            <CardDescription>
              Últimas movimentações de pontos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between pb-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {transaction.transactionType === 'purchase'
                        ? '🛒 Compra'
                        : transaction.transactionType === 'signup_bonus'
                        ? '🎁 Bônus de Cadastro'
                        : '💰 Resgate'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString(
                        'pt-BR'
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-mono font-bold ${
                        transaction.pointsEarned
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.pointsEarned ? '+' : '-'}
                      {transaction.pointsEarned || transaction.pointsSpent}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
