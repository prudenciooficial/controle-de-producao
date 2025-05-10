
import React, { useEffect, useState } from 'react';
import { fetchProductionBatches } from '@/services/productionService';
import { fetchSales } from '@/services/salesService';
import { DateFilterChart } from '@/components/dashboard/DateFilterChart';
import { useData } from '@/context/DataContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, PackageCheck, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [productionData, setProductionData] = useState<{ date: Date, quantity: number }[]>([]);
  const [salesData, setSalesData] = useState<{ date: Date, quantity: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // For inventory filtering
  const [productSearch, setProductSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");

  const { getAvailableProducts, getAvailableMaterials, isLoading } = useData();
  const availableProducts = getAvailableProducts();
  const availableMaterials = getAvailableMaterials();

  // Filter products
  const filteredProducts = availableProducts.filter(
    (product) =>
      product.productName?.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.batchNumber?.toLowerCase().includes(productSearch.toLowerCase())
  );
  
  // Filter materials
  const filteredMaterials = availableMaterials.filter(
    (material) =>
      material.materialName?.toLowerCase().includes(materialSearch.toLowerCase()) ||
      material.batchNumber?.toLowerCase().includes(materialSearch.toLowerCase()) ||
      material.materialType?.toLowerCase().includes(materialSearch.toLowerCase())
  );

  // Group materials by type
  const groupedMaterials = filteredMaterials.reduce((acc, material) => {
    const type = material.materialType || "Desconhecido";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(material);
    return acc;
  }, {} as Record<string, typeof filteredMaterials>);
  
  // Get material type icon
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
  
  // Calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: Date | undefined) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Get expiry badge
  const getExpiryBadge = (expiryDate: Date | undefined) => {
    if (!expiryDate) return null;
    
    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
    
    if (daysUntilExpiry === null) return null;
    
    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="destructive">Vence em {daysUntilExpiry} dias</Badge>;
    } else if (daysUntilExpiry <= 90) {
      return <Badge className="bg-yellow-500">Vence em {daysUntilExpiry} dias</Badge>;
    } else {
      return <Badge variant="outline">{new Date(expiryDate).toLocaleDateString()}</Badge>;
    }
  };

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
      
      <div className="space-y-6">
        <DateFilterChart
          productionData={productionData}
          salesData={salesData}
        />

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Estoque</CardTitle>
              <CardDescription>
                Situação atual do estoque de produtos e matérias-primas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="produtos">
                <TabsList className="mb-4">
                  <TabsTrigger value="produtos">Produtos Acabados</TabsTrigger>
                  <TabsTrigger value="materiais">Matérias-Primas</TabsTrigger>
                </TabsList>
                
                <TabsContent value="produtos">
                  <div className="mb-4">
                    <Input
                      placeholder="Buscar por produto ou lote..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead>Produzido</TableHead>
                          <TableHead>Disponível</TableHead>
                          <TableHead>Un.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading.productionBatches ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                            </TableCell>
                          </TableRow>
                        ) : filteredProducts.length > 0 ? (
                          filteredProducts.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.productName}</TableCell>
                              <TableCell>{product.batchNumber}</TableCell>
                              <TableCell>{product.quantity}</TableCell>
                              <TableCell>{product.remainingQuantity}</TableCell>
                              <TableCell>{product.unitOfMeasure}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              Nenhum produto disponível em estoque.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="materiais">
                  <div className="mb-4">
                    <Input
                      placeholder="Buscar por insumo, tipo ou lote..."
                      value={materialSearch}
                      onChange={(e) => setMaterialSearch(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  
                  {isLoading.materialBatches ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : Object.keys(groupedMaterials).length > 0 ? (
                    Object.entries(groupedMaterials).map(([type, materials]) => (
                      <div key={type} className="mb-8">
                        <h3 className="text-lg font-medium mb-4 flex items-center">
                          {getMaterialTypeIcon(type)}
                          <span className="ml-2">{type}</span>
                        </h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Insumo</TableHead>
                                <TableHead>Lote</TableHead>
                                <TableHead>Recebido</TableHead>
                                <TableHead>Disponível</TableHead>
                                <TableHead>Un.</TableHead>
                                <TableHead>Validade</TableHead>
                                <TableHead>Laudo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {materials.map((material) => (
                                <TableRow key={material.id}>
                                  <TableCell className="font-medium">{material.materialName || "Nome não disponível"}</TableCell>
                                  <TableCell>{material.batchNumber}</TableCell>
                                  <TableCell>{material.suppliedQuantity}</TableCell>
                                  <TableCell>{material.remainingQuantity}</TableCell>
                                  <TableCell>{material.unitOfMeasure}</TableCell>
                                  <TableCell>
                                    {getExpiryBadge(material.expiryDate)}
                                  </TableCell>
                                  <TableCell>
                                    {material.hasReport ? (
                                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                        Sim
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                        Não
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      Nenhum material disponível em estoque.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
