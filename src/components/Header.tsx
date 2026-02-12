import { ShoppingCart, Menu, X, Sun, Moon, Truck, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore, useUIStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/hooks/use-theme';
import { CustomerProfileDropdown } from './CustomerProfileDropdown';
import logoForneiro from '@/assets/logo-forneiro.jpg';

interface HeaderProps {
  onLoginClick?: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  const { getItemCount } = useCartStore();
  const { setCartOpen } = useUIStore();
  const settings = useSettingsStore((s) => s.settings);
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const itemCount = getItemCount();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logoForneiro}
              alt="Forneiro Éden Pizzaria"
              className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-primary"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#cardapio"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Cardápio
            </a>
            
            {/* Delivery & Pickup Badges */}
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="gap-2 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-default"
              >
                <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold">
                  {settings.deliveryTimeMin}–{settings.deliveryTimeMax}min
                </span>
              </Badge>
              
              <Badge
                variant="outline"
                className="gap-2 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950 cursor-default"
              >
                <Store className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold">
                  {settings.pickupTimeMin}–{settings.pickupTimeMax}min
                </span>
              </Badge>
            </div>
          </nav>

          {/* Theme Toggle, Login/Profile & Cart Button */}
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>

            {/* Mostrar Profile Dropdown quando logado */}
            {currentCustomer ? (
              <CustomerProfileDropdown />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoginClick}
                className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">Entrar</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-primary">
                      {itemCount}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-border"
            >
              <div className="py-4 space-y-3">
                <a
                  href="#cardapio"
                  className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Cardápio
                </a>
                
                {/* Delivery & Pickup Badges Mobile */}
                <div className="px-4 py-2 flex flex-col gap-2">
                  <Badge
                    variant="outline"
                    className="gap-2 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-default w-fit"
                  >
                    <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold">
                      Entrega {settings.deliveryTimeMin}–{settings.deliveryTimeMax}min
                    </span>
                  </Badge>
                  
                  <Badge
                    variant="outline"
                    className="gap-2 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950 cursor-default w-fit"
                  >
                    <Store className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold">
                      Retirada {settings.pickupTimeMin}–{settings.pickupTimeMax}min
                    </span>
                  </Badge>
                </div>
                {!currentCustomer && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                    onClick={() => {
                      onLoginClick?.();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Entrar
                  </Button>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
