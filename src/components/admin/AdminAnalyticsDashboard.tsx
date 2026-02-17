import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Pizza,
  Target,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalyticsData {
  totalRevenueMtd: number;
  totalRevenueLastMonth: number;
  totalOrders: number;
  newCustomers: number;
  repeatCustomers: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  weeklyData: Array<{ date: string; orders: number; revenue: number }>;
}

export const AdminAnalyticsDashboard = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current month start and end
        const now = new Date();
        const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        const monthEnd = endOfDay(now);

        // Get last month dates
        const lastMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        const lastMonthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));

        // Get last 7 days data
        const sevenDaysAgo = subDays(startOfDay(now), 6);

        // Fetch current month orders
        const { data: mtdOrders, error: mtdError } = await (supabase as any)
          .from('orders')
          .select('id, total, created_at, customer_id, status')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())
          .neq('status', 'cancelled');

        if (mtdError) throw mtdError;

        // Fetch last month orders
        const { data: lastMonthOrders, error: lastMonthError } = await (supabase as any)
          .from('orders')
          .select('total')
          .gte('created_at', lastMonthStart.toISOString())
          .lte('created_at', lastMonthEnd.toISOString())
          .neq('status', 'cancelled');

        if (lastMonthError) throw lastMonthError;

        // Fetch top products
        const { data: topProductsRaw, error: productsError } = await (supabase as any)
          .from('order_items')
          .select('product_name, quantity, total_price, created_at')
          .gte('created_at', monthStart.toISOString())
          .order('quantity', { ascending: false })
          .limit(5);

        if (productsError) throw productsError;

        // Fetch customers for MTD
        const uniqueCustomersThisMonth = new Set(
          mtdOrders?.map((o: any) => o.customer_id) || []
        );

        // Fetch customers for last month
        const { data: lastMonthOrdersList, error: lastMonthListError } = await (supabase as any)
          .from('orders')
          .select('customer_id')
          .gte('created_at', lastMonthStart.toISOString())
          .lte('created_at', lastMonthEnd.toISOString());

        if (lastMonthListError) throw lastMonthListError;

        const uniqueCustomersLastMonth = new Set(
          lastMonthOrdersList?.map((o: any) => o.customer_id) || []
        );

        // Count repeat customers (those who appear in both months)
        const repeatCustomersCount = Array.from(uniqueCustomersThisMonth).filter(id =>
          uniqueCustomersLastMonth.has(id)
        ).length;

        // Group top products
        const productMap = new Map<
          string,
          { name: string; quantity: number; revenue: number }
        >();

        (topProductsRaw || []).forEach((item: any) => {
          const existing = productMap.get(item.product_name);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.total_price;
          } else {
            productMap.set(item.product_name, {
              name: item.product_name,
              quantity: item.quantity,
              revenue: item.total_price,
            });
          }
        });

        const topProducts = Array.from(productMap.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 3);

        // Calculate weekly data
        const weeklyMap = new Map<string, { orders: number; revenue: number }>();

        for (let i = 6; i >= 0; i--) {
          const date = subDays(startOfDay(now), i);
          const dateStr = format(date, 'dd/MM', { locale: ptBR });
          weeklyMap.set(dateStr, { orders: 0, revenue: 0 });
        }

        (mtdOrders || []).forEach((order: any) => {
          const orderDate = new Date(order.created_at);
          if (orderDate >= sevenDaysAgo && orderDate <= now) {
            const dateStr = format(orderDate, 'dd/MM', { locale: ptBR });
            const existing = weeklyMap.get(dateStr);
            if (existing) {
              existing.orders++;
              existing.revenue += order.total;
            }
          }
        });

        const weeklyData = Array.from(weeklyMap.entries()).map(([date, data]) => ({
          date,
          orders: data.orders,
          revenue: data.revenue,
        }));

        // Calculate totals
        const totalRevenueMtd = (mtdOrders || []).reduce((sum: number, o: any) => sum + o.total, 0);
        const totalRevenueLastMonth = (lastMonthOrders || []).reduce(
          (sum: number, o: any) => sum + o.total,
          0
        );

        setData({
          totalRevenueMtd,
          totalRevenueLastMonth,
          totalOrders: mtdOrders?.length || 0,
          newCustomers: uniqueCustomersThisMonth.size,
          repeatCustomers: repeatCustomersCount,
          topProducts,
          weeklyData,
        });
      } catch (err: any) {
        console.error('Analytics fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Refresh analytics every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-32 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="text-red-800 pt-6">Erro ao carregar analytics: {error}</CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const growthPercentage =
    data.totalRevenueLastMonth > 0
      ? ((data.totalRevenueMtd - data.totalRevenueLastMonth) / data.totalRevenueLastMonth) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas Este Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  R$ {data.totalRevenueMtd.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
                <Badge
                  variant={growthPercentage >= 0 ? 'default' : 'destructive'}
                  className="gap-1"
                >
                  {growthPercentage >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(growthPercentage).toFixed(0)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Mês passado: R${data.totalRevenueLastMonth.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos Este Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Ticket médio: R${(data.totalRevenueMtd / (data.totalOrders || 1)).toLocaleString('pt-BR', {
                maximumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>

        {/* New Customers Card */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Novos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.newCustomers}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Repetição: {data.repeatCustomers} clientes
            </p>
          </CardContent>
        </Card>

        {/* Repeat Rate Card */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Repetição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.newCustomers > 0
                ? ((data.repeatCustomers / data.newCustomers) * 100).toFixed(0)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              De {data.newCustomers} clientes únicos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Desempenho Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.weeklyData.map((day) => (
              <div key={day.date} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{day.date}</span>
                  <span className="text-muted-foreground">
                    {day.orders} pedidos • R$ {day.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <Progress
                  value={
                    data.weeklyData.length > 0
                      ? (day.orders / Math.max(...data.weeklyData.map((d) => d.orders || 1))) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pizza className="w-5 h-5" />
            Produtos Top 3 Este Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topProducts.map((product, idx) => (
              <div key={product.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-lg font-semibold">
                      #{idx + 1}
                    </Badge>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} vendas • R${product.revenue.toLocaleString('pt-BR', {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <Progress
                  value={
                    data.topProducts.length > 0
                      ? (product.quantity / Math.max(...data.topProducts.map((p) => p.quantity || 1))) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

