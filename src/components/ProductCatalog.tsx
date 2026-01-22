import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductCard } from '@/components/ProductCard';
import { Gift, Tag, Pizza, Crown, Star, Cake, GlassWater } from 'lucide-react';
import { useCatalogStore } from '@/store/useCatalogStore';

const categories = [
  { id: 'combos', label: 'Combos', icon: Gift },
  { id: 'promocionais', label: 'Promocionais', icon: Tag },
  { id: 'tradicionais', label: 'Tradicionais', icon: Pizza },
  { id: 'premium', label: 'Premium', icon: Crown },
  { id: 'especiais', label: 'Especiais', icon: Star },
  { id: 'doces', label: 'Doces', icon: Cake },
  { id: 'bebidas', label: 'Bebidas', icon: GlassWater },
] as const;

export function ProductCatalog() {
  const [activeTab, setActiveTab] = useState('combos');
  const productsById = useCatalogStore((s) => s.productsById);

  const products = useMemo(() => Object.values(productsById), [productsById]);
  const getByCategory = useMemo(() => {
    return (categoryId: string) =>
      products
        .filter((p) => p.category === (categoryId as any))
        .sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
  }, [products]);

  return (
    <section id="cardapio" className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Nosso Cardápio
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Escolha entre mais de 100 sabores únicos, preparados com ingredientes 
            frescos e muito carinho.
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 mb-8">
            <TabsList className="inline-flex h-auto p-1 bg-secondary/50 rounded-xl gap-1 min-w-max">
              {categories.map((category) => {
                const Icon = category.icon;
                const products = getByCategory(category.id as any);
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{category.label}</span>
                    <span className="ml-1 text-xs opacity-70">
                      ({products.filter(p => p.isActive).length})
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Products Grid */}
          {categories.map((category) => {
            const products = getByCategory(category.id as any);
            const activeProducts = products.filter((p) => p.isActive);
            return (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {activeProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>

                {activeProducts.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Nenhum produto disponível nesta categoria.
                    </p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}

