import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Factory, ShoppingCart, Truck, Package, PackageX, Search, Settings, Menu as MenuIcon, Users, ScrollText, FileSearch, FlaskConical, ChevronDown, ChevronRight, History, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  type SubMenuItem = {
    name: string;
    path: string;
    icon: React.ElementType;
  };

  type MenuItem = {
    name: string;
    path?: string;
    icon: React.ElementType;
    module?: string;
    permissionCheck?: () => boolean;
    subItems?: SubMenuItem[];
  };

  const [allMenuItems] = useState<MenuItem[]>([
    { name: "Dashboard", path: "/", icon: LayoutDashboard, module: "dashboard" },
    { 
      name: "Produção", 
      icon: Factory, 
      module: "production",
      subItems: [
        { name: "Mexidas", path: "/mexida", icon: FlaskConical },
        { name: "Produção", path: "/producao", icon: Factory }
      ]
    },
    { name: "Vendas", path: "/vendas", icon: ShoppingCart, module: "sales" },
    { name: "Pedidos", path: "/pedidos", icon: Truck, module: "orders" },
    { name: "Estoque", path: "/estoque", icon: Package, module: "inventory" },
    { name: "Perdas", path: "/perdas", icon: PackageX, module: "losses" },
    { name: "Rastreabilidade", path: "/rastreabilidade", icon: Search, module: "traceability" },
    { name: "Cadastro", path: "/cadastro", icon: Settings, module: "general_settings" },
    { name: "RH", path: "/recursos-humanos", icon: UserCheck, module: "human_resources" },
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
            const hasAccess = hasPermission(item.module, 'view');
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

  // Função para verificar se um item ou seus subitens estão ativos
  const isItemActive = (item: MenuItem) => {
    if (item.path && location.pathname === item.path) return true;
    if (item.subItems) {
      return item.subItems.some(subItem => location.pathname === subItem.path);
    }
    return false;
  };

  // Função para alternar expansão de menu
  const toggleMenuExpansion = (itemName: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  // Auto-expand menu if current page is a submenu item
  useEffect(() => {
    availableMenuItems.forEach(item => {
      if (item.subItems && isItemActive(item)) {
        setExpandedMenus(prev => new Set([...prev, item.name]));
      }
    });
  }, [location.pathname, availableMenuItems]);

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
        const isActive = isItemActive(item);
        const isExpanded_Menu = expandedMenus.has(item.name);
        const hasSubItems = item.subItems && item.subItems.length > 0;

        return (
          <div key={item.name}>
            {/* Item principal */}
            {hasSubItems ? (
              <button
                onClick={() => toggleMenuExpansion(item.name)}
                className={cn(
                  "flex items-center rounded-lg py-3 text-sm font-medium transition-colors duration-150 text-sidebar-foreground hover:bg-sidebar-accent w-full",
                  isActive ? "bg-sidebar-accent shadow-sm" : "",
                  isExpanded ? "px-4" : "px-3 justify-center"
                )}
                title={!isExpanded ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isExpanded && "mr-3")} />
                {isExpanded && (
                  <>
                    <motion.span 
                      variants={navLinkTextVariants}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="whitespace-nowrap flex-1 text-left"
                    >
                      {item.name}
                    </motion.span>
                    <motion.div
                      animate={{ rotate: isExpanded_Menu ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </motion.div>
                  </>
                )}
              </button>
            ) : (
              <MotionLink
                to={item.path!}
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
            )}

            {/* Subitens */}
            {hasSubItems && (isExpanded || isMobile) && (
              <AnimatePresence>
                {isExpanded_Menu && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "mt-1 space-y-1",
                      isMobile ? "ml-6" : "ml-8"
                    )}
                  >
                    {item.subItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path;
                      
                      if (isMobile) {
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            onClick={() => {
                              if (onMobileMenuToggle) {
                                onMobileMenuToggle();
                              }
                            }}
                            className={cn(
                              "flex items-center rounded-lg py-2 px-3 text-sm font-medium transition-colors duration-150 text-sidebar-foreground hover:bg-sidebar-accent",
                              isSubActive ? "bg-sidebar-accent shadow-sm text-sidebar-accent-foreground" : ""
                            )}
                          >
                            <subItem.icon className="h-4 w-4 shrink-0 mr-3" />
                            <span className="whitespace-nowrap">{subItem.name}</span>
                          </Link>
                        );
                      }
                      
                      return (
                        <MotionLink
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => {
                            if (isMobile && onMobileMenuToggle) {
                              onMobileMenuToggle();
                            }
                          }}
                          className={cn(
                            "flex items-center rounded-lg py-2 px-3 text-sm font-medium transition-colors duration-150 text-sidebar-foreground hover:bg-sidebar-accent",
                            isSubActive ? "bg-sidebar-accent shadow-sm text-sidebar-accent-foreground" : ""
                          )}
                          whileHover={{ x: isSubActive ? 0 : 2 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <subItem.icon className="h-4 w-4 shrink-0 mr-3" />
                          <span className="whitespace-nowrap">{subItem.name}</span>
                        </MotionLink>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
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
          <SheetHeader className="h-16 border-b border-sidebar-border px-6 flex flex-row items-center justify-start">
            <SheetTitle className="text-xl font-bold text-sidebar-foreground">Sistema de Produção</SheetTitle>
            <SheetDescription className="sr-only">
              Menu de navegação do sistema de controle de produção
            </SheetDescription>
          </SheetHeader>
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
