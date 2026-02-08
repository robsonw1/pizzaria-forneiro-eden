import { Header } from '@/components/Header';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ProductModal } from '@/components/ProductModal';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Footer } from '@/components/Footer';
import { CustomerLoginModal } from '@/components/CustomerLoginModal';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { useLoyaltyRealtimeSync } from '@/hooks/use-loyalty-realtime-sync';
import { useState } from 'react';

const Index = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);

  // Sincronizar dados de loyalty em tempo real
  useLoyaltyRealtimeSync();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />

      <main className="flex-1">
        <ProductCatalog />
      </main>

      {/* Footer */}
      <Footer
        onLoginClick={() => setIsLoginModalOpen(true)}
        onAdminClick={() => {}}
      />

      {/* Modals & Drawers */}
      <CustomerLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => setIsLoginModalOpen(false)}
      />
      <ProductModal />
      <CartDrawer />
      <CheckoutModal />
    </div>
  );
};

export default Index;
