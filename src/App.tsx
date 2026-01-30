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

const App = () => {
  useEffect(() => {
    // Update meta tags for social media preview
    document.title = "Pizzaria Forneiro Eden - Cardápio Digital";
    
    const updateMetaTag = (name: string, content: string, isProperty: boolean = false) => {
      let element = document.querySelector(
        isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`
      );
      if (!element) {
        element = document.createElement("meta");
        isProperty ? element.setAttribute("property", name) : element.setAttribute("name", name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    updateMetaTag("description", "Cardápio digital da Pizzaria Forneiro Eden. Peça sua pizza deliciosa online.");
    updateMetaTag("og:title", "Pizzaria Forneiro Eden", true);
    updateMetaTag("og:description", "Cardápio digital - Peça sua pizza deliciosa agora!", true);
    updateMetaTag("og:type", "website", true);
    updateMetaTag("og:image", "/logo-forneiro.jpg", true);
    updateMetaTag("twitter:title", "Pizzaria Forneiro Eden");
    updateMetaTag("twitter:description", "Cardápio digital - Peça sua pizza deliciosa agora!");
    updateMetaTag("twitter:image", "/logo-forneiro.jpg");
  }, []);

  return (
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
};

export default App;
