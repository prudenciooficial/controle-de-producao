import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Factory, ShoppingCart, Truck, Package, PackageX, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}
export function Sidebar({
  isOpen,
  onClose
}: SidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  useEffect(() => {
    if (isMobile) {
      setShowMobileMenu(Boolean(isOpen));
    }
  }, [isOpen, isMobile]);
  useEffect(() => {
    // Close mobile menu when route changes
    if (isMobile && showMobileMenu) {
      setShowMobileMenu(false);
      onClose?.();
    }
  }, [location.pathname, isMobile]);
  const menuItems = [{
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard
  }, {
    name: "Produção",
    path: "/producao",
    icon: Factory
  }, {
    name: "Vendas",
    path: "/vendas",
    icon: ShoppingCart
  }, {
    name: "Pedidos",
    path: "/pedidos",
    icon: Truck
  }, {
    name: "Estoque",
    path: "/estoque",
    icon: Package
  }, {
    name: "Perdas",
    path: "/perdas",
    icon: PackageX
  }, {
    name: "Cadastro",
    path: "/cadastro",
    icon: Settings
  }];
  const sidebarContent = <nav className="space-y-1 px-4 py-6">
      {menuItems.map(item => {
      const isActive = location.pathname === item.path;
      return <Link key={item.path} to={item.path} className={cn("flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200", isActive ? "bg-sidebar-accent text-white shadow-sm translate-x-1" : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-white hover:translate-x-1")}>
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </Link>;
    })}
    </nav>;
  if (isMobile) {
    return <Sheet open={showMobileMenu} onOpenChange={open => {
      setShowMobileMenu(open);
      if (!open) onClose?.();
    }}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar">
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <h1 className="text-xl font-bold text-white">Sistema de Produção</h1>
            <Button variant="ghost" size="icon" className="absolute right-4 top-4 text-white hover:bg-sidebar-accent" onClick={() => {
            setShowMobileMenu(false);
            onClose?.();
          }}>
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>
          {sidebarContent}
        </SheetContent>
      </Sheet>;
  }
  return <div className="h-screen w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar fixed hidden md:block">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <h1 className="text-xl font-bold text-white">Controle de Produção</h1>
      </div>
      {sidebarContent}
    </div>;
}