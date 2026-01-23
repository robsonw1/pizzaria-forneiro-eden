import { Header } from '@/components/Header';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ProductModal } from '@/components/ProductModal';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Instagram, Facebook, Phone, MapPin, Clock } from 'lucide-react';
import logoForneiro from '@/assets/logo-forneiro.jpg';
import { useSettingsStore, WeekSchedule } from '@/store/useSettingsStore';

const dayLabels: Record<keyof WeekSchedule, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom',
};

const Index = () => {
  const settings = useSettingsStore((s) => s.settings);

  // Build schedule string from settings
  const buildScheduleString = () => {
    const schedule = settings.schedule;
    const openDays: string[] = [];
    const dayOrder: (keyof WeekSchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    dayOrder.forEach(day => {
      if (schedule[day].isOpen) {
        openDays.push(`${dayLabels[day]}: ${schedule[day].openTime} às ${schedule[day].closeTime}`);
      }
    });
    
    if (openDays.length === 0) return 'Fechado';
    if (openDays.length <= 2) return openDays.join(' | ');
    return `${openDays.slice(0, 2).join(' | ')} ...`;
  };

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
                  alt={settings.name} 
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <span className="font-display text-lg font-bold">{settings.name.split(' ')[0] || 'Forneiro'}</span>
                  <span className="font-display text-sm text-primary block -mt-1">{settings.name.split(' ').slice(1).join(' ') || 'Éden'}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {settings.slogan}
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{settings.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{settings.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{buildScheduleString()}</span>
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
            <p>© 2024 {settings.name}. Todos os direitos reservados.</p>
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
