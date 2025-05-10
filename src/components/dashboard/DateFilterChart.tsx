
import React, { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, differenceInDays, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

interface DateFilterChartProps {
  productionData: { date: Date, quantity: number }[];
  salesData: { date: Date, quantity: number }[];
}

export function DateFilterChart({ productionData, salesData }: DateFilterChartProps) {
  // Default to last 30 days
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setDate(today.getDate() - 30);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: oneMonthAgo,
    to: today
  });

  // Function to aggregate data by day or month based on date range
  const aggregateData = () => {
    if (!dateRange?.from || !dateRange?.to) return [];
    
    const days = differenceInDays(dateRange.to, dateRange.from) + 1;
    const useMonthly = days > 31; // Use monthly aggregation if more than 31 days
    
    const dataMap = new Map();
    
    if (useMonthly) {
      // Monthly aggregation
      let currentDate = startOfMonth(new Date(dateRange.from));
      const endDate = endOfMonth(new Date(dateRange.to));
      
      while (currentDate <= endDate) {
        const key = format(currentDate, 'yyyy-MM');
        const label = format(currentDate, 'MMM yyyy');
        
        if (!dataMap.has(key)) {
          dataMap.set(key, { 
            date: label, 
            production: 0, 
            sales: 0 
          });
        }
        
        // Move to next month
        currentDate = addMonths(currentDate, 1);
      }
      
      // Aggregate production data
      productionData.forEach(item => {
        const itemDate = new Date(item.date);
        if (itemDate >= dateRange.from && itemDate <= dateRange.to) {
          const key = format(itemDate, 'yyyy-MM');
          if (dataMap.has(key)) {
            const entry = dataMap.get(key);
            entry.production += item.quantity;
            dataMap.set(key, entry);
          }
        }
      });
      
      // Aggregate sales data
      salesData.forEach(item => {
        const itemDate = new Date(item.date);
        if (itemDate >= dateRange.from && itemDate <= dateRange.to) {
          const key = format(itemDate, 'yyyy-MM');
          if (dataMap.has(key)) {
            const entry = dataMap.get(key);
            entry.sales += item.quantity;
            dataMap.set(key, entry);
          }
        }
      });
    } else {
      // Daily aggregation
      let currentDate = new Date(dateRange.from);
      const endDate = new Date(dateRange.to);
      
      while (currentDate <= endDate) {
        const key = format(currentDate, 'yyyy-MM-dd');
        const label = format(currentDate, 'dd/MM');
        
        if (!dataMap.has(key)) {
          dataMap.set(key, { 
            date: label, 
            production: 0, 
            sales: 0 
          });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Aggregate production data
      productionData.forEach(item => {
        const itemDate = new Date(item.date);
        if (itemDate >= dateRange.from && itemDate <= dateRange.to) {
          const key = format(itemDate, 'yyyy-MM-dd');
          if (dataMap.has(key)) {
            const entry = dataMap.get(key);
            entry.production += item.quantity;
            dataMap.set(key, entry);
          }
        }
      });
      
      // Aggregate sales data
      salesData.forEach(item => {
        const itemDate = new Date(item.date);
        if (itemDate >= dateRange.from && itemDate <= dateRange.to) {
          const key = format(itemDate, 'yyyy-MM-dd');
          if (dataMap.has(key)) {
            const entry = dataMap.get(key);
            entry.sales += item.quantity;
            dataMap.set(key, entry);
          }
        }
      });
    }
    
    // Convert map to array and sort by date
    return Array.from(dataMap.values());
  };
  
  const chartData = aggregateData();
  
  // Calculate statistics based on filtered data
  const totalProduction = chartData.reduce((sum, item) => sum + item.production, 0);
  const totalSales = chartData.reduce((sum, item) => sum + item.sales, 0);
  const averageProfitability = totalProduction > 0 ? ((totalSales / totalProduction) * 100).toFixed(2) : '0';

  // Helper function to set predefined date ranges
  const setLastMonth = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    setDateRange({ from: start, to: end });
  };

  const setLastThreeMonths = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    setDateRange({ from: start, to: end });
  };

  const setLastSixMonths = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    setDateRange({ from: start, to: end });
  };

  const setYearToDate = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1); // January 1st of current year
    setDateRange({ from: start, to: end });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={setLastMonth}
            className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
          >
            Último mês
          </button>
          <button 
            onClick={setLastThreeMonths}
            className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
          >
            3 Meses
          </button>
          <button 
            onClick={setLastSixMonths}
            className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
          >
            6 Meses
          </button>
          <button 
            onClick={setYearToDate}
            className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
          >
            Este ano
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Produção Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProduction.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidade Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProfitability}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produção vs. Vendas</CardTitle>
          <CardDescription>
            {differenceInDays(dateRange?.to || new Date(), dateRange?.from || new Date()) > 31 
              ? 'Visualização mensal' 
              : 'Visualização diária'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="production"
                  name="Produção"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  name="Vendas" 
                  stroke="#82ca9d" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
