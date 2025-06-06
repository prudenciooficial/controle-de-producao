import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Settings, 
  Factory, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Users,
  FileText,
  Database,
  Beaker
} from "lucide-react";

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems: MenuItem[] = [
    { name: "Dashboard", path: "/", icon: Home, description: "Visão geral" },
    { name: "Cadastros", path: "/cadastros", icon: Settings, description: "Configurações do sistema" },
    { name: "Mexida", path: "/mexida", icon: Beaker, description: "Registrar mexidas" },
    { name: "Produção", path: "/producao", icon: Factory, description: "Registrar produção" },
    { name: "Estoque", path: "/estoque", icon: Package, description: "Controle de estoque" },
    { name: "Vendas", path: "/vendas", icon: TrendingUp, description: "Registrar vendas" },
    { name: "Perdas", path: "/perdas", icon: TrendingDown, description: "Registrar perdas" },
    { name: "Pedidos", path: "/pedidos", icon: ShoppingCart, description: "Gerenciar pedidos" },
    { name: "Rastreabilidade", path: "/rastreabilidade", icon: FileText, description: "Rastreamento de lotes" },
    { name: "Usuários", path: "/usuarios", icon: Users, description: "Gerenciar usuários" },
    { name: "Logs do Sistema", path: "/logs", icon: Database, description: "Logs de auditoria" },
  ];

  return (
    <div className="h-full bg-card border-r border-border">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Factory className="h-6 w-6" />
            <span className="">Nossa Goma</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                             (item.path !== "/" && location.pathname.startsWith(item.path));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive && "bg-muted text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
