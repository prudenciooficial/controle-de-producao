import React, { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useData } from "@/context/DataContext";
import { LayoutDashboard, ShoppingCart, Package, DollarSign, Factory, Loader2, TrendingDown, TrendingUp, Info, AlertTriangle, ClipboardList } from "lucide-react";
import { SimpleDateFilter } from "@/components/ui/simple-date-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isSameDay, startOfDay, subMonths, subDays, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatMonthYear, formatDayMonth, isWithinOneMonth, formatNumberBR } from "@/components/helpers/dateFormatUtils";
import { InventoryDetailsDialog } from "@/components/inventory/InventoryDetailsDialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { StatsSection } from "@/components/ui/StatsSection";
import { motion } from "framer-motion";

// Types for Dashboard components
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: {
      date: Date;
      production?: number;
      sales?: number;
      losses?: number;
      productionChange?: number;
      salesChange?: number;
      percentageChange?: number;
    };
  }>;
  label?: string;
}

interface ChartEntry {
  name: string;
  value: number;
  color: string;
}

// Função melhorada para calcular mudança percentual
const getPercentChange = (current: number, previous: number) => {
  // Se ambos são 0, não há mudança
  if (current === 0 && previous === 0) return 0;
  
  // Se previous é 0 mas current não é, consideramos como 100% ou -100%
  if (previous === 0) return current > 0 ? 100 : (current < 0 ? -100 : 0);
  
  // Cálculo normal da porcentagem
  return ((current - previous) / Math.abs(previous)) * 100;
};

const Dashboard = () => {
  const { 
    dashboardStats,
    productionBatches,
    sales,
    losses,
    products,
    globalSettings,
    isLoading,
    dateRange,
    setDateRange,
    getAvailableProducts,
    getAvailableMaterials,
    materialBatches,
    getProductiveCapacity
  } = useData();
  
  // State for inventory details dialog
  const [selectedItem, setSelectedItem] = React.useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<"product" | "material">("product");
  const [selectedBatches, setSelectedBatches] = React.useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  
  // Define previous month stats for comparison
  const [previousMonthStats, setPreviousMonthStats] = React.useState({
    totalProduction: 0,
    totalSales: 0,
    currentInventory: 0,
    averageProfitability: 0,
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
    if (previousMonthRange && productionBatches && sales && globalSettings) {
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
        averageProfitability: prevProfitability,
      });
    }
  }, [previousMonthRange, productionBatches, sales, dashboardStats, products, globalSettings]);
  
  // Calcular capacidade produtiva atual usando a função utilitária OTIMIZADA
  const currentCapacidadeProdutiva = React.useMemo(() => {
    if (isLoading.globalSettings || !globalSettings || isLoading.materialBatches) {
      return 0; // Ou algum valor de carregamento/padrão
    }
    
    try {
      const productiveCapacity = getProductiveCapacity();
      return productiveCapacity.capacityKg;
    } catch (error) {
      console.error('Erro ao calcular capacidade produtiva:', error);
      return 0;
    }
  }, [isLoading.globalSettings, isLoading.materialBatches, globalSettings, getProductiveCapacity]);
  
  // Calculate percentage changes
  const percentChanges = {
    production: getPercentChange(dashboardStats.totalProduction, previousMonthStats.totalProduction),
    sales: getPercentChange(dashboardStats.totalSales, previousMonthStats.totalSales),
    inventory: getPercentChange(dashboardStats.currentInventory, previousMonthStats.currentInventory),
    profitability: getPercentChange(dashboardStats.averageProfitability, previousMonthStats.averageProfitability),
  };
  
  React.useEffect(() => {
    // Set default date range to current month if not set
    // BUT only if we're not already loading data to avoid double refresh
    if (!dateRange && !isLoading.productionBatches) {
      const today = new Date();
      setDateRange({
        from: startOfMonth(today),
        to: endOfMonth(today)
      });
    }
  }, [dateRange, setDateRange, isLoading.productionBatches]);
  
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
        // Calculate losses for this day
        const lossesAmount = losses
          ?.filter(loss => {
            const lossDate = new Date(loss.date);
            return isSameDay(lossDate, day);
          })
          .reduce((total, loss) => {
            return total + loss.quantity;
          }, 0) || 0;
        
        // Calculate previous day's losses for percentage change
        const previousDay = index > 0 ? days[index - 1] : subDays(day, 1);
        const previousDayLosses = losses
          ?.filter(loss => {
            const lossDate = new Date(loss.date);
            return isSameDay(lossDate, previousDay);
          })
          .reduce((total, loss) => {
            return total + loss.quantity;
          }, 0) || 0;
        
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
          ?.filter(loss => {
            const date = new Date(loss.date);
            return date.getMonth() === month && date.getFullYear() === year;
          })
          .reduce((total, loss) => {
            return total + loss.quantity;
          }, 0) || 0;
        
        // Calculate previous month's losses for percentage change
        const previousMonthDate = subMonths(currentDate, 1);
        const previousMonthLosses = losses
          ?.filter(loss => {
            const date = new Date(loss.date);
            return date.getMonth() === previousMonthDate.getMonth() && 
                   date.getFullYear() === previousMonthDate.getFullYear();
          })
          .reduce((total, loss) => {
            return total + loss.quantity;
          }, 0) || 0;
        
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
  const handleViewDetails = (item: any, type: "product" | "material") => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
  
  // Tooltip melhorado para Perdas 
  const LossesTooltip = ({ active, payload, label }: TooltipProps) => {
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
            Perdas: {formatNumberBR(data.losses || 0, { roundBeforeFormat: true })} kg
          </p>
          {/* Mostrar variação se existir e não for NaN */}
          {percentageChangeValue !== undefined && 
           percentageChangeValue !== null && 
           !isNaN(percentageChangeValue) && 
           percentageChangeValue !== 0 && (
            <div className="flex items-center text-xs mt-1">
              <span className="mr-1 text-muted-foreground">Variação:</span>
              {percentageChangeValue > 0 ? (
                <span className="flex items-center text-red-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{percentageChangeValue.toFixed(1)}%
                </span>
              ) : (
                <span className="flex items-center text-emerald-600">
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
  
  // Tooltip customizado melhorado para Produção vs Vendas
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateLabel = showDailyChart 
        ? format(data.date, "EEEE, dd 'de' MMMM", { locale: ptBR })
        : format(data.date, "MMMM 'de' yyyy", { locale: ptBR });
      
      return (
        <div className="bg-background border border-border p-2 rounded-md shadow-md">
          <p className="font-medium">{dateLabel}</p>
          {payload.map((entry: ChartEntry, index: number) => {
            const isProduction = entry.name === "Produção (kg)";
            const percentChange = isProduction ? data.productionChange : data.salesChange;
            
            return (
              <div key={`item-${index}`} className="flex flex-col">
                <p className="text-sm" style={{ color: entry.color }}>
                  {entry.name}: {formatNumberBR(entry.value, { roundBeforeFormat: true })} kg
                </p>
                
                {/* Mostrar variação se existir e não for NaN */}
                {percentChange !== undefined && 
                 percentChange !== null && 
                 !isNaN(percentChange) && 
                 percentChange !== 0 && (
                  <div className="flex items-center text-xs ml-2 mt-1">
                    <span className="mr-1 text-muted-foreground">Variação:</span>
                    {percentChange > 0 ? (
                      <span className="flex items-center text-emerald-600">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{percentChange.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
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
  
  // Stats para exibição, incluindo a capacidade produtiva e o estoque de fécula
  const statsForDisplay = {
    ...dashboardStats, // Isso já inclui totalFeculaInventoryKg e currentInventory (produtos acabados)
    capacidadeProdutiva: currentCapacidadeProdutiva,
  };
  
  // Loading state rendering
  if (isLoading.products || isLoading.materialBatches || isLoading.globalSettings) {
    return (
      <div className="space-y-6 animate-fade-in flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium">Carregando dados do dashboard...</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>
      <div className="flex flex-col gap-4 p-2 sm:p-4 md:p-6">
        <div className="w-full sm:w-auto">
          <SimpleDateFilter compact dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>

        {/* Seção de estatísticas */}
        <StatsSection stats={statsForDisplay} changes={percentChanges} />

        {/* Gráficos Corrigidos */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card className="group relative overflow-hidden backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/20 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                Produção vs Vendas
                <span className="text-sm font-normal text-muted-foreground ml-auto">
                  {showDailyChart ? 'Visão Diária' : 'Visão Mensal'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              {/* Fundo gradiente REMOVIDO */}
              <ChartContainer config={{}} className="h-[300px] w-full">
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey={showDailyChart ? "day" : "month"}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="production" 
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#3b82f6' }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#3b82f6' }}
                    name="Produção (kg)" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#10b981' }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#10b981' }}
                    name="Vendas (kg)" 
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/20 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-lg">
                  <TrendingDown className="h-5 w-5" />
                </div>
                Perdas por Período
                <span className="text-sm font-normal text-muted-foreground ml-auto">
                  {showDailyChart ? 'Diário' : 'Mensal'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              {/* Fundo gradiente REMOVIDO */}
              <ChartContainer config={{}} className="h-[300px] w-full">
                <LineChart data={getLossesChartData()}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey={showDailyChart ? "day" : "month"}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<LossesTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="losses" 
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#ef4444' }}
                    activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#ef4444' }}
                    name="Perdas (kg)" 
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card className="animate-scale-in" style={{ animationDelay: "0.5s" }}>
            <CardHeader>
              <CardTitle className="flex items-center">
                Estoque de Produtos Acabados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Tabela tradicional para telas médias/grandes */}
              <div className="overflow-x-auto hidden sm:block">
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
                        <TableRow key={product.name} className="hover:bg-muted/50">
                          <TableCell className="font-medium align-middle">{product.name}</TableCell>
                          <TableCell className="align-middle">{formatNumberBR(product.total)}</TableCell>
                          <TableCell className="align-middle">{product.unitOfMeasure === 'kg' ? 'unidades' : product.unitOfMeasure}</TableCell>
                          <TableCell className="text-right align-middle">
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
              </div>
              {/* Cards para mobile */}
              <div className="block sm:hidden space-y-4">
                {productTotals.length > 0 ? (
                  productTotals.map((product) => (
                    <div key={product.name} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-base">{product.name}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(product, "product")}
                          className="ml-2"
                        >
                          <Info className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">Quantidade</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatNumberBR(product.total)}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">Unidade</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{product.unitOfMeasure === 'kg' ? 'unidades' : product.unitOfMeasure}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-300">
                    Nenhum produto disponível em estoque.
                  </div>
                )}
              </div>
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
                      <div className="overflow-x-auto">
                        {/* Tabela tradicional para telas médias/grandes */}
                        <div className="overflow-x-auto hidden sm:block">
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
                                <TableRow key={material.name} className="hover:bg-muted/50">
                                  <TableCell className="font-medium align-middle">{material.name}</TableCell>
                                  <TableCell className="align-middle">
                                    {typeGroup.type.toLowerCase().includes('fécula') ? (
                                      <span>
                                        {formatNumberBR(material.total)} sacos
                                      </span>
                                    ) : (
                                      formatNumberBR(material.total)
                                    )}
                                  </TableCell>
                                  <TableCell className="align-middle">
                                    {typeGroup.type.toLowerCase().includes('fécula') ? 'sacos' : (material.unitOfMeasure === 'kg' ? 'unidades' : material.unitOfMeasure)}
                                  </TableCell>
                                  <TableCell className="text-right align-middle">
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
                        {/* Cards para mobile */}
                        <div className="block sm:hidden space-y-4">
                          {typeGroup.materials.length > 0 ? (
                            typeGroup.materials.map((material) => (
                              <div key={material.name} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-2 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-base">{material.name}</span>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleViewDetails(material, "material")}
                                    className="ml-2"
                                  >
                                    <Info className="h-4 w-4 mr-1" />
                                    Detalhes
                                  </Button>
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                  <div>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">Tipo</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{typeGroup.type}</span>
                                  </div>
                                  <div>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">Quantidade</span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{typeGroup.type.toLowerCase().includes('fécula') ? `${formatNumberBR(material.total)} sacos` : formatNumberBR(material.total)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">Unidade</span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{typeGroup.type.toLowerCase().includes('fécula') ? 'sacos' : (material.unitOfMeasure === 'kg' ? 'unidades' : material.unitOfMeasure)}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-300">
                              Nenhum material disponível em estoque.
                            </div>
                          )}
                        </div>
                      </div>
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
