import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Factory, ShoppingCart, Truck, Package, PackageX, Search, Settings, Menu as MenuIcon, Users, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
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
  const { hasRole, hasPermission, canViewSystemLogs } = useAuth();
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(false);
  const [availableMenuItems, setAvailableMenuItems] = useState<any[]>([]);

  type MenuItem = {
    name: string;
    path: string;
    icon: React.ElementType;
    module?: string;
    permissionCheck?: () => boolean;
  };

  const [allMenuItems] = useState<MenuItem[]>([
    { name: "Dashboard", path: "/", icon: LayoutDashboard, module: "dashboard" },
    { name: "Produção", path: "/producao", icon: Factory, module: "production" },
    { name: "Vendas", path: "/vendas", icon: ShoppingCart, module: "sales" },
    { name: "Pedidos", path: "/pedidos", icon: Truck, module: "orders" },
    { name: "Estoque", path: "/estoque", icon: Package, module: "inventory" },
    { name: "Perdas", path: "/perdas", icon: PackageX, module: "losses" },
    { name: "Rastreabilidade", path: "/rastreabilidade", icon: Search, module: "traceability" },
    { name: "Cadastro", path: "/cadastro", icon: Settings, module: "general_settings" },
    { name: "Usuários", path: "/usuarios", icon: Users, module: "user_management" },
    {
      name: "Logs do Sistema",
      path: "/logs",
      icon: ScrollText,
      permissionCheck: canViewSystemLogs,
    },
  ]);

  useEffect(() => {
    if (isMobile) {
      setIsDesktopSidebarExpanded(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const checkPermissions = () => {
      const filteredItems = [];
      
      for (const item of allMenuItems) {
        if (hasRole('admin')) {
          filteredItems.push(item);
          continue;
        }
        
        if (item.permissionCheck) {
          if (item.permissionCheck()) {
            filteredItems.push(item);
          }
          continue;
        }

        if (item.module) {
          try {
            const hasAccess = hasPermission(item.module, 'read');
            if (hasAccess) {
              filteredItems.push(item);
            }
          } catch (error) {
            console.error(`Error checking permission for ${item.module}:`, error);
          }
        }
      }
      setAvailableMenuItems(filteredItems);
    };

    checkPermissions();
  }, [hasRole, hasPermission, canViewSystemLogs, allMenuItems]);

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

  const logoVariants = {
    expanded: { opacity: 1, scale: 1, transition: { delay: 0.2 } },
    collapsed: { opacity: 0.7, scale: 0.8, transition: { duration: 0.2 } },
  };

  const sidebarContent = (isExpanded: boolean) => (
    <motion.nav 
      className="space-y-1 px-2 py-6 flex-grow"
      initial={false}
      animate={isExpanded ? "expanded" : "collapsed"}
    >
      {availableMenuItems.map((item) => {
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

  const sidebarLogo = (isExpanded: boolean) => (
    <motion.div 
      className="p-4 mt-auto flex items-center justify-center"
      variants={logoVariants}
      initial="collapsed"
      animate={isExpanded ? "expanded" : "collapsed"}
    >
      <img 
        src="/images/NossaGoma.png" 
        alt="Nossa Goma Logo"
        className={cn(
          "transition-all duration-300 ease-in-out",
          isExpanded ? "h-16 w-auto" : "h-10 w-auto"
        )}
      />
    </motion.div>
  );

  if (isMobile) {
    return (
      <Sheet
        open={isMobileMenuOpen}
        onOpenChange={onMobileMenuToggle}
      >
        <SheetContent 
          side="left" 
          className="w-64 p-0 bg-sidebar border-r-0 border-sidebar-border text-sidebar-foreground flex flex-col"
        >
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
            <h1 className="text-xl font-bold">Sistema de Produção</h1>
          </div>
          {sidebarContent(true)}
          {sidebarLogo(true)}
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
      {sidebarLogo(isDesktopSidebarExpanded)}
    </motion.div>
  );
}
