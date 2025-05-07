
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Factory, 
  ShoppingCart, 
  Truck, 
  Package, 
  PackageX, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const location = useLocation();
  
  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Produção", path: "/producao", icon: Factory },
    { name: "Vendas", path: "/vendas", icon: ShoppingCart },
    { name: "Pedidos", path: "/pedidos", icon: Truck },
    { name: "Estoque", path: "/estoque", icon: Package },
    { name: "Perdas", path: "/perdas", icon: PackageX },
    { name: "Cadastro", path: "/cadastro", icon: Settings },
  ];
  
  return (
    <div className="h-screen w-64 flex-shrink-0 border-r bg-sidebar fixed">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">Sistema de Produção</h1>
      </div>
      <nav className="space-y-1 px-3 py-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center rounded-md px-4 py-3 text-sm font-medium transition-colors",
              location.pathname === item.path
                ? "bg-primary text-white"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
