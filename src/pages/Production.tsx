import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { History, Plus, Trash, Package, Factory, ClipboardList, FlaskConical, Loader2, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";
import { fetchAvailableMixBatches } from "@/services/mixService";
import type { MixBatch } from "@/types/mix";
import type { ProductionBatch } from "@/types";

// Schema for form validation
const productionFormSchema = z.object({
  productionDate: z.string().nonempty({ message: "Data de produção é obrigatória" }),
  batchNumber: z.string().nonempty({ message: "Lote de produção é obrigatório" }),
  mixProductionBatchId: z.string().nonempty({ message: "Mexida é obrigatória" }),
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
    })
  ).optional().default([]),
});

type ProductionFormValues = z.infer<typeof productionFormSchema>;

const generateSuggestedBatchNumber = (
  batches: ProductionBatch[] | undefined
): string => {
  const defaultInitialSuggestion = "1";

  if (!batches || batches.length === 0) {
    return defaultInitialSuggestion;
  }

  let maxNum = 0;
  let prefixForMaxNum = ""; 
  let foundNumericBatch = false;

  batches.forEach(batch => {
    if (batch && typeof batch.batchNumber === 'string') {
      const bn = batch.batchNumber;
      const match = bn.match(/^(.*?)(\d+)$/); 

      if (match) {
        foundNumericBatch = true;
        const currentNum = parseInt(match[2], 10);
        if (currentNum >= maxNum) {
          maxNum = currentNum;
          prefixForMaxNum = match[1]; 
        }
      }
    }
  });

  if (!foundNumericBatch) {
    return defaultInitialSuggestion;
  }
  
  return `${prefixForMaxNum}${maxNum + 1}`;
};

const Production = () => {
  const { 
    products, 
    materialBatches, 
    addProductionBatch, 
    productionBatches, 
    isLoading,
    refetchProductionBatches,
  } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission, user, getUserDisplayName } = useAuth();
  const isMobile = useIsMobile();
  
  const today = getTodayDateString();
  const [availableMixes, setAvailableMixes] = useState<MixBatch[]>([]);
  const [isLoadingMixes, setIsLoadingMixes] = useState<boolean>(true);

  const loadAvailableMixes = useCallback(async () => {
    try {
      // console.log("🔄 Buscando mexidas disponíveis...");
      const mixes = await fetchAvailableMixBatches();
      // console.log("✅ Mexidas carregadas:", mixes.length, "mexidas encontradas");
      setAvailableMixes(mixes);
      
      if (mixes.length === 0) {
        // console.warn("⚠️ Nenhuma mexida disponível encontrada");
        toast({
          title: "Aviso",
          description: "Nenhuma mexida disponível para produção. Registre uma mexida primeiro.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("❌ Erro ao buscar mexidas:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar mexidas disponíveis.",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      productionDate: today,
      batchNumber: "",
      mixProductionBatchId: "",
      notes: "",
      producedItems: [{ productId: "", quantity: 0 }],
      usedMaterials: [],
    },
  });

  // useEffect para sugerir o número do lote
  React.useEffect(() => {
    if (!isLoading.productionBatches && productionBatches && Array.isArray(productionBatches)) {
      const suggestedBatch = generateSuggestedBatchNumber(productionBatches);
      const currentBatchValue = form.getValues("batchNumber");
      
      if (!form.formState.dirtyFields.batchNumber && currentBatchValue === "") {
        form.setValue("batchNumber", suggestedBatch, { shouldValidate: false, shouldDirty: false });
      }
    }
  }, [isLoading.productionBatches, productionBatches, form]);
  
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

  const watchedMixId = form.watch("mixProductionBatchId");

  // Buscar detalhes da mexida selecionada
  const selectedMixDetails = React.useMemo(() => {
    if (!watchedMixId) return null;
    return availableMixes.find(mix => mix.id === watchedMixId);
  }, [watchedMixId, availableMixes]);

  const getProductDetails = React.useCallback((productId: string) => {
    return products.find((p) => p.id === productId);
  }, [products]);
  
  const getMaterialBatchDetails = React.useCallback((materialBatchId: string) => {
    return materialBatches.find((m) => m.id === materialBatchId);
  }, [materialBatches]);

  const onSubmit = async (data: ProductionFormValues) => {
    if (!hasPermission('production', 'create')) {
      toast({ variant: "destructive", title: "Acesso Negado", description: "Você não tem permissão para registrar novas produções." });
      return;
    }

    // Validação extra: verificar se há mexidas disponíveis
    if (isLoadingMixes) {
      toast({ variant: "destructive", title: "Aguarde", description: "Aguarde o carregamento das mexidas." });
      return;
    }

    if (availableMixes.length === 0) {
      toast({ 
        variant: "destructive", 
        title: "Nenhuma mexida disponível", 
        description: "Você precisa criar uma mexida antes de registrar a produção." 
      });
      return;
    }

    if (!data.mixProductionBatchId) {
      toast({ variant: "destructive", title: "Mexida obrigatória", description: "Selecione uma mexida antes de continuar." });
      return;
    }

    if (!selectedMixDetails) {
      toast({ variant: "destructive", title: "Mexida obrigatória", description: "Selecione uma mexida antes de continuar." });
      return;
    }

    try {
      const producedItemsData = data.producedItems.map((item) => {
        const product = getProductDetails(item.productId);
        if (!product) throw new Error(`Produto não encontrado: ${item.productId}`);
        return {
          productId: item.productId, productName: product.name, quantity: item.quantity,
          unitOfMeasure: product.unitOfMeasure, batchNumber: data.batchNumber, remainingQuantity: item.quantity,
        };
      });

      // Processar apenas insumos adicionais (se houver)
      let usedMaterialsPayload: Array<{
        materialBatchId: string;
        materialName: string;
        materialType: string;
        batchNumber: string;
        quantity: number;
        unitOfMeasure: string;
        mixCountUsed: null;
      }> = [];
      
      if (data.usedMaterials && data.usedMaterials.length > 0) {
        const additionalMaterials = data.usedMaterials.map((item) => {
          const materialBatch = getMaterialBatchDetails(item.materialBatchId);
          if (!materialBatch) throw new Error(`Lote de insumo não encontrado: ${item.materialBatchId}`);
          return {
            materialBatchId: item.materialBatchId, 
            materialName: materialBatch.materialName, 
            materialType: materialBatch.materialType,
            batchNumber: materialBatch.batchNumber, 
            quantity: 0, // Quantidade zerada pois não é mais controlada aqui
            unitOfMeasure: materialBatch.unitOfMeasure, 
            mixCountUsed: null,
          };
        });
        usedMaterialsPayload = additionalMaterials;
      }
      
      const productionBatchPayload = {
        batchNumber: data.batchNumber, 
        productionDate: parseDateString(data.productionDate), 
        mixDay: selectedMixDetails.mixDay,
        mixCount: selectedMixDetails.mixCount, 
        notes: data.notes, 
        producedItems: producedItemsData, 
        usedMaterials: usedMaterialsPayload,
        isMixOnly: false,
        mixProductionBatchId: selectedMixDetails.id,
        status: undefined,
      } as Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">;
      
      await addProductionBatch(productionBatchPayload);
      
      // Refresh dos dados do contexto
      try {
        console.log("🔄 Atualizando dados do contexto...");
        await refetchProductionBatches();
        console.log("✅ Dados do contexto atualizados com sucesso");
        
        // Atualizar também as mexidas disponíveis
        console.log("🔄 Atualizando mexidas disponíveis...");
        const updatedMixes = await fetchAvailableMixBatches();
        setAvailableMixes(updatedMixes);
        console.log("✅ Mexidas atualizadas:", updatedMixes.length, "mexidas disponíveis");
      } catch (error) {
        console.error("❌ Erro ao atualizar dados do contexto:", error);
      }
      
      form.reset({
        productionDate: today, 
        batchNumber: generateSuggestedBatchNumber(productionBatches),
        mixProductionBatchId: "",
        notes: "",
        producedItems: [{ productId: "", quantity: 0 }], 
        usedMaterials: [],
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao registrar produção", description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar a produção." });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Registrar Nova Produção</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/mexida")}>
            <FlaskConical className="mr-2 h-4 w-4" /> Nova Mexida
          </Button>
          <Button variant="outline" onClick={() => navigate("/producao/historico")}>
            <History className="mr-2 h-4 w-4" /> Histórico de Produção
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClipboardList className="h-5 w-5" />
                <span>Detalhes da Produção</span>
              </CardTitle>
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
              <FormField 
                control={form.control} 
                name="mixProductionBatchId" 
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Mexida</FormLabel>
                    {isLoadingMixes ? (
                      <div className="flex items-center justify-center p-4 border rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Carregando mexidas...</span>
                      </div>
                    ) : availableMixes.length === 0 ? (
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-center p-4 border border-dashed rounded-md">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                          <span className="text-sm text-muted-foreground">Nenhuma mexida disponível</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/mexida")}
                          className="w-full"
                        >
                          <FlaskConical className="mr-2 h-4 w-4" />
                          Criar Nova Mexida
                        </Button>
                      </div>
                    ) : (
                      <Combobox
                        options={availableMixes.map(mix => ({ 
                          value: mix.id, 
                          label: `${mix.batchNumber} (${mix.mixCount} mexidas)`
                        }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione uma mexida"
                        searchPlaceholder="Buscar mexida..."
                        notFoundMessage="Nenhuma mexida disponível."
                      />
                    )}
                    <FormMessage />
                    {selectedMixDetails && (
                      <FormDescription className="text-xs">
                        Mexida selecionada: {selectedMixDetails.batchNumber} - {selectedMixDetails.mixCount} mexidas
                      </FormDescription>
                    )}
                  </FormItem>
                )} 
              />
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

          {/* Produtos Acabados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Produtos Acabados</span>
              </CardTitle>
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
                            options={products.map(p => ({ 
                              value: p.id, 
                              label: `${p.name} (${p.unitOfMeasure})`
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
                            <Input 
                              type="number" 
                              placeholder="0"
                              value={field.value == null || field.value === 0 ? "" : field.value}
                              onChange={e => {
                                const inputValue = e.target.value;
                                if (inputValue === "") {
                                  field.onChange(null);
                                } else {
                                  const value = parseFloat(inputValue) || 0;
                                  field.onChange(value);
                                }
                              }}
                              onBlur={e => {
                                const inputValue = e.target.value;
                                if (inputValue === "") {
                                  field.onChange(0);
                                } else {
                                  const value = parseFloat(inputValue) || 0;
                                  field.onChange(value);
                                }
                              }}
                            />
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
              
              {(() => {
                const piValues = form.watch("producedItems");
                if (piValues && piValues.length > 0) {
                  const totalKg = piValues.reduce((acc, piv) => {
                    const pDetails = getProductDetails(piv.productId);
                    const qty = (typeof piv.quantity === 'number' && piv.quantity > 0) ? piv.quantity : 0;
                    let itemKg = 0;
                    if (pDetails && typeof pDetails.weightFactor === 'number') itemKg = qty * pDetails.weightFactor;
                    return acc + itemKg;
                  }, 0);
                  if (totalKg > 0) return (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-semibold text-right">
                        Total Produzido: {totalKg.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })} kg
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </CardContent>
          </Card>

          {/* Insumos Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Factory className="h-5 w-5" />
                <span>Insumos Adicionais</span>
              </CardTitle>
              <CardDescription>Selecione os insumos adicionais utilizados na produção.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aviso sobre o registro */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Informação sobre Controle</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Selecione apenas os lotes de insumos adicionais utilizados na produção.
                      <strong> Para controle de estoque, utilize o módulo Estoque na aba "Baixa de Estoque".</strong>
                    </p>
                  </div>
                </div>
              </div>
              
              {usedMaterialFields.map((item, index) => {
                const selMatBatchId = form.watch(`usedMaterials.${index}.materialBatchId`);
                const matBatchDetails = getMaterialBatchDetails(selMatBatchId);
                
                return (
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
                    
                    <div className="grid gap-4 items-start grid-cols-1">
                      <FormField 
                        control={form.control} 
                        name={`usedMaterials.${index}.materialBatchId`} 
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Insumo e Lote</FormLabel>
                            <Combobox 
                              options={availableMaterialBatches.map(b => ({ 
                                value: b.id, 
                                label: `${b.materialName} (Lote: ${b.batchNumber}, Rest: ${b.remainingQuantity} ${b.unitOfMeasure})`
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
                    </div>
                    
                    {(() => { 
                      if (selMatBatchId && matBatchDetails) {
                        return (
                          <FormDescription className="mt-2 text-xs">
                            <strong>Selecionado:</strong> {matBatchDetails.materialName} / {matBatchDetails.batchNumber} 
                            {' - '} <strong>Tipo:</strong> {matBatchDetails.materialType}
                            {' - '} <strong>Disponível:</strong> {matBatchDetails.remainingQuantity} {matBatchDetails.unitOfMeasure}
                          </FormDescription>
                        ); 
                      }
                      return null; 
                    })()}
                  </Card>
                );
              })}
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => appendUsedMaterial({ materialBatchId: "" })} 
                className="mt-4 w-full"
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar Insumo
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">
              <Factory className="mr-2 h-4 w-4" />
              Registrar Produção
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default Production;

