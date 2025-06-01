import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useConservantLogic } from "@/hooks/useConservantLogic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { ConservantMixFields } from "@/components/production/ConservantMixFields";
import { History, Plus, Trash, Package, Factory, ClipboardList } from "lucide-react";
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

// Definindo os passos/abas
const TABS = [
  { id: "info", name: "Informações Gerais", fields: ["productionDate", "batchNumber", "mixDate", "mixCount", "notes"] as const, icon: ClipboardList },
  { id: "products", name: "Produtos Acabados", fields: ["producedItems"] as const, icon: Package },
  { id: "materials", name: "Insumos Utilizados", fields: ["usedMaterials"] as const, icon: Factory },
];

const Production = () => {
  const { products, materialBatches, addProductionBatch } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  
  const today = getTodayDateString();
  const [activeTabId, setActiveTabId] = useState<string>(TABS[0].id);
  
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

  // Watch form values for conservant logic
  const watchedUsedMaterials = form.watch("usedMaterials");
  const watchedMixCount = form.watch("mixCount");

  // Get conservant materials from selected materials
  const conservantMaterials = React.useMemo(() => {
    return watchedUsedMaterials
      .filter(material => material.materialBatchId)
      .map(material => {
        const batch = getMaterialBatchDetails(material.materialBatchId);
        return batch;
      })
      .filter(batch => batch && batch.materialType === "Conservante")
      .map(batch => ({
        materialBatchId: batch!.id,
        materialName: batch!.materialName,
        materialType: batch!.materialType,
        batchNumber: batch!.batchNumber,
        quantity: batch!.remainingQuantity,
        unitOfMeasure: batch!.unitOfMeasure,
      }));
  }, [watchedUsedMaterials, materialBatches]);

  // Get conservant usage factor from products table
  const conservantUsageFactor = React.useMemo(() => {
    // Get the first product to use its conservant usage factor
    const firstProduct = products[0];
    return firstProduct?.conservantUsageFactor || 0.1;
  }, [products]);

  // Use conservant logic hook
  const {
    conservantUsages,
    isValid: conservantValid,
    validationError: conservantError,
    updateMixCount,
    getConservantMaterials,
    showMixFields
  } = useConservantLogic(conservantMaterials, watchedMixCount, conservantUsageFactor);
  
  // Get product details
  const getProductDetails = (productId: string) => {
    return products.find((p) => p.id === productId);
  };
  
  // Get material batch details
  const getMaterialBatchDetails = (materialBatchId: string) => {
    return materialBatches.find((m) => m.id === materialBatchId);
  };
  
  const onSubmit = (data: ProductionFormValues) => {
    if (!hasPermission('production', 'create')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para registrar novas produções.",
      });
      return;
    }

    // Validate conservant distribution if conservants are present
    if (conservantMaterials.length > 0 && !conservantValid) {
      toast({
        variant: "destructive",
        title: "Erro na distribuição de conservantes",
        description: conservantError,
      });
      return;
    }

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
      
      // Prepare usedMaterials with conservant logic
      let usedMaterials;
      
      if (conservantMaterials.length > 0) {
        // Use conservant materials from the hook
        const conservantUsedMaterials = getConservantMaterials();
        
        // Get non-conservant materials
        const nonConservantMaterials = data.usedMaterials
          .filter(item => {
            const batch = getMaterialBatchDetails(item.materialBatchId);
            return batch && batch.materialType !== "Conservante";
          })
          .map((item) => {
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
        
        usedMaterials = [...conservantUsedMaterials, ...nonConservantMaterials];
      } else {
        // Regular material processing
        usedMaterials = data.usedMaterials.map((item) => {
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
      }
      
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

  const handleNext = async () => {
    const currentTabIndex = TABS.findIndex(tab => tab.id === activeTabId);
    const currentTabFields = TABS[currentTabIndex].fields;
    
    // Validar campos da aba atual
    // @ts-ignore porque TABS[x].fields é um array de strings e trigger espera nomes de campos específicos
    const isValid = await form.trigger(currentTabFields);

    if (isValid && currentTabIndex < TABS.length - 1) {
      setActiveTabId(TABS[currentTabIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const currentTabIndex = TABS.findIndex(tab => tab.id === activeTabId);
    if (currentTabIndex > 0) {
      setActiveTabId(TABS[currentTabIndex - 1].id);
    }
  };

  const currentTabInfo = TABS.find(tab => tab.id === activeTabId) || TABS[0];
  const currentTabIndex = TABS.findIndex(tab => tab.id === activeTabId);
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Registrar Nova Produção</h1>
        <Button variant="outline" onClick={() => navigate("/producao/historico")}>
          <History className="mr-2 h-4 w-4" />
          Histórico de Produção
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
            <TabsList className={cn("grid w-full grid-cols-3 mb-6", isMobile && "grid-cols-1 h-auto")}>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} disabled={tab.id !== activeTabId} onClick={() => setActiveTabId(tab.id)}>
                  <tab.icon className="mr-2 h-4 w-4" /> {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Aba de Informações Gerais */}
            <TabsContent value="info" forceMount className={cn(activeTabId !== "info" && "hidden")} >
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da Produção</CardTitle>
                  <CardDescription>Forneça os detalhes básicos da produção.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={cn("grid grid-cols-2 gap-6", isMobile && "grid-cols-1")}>
                    <FormField
                      control={form.control}
                      name="productionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Produção</FormLabel>
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
                            <Input placeholder="Ex: PROD-2024-07-27" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className={cn("grid grid-cols-2 gap-6", isMobile && "grid-cols-1")}>
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
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Alguma observação relevante sobre a produção..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Produtos Acabados */}
            <TabsContent value="products" forceMount className={cn(activeTabId !== "products" && "hidden")} >
              <Card>
                <CardHeader>
                  <CardTitle>Produtos Acabados</CardTitle>
                  <CardDescription>Liste os produtos que foram produzidos neste lote.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {producedItemFields.map((item, index) => (
                    <Card key={item.id} className="p-4 relative bg-muted/30">
                       <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeProducedItem(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                      <div className={cn("grid grid-cols-2 gap-4 items-end", isMobile && "grid-cols-1")}>
                        <FormField
                          control={form.control}
                          name={`producedItems.${index}.productId`}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Produto</FormLabel>
                              <Combobox
                                options={products.map(product => ({
                                  value: product.id,
                                  label: `${product.name} (${product.unitOfMeasure})`
                                }))}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Selecione um produto"
                                searchPlaceholder="Buscar produto..."
                                notFoundMessage="Nenhum produto encontrado."
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`producedItems.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantidade Produzida</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendProducedItem({ productId: "", quantity: 0 })}
                    className="mt-4 w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
                  </Button>

                  {/* Totalizador de Produção */}
                  {(() => {
                    const producedItemsValues = form.watch("producedItems");
                    if (producedItemsValues && producedItemsValues.length > 0) {
                      const totalWeightInKg = producedItemsValues.reduce((acc, item) => {
                        const productDetails = getProductDetails(item.productId);
                        const quantity = (typeof item.quantity === 'number' && item.quantity > 0) ? item.quantity : 0;
                        
                        let itemWeightInKg = 0;
                        if (productDetails && typeof productDetails.weightFactor === 'number') {
                          itemWeightInKg = quantity * productDetails.weightFactor;
                        }
                        return acc + itemWeightInKg;
                      }, 0);

                      if (totalWeightInKg > 0) {
                        return (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-semibold text-right">
                              Total Produzido: {totalWeightInKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                            </p>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Updated materials tab with conservant logic */}
            <TabsContent value="materials" forceMount className={cn(activeTabId !== "materials" && "hidden")} >
              <Card>
                <CardHeader>
                  <CardTitle>Insumos Utilizados</CardTitle>
                  <CardDescription>Liste os insumos e seus respectivos lotes utilizados na produção.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {usedMaterialFields.map((item, index) => (
                    <Card key={item.id} className="p-4 relative bg-muted/30">
                       <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeUsedMaterial(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                      <div className={cn("grid grid-cols-2 gap-4 items-end", isMobile && "grid-cols-1")}>
                        <FormField
                          control={form.control}
                          name={`usedMaterials.${index}.materialBatchId`}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Lote do Insumo</FormLabel>
                              <Combobox
                                options={availableMaterialBatches.map(batch => ({
                                  value: batch.id,
                                  label: `${batch.materialName} (Lote: ${batch.batchNumber}, Rest: ${batch.remainingQuantity} ${batch.unitOfMeasure})`
                                }))}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Selecione um lote de insumo"
                                searchPlaceholder="Buscar lote..."
                                notFoundMessage="Nenhum lote de insumo encontrado."
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`usedMaterials.${index}.quantity`}
                          render={({ field }) => {
                            const selectedMaterialBatchId = form.watch(`usedMaterials.${index}.materialBatchId`);
                            const currentQuantity = form.watch(`usedMaterials.${index}.quantity`);

                            React.useEffect(() => {
                              if (selectedMaterialBatchId && typeof currentQuantity === 'number') {
                                const materialBatch = getMaterialBatchDetails(selectedMaterialBatchId);
                                if (materialBatch) {
                                  if (currentQuantity > materialBatch.remainingQuantity) {
                                    form.setError(`usedMaterials.${index}.quantity`, {
                                      type: 'manual',
                                      message: `Máx: ${materialBatch.remainingQuantity} ${materialBatch.unitOfMeasure}`,
                                    });
                                  } else if (currentQuantity <= 0 && materialBatch.remainingQuantity > 0) {
                                    const errors = form.formState.errors.usedMaterials?.[index]?.quantity;
                                    if (errors && errors.type === 'manual') {
                                       form.clearErrors(`usedMaterials.${index}.quantity`);
                                    }
                                  } else {
                                    const errors = form.formState.errors.usedMaterials?.[index]?.quantity;
                                    if (errors && errors.type === 'manual') {
                                       form.clearErrors(`usedMaterials.${index}.quantity`);
                                    }
                                  }
                                } else {
                                   form.clearErrors(`usedMaterials.${index}.quantity`);
                                }
                              } else if (!selectedMaterialBatchId) {
                                form.clearErrors(`usedMaterials.${index}.quantity`);
                              }
                            }, [selectedMaterialBatchId, currentQuantity, index, form, getMaterialBatchDetails]);

                            return (
                              <FormItem>
                                <FormLabel>Quantidade Utilizada</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                       {(() => {
                        const watchedBatchId = form.watch(`usedMaterials.${index}.materialBatchId`);
                        if (watchedBatchId) {
                          const details = getMaterialBatchDetails(watchedBatchId);
                          return (
                            <FormDescription className="mt-2 text-xs">
                              Lote selecionado: {details?.materialName} / {details?.batchNumber}
                              {' - '}
                              Disponível: {details?.remainingQuantity} {details?.unitOfMeasure}
                            </FormDescription>
                          );
                        }
                        return null;
                      })()}
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendUsedMaterial({ materialBatchId: "", quantity: 0 })}
                    className="mt-4 w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Insumo
                  </Button>

                  {/* Conservant Mix Fields */}
                  {showMixFields && (
                    <ConservantMixFields
                      conservantUsages={conservantUsages}
                      isValid={conservantValid}
                      validationError={conservantError}
                      onMixCountChange={updateMixCount}
                      form={form}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-8 p-0">
            {currentTabIndex > 0 && (
              <Button type="button" variant="outline" onClick={handlePrevious} className="md:w-auto">
                Voltar
              </Button>
            )}
            {currentTabIndex < TABS.length - 1 && (
              <Button type="button" onClick={handleNext} className="ml-auto md:w-auto">
                Avançar
              </Button>
            )}
            {currentTabIndex === TABS.length - 1 && (
              <Button type="submit" disabled={form.formState.isSubmitting} className="ml-auto md:w-auto">
                {form.formState.isSubmitting ? "Salvando..." : "Salvar Produção"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default Production;
