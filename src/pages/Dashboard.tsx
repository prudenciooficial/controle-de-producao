import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useData } from "@/context/DataContext";
import { LayoutDashboard, ShoppingCart, Package, DollarSign, Factory, Loader2 } from "lucide-react";

const Dashboard = () => {
  const { 
    dashboardStats,
    productionBatches,
    sales,
    isLoading
  } = useData();
  
  // Prepare data for Production vs Sales chart
  const getChartData = () => {
    const data: { month: string; production: number; sales: number }[] = [];
    
    // Get last 6 months
    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        monthName: month.toLocaleString("default", { month: "short" }),
        month: month.getMonth(),
        year: month.getFullYear()
      });
    }
    
    // Calculate production and sales per month
    months.forEach(monthData => {
      const { month, year, monthName } = monthData;
      
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
        month: monthName,
        production,
        sales: salesAmount
      });
    });
    
    return data;
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="animate-scale-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produção Total</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalProduction} kg</div>
            <p className="text-xs text-muted-foreground">Todos os produtos produzidos</p>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalSales} kg</div>
            <p className="text-xs text-muted-foreground">Total de produtos vendidos</p>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estoque Atual</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.currentInventory} kg</div>
            <p className="text-xs text-muted-foreground">Produtos disponíveis em estoque</p>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidade Média</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.averageProfitability}%</div>
            <p className="text-xs text-muted-foreground">Eficiência de produção</p>
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
