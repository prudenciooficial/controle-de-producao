import { Moon, Sun } from "lucide-react";
// A importação de Button não é necessária se ele não for usado.
// import { Button } from "@/components/ui/button"; 
import { useTheme } from "./ThemeProvider";
import { Toggle } from "../ui/toggle";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark"); // Ciclo simples light/dark
  };

  return (
    <div className="flex items-center">
      <Toggle 
        aria-label="Alternar tema"
        // A propriedade 'pressed' é mais adequada para um estado binário.
        // Se o tema atual for 'dark', o botão (que mostra o ícone do sol para mudar para claro) pode ser considerado 'não pressionado'
        // Se o tema atual for 'light', o botão (que mostra o ícone da lua para mudar para escuro) pode ser considerado 'pressionado' se associarmos 'pressionado' com a intenção de ir para escuro.
        // Para maior clareza, vamos deixar o visual ser controlado apenas pelos ícones Sun/Moon e sua rotação/escala baseada na classe .dark
        onClick={toggleTheme}
        variant="default"
        size="sm"
        className="h-9 w-9 rounded-full bg-background border shadow-sm"
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400" />
        <span className="sr-only">Alternar tema</span>
      </Toggle>
    </div>
  );
}
