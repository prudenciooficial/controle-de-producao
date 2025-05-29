import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Factory, ShoppingCart, Truck, Package, PackageX, Search, Settings, Menu as MenuIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

const MotionLink = motion(Link);

export function Sidebar({ isMobileMenuOpen, onMobileMenuToggle }: SidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setIsDesktopSidebarExpanded(false);
    }
  }, [isMobile]);

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

  const sidebarHeaderVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -10 },
  };

  const sidebarIconVariants = {
    expanded: { opacity: 0, x: 10 },
    collapsed: { opacity: 1, x: 0 },
  };

  const navLinkTextVariants = {
    expanded: { opacity: 1, x: 0, display: "inline-block" },
    collapsed: { opacity: 0, x: -5, display: "none" },
  };

  const sidebarContent = (isExpanded: boolean) => (
    <motion.nav 
      className="space-y-1 px-2 py-6"
      initial={false}
      animate={isExpanded ? "expanded" : "collapsed"}
    >
      {menuItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <MotionLink
            key={item.path}
            to={item.path}
            onClick={() => {
              if (isMobile && onMobileMenuToggle) {
                onMobileMenuToggle();
              }
            }}
            className={cn(
              "flex items-center rounded-lg py-3 text-sm font-medium transition-colors duration-150 text-sidebar-foreground hover:bg-sidebar-accent",
              isActive ? "bg-sidebar-accent shadow-sm" : "",
              isExpanded ? "px-4" : "px-3 justify-center"
            )}
            title={!isExpanded ? item.name : undefined}
            whileHover={{ x: isActive ? 0 : (isExpanded ? 2 : 0) }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <item.icon className={cn("h-5 w-5 shrink-0", isExpanded && "mr-3")} />
            <motion.span 
              variants={navLinkTextVariants}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="whitespace-nowrap"
            >
              {item.name}
            </motion.span>
          </MotionLink>
        );
      })}
    </motion.nav>
  );

  if (isMobile) {
    return (
      <Sheet
        open={isMobileMenuOpen}
        onOpenChange={onMobileMenuToggle}
      >
        <SheetContent 
          side="left" 
          className="w-64 p-0 bg-sidebar border-r-0 border-sidebar-border text-sidebar-foreground"
        >
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
            <h1 className="text-xl font-bold">Sistema de Produção</h1>
          </div>
          {sidebarContent(true)}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Sidebar
  return (
    <motion.div 
      className={cn(
        "h-screen flex-shrink-0 bg-sidebar fixed hidden md:flex md:flex-col border-r border-sidebar-border z-50"
      )}
      initial={false}
      animate={{
        width: isDesktopSidebarExpanded ? "16rem" : "5rem",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onMouseEnter={() => setIsDesktopSidebarExpanded(true)}
      onMouseLeave={() => setIsDesktopSidebarExpanded(false)}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-3 justify-center relative overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          {isDesktopSidebarExpanded ? (
            <motion.h1 
              key="title"
              variants={sidebarHeaderVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="text-xl font-bold text-sidebar-foreground whitespace-nowrap"
            >
              Sistema de Produção
            </motion.h1>
          ) : (
            <motion.div
              key="icon"
              variants={sidebarIconVariants}
              initial="expanded"
              animate="collapsed"
              exit="expanded"
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute"
            >
              <LayoutDashboard className="h-6 w-6 text-sidebar-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {sidebarContent(isDesktopSidebarExpanded)}
    </motion.div>
  );
}
