
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Home, Box, ShoppingCart, Package, Briefcase, BarChart2, FileText } from "lucide-react";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "../ui/sheet";
import { useTheme } from "@/context/ThemeContext";

export default function MobileNavbar() {
  const location = useLocation();
  const { theme } = useTheme();
  
  const isActive = (path: string) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background z-50 lg:hidden">
      <div className="flex items-center justify-around p-2">
        <Link to="/">
          <Button variant="ghost" size="icon" className={isActive('/') ? 'text-primary' : ''}>
            <Home size={24} />
          </Button>
        </Link>
        <Link to="/producao">
          <Button variant="ghost" size="icon" className={isActive('/producao') ? 'text-primary' : ''}>
            <Box size={24} />
          </Button>
        </Link>
        <Link to="/vendas">
          <Button variant="ghost" size="icon" className={isActive('/vendas') ? 'text-primary' : ''}>
            <ShoppingCart size={24} />
          </Button>
        </Link>
        <Link to="/pedidos">
          <Button variant="ghost" size="icon" className={isActive('/pedidos') ? 'text-primary' : ''}>
            <Package size={24} />
          </Button>
        </Link>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] sm:w-[300px]">
            <div className="grid gap-1 py-4">
              <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">Menu</h2>
              <nav className="grid items-start px-2 text-sm">
                <Link to="/" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive('/') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/producao" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive('/producao') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <Box className="h-4 w-4" />
                  <span>Produção</span>
                </Link>
                <Link to="/producao/historico" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all pl-9 ${isActive('/producao/historico') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <FileText className="h-4 w-4" />
                  <span>Histórico</span>
                </Link>
                <Link to="/vendas" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive('/vendas') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <ShoppingCart className="h-4 w-4" />
                  <span>Vendas</span>
                </Link>
                <Link to="/vendas/historico" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all pl-9 ${isActive('/vendas/historico') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <FileText className="h-4 w-4" />
                  <span>Histórico</span>
                </Link>
                <Link to="/pedidos" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive('/pedidos') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <Package className="h-4 w-4" />
                  <span>Pedidos</span>
                </Link>
                <Link to="/pedidos/historico" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all pl-9 ${isActive('/pedidos/historico') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <FileText className="h-4 w-4" />
                  <span>Histórico</span>
                </Link>
                <Link to="/estoque" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive('/estoque') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <Briefcase className="h-4 w-4" />
                  <span>Estoque</span>
                </Link>
                <Link to="/perdas" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive('/perdas') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <BarChart2 className="h-4 w-4" />
                  <span>Perdas</span>
                </Link>
                <Link to="/perdas/historico" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all pl-9 ${isActive('/perdas/historico') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <FileText className="h-4 w-4" />
                  <span>Histórico</span>
                </Link>
                <Link to="/cadastro" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive('/cadastro') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}>
                  <FileText className="h-4 w-4" />
                  <span>Cadastro</span>
                </Link>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
