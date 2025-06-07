import { MoveDownLeft, MoveUpRight, DollarSign, Package, TrendingUp, TrendingDown, Factory, ShoppingCart, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumberBR } from "@/components/helpers/dateFormatUtils";
import { cn } from "@/lib/utils";

interface StatsSectionProps {
  stats: {
    totalProduction: number;
    totalSales: number;
    currentInventory: number;
    averageProfitability: number;
    capacidadeProdutiva?: number;
    totalFeculaInventoryKg?: number;
  };
  changes: {
    production: number;
    sales: number;
    inventory: number;
    profitability: number;
  };
}

// Cores modernas com gradientes e glassmorphism
const cardStyles = {
  production: {
    gradient: "from-blue-500/10 via-indigo-500/5 to-purple-500/10",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
    border: "border-blue-200/50 dark:border-blue-800/50",
    shadow: "shadow-blue-500/10",
  },
  sales: {
    gradient: "from-emerald-500/10 via-green-500/5 to-teal-500/10",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
    border: "border-emerald-200/50 dark:border-emerald-800/50",
    shadow: "shadow-emerald-500/10",
  },
  inventory: {
    gradient: "from-amber-500/10 via-yellow-500/5 to-orange-500/10",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
    border: "border-amber-200/50 dark:border-amber-800/50",
    shadow: "shadow-amber-500/10",
  },
  capacidadeProdutiva: {
    gradient: "from-cyan-500/10 via-sky-500/5 to-blue-500/10",
    iconBg: "bg-gradient-to-br from-cyan-500 to-sky-600",
    border: "border-cyan-200/50 dark:border-cyan-800/50",
    shadow: "shadow-cyan-500/10",
  },
  profitability: {
    gradient: "from-violet-500/10 via-purple-500/5 to-fuchsia-500/10",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
    border: "border-violet-200/50 dark:border-violet-800/50",
    shadow: "shadow-violet-500/10",
  },
};

const StatsSection: React.FC<StatsSectionProps> = ({ stats, changes }) => {
  const statItems = [
    {
      id: "production",
      title: "Produção Total",
      value: stats.totalProduction,
      change: changes.production,
      metricIcon: Factory,
      unit: "kg",
    },
    {
      id: "sales",
      title: "Vendas Totais",
      value: stats.totalSales,
      change: changes.sales,
      metricIcon: ShoppingCart,
      unit: "kg",
    },
    {
      id: "inventory",
      title: "Estoque Atual",
      value: stats.currentInventory,
      change: changes.inventory,
      metricIcon: Package,
      unit: "kg",
    },
    {
      id: "capacidadeProdutiva",
      title: "Capacidade Produtiva",
      value: stats.capacidadeProdutiva || 0,
      metricIcon: ClipboardList,
      unit: "kg",
      isCapacityCard: true
    },
    {
      id: "profitability",
      title: "Rentabilidade Média",
      value: stats.averageProfitability,
      change: changes.profitability,
      metricIcon: DollarSign,
      unit: "%",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
      {statItems.map((item) => {
        const isPositiveChange = item.change >= 0;
        const IconComponent = item.metricIcon;
        // @ts-ignore
        const styles = cardStyles[item.id] || cardStyles.production;

        return (
          <Card 
            key={item.id} 
            className={cn(
              "group relative overflow-hidden",
              "backdrop-blur-xl bg-white/80 dark:bg-gray-900/80",
              "border border-white/20 dark:border-gray-800/20",
              styles.border,
              "shadow-xl shadow-black/5 dark:shadow-black/20",
              styles.shadow,
              "hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30",
              "hover:scale-[1.02] hover:-translate-y-1",
              "transition-all duration-300 ease-out",
              "before:absolute before:inset-0 before:bg-gradient-to-br",
              `before:${styles.gradient}`,
              "before:opacity-60 before:transition-opacity before:duration-300",
              "hover:before:opacity-80"
            )}
          >
            <CardContent className="relative p-6 flex flex-col h-full">
              {/* Header com ícone */}
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "relative p-3 rounded-xl",
                  styles.iconBg,
                  "shadow-lg shadow-black/20",
                  "group-hover:scale-110 group-hover:rotate-3",
                  "transition-all duration-300 ease-out"
                )}>
                  <IconComponent className="h-6 w-6 text-white" />
                  
                  {/* Brilho sutil no ícone */}
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                {/* Indicador de mudança */}
                {!item.isCapacityCard && (
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    "backdrop-blur-sm",
                    isPositiveChange 
                      ? "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" 
                      : "bg-red-100/80 text-red-700 dark:bg-red-900/50 dark:text-red-300",
                    "group-hover:scale-105 transition-transform duration-200"
                  )}>
                    {isPositiveChange ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>
                      {isPositiveChange ? "+" : ""}
                      {formatNumberBR(item.change, { maximumFractionDigits: 1 })}%
                    </span>
                  </div>
                )}
              </div>

              {/* Conteúdo principal */}
              <div className="flex-1">
                <h3 className="text-sm font-medium text-muted-foreground/80 mb-2 tracking-wide">
                  {item.title}
                </h3>
                
                <div className="text-2xl lg:text-3xl font-bold mb-3 text-foreground/90 tracking-tight">
                  {item.unit === "%" 
                    ? `${formatNumberBR(item.value, { maximumFractionDigits: 2 })}%` 
                    : `${formatNumberBR(item.value, { roundBeforeFormat: item.unit === 'kg' })} ${item.unit}`}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto">
                {item.isCapacityCard ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />
                    <span className="px-2 py-1 bg-muted/50 rounded-full text-center">
                      {formatNumberBR(stats.totalFeculaInventoryKg || 0, { roundBeforeFormat: true })} kg fécula
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-muted-foreground/70">
                    {isPositiveChange ? (
                      <MoveUpRight className="h-3 w-3 text-emerald-500 mr-1.5" />
                    ) : (
                      <MoveDownLeft className="h-3 w-3 text-red-500 mr-1.5" />
                    )}
                    <span>vs. mês anterior</span>
                  </div>
                )}
      </div>

              {/* Efeito de borda animada */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
                   style={{
                     background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`,
                     transform: 'translateX(-100%)',
                     animation: 'shine 2s infinite'
                   }} />
            </CardContent>
          </Card>
        );
      })}
      
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export { StatsSection }; 