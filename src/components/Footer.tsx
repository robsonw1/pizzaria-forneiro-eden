import { Instagram, Facebook, Phone, MapPin, Clock, LogIn, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore, WeekSchedule } from '@/store/useSettingsStore';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { CustomerProfileDropdown } from '@/components/CustomerProfileDropdown';
import logoForneiro from '@/assets/logo-forneiro.jpg';
import { Link } from 'react-router-dom';

interface FooterProps {
  onLoginClick?: () => void;
  onAdminClick?: () => void;
}

const dayLabels: Record<keyof WeekSchedule, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom',
};

export function Footer({ onLoginClick, onAdminClick }: FooterProps) {
  const settings = useSettingsStore((s) => s.settings);
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);

  const buildScheduleString = () => {
    const schedule = settings.schedule;
    const openDays: string[] = [];
    const dayOrder: (keyof WeekSchedule)[] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    dayOrder.forEach((day) => {
      if (schedule[day].isOpen) {
        openDays.push(
          `${dayLabels[day]}: ${schedule[day].openTime} às ${schedule[day].closeTime}`
        );
      }
    });

    if (openDays.length === 0) return 'Fechado';
    if (openDays.length <= 2) return openDays.join(' | ');
    return `${openDays.slice(0, 2).join(' | ')} ...`;
  };

  return (
    <footer className="bg-card border-t py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src={logoForneiro}
                alt={settings.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <span className="font-display text-lg font-bold">
                  {settings.name.split(' ')[0] || 'Forneiro'}
                </span>
                <span className="font-display text-sm text-primary block -mt-1">
                  {settings.name.split(' ').slice(1).join(' ') || 'Éden'}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{settings.slogan}</p>
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

          {/* Social & Actions */}
          <div>
            <h4 className="font-semibold mb-4">Redes Sociais</h4>
            <div className="flex gap-3 mb-6">
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

        {/* Actions Row */}
        <div className="border-t pt-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {currentCustomer ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Minha Conta:</span>
                  <CustomerProfileDropdown />
                </div>
              </>
            ) : (
              <Button
                onClick={onLoginClick}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <LogIn className="w-4 h-4" />
                Entrar na Minha Conta
              </Button>
            )}
            <Button
              onClick={onAdminClick}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto"
              asChild
            >
              <Link to="/admin" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Área Admin
              </Link>
            </Button>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 {settings.name}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
