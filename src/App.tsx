import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Index from "./pages/Index.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// Update meta tags once when app loads
if (typeof document !== 'undefined') {
  document.title = "Pizzaria Forneiro Eden - Cardápio Digital";
  
  const updateMeta = (name: string, content: string, isProperty = false) => {
    let el = document.querySelector(
      isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`
    );
    if (!el) {
      el = document.createElement("meta");
      isProperty ? el.setAttribute("property", name) : el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  updateMeta("description", "Cardápio digital da Pizzaria Forneiro Eden. Peça sua pizza deliciosa online.");
  updateMeta("og:title", "Pizzaria Forneiro Eden", true);
  updateMeta("og:description", "Cardápio digital - Peça sua pizza deliciosa agora!", true);
  updateMeta("og:type", "website", true);
  updateMeta("og:image", "/logo-forneiro.jpg", true);
  updateMeta("twitter:title", "Pizzaria Forneiro Eden");
  updateMeta("twitter:description", "Cardápio digital - Peça sua pizza deliciosa agora!");
  updateMeta("twitter:image", "/logo-forneiro.jpg");
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
