import { ShoppingCart, Menu, X, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore, useUIStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/hooks/use-theme';
import logoForneiro from '@/assets/logo-forneiro.jpg';

export function Header() {
  const { getItemCount } = useCartStore();
  const { setCartOpen } = useUIStore();
  const settings = useSettingsStore((s) => s.settings);
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
          <nav className="hidden md:flex items-center gap-8">
            <a href="#cardapio" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Cardápio
            </a>
            <div className="text-sm font-medium text-muted-foreground">
              <span className="text-foreground">Entrega:</span> {settings.deliveryTimeMin}–{settings.deliveryTimeMax} min
              <span className="mx-2 text-border">•</span>
              <span className="text-foreground">Retirada:</span> {settings.pickupTimeMin}–{settings.pickupTimeMax} min
            </div>
            <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Admin
            </Link>
          </nav>

          {/* Theme Toggle & Cart Button */}
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>

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
                    <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-primary">
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
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
              <div className="py-4 space-y-2">
                <a 
                  href="#cardapio" 
                  className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Cardápio
                </a>
                <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                  <div>
                    <span className="text-foreground">Entrega:</span> {settings.deliveryTimeMin}–{settings.deliveryTimeMax} min
                  </div>
                  <div>
                    <span className="text-foreground">Retirada:</span> {settings.pickupTimeMin}–{settings.pickupTimeMax} min
                  </div>
                </div>
                <Link 
                  to="/admin" 
                  className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

