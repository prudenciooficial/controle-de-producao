
import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, PackageCheck } from "lucide-react";

const Inventory = () => {
  const { getAvailableProducts, getAvailableMaterials, materialBatches } = useData();
  const [productSearch, setProductSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  
  const availableProducts = getAvailableProducts();
  const availableMaterials = getAvailableMaterials();
  
  // Filter products
  const filteredProducts = availableProducts.filter(
    (product) =>
      product.productName.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.batchNumber.toLowerCase().includes(productSearch.toLowerCase())
  );
  
  // Filter materials
  const filteredMaterials = availableMaterials.filter(
    (material) =>
      material.materialName.toLowerCase().includes(materialSearch.toLowerCase()) ||
      material.batchNumber.toLowerCase().includes(materialSearch.toLowerCase()) ||
      material.materialType.toLowerCase().includes(materialSearch.toLowerCase())
  );
  
  // Group materials by type
  const groupedMaterials = filteredMaterials.reduce((acc, material) => {
    const type = material.materialType;
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
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Estoque</h1>
      </div>
      
      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="produtos">Produtos Acabados</TabsTrigger>
          <TabsTrigger value="materiais">Matérias-Primas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="produtos">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PackageCheck className="mr-2 h-5 w-5" />
                Estoque de Produtos Acabados
              </CardTitle>
              <CardDescription>
                Produtos produzidos disponíveis em estoque.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Input
                  placeholder="Buscar por produto ou lote..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>
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
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.productName}</TableCell>
                        <TableCell>{product.batchNumber}</TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>{product.remainingQuantity}</TableCell>
                        <TableCell>{product.unitOfMeasure}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Nenhum produto disponível em estoque.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="materiais">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Estoque de Matérias-Primas
              </CardTitle>
              <CardDescription>
                Insumos disponíveis para produção.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Input
                  placeholder="Buscar por insumo, tipo ou lote..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              {Object.keys(groupedMaterials).length > 0 ? (
                Object.entries(groupedMaterials).map(([type, materials]) => (
                  <div key={type} className="mb-8">
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      {getMaterialTypeIcon(type)}
                      <span className="ml-2">{type}</span>
                    </h3>
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
                            <TableCell>{material.materialName}</TableCell>
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
                ))
              ) : (
                <div className="text-center py-4">
                  Nenhum material disponível em estoque.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventory;
