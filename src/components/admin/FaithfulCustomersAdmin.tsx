import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Gift, Users, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FaithfulCustomer {
  id: string;
  email: string;
  name: string;
  totalPoints: number;
  totalSpent: number;
  totalPurchases: number;
  isRegistered: boolean;
}

export function FaithfulCustomersAdmin() {
  const [customers, setCustomers] = useState<FaithfulCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRegisteredCustomers: 0,
    totalPointsIssued: 0,
    averageSpentPerCustomer: 0,
    topCustomer: null as FaithfulCustomer | null,
  });

  useEffect(() => {
    loadFaithfulCustomers();
    // Real-time subscription
    const subscription = supabase
      .channel('public:customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        console.log('🔄 Mudança em customers detectada');
        loadFaithfulCustomers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadFaithfulCustomers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('is_registered', true)
        .order('total_points', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Erro ao buscar clientes fiéis:', error);
        setIsLoading(false);
        return;
      }

      const mappedCustomers = data.map((c: any) => ({
        id: c.id,
        email: c.email,
        name: c.name || 'Sem nome',
        totalPoints: c.total_points || 0,
        totalSpent: c.total_spent || 0,
        totalPurchases: c.total_purchases || 0,
        isRegistered: c.is_registered,
      }));

      setCustomers(mappedCustomers);

      // Calcular estatísticas
      const totalRegistered = mappedCustomers.length;
      const totalPoints = mappedCustomers.reduce((sum: number, c: any) => sum + c.totalPoints, 0);
      const totalSpent = mappedCustomers.reduce((sum: number, c: any) => sum + c.totalSpent, 0);
      const avgSpent = totalRegistered > 0 ? totalSpent / totalRegistered : 0;
      const topCustomer = mappedCustomers[0] || null;

      setStats({
        totalRegisteredCustomers: totalRegistered,
        totalPointsIssued: totalPoints,
        averageSpentPerCustomer: avgSpent,
        topCustomer,
      });
    } catch (error) {
      console.error('Erro em loadFaithfulCustomers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getTierBadge = (totalSpent: number) => {
    if (totalSpent < 500) return { label: 'Bronze', color: 'bg-amber-100 text-amber-800' };
    if (totalSpent < 2000) return { label: 'Prata', color: 'bg-slate-100 text-slate-800' };
    return { label: 'Ouro', color: 'bg-yellow-100 text-yellow-800' };
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Clientes Registrados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Registrados
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalRegisteredCustomers}</div>
            )}
          </CardContent>
        </Card>

        {/* Total Pontos Emitidos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pontos
            </CardTitle>
            <Gift className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalPointsIssued}</div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {formatPrice(stats.averageSpentPerCustomer)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cliente Topo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Cliente
            </CardTitle>
            <Award className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : stats.topCustomer ? (
              <div>
                <p className="text-2xl font-bold">{stats.topCustomer.totalPoints}</p>
                <p className="text-xs text-muted-foreground">{stats.topCustomer.name}</p>
              </div>
            ) : (
              <div className="text-muted-foreground">Nenhum</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Clientes Fiéis */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Mais Fiéis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cliente registrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Compras</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead className="text-right">Pontos</TableHead>
                    <TableHead className="text-right">Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => {
                    const tier = getTierBadge(customer.totalSpent);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell className="text-sm">{customer.email}</TableCell>
                        <TableCell className="text-right">{customer.totalPurchases}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPrice(customer.totalSpent)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{customer.totalPoints}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={tier.color}>{tier.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
