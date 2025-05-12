
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
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
import Registration from "./pages/Registration";
import NotFound from "./pages/NotFound";
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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={cn("flex flex-col flex-1", isMobile ? "w-full" : "md:ml-64")}>
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1">
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
            <Route path="/cadastro" element={<Registration />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <Toaster />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <DataProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
