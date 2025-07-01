import { Menu, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Clock } from "./Clock";
import { useAuth } from "@/contexts/AuthContext";
import { CompactConnectionStatus } from "@/components/ConnectionStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  toggleSidebar: () => void;
  offlineSystemReady?: boolean;
}

export function Header({ toggleSidebar, offlineSystemReady = false }: HeaderProps) {
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email || "Usuário";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Clock />
          
          {/* Status de conexão offline/online */}
          {offlineSystemReady && <CompactConnectionStatus />}
          
          <ThemeToggle />
          
          {user && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-3 hover:bg-accent/50 transition-colors"
                >
                  <img 
                    src="/images/NossaGoma.jpg" 
                    alt="Nossa Goma Logo" 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="text-sm hidden sm:inline">
                    {displayName}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                side="bottom"
                sideOffset={8}
                alignOffset={-4}
                avoidCollisions={true}
                className="w-48 min-w-[12rem]"
              >
                <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
