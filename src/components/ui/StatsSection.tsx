
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, Factory, TrendingUp, TrendingDown, Info } from "lucide-react";
import { formatNumberBR } from "@/components/helpers/dateFormatUtils";

interface StatsProps {
  totalProduction: number;
  totalSales: number;
  currentInventory: number;
  averageProfitability: number;
  totalFeculaInventoryKg: number;
  capacidadeProdutiva: number;
}

interface ChangesProps {
  production: number;
  sales: number;
  inventory: number;
  profitability: number;
}

interface StatsSectionProps {
  stats: StatsProps;
  changes: ChangesProps;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ stats, changes }) => {
  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-500";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
      <Card className="animate-scale-in" style={{ animationDelay: "0.1s" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Produção Total</CardTitle>
          <Factory className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumberBR(stats.totalProduction)} kg</div>
          {changes.production !== 0 && (
            <div className={`flex items-center text-xs ${getChangeColor(changes.production)}`}>
              {getChangeIcon(changes.production)}
              <span className="ml-1">
                {changes.production > 0 ? '+' : ''}{changes.production.toFixed(1)}% vs mês anterior
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vendas Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumberBR(stats.totalSales)} kg</div>
          {changes.sales !== 0 && (
            <div className={`flex items-center text-xs ${getChangeColor(changes.sales)}`}>
              {getChangeIcon(changes.sales)}
              <span className="ml-1">
                {changes.sales > 0 ? '+' : ''}{changes.sales.toFixed(1)}% vs mês anterior
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-scale-in" style={{ animationDelay: "0.3s" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estoque Produtos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumberBR(stats.currentInventory)} kg</div>
          {changes.inventory !== 0 && (
            <div className={`flex items-center text-xs ${getChangeColor(changes.inventory)}`}>
              {getChangeIcon(changes.inventory)}
              <span className="ml-1">
                {changes.inventory > 0 ? '+' : ''}{changes.inventory.toFixed(1)}% vs mês anterior
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-scale-in" style={{ animationDelay: "0.4s" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estoque Fécula</CardTitle>
          <Package className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumberBR(stats.totalFeculaInventoryKg)} kg</div>
          <p className="text-xs text-muted-foreground mt-1">
            Matéria-prima disponível
          </p>
        </CardContent>
      </Card>

      <Card className="animate-scale-in" style={{ animationDelay: "0.5s" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Capacidade Produtiva</CardTitle>
          <Info className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumberBR(stats.capacidadeProdutiva)} kg</div>
          <p className="text-xs text-muted-foreground mt-1">
            Estimativa com fécula atual
          </p>
        </CardContent>
      </Card>

      <Card className="animate-scale-in" style={{ animationDelay: "0.6s" }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Eficiência Produtiva</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageProfitability.toFixed(2)}</div>
          {changes.profitability !== 0 && (
            <div className={`flex items-center text-xs ${getChangeColor(changes.profitability)}`}>
              {getChangeIcon(changes.profitability)}
              <span className="ml-1">
                {changes.profitability > 0 ? '+' : ''}{changes.profitability.toFixed(1)}% vs mês anterior
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsSection;
