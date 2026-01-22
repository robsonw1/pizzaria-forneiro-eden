import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCartStore, useUIStore } from '@/store/useStore';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import pizzaImage from '@/assets/pizza-hero.jpg';

export function CartDrawer() {
  const { isCartOpen, setCartOpen, setCheckoutOpen } = useUIStore();
  const { items, removeItem, updateQuantity, getSubtotal, clearCart } = useCartStore();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleCheckout = () => {
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const subtotal = getSubtotal();

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-xl flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Seu Carrinho
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
              <ShoppingBag className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">
              Carrinho vazio
            </h3>
            <p className="text-muted-foreground mb-6">
              Adicione itens deliciosos ao seu carrinho
            </p>
            <Button onClick={() => setCartOpen(false)}>
              Ver cardápio
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-secondary/50 rounded-xl p-4"
                    >
                      <div className="flex gap-3">
                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                          <img 
                            src={pizzaImage} 
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-sm line-clamp-1">
                                {item.product.name}
                                {item.isHalfHalf && item.secondHalf && (
                                  <span className="text-muted-foreground">
                                    {' '}/ {item.secondHalf.name}
                                  </span>
                                )}
                              </h4>
                              
                              {/* Size */}
                              {item.size && (
                                <span className="text-xs text-muted-foreground capitalize">
                                  {item.size}
                                </span>
                              )}
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Customizations */}
                          <div className="mt-1 space-y-0.5">
                            {item.border && (
                              <p className="text-xs text-muted-foreground">
                                Borda: {item.border.name}
                              </p>
                            )}
                            {item.extras && item.extras.length > 0 && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                + {item.extras.map(e => e.name).join(', ')}
                              </p>
                            )}
                            {/* Show combo pizza flavors */}
                            {item.comboPizzaFlavors && item.comboPizzaFlavors.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {item.comboPizzaFlavors.length === 1 ? (
                                  <span>🍕 Sabor: {item.comboPizzaFlavors[0].name}</span>
                                ) : (
                                  <>
                                    <div>🍕 Pizza 1: {item.comboPizzaFlavors[0].name}</div>
                                    <div>🍕 Pizza 2: {item.comboPizzaFlavors[1].name}</div>
                                  </>
                                )}
                              </div>
                            )}
                            {/* Show custom ingredients for Moda do Cliente */}
                            {item.customIngredients && item.customIngredients.length > 0 && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                🧑‍🍳 {item.customIngredients.join(', ')}
                              </p>
                            )}
                            {item.drink && (
                              <p className="text-xs text-muted-foreground">
                                🥤 {item.drink.name} {item.isDrinkFree && <span className="text-green-600">(grátis)</span>}
                              </p>
                            )}
                          </div>

                          {/* Quantity and Price */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            <span className="font-bold text-primary">
                              {formatPrice(item.totalPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Taxa de entrega calculada no checkout
              </p>

              <Button 
                className="w-full btn-cta gap-2" 
                size="lg"
                onClick={handleCheckout}
              >
                Finalizar pedido
                <ArrowRight className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={clearCart}
              >
                Limpar carrinho
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
