
import React, { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useData } from "@/context/DataContext";
import { LayoutDashboard, ShoppingCart, Package, DollarSign, Factory, Loader2, TrendingDown, TrendingUp, Info, AlertTriangle } from "lucide-react";
import { SimpleDateFilter } from "@/components/ui/simple-date-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isSameDay, startOfDay, subMonths, subDays, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatMonthYear, formatDayMonth, isWithinOneMonth, formatNumberBR } from "@/components/helpers/dateFormatUtils";
import { InventoryDetailsDialog } from "@/components/inventory/InventoryDetailsDialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Helper function to calculate percentage change
const getPercentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const Dashboard = () => {
  const { 
    dashboardStats,
    productionBatches,
    sales,
    losses,
    products,
    isLoading,
    dateRange,
    setDateRange,
    getAvailableProducts,
    getAvailableMaterials,
  } = useData();
  
  // State for inventory details dialog
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<"product" | "material">("product");
  const [selectedBatches, setSelectedBatches] = React.useState<any[]>([]);
  
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
          return total + batch.producedItems.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            const weightFactor = product?.weightFactor || 1;
            return sum + (item.quantity * weightFactor);
          }, 0);
        }, 0);
      
      // Calculate previous month sales
      const prevSales = sales
        .filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate >= previousMonthRange.from && saleDate <= previousMonthRange.to;
        })
        .reduce((total, sale) => {
          return total + sale.items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            const weightFactor = product?.weightFactor || 1;
            return sum + (item.quantity * weightFactor);
          }, 0);
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
  }, [previousMonthRange, productionBatches, sales, dashboardStats, products]);
  
  // Calculate percentage changes
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
      
      return days.map((day, index) => {
        // Calculate production for this day using weight factors
        const production = productionBatches
          .filter(batch => {
            const batchDate = new Date(batch.productionDate);
            return isSameDay(batchDate, day);
          })
          .reduce((total, batch) => {
            return total + batch.producedItems.reduce((sum, item) => {
              const product = products.find(p => p.id === item.productId);
              const weightFactor = product?.weightFactor || 1;
              return sum + (item.quantity * weightFactor);
            }, 0);
          }, 0);
        
        // Calculate sales for this day using weight factors
        const salesAmount = sales
          .filter(sale => {
            const saleDate = new Date(sale.date);
            return isSameDay(saleDate, day);
          })
          .reduce((total, sale) => {
            return total + sale.items.reduce((sum, item) => {
              const product = products.find(p => p.id === item.productId);
              const weightFactor = product?.weightFactor || 1;
              return sum + (item.quantity * weightFactor);
            }, 0);
          }, 0);
        
        // Calculate previous day's values
        let previousDayProduction = 0;
        let previousDaySales = 0;
        
        if (index > 0) {
          const previousDay = days[index - 1];
          
          previousDayProduction = productionBatches
            .filter(batch => {
              const batchDate = new Date(batch.productionDate);
              return isSameDay(batchDate, previousDay);
            })
            .reduce((total, batch) => {
              return total + batch.producedItems.reduce((sum, item) => {
                const product = products.find(p => p.id === item.productId);
                const weightFactor = product?.weightFactor || 1;
                return sum + (item.quantity * weightFactor);
              }, 0);
            }, 0);
          
          previousDaySales = sales
            .filter(sale => {
              const saleDate = new Date(sale.date);
              return isSameDay(saleDate, previousDay);
            })
            .reduce((total, sale) => {
              return total + sale.items.reduce((sum, item) => {
                const product = products.find(p => p.id === item.productId);
                const weightFactor = product?.weightFactor || 1;
                return sum + (item.quantity * weightFactor);
              }, 0);
            }, 0);
        }
        
        // Calculate percentage changes
        const productionChange = getPercentChange(production, previousDayProduction);
        const salesChange = getPercentChange(salesAmount, previousDaySales);
        
        return {
          date: startOfDay(day),
          day: formatDayMonth(day),
          production,
          sales: salesAmount,
          productionChange,
          salesChange
        };
      });
    } else {
      // Show monthly data
      const data = [];
      let currentDate = new Date(dateRange.from);
      const endDate = dateRange.to;
      
      let previousMonth = null;
      let previousMonthProduction = 0;
      let previousMonthSales = 0;
      
      while (currentDate <= endDate) {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const monthName = formatMonthYear(currentDate);
        
        // Calculate production for this month using weight factors
        const production = productionBatches
          .filter(batch => {
            const date = new Date(batch.productionDate);
            return date.getMonth() === month && date.getFullYear() === year;
          })
          .reduce((total, batch) => {
            return total + batch.producedItems.reduce((sum, item) => {
              const product = products.find(p => p.id === item.productId);
              const weightFactor = product?.weightFactor || 1;
              return sum + (item.quantity * weightFactor);
            }, 0);
          }, 0);
        
        // Calculate sales for this month using weight factors
        const salesAmount = sales
          .filter(sale => {
            const date = new Date(sale.date);
            return date.getMonth() === month && date.getFullYear() === year;
          })
          .reduce((total, sale) => {
            return total + sale.items.reduce((sum, item) => {
              const product = products.find(p => p.id === item.productId);
              const weightFactor = product?.weightFactor || 1;
              return sum + (item.quantity * weightFactor);
            }, 0);
          }, 0);
        
        // Calculate percentage changes compared to previous month
        let productionChange = 0;
        let salesChange = 0;
        
        if (previousMonth !== null) {
          productionChange = getPercentChange(production, previousMonthProduction);
          salesChange = getPercentChange(salesAmount, previousMonthSales);
        }
        
        data.push({
          date: new Date(year, month, 1),
          month: monthName,
          production,
          sales: salesAmount,
          productionChange,
          salesChange
        });
        
        // Save current month's data for next iteration
        previousMonth = { month, year };
        previousMonthProduction = production;
        previousMonthSales = salesAmount;
        
        // Move to next month
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }
      
      return data;
    }
  };
  
  // NEW: Prepare data for Losses chart
  const getLossesChartData = () => {
    // If no date range or losses data, return empty array
    if (!dateRange?.from || !dateRange?.to || !losses || losses.length === 0) {
      return [];
    }
    
    if (showDailyChart) {
      // Show daily data
      const days = eachDayOfInterval({
        start: dateRange.from,
        end: dateRange.to
      });
      
      return days.map((day, index) => {
        // Calculate losses for this day
        const lossesAmount = losses
          .filter(loss => {
            const lossDate = new Date(loss.date);
            return isSameDay(lossDate, day);
          })
          .reduce((total, loss) => {
            return total + loss.quantity;
          }, 0);
        
        // Calculate previous day's losses for percentage change
        const previousDay = index > 0 ? days[index - 1] : subDays(day, 1);
        const previousDayLosses = losses
          .filter(loss => {
            const lossDate = new Date(loss.date);
            return isSameDay(lossDate, previousDay);
          })
          .reduce((total, loss) => {
            return total + loss.quantity;
          }, 0);
        
        // Calculate percentage change
        const percentageChange = getPercentChange(lossesAmount, previousDayLosses);
        
        return {
          date: startOfDay(day),
          day: formatDayMonth(day),
          losses: lossesAmount,
          percentageChange: percentageChange
        };
      });
    } else {
      // Show monthly data
      const data = [];
      let currentDate = new Date(dateRange.from);
      const endDate = dateRange.to;
      
      while (currentDate <= endDate) {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const monthName = formatMonthYear(currentDate);
        
        // Calculate losses for this month
        const lossesAmount = losses
          .filter(loss => {
            const date = new Date(loss.date);
            return date.getMonth() === month && date.getFullYear() === year;
          })
          .reduce((total, loss) => {
            return total + loss.quantity;
          }, 0);
        
        // Calculate previous month's losses for percentage change
        const previousMonthDate = subMonths(currentDate, 1);
        const previousMonthLosses = losses
          .filter(loss => {
            const date = new Date(loss.date);
            return date.getMonth() === previousMonthDate.getMonth() && 
                   date.getFullYear() === previousMonthDate.getFullYear();
          })
          .reduce((total, loss) => {
            return total + loss.quantity;
          }, 0);
        
        // Calculate percentage change
        const percentageChange = getPercentChange(lossesAmount, previousMonthLosses);
        
        data.push({
          date: new Date(year, month, 1),
          month: monthName,
          losses: lossesAmount,
          percentageChange: percentageChange
        });
        
        // Move to next month
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }
      
      return data;
    }
  };
  
  const chartData = getChartData();
  const lossesChartData = getLossesChartData();
  
  // Get available products and materials
  const availableProducts = getAvailableProducts();
  const availableMaterials = getAvailableMaterials();
  
  // Group products by name
  const groupedProducts = availableProducts.reduce((acc, product) => {
    const name = product.productName;
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(product);
    return acc;
  }, {} as Record<string, typeof availableProducts>);
  
  // Calculate total quantity for each product
  const productTotals = Object.entries(groupedProducts).map(([name, products]) => {
    const total = products.reduce((sum, p) => sum + p.remainingQuantity, 0);
    const unitOfMeasure = products[0]?.unitOfMeasure || "kg";
    const firstProduct = products[0];
    
    return {
      name,
      total,
      unitOfMeasure,
      products,
      firstProduct
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  
  // Group materials by type
  const groupedMaterials = availableMaterials.reduce((acc, material) => {
    const type = material.materialType || "Desconhecido";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(material);
    return acc;
  }, {} as Record<string, typeof availableMaterials>);
  
  // Calculate materials by type and name
  const materialTypes = Object.entries(groupedMaterials).map(([type, materials]) => {
    // Group by name within type
    const byName = materials.reduce((acc, material) => {
      const name = material.materialName || "Desconhecido";
      if (!acc[name]) {
        acc[name] = [];
      }
      acc[name].push(material);
      return acc;
    }, {} as Record<string, typeof materials>);
    
    // Calculate totals by name
    const materialsByName = Object.entries(byName).map(([name, items]) => {
      const total = items.reduce((sum, m) => sum + m.remainingQuantity, 0);
      return {
        name,
        total,
        unitOfMeasure: items[0]?.unitOfMeasure || "kg",
        materials: items,
        firstMaterial: items[0]
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    
    return {
      type,
      materials: materialsByName
    };
  }).sort((a, b) => {
    // Custom sort order for material types
    const typeOrder = {
      "Fécula": 1,
      "Conservante": 2,
      "Embalagem": 3,
      "Saco": 4,
      "Caixa": 5
    };
    
    const orderA = typeOrder[a.type as keyof typeof typeOrder] || 99;
    const orderB = typeOrder[b.type as keyof typeof typeOrder] || 99;
    
    return orderA - orderB;
  });
  
  // Handle view details
  const handleViewDetails = (item: any, type: "product" | "material") => {
    setSelectedItem(item);
    setDialogType(type);
    
    if (type === "product") {
      setSelectedBatches(item.products);
    } else {
      setSelectedBatches(item.materials);
    }
    
    setDialogOpen(true);
  };
  
  // Get material type icon and color
  const getMaterialTypeIcon = (type: string) => {
    switch (type) {
      case "Fécula":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "Conservante":
        return <Package className="h-4 w-4 text-green-500" />;
      case "Embalagem":
        return <Package className="h-4 w-4 text-yellow-500" />;
      case "Saco":
        return <Package className="h-4 w-4 text-purple-500" />;
      case "Caixa":
        return <Package className="h-4 w-4 text-orange-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };
  
  // Custom tooltip formatter for Losses chart
  const LossesTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && payload[0].payload) {
      const data = payload[0].payload;
      const dateLabel = showDailyChart 
        ? format(data.date, "EEEE, dd 'de' MMMM", { locale: ptBR })
        : format(data.date, "MMMM 'de' yyyy", { locale: ptBR });
      
      const percentageChangeValue = data.percentageChange;
      
      return (
        <div className="bg-background border border-border p-2 rounded-md shadow-md">
          <p className="font-medium">{dateLabel}</p>
          <p className="text-sm text-red-500">
            Perdas: {formatNumberBR(data.losses)} kg
          </p>
          {percentageChangeValue !== 0 && (
            <div className="flex items-center text-sm mt-1">
              <span className="mr-1">Variação:</span>
              {percentageChangeValue > 0 ? (
                <span className="flex items-center text-destructive">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{percentageChangeValue.toFixed(1)}%
                </span>
              ) : (
                <span className="flex items-center text-success">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {percentageChangeValue.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };
  
  // Custom tooltip formatter for Production/Sales chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateLabel = showDailyChart 
        ? format(data.date, "EEEE, dd 'de' MMMM", { locale: ptBR })
        : format(data.date, "MMMM 'de' yyyy", { locale: ptBR });
      
      return (
        <div className="bg-background border border-border p-2 rounded-md shadow-md">
          <p className="font-medium">{dateLabel}</p>
          {payload.map((entry: any, index: number) => {
            const isProduction = entry.name === "Produção";
            const percentChange = isProduction ? data.productionChange : data.salesChange;
            
            return (
              <div key={`item-${index}`} className="flex flex-col">
                <p className="text-sm" style={{ color: entry.color }}>
                  {entry.name}: {formatNumberBR(entry.value)} kg
                </p>
                
                {percentChange !== 0 && (
                  <div className="flex items-center text-xs ml-2">
                    <span className="mr-1">Variação:</span>
                    {percentChange > 0 ? (
                      <span className="flex items-center text-success">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{percentChange.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="flex items-center text-destructive">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {percentChange.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };
  
  // Loading state rendering
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
        <h2 className="text-2xl font-bold mb-4">Período</h2>
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
      
      {/* New Losses Chart */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card className="col-span-2 animate-scale-in" style={{ animationDelay: "0.45s" }}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
              Perdas (kg)
            </CardTitle>
            {dateRange?.from && (
              <p className="text-sm text-muted-foreground">
                Período: {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} 
                {dateRange.to ? ` - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}` : ''}
              </p>
            )}
          </CardHeader>
          <CardContent className="h-80">
            {lossesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lossesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={showDailyChart ? "day" : "month"} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<LossesTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="losses" 
                    stroke="#ea384c" 
                    name="Perdas" 
                    strokeWidth={2} 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mb-2 text-muted-foreground" />
                <p>Nenhum dado de perdas disponível para o período selecionado.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="animate-scale-in" style={{ animationDelay: "0.5s" }}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Estoque de Produtos Acabados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productTotals.length > 0 ? (
                  productTotals.map((product) => (
                    <TableRow key={product.name}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{formatNumberBR(product.total)}</TableCell>
                      <TableCell>{product.unitOfMeasure}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(product, "product")}
                        >
                          <Info className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      Nenhum produto disponível em estoque.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="animate-scale-in" style={{ animationDelay: "0.6s" }}>
          <CardHeader>
            <CardTitle>Estoque de Matérias-Primas</CardTitle>
          </CardHeader>
          <CardContent>
            {materialTypes.length > 0 ? (
              <div className="space-y-6">
                {materialTypes.map((typeGroup) => (
                  <div key={typeGroup.type} className="space-y-2">
                    <h3 className="text-lg font-medium flex items-center">
                      {getMaterialTypeIcon(typeGroup.type)}
                      <span className="ml-2">{typeGroup.type}</span>
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Insumo</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Un.</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {typeGroup.materials.map((material) => (
                          <TableRow key={material.name}>
                            <TableCell className="font-medium">{material.name}</TableCell>
                            <TableCell>{formatNumberBR(material.total)}</TableCell>
                            <TableCell>{material.unitOfMeasure}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewDetails(material, "material")}
                              >
                                <Info className="h-4 w-4 mr-1" />
                                Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                Nenhum material disponível em estoque.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <InventoryDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem?.firstProduct || selectedItem}
        type={dialogType}
        batches={selectedBatches}
      />
    </div>
  );
};

export default Dashboard;
