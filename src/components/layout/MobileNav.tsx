
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  LayoutDashboard, 
  Factory, 
  ShoppingCart, 
  Truck, 
  Package, 
  PackageX, 
  Settings, 
  Menu 
} from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="mr-4 md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[250px] p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-left">Sistema de Produção</SheetTitle>
        </SheetHeader>
        <nav className="space-y-1 p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center rounded-md px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
