
import React, { useEffect, useState } from 'react';
import { fetchProductionBatches } from '@/services/productionService';
import { fetchSales } from '@/services/salesService';
import { fetchMaterialBatchesWithDetails } from '@/services/materialsService';
import { DateFilterChart } from '@/components/dashboard/DateFilterChart';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [productionData, setProductionData] = useState<{ date: Date, quantity: number }[]>([]);
  const [salesData, setSalesData] = useState<{ date: Date, quantity: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch production batches
        const productionBatches = await fetchProductionBatches();
        
        // Transform production data
        const productionStats = productionBatches.map(batch => {
          // Sum up all produced items in this batch
          const totalProduced = batch.producedItems.reduce(
            (sum, item) => sum + item.quantity, 
            0
          );
          
          return {
            date: batch.productionDate,
            quantity: totalProduced
          };
        });
        
        // Fetch sales
        const allSales = await fetchSales();
        
        // Transform sales data
        const salesStats = allSales.map(sale => {
          // Sum up all items in this sale
          const totalSold = sale.items.reduce(
            (sum, item) => sum + item.quantity, 
            0
          );
          
          return {
            date: sale.date,
            quantity: totalSold
          };
        });
        
        // Update state
        setProductionData(productionStats);
        setSalesData(salesStats);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Erro ao carregar dados do dashboard");
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500">{error}</h2>
          <p>Por favor, tente novamente mais tarde.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <DateFilterChart
        productionData={productionData}
        salesData={salesData}
      />
    </div>
  );
}
