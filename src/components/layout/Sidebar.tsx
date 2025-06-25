import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Factory, ShoppingCart, Truck, Package, PackageX, Search, Settings, Menu as MenuIcon, Users, ScrollText, FileSearch, FlaskConical, ChevronDown, ChevronRight, History, UserCheck, ShieldCheck, MessageSquare, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

const MotionLink = motion.create(Link);

type SubMenuItem = {
  name: string;
  path: string;
  icon: React.ElementType;
  module?: string;
};

type MenuItem = {
  name: string;
  path?: string;
  icon: React.ElementType;
  module?: string;
  permissionCheck?: () => boolean;
  subItems?: SubMenuItem[];
};

export function Sidebar({ isMobileMenuOpen, onMobileMenuToggle }: SidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { hasRole, canViewSystemLogs } = useAuth();
  const { getModuleAccess } = useModulePermissions();
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(false);
  const [availableMenuItems, setAvailableMenuItems] = useState<MenuItem[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const [allMenuItems] = useState<MenuItem[]>([
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
    { 
      name: "Produção", 
      icon: Factory, 
      module: "production",
      subItems: [
        { name: "Mexidas", path: "/mexida", icon: FlaskConical },
        { name: "Produção", path: "/producao", icon: Factory },
        { name: "Vendas", path: "/vendas", icon: ShoppingCart, module: "sales" },
        { name: "Pedidos", path: "/pedidos", icon: Truck, module: "orders" },
        { name: "Estoque", path: "/estoque", icon: Package, module: "inventory" },
        { name: "Perdas", path: "/perdas", icon: PackageX, module: "losses" },
        { name: "Cadastro", path: "/cadastro", icon: Settings, module: "general_settings" }
      ]
    },
    { 
      name: "RH", 
      icon: UserCheck, 
      module: "human_resources",
      subItems: [
        { name: "Ponto", path: "/recursos-humanos", icon: History }
      ]
    },
    { 
      name: "Qualidade", 
      icon: ShieldCheck, 
      module: "quality",
      subItems: [
        { name: "Reclamações", path: "/qualidade/reclamacoes", icon: MessageSquare },
        { name: "Rastreabilidade", path: "/rastreabilidade", icon: Search }
      ]
    },
    {
      name: "Administrador",
      icon: Shield,
      permissionCheck: () => hasRole('admin') || canViewSystemLogs(),
      subItems: [
        { name: "Usuários", path: "/usuarios", icon: Users },
        { name: "Logs do Sistema", path: "/logs", icon: ScrollText },
        { name: "Debug Permissões", path: "/debug-permissions", icon: FileSearch }
      ]
    },
  ]);

  useEffect(() => {
    if (isMobile) {
      setIsDesktopSidebarExpanded(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const checkPermissions = () => {
      // console.log('Verificando permissões dos módulos...');
      const filteredItems = [];
      
      for (const item of allMenuItems) {
        // console.log(`Verificando item: ${item.name}`);
        
        if (hasRole('admin')) {
          // console.log(`Admin tem acesso a ${item.name}`);
          filteredItems.push(item);
          continue;
        }
        
        if (item.permissionCheck) {
          if (item.permissionCheck()) {
            // console.log(`Permissão customizada aprovada para ${item.name}`);
            filteredItems.push(item);
          } else {
            // console.log(`Permissão customizada negada para ${item.name}`);
          }
          continue;
        }

        if (item.module) {
          const hasAccess = getModuleAccess(item.module);
          // console.log(`Módulo ${item.module} (${item.name}): ${hasAccess ? 'APROVADO' : 'NEGADO'}`);
          
          if (hasAccess) {
            // Se o item tem subitens, filtrar com base nas permissões individuais
            if (item.subItems && item.subItems.length > 0) {
              const filteredSubItems = item.subItems.filter(subItem => {
                if (!subItem.module) return true; // Se não tem módulo, assume que tem acesso
                const subItemAccess = getModuleAccess(subItem.module);
                // console.log(`Subitem ${subItem.name} (módulo: ${subItem.module}): ${subItemAccess ? 'APROVADO' : 'NEGADO'}`);
                return subItemAccess;
              });
              
              // Só adiciona o item principal se ele mesmo tem acesso OU se pelo menos um subitem tem acesso
              if (filteredSubItems.length > 0) {
                filteredItems.push({
                  ...item,
                  subItems: filteredSubItems
                });
              }
            } else {
              filteredItems.push(item);
            }
          }
        }
      }
      
      // console.log('Itens de menu disponíveis:', filteredItems.map(item => item.name));
      setAvailableMenuItems(filteredItems);
    };

    checkPermissions();
  }, [hasRole, getModuleAccess, canViewSystemLogs, allMenuItems]);

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
      const newSet = new Set<string>();
      
      // Se o item já está expandido, feche-o (não adicione ao Set)
      if (!prev.has(itemName)) {
        // Se não está expandido, abra apenas este item (fechando todos os outros)
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
      className="space-y-1 px-2 py-4 flex-grow overflow-y-auto scrollbar-hide"
      initial={false}
      animate={isExpanded ? "expanded" : "collapsed"}
      style={{ maxHeight: 'calc(100vh - 8rem)' }}
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
      className="p-3 flex items-center justify-center flex-shrink-0"
      variants={logoVariants}
      initial="collapsed"
      animate={isExpanded ? "expanded" : "collapsed"}
    >
      <img 
        src="/images/NossaGoma.png" 
        alt="Nossa Goma Logo"
        className={cn(
          "transition-all duration-300 ease-in-out",
          isExpanded ? "h-12 w-auto" : "h-8 w-auto"
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
