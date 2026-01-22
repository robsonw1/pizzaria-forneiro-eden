import { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  neighborhoodsData,
  Product,
  categoryLabels,
} from '@/data/products';

import { useCatalogStore } from '@/store/useCatalogStore';
import { ProductFormDialog } from '@/components/admin/ProductFormDialog';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const productsById = useCatalogStore((s) => s.productsById);
  const toggleActive = useCatalogStore((s) => s.toggleActive);

  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      navigate('/admin');
    }
  }, [navigate]);

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
  const stats = {
    totalProducts: allProducts.filter(p => p.isActive).length,
    totalOrders: 156,
    revenue: 12450.00,
    avgTicket: 79.80,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-warm flex items-center justify-center">
                  <Flame className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display font-bold">Admin</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
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
          <TabsList className="mb-8">
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
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Produtos Ativos
                  </CardTitle>
                  <Package className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">+5 este mês</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pedidos (Mês)
                  </CardTitle>
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">+12% vs. mês anterior</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Receita (Mês)
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(stats.revenue)}</div>
                  <p className="text-xs text-muted-foreground">+8% vs. mês anterior</p>
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
                  <p className="text-xs text-muted-foreground">+3% vs. mês anterior</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Últimos Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
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
                    {[
                      { id: 'PED-001234', customer: 'João Silva', total: 89.99, status: 'delivered', date: '21/01/2024 19:30' },
                      { id: 'PED-001233', customer: 'Maria Santos', total: 114.99, status: 'delivering', date: '21/01/2024 19:15' },
                      { id: 'PED-001232', customer: 'Pedro Costa', total: 63.99, status: 'preparing', date: '21/01/2024 19:00' },
                    ].map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>{formatPrice(order.total)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'delivering' ? 'secondary' : 'outline'
                            }
                          >
                            {order.status === 'delivered' ? 'Entregue' :
                             order.status === 'delivering' ? 'Em entrega' : 'Preparando'}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
                        {Object.entries(categoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
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
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
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
                              onCheckedChange={() => toggleActive(product.id)}
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
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { id: 'PED-001234', customer: 'João Silva', items: 3, total: 89.99, payment: 'pix', status: 'delivered', date: '21/01/2024 19:30' },
                      { id: 'PED-001233', customer: 'Maria Santos', items: 2, total: 114.99, payment: 'card', status: 'delivering', date: '21/01/2024 19:15' },
                      { id: 'PED-001232', customer: 'Pedro Costa', items: 1, total: 63.99, payment: 'pix', status: 'preparing', date: '21/01/2024 19:00' },
                      { id: 'PED-001231', customer: 'Ana Lima', items: 4, total: 156.99, payment: 'card', status: 'confirmed', date: '21/01/2024 18:45' },
                      { id: 'PED-001230', customer: 'Carlos Souza', items: 2, total: 78.99, payment: 'pix', status: 'pending', date: '21/01/2024 18:30' },
                    ].map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>{order.items} itens</TableCell>
                        <TableCell>{formatPrice(order.total)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {order.payment === 'pix' ? 'PIX' : 'Cartão'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'delivering' ? 'secondary' :
                              order.status === 'preparing' ? 'outline' : 'destructive'
                            }
                          >
                            {order.status === 'delivered' ? 'Entregue' :
                             order.status === 'delivering' ? 'Em entrega' :
                             order.status === 'preparing' ? 'Preparando' :
                             order.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.date}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">Ver</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Neighborhoods Tab */}
          <TabsContent value="neighborhoods">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Bairros e Taxas de Entrega</CardTitle>
                <Button className="gap-2">
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
                    {neighborhoodsData.map((nb) => (
                      <TableRow key={nb.id}>
                        <TableCell className="font-medium">{nb.name}</TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            defaultValue={nb.deliveryFee} 
                            className="w-24"
                            step="0.50"
                          />
                        </TableCell>
                        <TableCell>
                          <Switch checked={nb.isActive} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
                      <Input id="store-name" defaultValue="Forneiro Éden" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="store-phone">Telefone</Label>
                      <Input id="store-phone" defaultValue="(11) 99999-9999" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="store-address">Endereço</Label>
                    <Input id="store-address" defaultValue="Rua das Pizzas, 123 - Centro" className="mt-1" />
                  </div>

                  <Separator />

                  <h4 className="font-semibold">Horário de Funcionamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Segunda a Sexta</Label>
                      <div className="flex gap-2 mt-1">
                        <Input defaultValue="18:00" className="w-24" />
                        <span className="self-center">às</span>
                        <Input defaultValue="23:00" className="w-24" />
                      </div>
                    </div>
                    <div>
                      <Label>Sábado</Label>
                      <div className="flex gap-2 mt-1">
                        <Input defaultValue="17:00" className="w-24" />
                        <span className="self-center">às</span>
                        <Input defaultValue="00:00" className="w-24" />
                      </div>
                    </div>
                    <div>
                      <Label>Domingo</Label>
                      <div className="flex gap-2 mt-1">
                        <Input defaultValue="17:00" className="w-24" />
                        <span className="self-center">às</span>
                        <Input defaultValue="23:00" className="w-24" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delivery-time">Tempo de Entrega (minutos)</Label>
                      <Input id="delivery-time" type="number" defaultValue="45" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="pickup-time">Tempo de Retirada (minutos)</Label>
                      <Input id="pickup-time" type="number" defaultValue="30" className="mt-1" />
                    </div>
                  </div>

                  <Button className="btn-cta">Salvar Alterações</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Senha Atual</Label>
                    <Input id="current-password" type="password" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input id="new-password" type="password" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                    <Input id="confirm-password" type="password" className="mt-1" />
                  </div>
                  <Button variant="outline">Alterar Senha</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
