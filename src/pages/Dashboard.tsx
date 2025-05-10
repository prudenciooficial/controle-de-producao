
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useData } from "@/context/DataContext";
import { LayoutDashboard, ShoppingCart, Package, DollarSign, Factory, Loader2 } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { addMonths, isSameMonth, isWithinInterval, subMonths, differenceInDays, format, startOfMonth, endOfMonth, isAfter, isBefore, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const Dashboard = () => {
  const { 
    dashboardStats,
    productionBatches,
    sales,
    isLoading
  } = useData();
  
  // Date range state
  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    if (!date?.from) {
      return dashboardStats;
    }

    const to = date.to || new Date();

    // Filter production batches in date range
    const filteredBatches = productionBatches.filter(batch => {
      const batchDate = new Date(batch.productionDate);
      return (isAfter(batchDate, date.from) || isSameDay(batchDate, date.from)) && 
             (isBefore(batchDate, to) || isSameDay(batchDate, to));
    });

    // Filter sales in date range
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return (isAfter(saleDate, date.from) || isSameDay(saleDate, date.from)) && 
             (isBefore(saleDate, to) || isSameDay(saleDate, to));
    });

    // Calculate total production
    const totalProduction = filteredBatches.reduce((sum, batch) => {
      return sum + batch.producedItems.reduce((total, item) => total + item.quantity, 0);
    }, 0);
    
    // Calculate total sales
    const totalSales = filteredSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((total, item) => total + item.quantity, 0);
    }, 0);
    
    // Calculate average profitability (simplified - just using the ratio)
    const averageProfitability = totalProduction > 0 ? 
      Math.round((totalSales / totalProduction) * 100) : 0;

    return {
      totalProduction,
      totalSales,
      currentInventory: dashboardStats.currentInventory, // Current inventory stays the same
      averageProfitability
    };
  }, [dashboardStats, productionBatches, sales, date]);
  
  // Prepare data for Production vs Sales chart based on date range
  const getChartData = useMemo(() => {
    if (!date?.from) return [];
    
    const to = date.to || new Date();
    const daysDifference = differenceInDays(to, date.from);
    const isMonthly = daysDifference > 31; // Show monthly if more than a month
    
    if (isMonthly) {
      // Monthly data
      const monthlyData: { month: string; production: number; sales: number }[] = [];
      let currentMonth = startOfMonth(date.from);
      
      while (isBefore(currentMonth, to) || isSameMonth(currentMonth, to)) {
        const monthEnd = endOfMonth(currentMonth);
        const monthName = format(currentMonth, "MMM yyyy", { locale: ptBR });
        
        // Calculate production for this month
        const production = productionBatches
          .filter(batch => {
            const batchDate = new Date(batch.productionDate);
            return (isAfter(batchDate, currentMonth) || isSameDay(batchDate, currentMonth)) && 
                  (isBefore(batchDate, monthEnd) || isSameDay(batchDate, monthEnd));
          })
          .reduce((total, batch) => {
            return total + batch.producedItems.reduce((sum, item) => sum + item.quantity, 0);
          }, 0);
        
        // Calculate sales for this month
        const salesAmount = sales
          .filter(sale => {
            const saleDate = new Date(sale.date);
            return (isAfter(saleDate, currentMonth) || isSameDay(saleDate, currentMonth)) && 
                  (isBefore(saleDate, monthEnd) || isSameDay(saleDate, monthEnd));
          })
          .reduce((total, sale) => {
            return total + sale.items.reduce((sum, item) => sum + item.quantity, 0);
          }, 0);
        
        monthlyData.push({
          month: monthName,
          production,
          sales: salesAmount
        });
        
        // Move to next month
        currentMonth = addMonths(currentMonth, 1);
      }
      
      return monthlyData;
    } else {
      // Daily data for <= 31 days
      const dailyData: { month: string; production: number; sales: number }[] = [];
      
      for (let i = 0; i <= daysDifference; i++) {
        const currentDay = new Date(date.from);
        currentDay.setDate(date.from.getDate() + i);
        
        // Format day
        const dayName = format(currentDay, "dd/MM");
        
        // Calculate production for this day
        const production = productionBatches
          .filter(batch => {
            const batchDate = new Date(batch.productionDate);
            return isSameDay(batchDate, currentDay);
          })
          .reduce((total, batch) => {
            return total + batch.producedItems.reduce((sum, item) => sum + item.quantity, 0);
          }, 0);
        
        // Calculate sales for this day
        const salesAmount = sales
          .filter(sale => {
            const saleDate = new Date(sale.date);
            return isSameDay(saleDate, currentDay);
          })
          .reduce((total, sale) => {
            return total + sale.items.reduce((sum, item) => sum + item.quantity, 0);
          }, 0);
        
        dailyData.push({
          month: dayName,
          production,
          sales: salesAmount
        });
      }
      
      return dailyData;
    }
  }, [date, productionBatches, sales]);
  
  // Prepare data for inventory
  const getInventoryData = () => {
    // Get finished products inventory
    const finishedProducts = filteredStats.currentInventory;
    
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
  const chartData = getChartData;
  
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
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      {/* Date Range Picker */}
      <div className="mb-6">
        <DateRangePicker date={date} onDateChange={setDate} />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="animate-scale-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produção Total</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.totalProduction} kg</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.totalSales} kg</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estoque Atual</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.currentInventory} kg</div>
            <p className="text-xs text-muted-foreground">Produtos disponíveis em estoque</p>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidade Média</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.averageProfitability}%</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card className="col-span-2 animate-scale-in" style={{ animationDelay: "0.4s" }}>
          <CardHeader>
            <CardTitle>Produção x Vendas (kg)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
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
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
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
                      {batch.productionDate.toLocaleDateString()} - {batch.producedItems.reduce((sum, item) => sum + item.quantity, 0)} kg
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
                      {sale.date.toLocaleDateString()} - {sale.customerName}
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
