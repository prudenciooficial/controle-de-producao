
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Route,
  Settings,
  Users,
  Activity,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3, permission: { module: "dashboard", action: "read" } },
  { name: "Produção", href: "/production", icon: Package, permission: { module: "production", action: "read" } },
  { name: "Vendas", href: "/sales", icon: ShoppingCart, permission: { module: "sales", action: "read" } },
  { name: "Pedidos", href: "/orders", icon: Truck, permission: { module: "orders", action: "read" } },
  { name: "Estoque", href: "/inventory", icon: Activity, permission: { module: "inventory", action: "read" } },
  { name: "Perdas", href: "/losses", icon: AlertTriangle, permission: { module: "losses", action: "read" } },
  { name: "Rastreabilidade", href: "/traceability", icon: Route, permission: { module: "traceability", action: "read" } },
  { name: "Cadastros", href: "/registration", icon: Settings, permission: { module: "general_settings", action: "read" } },
  { name: "Usuários", href: "/users", icon: Users, permission: { module: "user_management", action: "read" } },
  { name: "Logs", href: "/logs", icon: FileText, permission: { module: "logs", action: "read" } },
];

export function Sidebar() {
  const location = useLocation();
  const { hasPermission } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col overflow-y-auto border-r bg-white px-3 py-4">
      <div className="flex flex-col space-y-1">
        {navigation.map((item) => {
          const hasAccess = hasPermission(item.permission.module, item.permission.action);
          
          if (!hasAccess) {
            return null;
          }

          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
