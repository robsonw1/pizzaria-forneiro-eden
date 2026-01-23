import { Clock, MapPin, Phone } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

export function HeroSection() {
  const settings = useSettingsStore((s) => s.settings);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-secondary/50 to-background py-12 md:py-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-accent blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <span className="text-xl">🇮🇹</span>
            <span className="text-sm font-medium">{settings.slogan}</span>
          </div>

          {/* Main Title */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4">
            Sabor que vem do
            <span className="text-gradient-warm block mt-2">forno para sua mesa</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {settings.slogan} Ingredientes frescos, massa artesanal 
            e o carinho de uma receita passada por gerações.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href="#cardapio"
              className="w-full sm:w-auto px-8 py-4 rounded-xl btn-cta text-center"
            >
              Ver Cardápio
            </a>
            <a
              href="#combos"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors text-center"
            >
              Combos Especiais
            </a>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Entrega em</p>
                <p className="font-semibold text-foreground">{settings.deliveryTimeMin}-{settings.deliveryTimeMax} min</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Atendemos</p>
                <p className="font-semibold text-foreground">20+ bairros</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="font-semibold text-foreground">{settings.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
