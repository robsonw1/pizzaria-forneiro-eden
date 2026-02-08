import { Header } from '@/components/Header';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ProductModal } from '@/components/ProductModal';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Footer } from '@/components/Footer';
import { CustomerLoginModal } from '@/components/CustomerLoginModal';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { useLoyaltyRealtimeSync } from '@/hooks/use-loyalty-realtime-sync';
import { useState, useEffect } from 'react';

const Index = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const restoreRememberedLogin = useLoyaltyStore((s) => s.restoreRememberedLogin);

  // Sincronizar dados de loyalty em tempo real
  useLoyaltyRealtimeSync();

  // Restaurar login lembrado ao inicializar
  useEffect(() => {
    const restoreLogin = async () => {
      const restored = await restoreRememberedLogin();
      if (restored) {
        console.log('✅ Login automático restaurado');
      }
    };

    restoreLogin();
  }, [restoreRememberedLogin]);

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
