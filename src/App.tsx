
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import Logs from "./pages/Logs";
import NotFound from "./pages/NotFound";
import PrintableTraceabilityPage from "./pages/print/PrintableTraceabilityPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <DataProvider>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/print/traceability/:batchNumber" element={<PrintableTraceabilityPage />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="production" element={<Production />} />
                    <Route path="production/history" element={<ProductionHistory />} />
                    <Route path="sales" element={<Sales />} />
                    <Route path="sales/history" element={<SalesHistory />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/history" element={<OrdersHistory />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="losses" element={<Losses />} />
                    <Route path="losses/history" element={<LossesHistory />} />
                    <Route path="traceability" element={<Traceability />} />
                    <Route path="registration" element={<Registration />} />
                    <Route path="users" element={<Users />} />
                    <Route path="logs" element={<Logs />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </DataProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
