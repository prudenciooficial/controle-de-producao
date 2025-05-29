import { MoveDownLeft, MoveUpRight, DollarSign, Package, TrendingUp, TrendingDown, Factory, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumberBR } from "@/components/helpers/dateFormatUtils";
import { cn } from "@/lib/utils";

interface StatsSectionProps {
  stats: {
    totalProduction: number;
    totalSales: number;
    currentInventory: number;
    averageProfitability: number;
  };
  changes: {
    production: number;
    sales: number;
    inventory: number;
    profitability: number;
  };
}

// Definição de cores para os ícones (pode ser ajustado conforme a paleta do app)
const iconColors = {
  production: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300",
  sales: "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300",
  inventory: "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300",
  profitability: "bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300",
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
      id: "profitability",
      title: "Rentabilidade Média",
      value: stats.averageProfitability,
      change: changes.profitability,
      metricIcon: DollarSign,
      unit: "%",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {statItems.map((item) => {
        const isPositiveChange = item.change >= 0;
        const IconComponent = item.metricIcon;
        // @ts-ignore
        const iconColorClasses = iconColors[item.id] || "bg-gray-100 text-gray-600";

        return (
          <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-3 rounded-lg", iconColorClasses)}>
                  <IconComponent className="h-7 w-7" />
                </div>
              </div>

              <h3 className="text-sm font-medium text-muted-foreground mb-0.5">{item.title}</h3>
              <div className="text-3xl font-bold mb-1">
                {item.unit === "%" ? `${formatNumberBR(item.value)}%` : `${formatNumberBR(item.value)} ${item.unit}`}
              </div>

              <div className="flex items-center text-xs">
                {isPositiveChange ? (
                  <MoveUpRight className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <MoveDownLeft className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={cn(isPositiveChange ? "text-green-600" : "text-red-600", "font-semibold")}>
                  {isPositiveChange ? "+" : ""}
                  {formatNumberBR(item.change)}%
                </span>
                <span className="text-muted-foreground ml-1.5">vs. mês anterior</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export { StatsSection }; 