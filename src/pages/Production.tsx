
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Plus, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";

// Schema for form validation
const productionFormSchema = z.object({
  productionDate: z.string().nonempty({ message: "Data de produção é obrigatória" }),
  batchNumber: z.string().nonempty({ message: "Lote de produção é obrigatório" }),
  mixDate: z.string().nonempty({ message: "Data da mexida é obrigatória" }),
  mixCount: z
    .number()
    .int()
    .positive({ message: "Quantidade de mexidas deve ser maior que zero" }),
  notes: z.string().optional(),
  producedItems: z.array(
    z.object({
      productId: z.string().nonempty({ message: "Produto é obrigatório" }),
      quantity: z
        .number()
        .positive({ message: "Quantidade deve ser maior que zero" }),
    })
  ).nonempty({ message: "Adicione pelo menos um produto produzido" }),
  usedMaterials: z.array(
    z.object({
      materialBatchId: z.string().nonempty({ message: "Insumo é obrigatório" }),
      quantity: z
        .number()
        .positive({ message: "Quantidade deve ser maior que zero" }),
    })
  ).nonempty({ message: "Adicione pelo menos um insumo utilizado" }),
});

type ProductionFormValues = z.infer<typeof productionFormSchema>;

const Production = () => {
  const { products, materialBatches, addProductionBatch } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const today = getTodayDateString();
  
  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      productionDate: today,
      batchNumber: `PROD-${today}`,
      mixDate: today,
      mixCount: 1,
      notes: "",
      producedItems: [{ productId: "", quantity: 0 }],
      usedMaterials: [
        { materialBatchId: "", quantity: 0 },
      ],
    },
  });
  
  const { fields: producedItemFields, append: appendProducedItem, remove: removeProducedItem } = 
    useFieldArray({
      control: form.control,
      name: "producedItems",
    });
  
  const { fields: usedMaterialFields, append: appendUsedMaterial, remove: removeUsedMaterial } = 
    useFieldArray({
      control: form.control,
      name: "usedMaterials",
    });
  
  const availableMaterialBatches = materialBatches.filter(
    (batch) => batch.remainingQuantity > 0
  );
  
  // Get product details
  const getProductDetails = (productId: string) => {
    return products.find((p) => p.id === productId);
  };
  
  // Get material batch details
  const getMaterialBatchDetails = (materialBatchId: string) => {
    return materialBatches.find((m) => m.id === materialBatchId);
  };
  
  const onSubmit = (data: ProductionFormValues) => {
    try {
      // Prepare producedItems with additional data
      const producedItems = data.producedItems.map((item) => {
        const product = getProductDetails(item.productId);
        
        if (!product) {
          throw new Error(`Produto não encontrado: ${item.productId}`);
        }
        
        return {
          id: Math.random().toString(36).substring(2, 15),
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          unitOfMeasure: product.unitOfMeasure,
          batchNumber: data.batchNumber, // FIXED: Use only the batch number without product code
          remainingQuantity: item.quantity,
        };
      });
      
      // Prepare usedMaterials with additional data
      const usedMaterials = data.usedMaterials.map((item) => {
        const materialBatch = getMaterialBatchDetails(item.materialBatchId);
        
        if (!materialBatch) {
          throw new Error(`Lote de insumo não encontrado: ${item.materialBatchId}`);
        }
        
        if (materialBatch.remainingQuantity < item.quantity) {
          throw new Error(`Quantidade insuficiente de ${materialBatch.materialName} no lote ${materialBatch.batchNumber}`);
        }
        
        return {
          id: Math.random().toString(36).substring(2, 15),
          materialBatchId: item.materialBatchId,
          materialName: materialBatch.materialName,
          materialType: materialBatch.materialType,
          batchNumber: materialBatch.batchNumber,
          quantity: item.quantity,
          unitOfMeasure: materialBatch.unitOfMeasure,
        };
      });
      
      // Create and add production batch
      const productionBatch = {
        batchNumber: data.batchNumber,
        productionDate: parseDateString(data.productionDate),
        mixDay: data.mixDate,
        mixCount: data.mixCount,
        notes: data.notes,
        producedItems,
        usedMaterials,
      };
      
      addProductionBatch(productionBatch);
      
      
      // Reset form
      form.reset({
        productionDate: today,
        batchNumber: `PROD-${today}`,
        mixDate: today,
        mixCount: 1,
        notes: "",
        producedItems: [{ productId: "", quantity: 0 }],
        usedMaterials: [{ materialBatchId: "", quantity: 0 }],
      });
    } catch (error) {
      console.error("Erro ao registrar produção:", error);
      toast({
        variant: "destructive",
        title: "Erro ao registrar produção",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar a produção.",
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Produção</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate("/producao/historico")}>
            <History className="mr-2 h-4 w-4" />
            Histórico
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="nova-producao" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="nova-producao">Nova Produção</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nova-producao">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Nova Produção</CardTitle>
              <CardDescription>
                Registre os detalhes da produção, produtos produzidos e insumos utilizados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Production details */}
                  <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4")}>
                    <FormField
                      control={form.control}
                      name="productionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Produção</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="batchNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lote de Produção</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="mixDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Mexida</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="mixCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade de Mexidas</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Produced items */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Produtos Produzidos</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendProducedItem({ productId: "", quantity: 0 })}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Produto
                      </Button>
                    </div>
                    
                    {producedItemFields.map((field, index) => (
                      <div
                        key={field.id}
                        className={cn("grid gap-4 p-4 border rounded-md", 
                          isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}
                      >
                        <FormField
                          control={form.control}
                          name={`producedItems.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Produto</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o produto" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id}
                                    >
                                      {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex space-x-2">
                          <FormField
                            control={form.control}
                            name={`producedItems.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Quantidade</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {index > 0 && (
                            <div className="flex items-end mb-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => removeProducedItem(index)}
                              >
                                <Trash className="h-5 w-5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Used materials */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Insumos Utilizados</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendUsedMaterial({ materialBatchId: "", quantity: 0 })}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Insumo
                      </Button>
                    </div>
                    
                    {usedMaterialFields.map((field, index) => (
                      <div
                        key={field.id}
                        className={cn("grid gap-4 p-4 border rounded-md", 
                          isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}
                      >
                        <FormField
                          control={form.control}
                          name={`usedMaterials.${index}.materialBatchId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Insumo (Lote)</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o insumo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableMaterialBatches.map((batch) => (
                                    <SelectItem key={batch.id} value={batch.id}>
                                      {batch.materialName} - {batch.batchNumber} ({batch.remainingQuantity} {batch.unitOfMeasure})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex space-x-2">
                          <FormField
                            control={form.control}
                            name={`usedMaterials.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Quantidade</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {index > 0 && (
                            <div className="flex items-end mb-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => removeUsedMaterial(index)}
                              >
                                <Trash className="h-5 w-5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Observações sobre a produção"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full">
                    Registrar Produção
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Production;
