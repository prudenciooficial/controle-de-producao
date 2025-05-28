import { MoveDownLeft, MoveUpRight, DollarSign, Package, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumberBR } from "@/components/helpers/dateFormatUtils"; // Assumindo que você tem essa função

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

const StatsSection: React.FC<StatsSectionProps> = ({ stats, changes }) => {
  const statItems = [
    {
      title: "Produção Total",
      value: stats.totalProduction,
      change: changes.production,
      icon: <TrendingUp className="w-4 h-4 text-success" />,
      iconNegative: <TrendingDown className="w-4 h-4 text-destructive" />,
      unit: "kg", // ou a unidade apropriada
    },
    {
      title: "Vendas Totais",
      value: stats.totalSales,
      change: changes.sales,
      icon: <TrendingUp className="w-4 h-4 text-success" />,
      iconNegative: <TrendingDown className="w-4 h-4 text-destructive" />,
      unit: "kg", // ou a unidade apropriada
    },
    {
      title: "Estoque Atual",
      value: stats.currentInventory,
      change: changes.inventory,
      icon: <Package className="w-4 h-4 text-primary" />, // Ícone diferente para estoque
      unit: "kg", // ou a unidade apropriada
    },
    {
      title: "Rentabilidade Média",
      value: stats.averageProfitability,
      change: changes.profitability,
      icon: <DollarSign className="w-4 h-4 text-success" />,
      iconNegative: <DollarSign className="w-4 h-4 text-destructive" />, // Pode ser o mesmo ou diferente
      unit: "%",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {statItems.map((item, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {item.title}
            </CardTitle>
            {item.change >= 0 ? item.icon : item.iconNegative || item.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {item.unit === "%" ? `${formatNumberBR(item.value)}%` : `${formatNumberBR(item.value)} ${item.unit}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {item.change >= 0 ? "+" : ""}
              {formatNumberBR(item.change)}% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export { StatsSection }; 