import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Clock } from "./Clock";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
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
          <ThemeToggle />
          
          {user && (
            <>
              <img 
                src="/images/NossaGoma.jpg" 
                alt="Nossa Goma Logo" 
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="text-sm hidden sm:inline">
                Bem vindo, {displayName}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="mr-0 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
