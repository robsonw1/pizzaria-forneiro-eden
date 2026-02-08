import { Header } from '@/components/Header';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ProductModal } from '@/components/ProductModal';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Footer } from '@/components/Footer';
import { CustomerLoginModal } from '@/components/CustomerLoginModal';
import { CustomerDashboard } from '@/components/CustomerDashboard';
import { useLoyaltyStore } from '@/store/useLoyaltyStore';
import { useState } from 'react';

const Index = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const currentCustomer = useLoyaltyStore((s) => s.currentCustomer);
  const logout = useLoyaltyStore((s) => s.logoutCustomer);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />
      
      <main className="flex-1">
        {currentCustomer ? (
          <div className="container mx-auto px-4 py-8">
            <CustomerDashboard onLogout={async () => {
              await logout();
            }} />
          </div>
        ) : (
          <ProductCatalog />
        )}
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
