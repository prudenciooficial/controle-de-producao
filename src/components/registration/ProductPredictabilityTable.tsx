
import React, { useState, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Product } from "@/types";
import { updateProduct } from "@/services";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ExtendedProduct extends Product {
  isEditing?: boolean;
}

const ProductPredictabilityTable = () => {
  const { products, refetchProducts } = useData();
  const [search, setSearch] = useState("");
  const [editableProducts, setEditableProducts] = useState<ExtendedProduct[]>([]);
  const [activeTab, setActiveTab] = useState("weight");
  
  useEffect(() => {
    // Initialize products with weight factor, default to 1 if not set
    const productsWithWeightFactor = products.map(product => ({
      ...product,
      weightFactor: product.weightFactor || 1,
      feculaConversionFactor: product.feculaConversionFactor || 25,
      productionPredictionFactor: product.productionPredictionFactor || 3.5,
      isEditing: false
    }));
    setEditableProducts(productsWithWeightFactor);
  }, [products]);
  
  const filteredProducts = editableProducts.filter(
    product => 
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.code.toLowerCase().includes(search.toLowerCase())
  );
  
  const handleEdit = (id: string) => {
    setEditableProducts(prev => 
      prev.map(product => 
        product.id === id 
          ? { ...product, isEditing: true } 
          : product
      )
    );
  };
  
  const handleCancel = (id: string) => {
    setEditableProducts(prev => 
      prev.map(product => {
        if (product.id === id) {
          const originalProduct = products.find(p => p.id === id);
          return { 
            ...originalProduct!, 
            weightFactor: originalProduct?.weightFactor || 1,
            feculaConversionFactor: originalProduct?.feculaConversionFactor || 25,
            productionPredictionFactor: originalProduct?.productionPredictionFactor || 3.5,
            isEditing: false 
          };
        }
        return product;
      })
    );
  };
  
  const handleInputChange = (id: string, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditableProducts(prev => 
      prev.map(product => 
        product.id === id 
          ? { ...product, [field]: numValue } 
          : product
      )
    );
  };
  
  const handleSave = async (id: string) => {
    const product = editableProducts.find(p => p.id === id);
    if (!product) return;
    
    try {
      const updateFields: Partial<Product> = {};
      
      if (activeTab === "weight") {
        updateFields.weightFactor = product.weightFactor;
      } else if (activeTab === "fecula") {
        updateFields.feculaConversionFactor = product.feculaConversionFactor;
        updateFields.productionPredictionFactor = product.productionPredictionFactor;
      }
      
      await updateProduct(id, updateFields);
      
      setEditableProducts(prev => 
        prev.map(p => 
          p.id === id ? { ...p, isEditing: false } : p
        )
      );
      
      toast({
        title: activeTab === "weight" ? "Fator de peso atualizado" : "Fatores de cálculo atualizados",
        description: `Os fatores para ${product.name} foram atualizados com sucesso.`
      });
      
      // Refresh products to get updated data
      refetchProducts();
    } catch (error) {
      console.error("Erro ao atualizar fatores:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao atualizar os fatores.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Buscar produtos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="weight">Previsibilidade de Peso</TabsTrigger>
          <TabsTrigger value="fecula">Cálculos de Fécula e Produção</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weight">
          <div className="mb-4 p-4 bg-muted/50 rounded-md">
            <h3 className="font-medium mb-2">Sobre a Previsibilidade</h3>
            <p className="text-sm text-muted-foreground">
              Configure quanto cada unidade de produto representa em peso. Por exemplo:<br/>
              • Produto de 1kg = fator 1 (1 unidade = 1kg)<br/>
              • Produto de 500g = fator 0.5 (1 unidade = 0.5kg)<br/>
              • Caixa com 10 unidades de 1kg = fator 10 (1 unidade = 10kg)
            </p>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Unidade Base</TableHead>
                <TableHead>Fator de Peso (kg)</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.code}</TableCell>
                    <TableCell>{product.unitOfMeasure}</TableCell>
                    <TableCell>
                      {product.isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={product.weightFactor}
                          onChange={e => handleInputChange(product.id, "weightFactor", e.target.value)}
                          className="w-24"
                        />
                      ) : (
                        product.weightFactor
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {product.isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSave(product.id)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(product.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="fecula">
          <div className="mb-4 p-4 bg-muted/50 rounded-md">
            <h3 className="font-medium mb-2">Sobre os Cálculos de Produção</h3>
            <p className="text-sm text-muted-foreground">
              Configure os fatores de cálculo para fécula e produção:<br/>
              • <strong>Fator de Conversão Fécula:</strong> Valor multiplicador para converter sacos de fécula em kg (padrão: 25)<br/>
              • <strong>Fator de Previsão Produção:</strong> Valor multiplicador para prever kg de produção a partir da fécula utilizada (padrão: 3.5)
            </p>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Fator Conversão Fécula</TableHead>
                <TableHead>Fator Previsão Produção</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.code}</TableCell>
                    <TableCell>
                      {product.isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={product.feculaConversionFactor}
                          onChange={e => handleInputChange(product.id, "feculaConversionFactor", e.target.value)}
                          className="w-24"
                        />
                      ) : (
                        product.feculaConversionFactor
                      )}
                    </TableCell>
                    <TableCell>
                      {product.isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={product.productionPredictionFactor}
                          onChange={e => handleInputChange(product.id, "productionPredictionFactor", e.target.value)}
                          className="w-24"
                        />
                      ) : (
                        product.productionPredictionFactor
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {product.isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSave(product.id)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(product.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductPredictabilityTable;
