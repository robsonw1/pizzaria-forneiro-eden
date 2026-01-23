import { Header } from '@/components/Header';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ProductModal } from '@/components/ProductModal';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Instagram, Facebook, Phone, MapPin, Clock } from 'lucide-react';
import logoForneiro from '@/assets/logo-forneiro.jpg';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <ProductCatalog />
      </main>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src={logoForneiro} 
                  alt="Forneiro Éden" 
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <span className="font-display text-lg font-bold">Forneiro</span>
                  <span className="font-display text-sm text-primary block -mt-1">Éden</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Pizza artesanal desde 1995. Tradição e sabor em cada fatia.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>(11) 99999-9999</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Rua das Pizzas, 123 - Centro</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Ter-Dom: 18h às 23h</span>
                </div>
              </div>
            </div>

            {/* Social */}
            <div>
              <h4 className="font-semibold mb-4">Redes Sociais</h4>
              <div className="flex gap-3">
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2024 Forneiro Éden. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ProductModal />
      <CartDrawer />
      <CheckoutModal />
    </div>
  );
};

export default Index;
