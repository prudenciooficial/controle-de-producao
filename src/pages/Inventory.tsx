import React, { useState, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, PackageCheck, Loader2, Info } from "lucide-react";
import { InventoryDetailsDialog } from "@/components/inventory/InventoryDetailsDialog";

const Inventory = () => {
  const { getAvailableProducts, getAvailableMaterials, materialBatches, isLoading } = useData();
  const [productSearch, setProductSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"product" | "material">("product");
  const [selectedBatches, setSelectedBatches] = useState<any[]>([]);
  
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
      material.materialName?.toLowerCase().includes(materialSearch.toLowerCase()) ||
      material.batchNumber?.toLowerCase().includes(materialSearch.toLowerCase()) ||
      material.materialType?.toLowerCase().includes(materialSearch.toLowerCase())
  );
  
  // Group materials by type with null/undefined check
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
  
  // Group products by name
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const name = product.productName;
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(product);
    return acc;
  }, {} as Record<string, typeof filteredProducts>);
  
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
  });
  
  // Calculate total quantity for each material type
  const materialTypeTotals = Object.entries(groupedMaterials).map(([type, materials]) => {
    const total = materials.reduce((sum, m) => sum + m.remainingQuantity, 0);
    
    // Group materials by name within each type
    const groupedByName = materials.reduce((acc, material) => {
      const name = material.materialName || "";
      if (!acc[name]) {
        acc[name] = [];
      }
      acc[name].push(material);
      return acc;
    }, {} as Record<string, typeof materials>);
    
    // Calculate total for each material name
    const materialTotals = Object.entries(groupedByName).map(([name, materials]) => {
      const total = materials.reduce((sum, m) => sum + m.remainingQuantity, 0);
      const unitOfMeasure = materials[0]?.unitOfMeasure || "kg";
      const firstMaterial = materials[0];
      
      return {
        name,
        total,
        unitOfMeasure,
        materials,
        firstMaterial
      };
    });
    
    return {
      type,
      total,
      materials: materialTotals
    };
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
  
  // Get expiry badge
  const getExpiryBadge = (expiryDate: Date | undefined) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (diffDays <= 30) {
      return <Badge variant="destructive">Vence em {diffDays} dias</Badge>;
    } else if (diffDays <= 90) {
      return <Badge className="bg-yellow-500">Vence em {diffDays} dias</Badge>;
    } else {
      return <Badge variant="outline">{new Date(expiryDate).toLocaleDateString()}</Badge>;
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
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
              {isLoading.productionBatches ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <Input
                      placeholder="Buscar por produto ou lote..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader sticky>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Quantidade Total</TableHead>
                          <TableHead>Un.</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productTotals.length > 0 ? (
                          productTotals.map((product) => (
                            <TableRow key={product.name}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.total}</TableCell>
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
                  </div>
                </>
              )}
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
              {isLoading.materialBatches ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <Input
                      placeholder="Buscar por insumo, tipo ou lote..."
                      value={materialSearch}
                      onChange={(e) => setMaterialSearch(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  
                  {materialTypeTotals.length > 0 ? (
                    materialTypeTotals.map((typeGroup) => (
                      <div key={typeGroup.type} className="mb-8">
                        <h3 className="text-lg font-medium mb-4 flex items-center">
                          {getMaterialTypeIcon(typeGroup.type)}
                          <span className="ml-2">{typeGroup.type}</span>
                          <span className="ml-2 text-muted-foreground text-sm">
                            ({typeGroup.total} kg total)
                          </span>
                        </h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader sticky>
                              <TableRow>
                                <TableHead>Insumo</TableHead>
                                <TableHead>Quantidade Total</TableHead>
                                <TableHead>Un.</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {typeGroup.materials.map((material) => (
                                <TableRow key={material.name}>
                                  <TableCell className="font-medium">{material.name}</TableCell>
                                  <TableCell>{material.total}</TableCell>
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
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      Nenhum material disponível em estoque.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
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

export default Inventory;
