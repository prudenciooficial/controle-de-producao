
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

interface ExtendedProduct extends Product {
  weightFactor: number;
  feculaConversionFactor?: number;
  productionPredictionFactor?: number;
  isEditing?: boolean;
}

const ProductPredictabilityTable = () => {
  const { products, refetchProducts } = useData();
  const [search, setSearch] = useState("");
  const [editableProducts, setEditableProducts] = useState<ExtendedProduct[]>([]);
  
  useEffect(() => {
    // Initialize products with weight factor, default to 1 if not set
    const productsWithWeightFactor = products.map(product => ({
      ...product,
      weightFactor: product.weightFactor || 1,
      feculaConversionFactor: product.feculaConversionFactor || 25,
      productionPredictionFactor: product.productionPredictionFactor || 5,
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
            productionPredictionFactor: originalProduct?.productionPredictionFactor || 5,
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
      await updateProduct(id, { 
        weightFactor: product.weightFactor,
        feculaConversionFactor: product.feculaConversionFactor,
        productionPredictionFactor: product.productionPredictionFactor
      });
      
      setEditableProducts(prev => 
        prev.map(p => 
          p.id === id ? { ...p, isEditing: false } : p
        )
      );
      
      toast({
        title: "Fatores atualizados",
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
      
      <div className="mb-4 p-4 bg-muted/50 rounded-md">
        <h3 className="font-medium mb-2">Sobre a Previsibilidade</h3>
        <p className="text-sm text-muted-foreground">
          Configure os fatores de previsibilidade e conversão para cada produto:<br/>
          • <strong>Fator de Peso (kg):</strong> Quanto cada unidade de produto representa em peso.<br/>
          • <strong>Fator de Conversão de Fécula:</strong> Fator multiplicador para converter sacos de fécula em kg (normalmente 25).<br/>
          • <strong>Fator de Previsão KG Produção:</strong> Fator multiplicador para estimar kg produzidos a partir de kg de fécula.
        </p>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Unidade Base</TableHead>
            <TableHead>Fator de Peso (kg)</TableHead>
            <TableHead>Fator de Conversão de Fécula</TableHead>
            <TableHead>Fator de Previsão KG Produção</TableHead>
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
                      onChange={e => handleInputChange(product.id, 'weightFactor', e.target.value)}
                      className="w-24"
                    />
                  ) : (
                    product.weightFactor
                  )}
                </TableCell>
                <TableCell>
                  {product.isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={product.feculaConversionFactor}
                      onChange={e => handleInputChange(product.id, 'feculaConversionFactor', e.target.value)}
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
                      onChange={e => handleInputChange(product.id, 'productionPredictionFactor', e.target.value)}
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
              <TableCell colSpan={7} className="text-center">
                Nenhum produto encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductPredictabilityTable;
