import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import OfertasDelDia from "./pages/OfertasDelDia";
import Ayuda from "./pages/Ayuda";
import Auth from "./pages/Auth";
import MisOrdenes from "./pages/MisOrdenes";
import Perfil from "./pages/Perfil";
import AdminProducts from "./pages/admin/AdminProducts";
import ImportProducts from "./pages/admin/ImportProducts";
import ProductImages from "./pages/admin/ProductImages";
import GaleriaImagenes from "./pages/admin/GaleriaImagenes";
import AdminSellers from "./pages/admin/Sellers";
import AdminSuppliers from "./pages/admin/Suppliers";
import Orders from "./pages/admin/Orders";
import SiteConfig from "./pages/admin/SiteConfig";
import AdminUsers from "./pages/admin/Users";
import ProductStats from "./pages/admin/ProductStats";
import SellerDashboard from "./pages/seller/SellerDashboard";
import NotFound from "./pages/NotFound";
import { useReferralCode } from "./hooks/useReferralCode";

const AppContent = () => {
  useReferralCode();

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/producto/:handle" element={<ProductDetail />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/confirmacion/:orderId" element={<OrderConfirmation />} />
      <Route path="/ofertas" element={<OfertasDelDia />} />
      <Route path="/ayuda" element={<Ayuda />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/mis-ordenes" element={<MisOrdenes />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/admin/productos" element={<AdminProducts />} />
      <Route path="/admin/importar" element={<ImportProducts />} />
      <Route path="/admin/imagenes" element={<ProductImages />} />
      <Route path="/admin/galeria" element={<GaleriaImagenes />} />
      <Route path="/admin/vendedores" element={<AdminSellers />} />
      <Route path="/admin/proveedores" element={<AdminSuppliers />} />
      <Route path="/admin/ordenes" element={<Orders />} />
      <Route path="/admin/configuracion" element={<SiteConfig />} />
      <Route path="/admin/usuarios" element={<AdminUsers />} />
      <Route path="/admin/estadisticas" element={<ProductStats />} />
      <Route path="/vendedor/dashboard" element={<SellerDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
