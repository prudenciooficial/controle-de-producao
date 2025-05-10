
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useData } from '@/context/DataContext';

export default function Production() {
  const navigate = useNavigate();
  const { materials, products, addProductionBatch, isLoading } = useData();

  const [batchNumber, setBatchNumber] = useState("");
  const [productionDate, setProductionDate] = useState<Date | null>(new Date());
  const [mixDay, setMixDay] = useState<Date | null>(new Date());
  const [mixCount, setMixCount] = useState(1);
  const [notes, setNotes] = useState("");

  const [producedItems, setProducedItems] = useState<Array<{
    productId: string;
    quantity: number;
    unitOfMeasure: string;
    batchNumber: string;
  }>>([]);

  const [usedMaterials, setUsedMaterials] = useState<Array<{
    materialBatchId: string;
    quantity: number;
    unitOfMeasure: string;
  }>>([]);

  const addProducedItem = () => {
    setProducedItems([
      ...producedItems,
      {
        productId: products?.[0]?.id || "",
        quantity: 0,
        unitOfMeasure: products?.[0]?.unitOfMeasure || "",
        batchNumber: batchNumber || ""
      }
    ]);
  };

  const updateProducedItem = (index: number, field: keyof typeof producedItems[0], value: any) => {
    const newItems = [...producedItems];
    
    if (field === 'productId' && products) {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index] = {
          ...newItems[index],
          productId: value,
          unitOfMeasure: selectedProduct.unitOfMeasure
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    setProducedItems(newItems);
  };

  const removeProducedItem = (index: number) => {
    setProducedItems(producedItems.filter((_, i) => i !== index));
  };

  const addUsedMaterial = () => {
    if (materials && materials.length > 0) {
      const materialBatches = materials[0]?.batches || [];
      const firstBatch = materialBatches.length > 0 ? materialBatches[0] : null;
      
      setUsedMaterials([
        ...usedMaterials,
        {
          materialBatchId: firstBatch?.id || "",
          quantity: 0,
          unitOfMeasure: firstBatch?.unitOfMeasure || ""
        }
      ]);
    }
  };

  const updateUsedMaterial = (index: number, field: keyof typeof usedMaterials[0], value: any) => {
    const newMaterials = [...usedMaterials];
    
    if (field === 'materialBatchId' && materials) {
      // Find the material batch to get its unit of measure
      for (const material of materials) {
        const batch = material.batches?.find(b => b.id === value);
        if (batch) {
          newMaterials[index] = {
            ...newMaterials[index],
            materialBatchId: value,
            unitOfMeasure: batch.unitOfMeasure
          };
          break;
        }
      }
    } else {
      newMaterials[index] = { ...newMaterials[index], [field]: value };
    }
    
    setUsedMaterials(newMaterials);
  };

  const removeUsedMaterial = (index: number) => {
    setUsedMaterials(usedMaterials.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!batchNumber) {
      toast.error("Número de lote é obrigatório");
      return;
    }

    if (!productionDate) {
      toast.error("Data de produção é obrigatória");
      return;
    }

    if (!mixDay) {
      toast.error("Dia da Mexida é obrigatório");
      return;
    }

    if (producedItems.length === 0) {
      toast.error("Adicione pelo menos um item produzido");
      return;
    }

    if (usedMaterials.length === 0) {
      toast.error("Adicione pelo menos um material utilizado");
      return;
    }

    // Validate produced items
    for (let i = 0; i < producedItems.length; i++) {
      const item = producedItems[i];
      
      if (!item.productId) {
        toast.error(`Selecione um produto para o item ${i + 1}`);
        return;
      }
      
      if (item.quantity <= 0) {
        toast.error(`Quantidade deve ser maior que zero para o item ${i + 1}`);
        return;
      }
    }

    // Validate used materials
    for (let i = 0; i < usedMaterials.length; i++) {
      const material = usedMaterials[i];
      
      if (!material.materialBatchId) {
        toast.error(`Selecione um lote de material para o item ${i + 1}`);
        return;
      }
      
      if (material.quantity <= 0) {
        toast.error(`Quantidade deve ser maior que zero para o material ${i + 1}`);
        return;
      }
    }

    addProductionBatch({
      batchNumber,
      productionDate: productionDate as Date,
      mixDay: format(mixDay as Date, 'yyyy-MM-dd'), // Format as ISO string for dates
      mixCount,
      notes,
      producedItems,
      usedMaterials
    }, {
      onSuccess: () => {
        toast.success("Lote de produção criado com sucesso");
        navigate("/producao/historico");
      },
      onError: (error) => {
        console.error("Error creating production batch:", error);
        toast.error("Erro ao criar lote de produção");
      }
    });
  };

  if (isLoading.materials || isLoading.products) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Nova Produção</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Informações do Lote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchNumber">Número do Lote</Label>
              <Input
                id="batchNumber"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Ex: L-20250510-001"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Data de Produção</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {productionDate ? format(productionDate, 'dd/MM/yyyy') : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={productionDate || undefined}
                    onSelect={setProductionDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Dia da Mexida</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {mixDay ? format(mixDay, 'dd/MM/yyyy') : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={mixDay || undefined}
                    onSelect={setMixDay}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mixCount">Quantidade de Mexidas</Label>
              <Input
                id="mixCount"
                type="number"
                min="1"
                value={mixCount}
                onChange={(e) => setMixCount(parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre a produção"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Itens Produzidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {producedItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-4">
                  <Label>Produto</Label>
                  <Select
                    value={item.productId}
                    onValueChange={(value) => updateProducedItem(index, 'productId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateProducedItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Unidade</Label>
                  <Input value={item.unitOfMeasure} disabled />
                </div>
                <div className="sm:col-span-3">
                  <Label>Número do Lote</Label>
                  <Input
                    value={item.batchNumber}
                    onChange={(e) => updateProducedItem(index, 'batchNumber', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-1">
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeProducedItem(index)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              type="button"
              onClick={addProducedItem}
            >
              Adicionar Produto
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Materiais Utilizados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usedMaterials.map((material, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-6">
                  <Label>Lote de Material</Label>
                  <Select
                    value={material.materialBatchId}
                    onValueChange={(value) => updateUsedMaterial(index, 'materialBatchId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um lote de material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials?.flatMap(material => (
                        material.batches?.map(batch => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {material.name} - Lote {batch.batchNumber} - Restante: {batch.remainingQuantity} {batch.unitOfMeasure}
                          </SelectItem>
                        )) || []
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="0"
                    value={material.quantity}
                    onChange={(e) => updateUsedMaterial(index, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Unidade</Label>
                  <Input value={material.unitOfMeasure} disabled />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeUsedMaterial(index)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              type="button"
              onClick={addUsedMaterial}
              disabled={!materials || materials.length === 0 || materials.every(m => !m.batches || m.batches.length === 0)}
            >
              Adicionar Material
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => navigate("/producao/historico")}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading.productionBatches}
        >
          {isLoading.productionBatches ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
