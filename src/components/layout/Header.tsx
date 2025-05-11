
import React from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  title?: string;
  toggleSidebar?: () => void;
}

export function Header({ title, toggleSidebar }: HeaderProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const getPageTitle = () => {
    if (title) return title;
    
    switch (location.pathname) {
      case "/":
        return "Dashboard";
      case "/producao":
        return "Produção";
      case "/producao/historico":
        return "Histórico de Produção";
      case "/vendas":
        return "Vendas";
      case "/vendas/historico":
        return "Histórico de Vendas";
      case "/pedidos":
        return "Pedidos";
      case "/pedidos/historico":
        return "Histórico de Pedidos";
      case "/estoque":
        return "Estoque";
      case "/perdas":
        return "Perdas";
      case "/perdas/historico":
        return "Histórico de Perdas";
      case "/cadastro":
        return "Cadastro";
      default:
        return "Sistema de Controle de Produção";
    }
  };
  
  return (
    <header className={cn(
      "sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background px-4 md:px-6",
      isMobile ? "pr-4" : ""
    )}>
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        )}
        <h1 className="text-xl font-bold">{getPageTitle()}</h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
