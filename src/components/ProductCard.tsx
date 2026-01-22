import { Product } from '@/data/products';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Leaf, Star, Sparkles } from 'lucide-react';
import { useUIStore } from '@/store/useStore';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { setSelectedProduct, setProductModalOpen } = useUIStore();

  const isUnavailable = !product.isActive;

  const handleClick = () => {
    if (isUnavailable) return;
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const getPrice = () => {
    if (product.price) return product.price;
    if (product.priceSmall && product.priceLarge) {
      return product.priceSmall;
    }
    return 0;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const isPizza = ['promocionais', 'tradicionais', 'premium', 'especiais', 'doces'].includes(product.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={
        "card-product group " +
        (isUnavailable ? "cursor-not-allowed opacity-70" : "cursor-pointer")
      }
      onClick={handleClick}
    >
      {/* Badges */}
      <div className="flex flex-wrap gap-2 p-4 pb-0">
        {isUnavailable && (
          <Badge variant="secondary">Indisponível</Badge>
        )}
        {product.isPopular && (
          <Badge className="badge-popular flex items-center gap-1">
            <Star className="w-3 h-3" />
            Popular
          </Badge>
        )}
        {product.isNew && (
          <Badge className="bg-accent text-accent-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Novo
          </Badge>
        )}
        {product.isVegetarian && (
          <Badge className="badge-promo flex items-center gap-1">
            <Leaf className="w-3 h-3" />
            Vegetariano
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-foreground mb-1 line-clamp-1">
          {product.name}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {product.description || product.ingredients.slice(0, 4).join(', ')}
        </p>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            {isPizza && product.priceSmall && product.priceLarge ? (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">A partir de</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(product.priceSmall)}
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold text-primary">
                {formatPrice(getPrice())}
              </span>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-primary hover:bg-primary/10"
            disabled={isUnavailable}
          >
            {isUnavailable ? "Indisponível" : "Ver detalhes"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

