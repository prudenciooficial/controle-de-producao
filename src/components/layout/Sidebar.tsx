import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Factory, ShoppingCart, Truck, Package, PackageX, Search, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setShowMobileMenu(isOpen || false);
    }
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (isMobile && showMobileMenu) {
      // A lógica de fechar ao mudar de rota já é tratada pelo onClose no onOpenChange do Sheet
      // ou pelo clique no botão de fechar padrão do SheetContent.
      // No entanto, manter um onClose na mudança de rota pode ser um comportamento desejado.
      // Se o SheetContent não fechar na mudança de rota por padrão, esta lógica pode ser útil.
      // Por ora, vamos confiar que o onClose chamado pelo onOpenChange é suficiente.
    }
  }, [location.pathname]); // Removido showMobileMenu e onClose daqui para evitar loops/efeitos indesejados

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Produção", path: "/producao", icon: Factory },
    { name: "Vendas", path: "/vendas", icon: ShoppingCart },
    { name: "Pedidos", path: "/pedidos", icon: Truck },
    { name: "Estoque", path: "/estoque", icon: Package },
    { name: "Perdas", path: "/perdas", icon: PackageX },
    { name: "Rastreabilidade", path: "/rastreabilidade", icon: Search },
    { name: "Cadastro", path: "/cadastro", icon: Settings },
  ];

  const sidebarContent = (
    <nav className="space-y-1 px-4 py-6">
      {menuItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => {
              if (isMobile) {
                onClose?.(); // Fecha o menu ao clicar num item no mobile
              }
            }}
            className={cn(
              "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 text-sidebar-foreground",
              isActive
                ? "bg-sidebar-accent shadow-sm translate-x-1"
                : "hover:bg-sidebar-accent hover:translate-x-1"
            )}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  if (isMobile) {
    return (
      <Sheet
        open={showMobileMenu}
        onOpenChange={(open) => {
          setShowMobileMenu(open); // Sincroniza o estado local com o estado do Sheet
          if (!open) {
            onClose?.(); // Chama o onClose principal quando o Sheet é fechado
          }
        }}
      >
        <SheetContent 
          side="left" 
          className="w-64 p-0 bg-sidebar border-r-0 border-sidebar-border text-white dark:text-sidebar-foreground"
        >
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
            <h1 className="text-xl font-bold text-sidebar-foreground">Sistema de Produção</h1>
          </div>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="h-screen w-64 flex-shrink-0 bg-sidebar fixed hidden md:block border-r border-sidebar-border">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <h1 className="text-xl font-bold text-sidebar-foreground">Sistema de Produção</h1>
      </div>
      {sidebarContent}
    </div>
  );
}
