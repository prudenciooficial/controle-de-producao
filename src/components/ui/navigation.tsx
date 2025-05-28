import React from "react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Truck,
  Package,
  AlertTriangle,
  Search,
  Settings,
} from "lucide-react";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/dashboard",
  },
  {
    title: "Produção",
    icon: <ClipboardList className="h-5 w-5" />,
    href: "/producao",
  },
  {
    title: "Vendas",
    icon: <ShoppingCart className="h-5 w-5" />,
    href: "/vendas",
  },
  {
    title: "Pedidos",
    icon: <Truck className="h-5 w-5" />,
    href: "/pedidos",
  },
  {
    title: "Estoque",
    icon: <Package className="h-5 w-5" />,
    href: "/estoque",
  },
  {
    title: "Perdas",
    icon: <AlertTriangle className="h-5 w-5" />,
    href: "/perdas",
  },
  {
    title: "Rastreabilidade",
    icon: <Search className="h-5 w-5" />,
    href: "/rastreabilidade",
  },
  {
    title: "Cadastro",
    icon: <Settings className="h-5 w-5" />,
    href: "/cadastro",
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar className="bg-[#1a237e] text-white border-r-0">
        <SidebarHeader className="border-b border-white/10">
          <h2 className="px-4 py-3 text-lg font-semibold flex items-center gap-2">
            Sistema de Produção
          </h2>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className="hover:bg-white/10 text-white data-[active=true]:bg-white/20"
                  tooltip={item.title}
                >
                  <Link href={item.href} className="flex items-center gap-3 px-4">
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
} 