
import React, { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useData } from "@/context/DataContext";
import { LayoutDashboard, ShoppingCart, Package, DollarSign, Factory, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { SimpleDateFilter } from "@/components/ui/simple-date-filter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isSameDay, startOfDay, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatMonthYear, formatDayMonth, isWithinOneMonth, formatNumberBR } from "@/components/helpers/dateFormatUtils";

const Dashboard = () => {
  const { 
    dashboardStats,
    productionBatches,
    sales,
    isLoading,
    dateRange,
    setDateRange
  } = useData();
  
  // Define previous month stats for comparison
  const [previousMonthStats, setPreviousMonthStats] = React.useState({
    totalProduction: 0,
    totalSales: 0,
    currentInventory: 0,
    averageProfitability: 0
  });
  
  // Calculate previous month date range
  const previousMonthRange = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      const prevMonth = subMonths(dateRange.from, 1);
      return {
        from: startOfMonth(prevMonth),
        to: endOfMonth(prevMonth)
      };
    }
    return null;
  }, [dateRange]);
  
  // Calculate previous month stats
  useEffect(() => {
    if (previousMonthRange && productionBatches && sales) {
      // Calculate previous month production
      const prevProduction = productionBatches
        .filter(batch => {
          const batchDate = new Date(batch.productionDate);
          return batchDate >= previousMonthRange.from && batchDate <= previousMonthRange.to;
        })
        .reduce((total, batch) => {
          return total + batch.producedItems.reduce((sum, item) => sum + item.quantity, 0);
        }, 0);
      
      // Calculate previous month sales
      const prevSales = sales
        .filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate >= previousMonthRange.from && saleDate <= previousMonthRange.to;
        })
        .reduce((total, sale) => {
          return total + sale.items.reduce((sum, item) => sum + item.quantity, 0);
        }, 0);
      
      // For inventory and profitability, since these are point-in-time metrics,
      // we'll use a simple estimate based on current values and changes
      // In a real app, you'd want to calculate these from historical data
      const prevInventory = Math.max(0, dashboardStats.currentInventory - 
        (dashboardStats.totalProduction - dashboardStats.totalSales));
      
      // For profitability, use the current value if no historical data is available
      const prevProfitability = prevProduction > 0 ? (prevSales / prevProduction) * 100 : dashboardStats.averageProfitability;
      
      setPreviousMonthStats({
        totalProduction: prevProduction,
        totalSales: prevSales,
        currentInventory: prevInventory,
        averageProfitability: prevProfitability
      });
    }
  }, [previousMonthRange, productionBatches, sales, dashboardStats]);
  
  // Calculate percentage changes
  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  const percentChanges = {
    production: getPercentChange(dashboardStats.totalProduction, previousMonthStats.totalProduction),
    sales: getPercentChange(dashboardStats.totalSales, previousMonthStats.totalSales),
    inventory: getPercentChange(dashboardStats.currentInventory, previousMonthStats.currentInventory),
    profitability: getPercentChange(dashboardStats.averageProfitability, previousMonthStats.averageProfitability)
  };
  
  React.useEffect(() => {
    // Set default date range to current month if not set
    if (!dateRange) {
      const today = new Date();
      setDateRange({
        from: startOfMonth(today),
        to: endOfMonth(today)
      });
    }
  }, [dateRange, setDateRange]);
  
  // Determine if we should show daily or monthly chart
  const showDailyChart = React.useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return isWithinOneMonth(dateRange.from, dateRange.to);
    }
    return false;
  }, [dateRange]);
  
  // Prepare data for Production vs Sales chart
  const getChartData = () => {
    // If no date range, return empty array
    if (!dateRange?.from || !dateRange?.to) {
      return [];
    }
    
    if (showDailyChart) {
      // Show daily data
      const days = eachDayOfInterval({
        start: dateRange.from,
        end: dateRange.to
      });
      
      return days.map(day => {
        // Calculate production for this day
        const production = productionBatches
          .filter(batch => {
            const batchDate = new Date(batch.productionDate);
            return isSameDay(batchDate, day);
          })
          .reduce((total, batch) => {
            return total + batch.producedItems.reduce((sum, item) => sum + item.quantity, 0);
          }, 0);
        
        // Calculate sales for this day
        const salesAmount = sales
          .filter(sale => {
            const saleDate = new Date(sale.date);
            return isSameDay(saleDate, day);
          })
          .reduce((total, sale) => {
            return total + sale.items.reduce((sum, item) => sum + item.quantity, 0);
          }, 0);
        
        return {
          date: startOfDay(day),
          day: formatDayMonth(day),
          production,
          sales: salesAmount
        };
      });
    } else {
      // Show monthly data (original logic)
      const data = [];
      let currentDate = new Date(dateRange.from);
      const endDate = dateRange.to;
      
      while (currentDate <= endDate) {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const monthName = formatMonthYear(currentDate);
        
        // Calculate production for this month
        const production = productionBatches
          .filter(batch => {
            const date = new Date(batch.productionDate);
            return date.getMonth() === month && date.getFullYear() === year;
          })
          .reduce((total, batch) => {
            return total + batch.producedItems.reduce((sum, item) => sum + item.quantity, 0);
          }, 0);
        
        // Calculate sales for this month
        const salesAmount = sales
          .filter(sale => {
            const date = new Date(sale.date);
            return date.getMonth() === month && date.getFullYear() === year;
          })
          .reduce((total, sale) => {
            return total + sale.items.reduce((sum, item) => sum + item.quantity, 0);
          }, 0);
        
        data.push({
          date: new Date(year, month, 1),
          month: monthName,
          production,
          sales: salesAmount
        });
        
        // Move to next month
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }
      
      return data;
    }
  };
  
  const chartData = getChartData();
  
  // Prepare data for inventory
  const getInventoryData = () => {
    // Get finished products inventory
    const finishedProducts = dashboardStats.currentInventory;
    
    // Get raw materials inventory (sum of remaining quantities)
    const rawMaterials = useData().materialBatches.reduce((total, batch) => {
      return total + batch.remainingQuantity;
    }, 0);
    
    return [
      { name: "Produtos Acabados", value: finishedProducts },
      { name: "Matérias-Primas", value: rawMaterials }
    ];
  };
  
  const inventoryData = getInventoryData();
  
  // Custom tooltip formatter for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateLabel = showDailyChart 
        ? format(data.date, "EEEE, dd 'de' MMMM", { locale: ptBR })
        : format(data.date, "MMMM 'de' yyyy", { locale: ptBR });
      
      return (
        <div className="bg-background border border-border p-2 rounded-md shadow-md">
          <p className="font-medium">{dateLabel}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatNumberBR(entry.value)} kg
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  if (isLoading.products || isLoading.materialBatches) {
    return (
      <div className="container mx-auto py-6 px-4 flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium">Carregando dados do dashboard...</h2>
        </div>
      </div>
    );
  }
  
  // Helper for rendering the trend indicator
  const renderTrendIndicator = (percentChange: number) => {
    if (percentChange === 0) return null;
    
    const isPositive = percentChange > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    
    return (
      <div className={`flex items-center ${isPositive ? 'text-success' : 'text-destructive'}`}>
        <Icon className="h-4 w-4 mr-1" />
        <span>{Math.abs(percentChange).toFixed(1)}%</span>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Filtro por período</h2>
        <SimpleDateFilter 
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          className="max-w-full"
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="animate-scale-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produção Total</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumberBR(dashboardStats.totalProduction)} kg</div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                {dateRange?.from ? `No período selecionado` : 'Todos os produtos produzidos'}
              </p>
              {renderTrendIndicator(percentChanges.production)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumberBR(dashboardStats.totalSales)} kg</div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                {dateRange?.from ? `No período selecionado` : 'Total de produtos vendidos'}
              </p>
              {renderTrendIndicator(percentChanges.sales)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estoque Atual</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumberBR(dashboardStats.currentInventory)} kg</div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">Produtos disponíveis em estoque</p>
              {renderTrendIndicator(percentChanges.inventory)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidade Média</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.averageProfitability}%</div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                {dateRange?.from ? `No período selecionado` : 'Eficiência de produção'}
              </p>
              {renderTrendIndicator(percentChanges.profitability)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card className="col-span-2 animate-scale-in" style={{ animationDelay: "0.4s" }}>
          <CardHeader>
            <CardTitle>Produção x Vendas (kg)</CardTitle>
            {dateRange?.from && (
              <p className="text-sm text-muted-foreground">
                Período: {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} 
                {dateRange.to ? ` - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}` : ''}
              </p>
            )}
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={showDailyChart ? "day" : "month"} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value) => {
                  return value === "production" ? "Produção" : "Vendas";
                }}/>
                <Line 
                  type="monotone" 
                  dataKey="production" 
                  stroke="#3b82f6" 
                  name="Produção" 
                  strokeWidth={2} 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#10b981" 
                  name="Vendas" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="animate-scale-in" style={{ animationDelay: "0.5s" }}>
          <CardHeader>
            <CardTitle>Estoque Atual por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => formatNumberBR(value) + " kg"}
                  labelFormatter={(label) => label}
                />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Quantidade (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.6s" }}>
          <CardHeader>
            <CardTitle>Últimas Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productionBatches.slice(0, 3).map(batch => (
                <div key={batch.id} className="flex items-center">
                  <div className="mr-4 rounded-full bg-primary/10 p-2">
                    <Factory className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Produção {batch.batchNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(batch.productionDate), "dd/MM/yyyy", { locale: ptBR })} - {batch.producedItems.reduce((sum, item) => sum + item.quantity, 0)} kg
                    </p>
                  </div>
                </div>
              ))}
              
              {sales.slice(0, 3).map(sale => (
                <div key={sale.id} className="flex items-center">
                  <div className="mr-4 rounded-full bg-green-500/10 p-2">
                    <ShoppingCart className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Venda {sale.invoiceNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sale.date), "dd/MM/yyyy", { locale: ptBR })} - {sale.customerName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
