import { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Flame,
  LogOut,
  Home,
  Pizza,
  ShoppingBag,
  MapPin,
  Settings,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Gift,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Sun,
  Moon,
  CreditCard,
  Bell,
} from 'lucide-react';
import {
  Product,
  categoryLabels,
  Order,
} from '@/data/products';

import { useCatalogStore } from '@/store/useCatalogStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNeighborhoodsStore } from '@/store/useNeighborhoodsStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { ProductFormDialog } from '@/components/admin/ProductFormDialog';
import { OrderDetailsDialog } from '@/components/admin/OrderDetailsDialog';
import { NeighborhoodFormDialog } from '@/components/admin/NeighborhoodFormDialog';
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import { ScheduleSettings } from '@/components/admin/ScheduleSettings';
import { PrintNodeSettings } from '@/components/admin/PrintNodeSettings';
import { NotificationsTab } from '@/components/admin/NotificationsTab';
import { LoyaltySettingsPanel } from '@/components/admin/LoyaltySettingsPanel';
import { FaithfulCustomersAdmin } from '@/components/admin/FaithfulCustomersAdmin';
import { CouponManagementPanel } from '@/components/admin/CouponManagementPanel';
import { PaymentSettingsPanel } from '@/components/admin/PaymentSettingsPanel';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@/hooks/use-theme';
import logoForneiro from '@/assets/logo-forneiro.jpg';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Product store
  const productsById = useCatalogStore((s) => s.productsById);
  const toggleActive = useCatalogStore((s) => s.toggleActive);
  const removeProduct = useCatalogStore((s) => s.removeProduct);

  // Settings store
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const changePassword = useSettingsStore((s) => s.changePassword);

  // Neighborhoods store
  const neighborhoods = useNeighborhoodsStore((s) => s.neighborhoods);
  const toggleNeighborhoodActive = useNeighborhoodsStore((s) => s.toggleActive);
  const updateNeighborhood = useNeighborhoodsStore((s) => s.updateNeighborhood);
  const removeNeighborhood = useNeighborhoodsStore((s) => s.removeNeighborhood);

  // Orders store
  const orders = useOrdersStore((s) => s.orders);
  const syncOrdersFromSupabase = useOrdersStore((s) => s.syncOrdersFromSupabase);
  const updateOrderPrintedAt = useOrdersStore((s) => s.updateOrderPrintedAt);
  const getStats = useOrdersStore((s) => s.getStats);
  const removeOrder = useOrdersStore((s) => s.removeOrder);

  // Local state for settings form
  const [settingsForm, setSettingsForm] = useState(settings);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isNeighborhoodDialogOpen, setIsNeighborhoodDialogOpen] = useState(false);
  const [editingNeighborhood, setEditingNeighborhood] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'product' | 'order' | 'neighborhood';
    id: string;
    name: string;
  }>({ open: false, type: 'product', id: '', name: '' });

  // Date range for stats
  const [dateRange, setDateRange] = useState({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  });

  // Order filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSort, setOrderSort] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      navigate('/admin');
    }
  }, [navigate]);

  // Sincronizar pedidos do Supabase quando o painel carrega
  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    if (!token) return;

    // Sincronizar imediatamente
    console.log('📥 Sincronizando pedidos do Supabase...');
    syncOrdersFromSupabase();

    // Configurar intervalo para sincronizar a cada 3 segundos
    const syncInterval = setInterval(() => {
      syncOrdersFromSupabase();
    }, 3000);

    // Configurar real-time subscription para novos pedidos
    const subscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        console.log('🔄 Mudança em orders detectada:', payload.eventType);
        syncOrdersFromSupabase();
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      clearInterval(syncInterval);
      subscription.unsubscribe();
    };
  }, [syncOrdersFromSupabase]);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const handleLogout = () => {
    localStorage.removeItem('admin-token');
    navigate('/admin');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  // Ativar/Desativar Produto e sincronizar com Supabase
  const handleToggleProductActive = async (productId: string) => {
    const product = productsById[productId];
    if (!product) return;

    try {
      const newActiveState = !product.isActive;
      const dataJson = {
        description: product.description,
        category: product.category,
        price: product.price || undefined,
        price_small: product.priceSmall || null,
        price_large: product.priceLarge || null,
        ingredients: product.ingredients || [],
        image: product.image || undefined,
        is_active: newActiveState,
        is_popular: product.isPopular || false,
        is_vegetarian: product.isVegetarian || false,
        is_customizable: product.isCustomizable || false,
        is_new: product.isNew || false,
      };

      // Atualizar no Supabase PRIMEIRO
      const { error } = await (supabase as any)
        .from('products')
        .update({ data: dataJson })
        .eq('id', productId);

      if (error) {
        console.error('❌ Erro ao sincronizar produto:', error);
        toast.error('Erro ao sincronizar produto');
        return;
      }

      // Atualizar o store localmente também (o realtime vai sincronizar para todos)
      toggleActive(productId);
      console.log(`✅ Produto ${productId} atualizado: isActive = ${newActiveState}`);
    } catch (error) {
      console.error('Erro ao sincronizar ativação do produto:', error);
      toast.error('Erro ao sincronizar produto');
    }
  };

  // Atualizar Bairro e sincronizar com Supabase
  const handleUpdateNeighborhood = async (neighborhoodId: string, updates: any) => {
    updateNeighborhood(neighborhoodId, updates);

    try {
      await (supabase as any)
        .from('neighborhoods')
        .update(updates)
        .eq('id', neighborhoodId);
    } catch (error) {
      console.error('Erro ao sincronizar bairro:', error);
      toast.error('Erro ao sincronizar bairro');
    }
  };

  // Ativar/Desativar Bairro e sincronizar com Supabase
  const handleToggleNeighborhoodActive = async (neighborhoodId: string) => {
    const neighborhood = neighborhoods.find(n => n.id === neighborhoodId);
    if (!neighborhood) return;

    toggleNeighborhoodActive(neighborhoodId);

    try {
      const newActiveState = !neighborhood.isActive;
      await (supabase as any)
        .from('neighborhoods')
        .update({ isActive: newActiveState })
        .eq('id', neighborhoodId);
    } catch (error) {
      console.error('Erro ao sincronizar ativação do bairro:', error);
      toast.error('Erro ao sincronizar bairro');
    }
  };

  // Atualizar horário e sincronizar com Supabase
  const handleScheduleChange = async (day: any, updates: any) => {
    try {
      const newSchedule = {
        ...settingsForm.schedule,
        [day]: { ...settingsForm.schedule[day], ...updates },
      };
      setSettingsForm({ ...settingsForm, schedule: newSchedule });
      await updateSettings({ ...settingsForm, schedule: newSchedule });
    } catch (error) {
      console.error('Erro ao sincronizar horário:', error);
      toast.error('Erro ao salvar horário');
    }
  };

  // Alternar aberto/fechado manualmente e sincronizar com Supabase
  const handleManualOpenToggle = async () => {
    try {
      const newState = !settingsForm.isManuallyOpen;
      setSettingsForm({ ...settingsForm, isManuallyOpen: newState });
      await updateSettings({ ...settingsForm, isManuallyOpen: newState });
    } catch (error) {
      console.error('Erro ao sincronizar status da loja:', error);
      toast.error('Erro ao atualizar status da loja');
    }
  };

  // Determinar status de impressão e renderizar componente apropriado
  const getPrintStatusDisplay = (order: Order) => {
    if (order.printedAt && order.printedAt.trim()) {
      // Verde: Já foi impresso (só se printedAt NÃO é vazio)
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Impresso
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(order.printedAt), "HH:mm", { locale: ptBR })}
          </span>
        </div>
      );
    } else {
      // Vermelho: Não foi impresso
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="destructive">
            Não impresso
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs h-7"
            onClick={() => handlePrintOrder(order)}
          >
            Imprimir
          </Button>
        </div>
      );
    }
  };

  // Imprimir pedido manualmente com RETRY robusto
  const handlePrintOrder = async (order: Order) => {
    let toastId: string | number | undefined;
    
    try {
      console.log('Iniciando impressão manual para:', order.id);
      toastId = toast.loading('Enviando pedido para impressora...');
      
      // Tentar invocar printorder com retry (3x com backoff curto)
      let lastError: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Tentativa ${attempt}/3 de invocar printorder...`);
          const { data, error } = await supabase.functions.invoke('printorder', {
            body: {
              orderId: order.id,
              force: true,
            },
          });

          if (error) {
            console.error(`Tentativa ${attempt}: Erro -`, error.message || error);
            lastError = error;
            if (attempt < 3) {
              const delayMs = 500 * attempt; // Backoff mais curto (500ms, 1s, 1.5s)
              console.log(`Aguardando ${delayMs}ms antes da próxima tentativa...`);
              await new Promise(r => setTimeout(r, delayMs));
              continue;
            }
          } else {
            console.log(`Printorder OK na tentativa ${attempt}:`, data);
            
            // Atualizar printed_at no store IMEDIATAMENTE (otimistic update) com hora local
            const printTime = new Date();
            const printOffset = printTime.getTimezoneOffset() * 60000;
            const localPrintTime = new Date(printTime.getTime() - printOffset);
            const printedAtTime = localPrintTime.toISOString().split('Z')[0];
            await updateOrderPrintedAt(order.id, printedAtTime);
            
            // Fechar loading toast e mostrar sucesso
            if (toastId !== undefined) {
              toast.dismiss(toastId);
            }
            toast.success('Pedido enviado para impressora!');
            
            return; // Sucesso - sair da função
          }
        } catch (err) {
          console.error(`Tentativa ${attempt} capturou erro:`, err);
          lastError = err;
          if (attempt < 3) {
            const delayMs = 500 * attempt;
            console.log(`Aguardando ${delayMs}ms ...`);
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }

      // Se chegou aqui, todas as tentativas falharam
      throw lastError || new Error('Erro ao enviar para impressora');
      
    } catch (error) {
      console.error('Erro ao imprimir pedido:', error);
      
      // Fechar loading toast e mostrar erro
      if (toastId !== undefined) {
        toast.dismiss(toastId);
      }
      toast.error(`Erro ao enviar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const allProducts: Product[] = useMemo(() => Object.values(productsById), [productsById]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts
      .filter((p) => {
        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
        if (statusFilter === 'active' && !p.isActive) return false;
        if (statusFilter === 'inactive' && p.isActive) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [allProducts, categoryFilter, search, statusFilter]);

  // Stats for overview
  const stats = useMemo(() => {
    const s = getStats(dateRange.start, dateRange.end);
    return {
      totalProducts: allProducts.filter(p => p.isActive).length,
      totalOrders: s.totalOrders,
      revenue: s.totalRevenue,
      avgTicket: s.avgTicket,
      deliveredOrders: s.deliveredOrders,
      cancelledOrders: s.cancelledOrders,
    };
  }, [allProducts, getStats, dateRange]);

  // Recent orders for overview
  const recentOrders = useMemo(() => {
    return orders.slice(0, 5);
  }, [orders]);

  // Filtered orders by date range - com log para debug
  const filteredOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      const isInRange = orderDate >= dateRange.start && orderDate <= dateRange.end;
      
      // Apply status filter
      const statusMatch = orderStatusFilter === 'all' || order.status === orderStatusFilter;
      
      return isInRange && statusMatch;
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return orderSort === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    console.log(`📊 Filtragem: ${orders.length} pedidos totais → ${filtered.length} no período ${format(dateRange.start, 'dd/MM')} a ${format(dateRange.end, 'dd/MM')}`);
    
    return filtered;
  }, [orders, dateRange, orderStatusFilter, orderSort]);

  const handleSaveSettings = async () => {
    // Atualizar o store e salvar no Supabase
    await updateSettings(settingsForm);
    
    toast.success('Configurações salvas com sucesso!');
  };

  const handleChangePassword = () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    const result = changePassword(passwordForm.current, passwordForm.new);
    if (result.success) {
      toast.success(result.message);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } else {
      toast.error(result.message);
    }
  };

  const handleDeleteConfirm = async () => {
    switch (deleteDialog.type) {
      case 'product':
        removeProduct(deleteDialog.id);
        // Deletar do Supabase
        const deleteProductsQuery = (supabase as any)
          .from('products')
          .delete()
          .eq('id', deleteDialog.id);
        await deleteProductsQuery;
        toast.success('Produto excluído com sucesso!');
        break;
      case 'order':
        removeOrder(deleteDialog.id);
        toast.success('Pedido excluído com sucesso!');
        break;
      case 'neighborhood':
        removeNeighborhood(deleteDialog.id);
        // Deletar do Supabase
        const deleteNeighborhoodsQuery = (supabase as any)
          .from('neighborhoods')
          .delete()
          .eq('id', deleteDialog.id);
        await deleteNeighborhoodsQuery;
        toast.success('Bairro excluído com sucesso!');
        break;
    }
    setDeleteDialog({ ...deleteDialog, open: false });
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDialogOpen(true);
  };

  const getStatusBadge = (status: Order['status'] | undefined) => {
    if (!status) return <Badge variant="outline">Desconhecido</Badge>;
    
    const statusConfig: Record<string, { label: string; variant: any }> = {
      pending: { label: 'Pendente', variant: 'destructive' },
      confirmed: { label: 'Confirmado', variant: 'outline' },
      preparing: { label: 'Preparando', variant: 'outline' },
      delivering: { label: 'Em Entrega', variant: 'secondary' },
      delivered: { label: 'Entregue', variant: 'default' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: String(status), variant: 'outline' };
    // @ts-ignore - Ensure variant is valid
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src={logoForneiro} 
                  alt="Forneiro Éden" 
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-primary"
                />
                <span className="font-display font-bold text-lg">Admin</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Home className="w-4 h-4" />
                  Ver Loja
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-8">
          Painel Administrativo
        </h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 flex-wrap">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Pizza className="w-4 h-4" />
              Cardápio
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="neighborhoods" className="gap-2">
              <MapPin className="w-4 h-4" />
              Bairros
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-2">
              <Users className="w-4 h-4" />
              Clientes Fiéis
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-2">
              <Gift className="w-4 h-4" />
              Cupons
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notificações
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              <DateRangeFilter onRangeChange={(start, end) => setDateRange({ start, end })} />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Produtos Ativos
                    </CardTitle>
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pedidos
                    </CardTitle>
                    <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalOrders}</div>
                    <div className="flex gap-2 text-xs mt-1">
                      <span className="text-green-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> {stats.deliveredOrders}
                      </span>
                      <span className="text-red-500 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> {stats.cancelledOrders}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Receita
                    </CardTitle>
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(stats.revenue)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Ticket Médio
                    </CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(stats.avgTicket)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Últimos Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum pedido registrado ainda.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(recentOrders ?? []).filter(Boolean).map((order: any) => {
                          if (!order?.id) return null;
                          return (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.id}</TableCell>
                            <TableCell>{order.customer?.name || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold">{formatPrice(order.total || 0)}</span>
                                {order.pointsRedeemed && order.pointsRedeemed > 0 && (
                                  <span className="text-xs text-green-600 font-medium">
                                    -{order.pointsRedeemed} pontos
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>
                              {order.createdAt ? format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gerenciar Cardápio</CardTitle>
                <Button
                  className="gap-2"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsNewProductOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Novo Produto
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                  <div className="lg:col-span-1">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nome ou descrição..."
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {Object.entries(categoryLabels ?? {}).filter(Boolean).map(([key, label]: any) => {
                          if (!key) return null;
                          return (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="lg:col-span-1">
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Indisponíveis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Preço Broto</TableHead>
                        <TableHead>Preço Grande</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(filteredProducts ?? []).filter(Boolean).map((product: any) => {
                        if (!product?.id) return null;
                        return (
                        <TableRow key={product.id} className={!product?.isActive ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {categoryLabels[product.category] ?? product.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {product.priceSmall ? formatPrice(product.priceSmall) : '-'}
                          </TableCell>
                          <TableCell>
                            {product.priceLarge ? formatPrice(product.priceLarge) : 
                             product.price ? formatPrice(product.price) : '-'}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={product.isActive}
                              onCheckedChange={() => handleToggleProductActive(product.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsNewProductOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  type: 'product',
                                  id: product.id,
                                  name: product.name,
                                })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>

                <ProductFormDialog
                  open={isNewProductOpen}
                  onOpenChange={(open) => {
                    setIsNewProductOpen(open);
                    if (!open) setEditingProduct(null);
                  }}
                  product={editingProduct}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <DateRangeFilter onRangeChange={(start, end) => setDateRange({ start, end })} />
                </div>

                {/* Order Filter and Sort Controls */}
                <div className="mb-4 flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Filtrar por Status</label>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                      <option value="all">Todos os Status</option>
                      <option value="pending">Pendente</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="preparing">Preparando</option>
                      <option value="delivering">Em Entrega</option>
                      <option value="delivered">Entregue</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Ordenar por Data</label>
                    <select
                      value={orderSort}
                      onChange={(e) => setOrderSort(e.target.value as 'newest' | 'oldest')}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                      <option value="newest">Mais Recentes</option>
                      <option value="oldest">Mais Antigas</option>
                    </select>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum pedido encontrado no período selecionado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Impressão</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(filteredOrders || []).filter(Boolean).map((order) => {
                        if (!order || !order.id) return null;
                        return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id || 'N/A'}</TableCell>
                          <TableCell>{order.customer?.name || 'Desconhecido'}</TableCell>
                          <TableCell>{order.items?.length || 0} itens</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">{formatPrice(order.total || 0)}</span>
                              {order.pointsRedeemed && order.pointsRedeemed > 0 && (
                                <span className="text-xs text-green-600 font-medium">
                                  -{order.pointsRedeemed} pontos
                                </span>
                              )}
                              {order.appliedCoupon && order.couponDiscount && order.couponDiscount > 0 && (
                                <span className="text-xs text-purple-600 font-medium">
                                  -{formatPrice(order.couponDiscount)} ({order.appliedCoupon})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            {getPrintStatusDisplay(order)}
                          </TableCell>
                          <TableCell>
                            {order.createdAt ? format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewOrder(order)}
                              >
                                Ver
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  type: 'order',
                                  id: order.id,
                                  name: order.id,
                                })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <OrderDetailsDialog
              open={isOrderDialogOpen}
              onOpenChange={setIsOrderDialogOpen}
              order={selectedOrder}
            />
          </TabsContent>

          {/* Neighborhoods Tab */}
          <TabsContent value="neighborhoods">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Bairros e Taxas de Entrega</CardTitle>
                <Button 
                  className="gap-2"
                  onClick={() => {
                    setEditingNeighborhood(null);
                    setIsNeighborhoodDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Novo Bairro
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bairro</TableHead>
                      <TableHead>Taxa de Entrega</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(neighborhoods ?? []).filter(Boolean).map((nb: any) => {
                      if (!nb?.id) return null;
                      return (
                      <TableRow key={nb.id} className={!nb?.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{nb.name}</TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={nb.deliveryFee} 
                            className="w-24"
                            step="0.50"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value) && value >= 0) {
                                handleUpdateNeighborhood(nb.id, { deliveryFee: value });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={nb.isActive} 
                            onCheckedChange={() => handleToggleNeighborhoodActive(nb.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setEditingNeighborhood(nb);
                                setIsNeighborhoodDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => setDeleteDialog({
                                open: true,
                                type: 'neighborhood',
                                id: nb.id,
                                name: nb.name,
                              })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <NeighborhoodFormDialog
              open={isNeighborhoodDialogOpen}
              onOpenChange={setIsNeighborhoodDialogOpen}
              neighborhood={editingNeighborhood}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Estabelecimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="store-name">Nome da Pizzaria</Label>
                      <Input 
                        id="store-name" 
                        value={settingsForm.name}
                        onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="store-phone">Telefone</Label>
                      <Input 
                        id="store-phone" 
                        value={settingsForm.phone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="store-address">Endereço</Label>
                    <Input 
                      id="store-address" 
                      value={settingsForm.address}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      className="mt-1" 
                    />
                  </div>

                  <div>
                    <Label htmlFor="store-slogan">Slogan / Subtítulo</Label>
                    <Input 
                      id="store-slogan" 
                      value={settingsForm.slogan || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, slogan: e.target.value })}
                      placeholder="Ex: A Pizza mais recheada da cidade 🇮🇹"
                      className="mt-1" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Aparece na página inicial e no rodapé da área do cliente
                    </p>
                  </div>

                  <Separator />

                  <ScheduleSettings 
                    onScheduleChange={handleScheduleChange}
                    onManualOpenToggle={handleManualOpenToggle}
                  />

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Tempo de Entrega (min–max)</Label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          type="number"
                          value={settingsForm.deliveryTimeMin}
                          onChange={(e) => setSettingsForm({ ...settingsForm, deliveryTimeMin: parseInt(e.target.value) || 0 })}
                          className="w-20" 
                        />
                        <span className="self-center">–</span>
                        <Input 
                          type="number"
                          value={settingsForm.deliveryTimeMax}
                          onChange={(e) => setSettingsForm({ ...settingsForm, deliveryTimeMax: parseInt(e.target.value) || 0 })}
                          className="w-20" 
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Tempo de Retirada (min–max)</Label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          type="number"
                          value={settingsForm.pickupTimeMin}
                          onChange={(e) => setSettingsForm({ ...settingsForm, pickupTimeMin: parseInt(e.target.value) || 0 })}
                          className="w-20" 
                        />
                        <span className="self-center">–</span>
                        <Input 
                          type="number"
                          value={settingsForm.pickupTimeMax}
                          onChange={(e) => setSettingsForm({ ...settingsForm, pickupTimeMax: parseInt(e.target.value) || 0 })}
                          className="w-20" 
                        />
                      </div>
                    </div>
                  </div>

                  <Button className="btn-cta" onClick={handleSaveSettings}>
                    Salvar Alterações
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Senha Atual</Label>
                    <Input 
                      id="current-password" 
                      type="password" 
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      className="mt-1" 
                    />
                  </div>
                  <Button variant="outline" onClick={handleChangePassword}>
                    Alterar Senha
                  </Button>
                </CardContent>
              </Card>

              <LoyaltySettingsPanel />

              <PrintNodeSettings />
            </div>
          </TabsContent>

          {/* Customers Loyalty Tab */}
          <TabsContent value="customers">
            <FaithfulCustomersAdmin />
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons">
            <CouponManagementPanel />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <PaymentSettingsPanel />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <NotificationsTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title={`Excluir ${deleteDialog.type === 'product' ? 'Produto' : deleteDialog.type === 'order' ? 'Pedido' : 'Bairro'}`}
        description={`Tem certeza que deseja excluir "${deleteDialog.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default AdminDashboard;
