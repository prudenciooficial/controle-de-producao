import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import Dashboard from "./pages/Dashboard";
import Production from "./pages/Production";
import ProductionHistory from "./pages/ProductionHistory";
import Sales from "./pages/Sales";
import SalesHistory from "./pages/SalesHistory";
import Orders from "./pages/Orders";
import OrdersHistory from "./pages/OrdersHistory";
import Inventory from "./pages/Inventory";
import Losses from "./pages/Losses";
import LossesHistory from "./pages/LossesHistory";
import Traceability from "./pages/Traceability";
import Registration from "./pages/Registration";
import Users from "./pages/Users";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PrintableTraceabilityPage from "./pages/print/PrintableTraceabilityPage";
import { useIsMobile } from "./hooks/use-mobile";
import { cn } from "./lib/utils";

const queryClient = new QueryClient();

const AppContent = () => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen w-full">
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/print/traceability/:batchId" element={<PrintableTraceabilityPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Sidebar isMobileMenuOpen={sidebarOpen} onMobileMenuToggle={toggleSidebar} />
            <div className={cn("flex flex-col flex-1 transition-all duration-300 ease-in-out", isMobile ? "w-full" : "md:ml-20")}>
              <Header toggleSidebar={toggleSidebar} />
              <main className="flex-1 p-4 sm:p-6">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/producao" element={<Production />} />
                  <Route path="/producao/historico" element={<ProductionHistory />} />
                  <Route path="/vendas" element={<Sales />} />
                  <Route path="/vendas/historico" element={<SalesHistory />} />
                  <Route path="/pedidos" element={<Orders />} />
                  <Route path="/pedidos/historico" element={<OrdersHistory />} />
                  <Route path="/estoque" element={<Inventory />} />
                  <Route path="/perdas" element={<Losses />} />
                  <Route path="/perdas/historico" element={<LossesHistory />} />
                  <Route path="/rastreabilidade" element={<Traceability />} />
                  <Route path="/cadastro" element={<Registration />} />
                  <Route path="/usuarios" element={<Users />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
      <Toaster />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <TooltipProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
