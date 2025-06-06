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
import { History, Plus, Trash, Package, Factory, ClipboardList, FlaskConical, Loader2, AlertTriangle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { fetchAvailableMixBatches, fetchMixBatches } from "@/services/mixService";
import type { MixBatch } from "@/types/mix";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
      quantity: z
        .number()
        .min(0, { message: "Quantidade não pode ser negativa" }),
    })
  ).optional().default([]),
});

type ProductionFormValues = z.infer<typeof productionFormSchema>;

// Definindo os passos/abas
const TABS = [
  { id: "info", name: "Informações Gerais", fields: ["productionDate", "batchNumber", "mixProductionBatchId", "notes"] as const, icon: ClipboardList },
  { id: "products", name: "Produtos Acabados", fields: ["producedItems"] as const, icon: Package },
  { id: "materials", name: "Insumos Adicionais", fields: ["usedMaterials"] as const, icon: Factory },
];

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
    refetchMaterialBatches,
    refetchProducts
  } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  
  const today = getTodayDateString();
  const [activeTabId, setActiveTabId] = useState<string>(TABS[0].id);
  const [globalConservantUsageFactor, setGlobalConservantUsageFactor] = useState<number | null>(null);
  const [isLoadingFactor, setIsLoadingFactor] = useState<boolean>(true);
  const [isDistributeSectionVisible, setIsDistributeSectionVisible] = useState(false);
  const [showConservantConflictModal, setShowConservantConflictModal] = useState(false);
  const [conflictingConservantInfo, setConflictingConservantInfo] = useState<{ index: number; materialName: string } | null>(null);
  const previousConservantCountRef = React.useRef(0);
  const [availableMixes, setAvailableMixes] = useState<MixBatch[]>([]);
  const [isLoadingMixes, setIsLoadingMixes] = useState<boolean>(true);

  // useEffect para buscar mexidas disponíveis
  React.useEffect(() => {
    const fetchMixes = async () => {
      setIsLoadingMixes(true);
      try {
        console.log("🔄 Buscando mexidas disponíveis...");
        const mixes = await fetchAvailableMixBatches();
        console.log("✅ Mexidas carregadas:", mixes.length, "mexidas encontradas");
        console.log("📋 Mexidas:", mixes);
        setAvailableMixes(mixes);
        
        if (mixes.length === 0) {
          console.warn("⚠️ Nenhuma mexida disponível encontrada");
          toast({ 
            variant: "default", 
            title: "Aviso", 
            description: "Nenhuma mexida disponível encontrada. Você precisa criar uma mexida primeiro." 
          });
        }
      } catch (error) {
        console.error("❌ Erro ao buscar mexidas:", error);
        toast({ 
          variant: "destructive", 
          title: "Erro ao carregar mexidas", 
          description: "Não foi possível carregar as mexidas disponíveis. Verifique a conexão com o banco de dados." 
        });
      } finally {
        setIsLoadingMixes(false);
      }
    };
    
    fetchMixes();
  }, [toast]);

  // useEffect para buscar fatores globais (posição original)
  React.useEffect(() => {
    const fetchGlobalFactors = async () => {
      setIsLoadingFactor(true);
      try {
        const { data, error } = await supabase
          .from("global_settings")
          .select("conservant_usage_factor")
          .limit(1)
          .single();

        if (error) {
          toast({ variant: "destructive", title: "Erro ao buscar fator", description: "Não foi possível buscar o fator de uso de conservante." });
          setGlobalConservantUsageFactor(0.1);
        } else if (data && typeof data.conservant_usage_factor === 'number') {
          setGlobalConservantUsageFactor(data.conservant_usage_factor === 0 ? 0.1 : data.conservant_usage_factor);
        } else {
          setGlobalConservantUsageFactor(0.1);
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Erro inesperado", description: "Ocorreu um erro ao buscar o fator de uso." });
        setGlobalConservantUsageFactor(0.1);
      } finally {
        setIsLoadingFactor(false);
      }
    };
    fetchGlobalFactors();
  }, [toast]);
  
  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      productionDate: today,
      batchNumber: "", // Inicialmente vazio
      mixProductionBatchId: "",
      notes: "",
      producedItems: [{ productId: "", quantity: 0 }],
      usedMaterials: [],
    },
  });

  // useEffect para sugerir o número do lote (APÓS form init e APÓS fetchGlobalFactors useEffect)
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

  // Buscar mexidas disponíveis - agora usando fetchAvailableMixBatches do mixService

  const watchedUsedMaterials = form.watch("usedMaterials");
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

  const conservantMaterials = React.useMemo(() => {
    const materials = watchedUsedMaterials
      .filter(material => material.materialBatchId)
      .map(material => {
        const batch = getMaterialBatchDetails(material.materialBatchId);
        return batch;
      })
      .filter(batch => batch && batch.materialType === "Conservante")
      .map(batch => ({
        id: batch!.id,
        materialBatchId: batch!.id,
        materialName: batch!.materialName,
        materialType: batch!.materialType,
        batchNumber: batch!.batchNumber,
        quantity: batch!.remainingQuantity,
        unitOfMeasure: "kg",
      }));
    return materials;
  }, [watchedUsedMaterials, materialBatches, getMaterialBatchDetails]);

  const {
    conservantUsages,
    isValid: conservantValid,
    validationError: conservantError,
    updateMixCount,
    getConservantMaterials,
  } = useConservantLogic(conservantMaterials, 1, globalConservantUsageFactor !== null ? globalConservantUsageFactor : 0.1);

  const directlyCalculatedConservantMaterialsCount = watchedUsedMaterials.filter(material => {
    if (!material.materialBatchId) return false;
    const details = getMaterialBatchDetails(material.materialBatchId);
    return details && details.materialType === "Conservante";
  }).length;

  React.useEffect(() => {
    if (directlyCalculatedConservantMaterialsCount <= 1 && isDistributeSectionVisible) {
      setIsDistributeSectionVisible(false);
    }
  }, [directlyCalculatedConservantMaterialsCount, isDistributeSectionVisible]);

  React.useEffect(() => {
    const currentConservantsInfo = watchedUsedMaterials
      .map((material, index) => {
        if (!material.materialBatchId) return null;
        const details = getMaterialBatchDetails(material.materialBatchId);
        if (details && details.materialType === "Conservante") {
          return { ...details, originalIndex: index };
        }
        return null;
      })
      .filter(Boolean) as (ReturnType<typeof getMaterialBatchDetails> & { materialType: "Conservante", originalIndex: number })[];

    const newConservantCount = currentConservantsInfo.length;

    if (
      newConservantCount >= 2 &&
      previousConservantCountRef.current < 2 && 
      !isDistributeSectionVisible && 
      !showConservantConflictModal 
    ) {
      const lastAddedConservant = currentConservantsInfo.sort((a, b) => b.originalIndex - a.originalIndex)[0];
      
      if (lastAddedConservant) {
        setConflictingConservantInfo({ 
          index: lastAddedConservant.originalIndex, 
          materialName: lastAddedConservant.materialName 
        });
        setShowConservantConflictModal(true);
      }
    }
    previousConservantCountRef.current = newConservantCount;
  }, [watchedUsedMaterials, getMaterialBatchDetails, isDistributeSectionVisible, showConservantConflictModal, materialBatches]);

  React.useEffect(() => {
    const currentUsedMaterials = form.getValues("usedMaterials");
    if (conservantUsages.length > 0 && currentUsedMaterials.length > 0) {
      currentUsedMaterials.forEach((formMaterial, index) => {
        const logicUsage = conservantUsages.find(cu => cu.materialBatchId === formMaterial.materialBatchId);
        if (logicUsage) { 
          const currentFormQuantity = formMaterial.quantity;
          const calculatedLogicQuantity = logicUsage.quantity;
          if (Math.abs(currentFormQuantity - calculatedLogicQuantity) > 0.0001) {
            form.setValue(`usedMaterials.${index}.quantity`, calculatedLogicQuantity, { shouldValidate: true, shouldDirty: true });
          }
        }
      });
    }
  }, [conservantUsages, form]);

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

    if (directlyCalculatedConservantMaterialsCount > 1 && !isDistributeSectionVisible) {
      toast({ variant: "default", title: "Distribuição de Conservantes Pendente", description: "Por favor, confirme a distribuição de mexidas entre os lotes de conservantes através do pop-up." });
      return;
    }

    if (isDistributeSectionVisible && conservantMaterials.length > 0 && !conservantValid) {
      toast({ variant: "destructive", title: "Erro na distribuição de conservantes", description: conservantError });
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
      let usedMaterialsPayload: any[] = [];
      
      if (data.usedMaterials && data.usedMaterials.length > 0) {
        const additionalMaterials = data.usedMaterials.map((item) => {
          const materialBatch = getMaterialBatchDetails(item.materialBatchId);
          if (!materialBatch) throw new Error(`Lote de insumo não encontrado: ${item.materialBatchId}`);
          if (materialBatch.remainingQuantity < item.quantity) throw new Error(`Quantidade insuficiente de ${materialBatch.materialName} no lote ${materialBatch.batchNumber}`);
          return {
            materialBatchId: item.materialBatchId, materialName: materialBatch.materialName, materialType: materialBatch.materialType,
            batchNumber: materialBatch.batchNumber, quantity: item.quantity, unitOfMeasure: materialBatch.unitOfMeasure, mixCountUsed: null,
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
        status: undefined as any, // VALOR UNDEFINED PARA EVITAR CONSTRAINT
      } as Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">;
      
      await addProductionBatch(productionBatchPayload);
      
      // Refresh dos dados do contexto primeiro para sincronização rápida
      try {
        console.log("🔄 Atualizando dados do contexto...");
        await Promise.all([
          refetchProductionBatches(),
          refetchMaterialBatches()
        ]);
        console.log("✅ Dados do contexto atualizados com sucesso");
        
        // Atualizar também as mexidas disponíveis
        console.log("🔄 Atualizando mexidas disponíveis...");
        const updatedMixes = await fetchAvailableMixBatches();
        setAvailableMixes(updatedMixes);
        console.log("✅ Mexidas atualizadas:", updatedMixes.length, "mexidas disponíveis");
      } catch (error) {
        console.error("❌ Erro ao atualizar dados do contexto:", error);
      }
      
      // Refresh automático da página para sincronização completa
      setTimeout(() => {
        console.log("🔄 Recarregando página para sincronização completa...");
        window.location.reload();
      }, 2000);
      
      form.reset({
        productionDate: today, 
        batchNumber: generateSuggestedBatchNumber(productionBatches), // Sugestão no reset
        mixProductionBatchId: "",
        notes: "",
        producedItems: [{ productId: "", quantity: 0 }], 
        usedMaterials: [],
      });
      setIsDistributeSectionVisible(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao registrar produção", description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar a produção." });
    }
  };

  const handleNext = async () => {
    const currentTabIndex = TABS.findIndex(tab => tab.id === activeTabId);
    const currentTabFields = TABS[currentTabIndex].fields;
    const isValid = await form.trigger(currentTabFields as any); 
    if (isValid && currentTabIndex < TABS.length - 1) setActiveTabId(TABS[currentTabIndex + 1].id);
  };

  const handlePrevious = () => {
    const currentTabIndex = TABS.findIndex(tab => tab.id === activeTabId);
    if (currentTabIndex > 0) setActiveTabId(TABS[currentTabIndex - 1].id);
  };

  const currentTabIndex = TABS.findIndex(tab => tab.id === activeTabId);
  
  // LOGS PARA DEPURAR O CICLO DE RENDERIZAÇÃO
  console.log('[Production] Render. Directly Calculated Conservants Count:', directlyCalculatedConservantMaterialsCount);
  console.log('[Production] Render. ConservantMaterials (prop para o hook):', JSON.stringify(conservantMaterials, null, 2));
  console.log('[Production] Render. ConservantUsages (retorno do hook):', JSON.stringify(conservantUsages, null, 2));
  console.log('[Production] Render. isDistributeSectionVisible:', isDistributeSectionVisible);

  const shouldShowMixFieldsSection = isDistributeSectionVisible && directlyCalculatedConservantMaterialsCount > 1;
  const conservantDataIsReadyForMixFields = shouldShowMixFieldsSection && conservantUsages.length === directlyCalculatedConservantMaterialsCount;

  console.log('[Production] Render. shouldShowMixFieldsSection:', shouldShowMixFieldsSection);
  console.log('[Production] Render. conservantDataIsReadyForMixFields:', conservantDataIsReadyForMixFields);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <div>
          <h1 className="text-2xl font-bold">Registrar Nova Produção</h1>
          <p className="text-sm text-muted-foreground">Segunda etapa: Selecione uma mexida e registre os produtos acabados</p>
        </div>
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
          <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
            <TabsList className={cn("grid w-full grid-cols-3 mb-6", isMobile && "grid-cols-1 h-auto")}>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} >
                  <tab.icon className="mr-2 h-4 w-4" /> {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="info" forceMount className={cn(activeTabId !== "info" && "hidden")} >
              <Card>
                <CardHeader><CardTitle>Detalhes da Produção</CardTitle><CardDescription>Forneça os detalhes básicos da produção.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                  <div className={cn("grid grid-cols-2 gap-6", isMobile && "grid-cols-1")}>
                    <FormField control={form.control} name="productionDate" render={({ field }) => (<FormItem><FormLabel>Data da Produção</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="batchNumber" render={({ field }) => (<FormItem><FormLabel>Lote de Produção</FormLabel><FormControl><Input placeholder="Ex: PROD-2024-07-27" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className={cn("grid grid-cols-2 gap-6", isMobile && "grid-cols-1")}>
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
                  </div>
                  <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Alguma observação relevante sobre a produção..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" forceMount className={cn(activeTabId !== "products" && "hidden")} >
              <Card>
                <CardHeader><CardTitle>Produtos Acabados</CardTitle><CardDescription>Liste os produtos que foram produzidos neste lote.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {producedItemFields.map((item, index) => (
                    <Card key={item.id} className="p-4 relative bg-muted/30">
                       <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeProducedItem(index)}><Trash className="h-4 w-4" /></Button>
                      <div className={cn("grid grid-cols-2 gap-4 items-end", isMobile && "grid-cols-1")}>
                        <FormField control={form.control} name={`producedItems.${index}.productId`} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Produto</FormLabel><Combobox options={products.map(p => ({ value: p.id, label: `${p.name} (${p.unitOfMeasure})`}))} value={field.value} onValueChange={field.onChange} placeholder="Selecione um produto" searchPlaceholder="Buscar produto..." notFoundMessage="Nenhum produto encontrado."/><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`producedItems.${index}.quantity`} render={({ field }) => (
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
                        )} />
                      </div>
                    </Card>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendProducedItem({ productId: "", quantity: null as any })} className="mt-4 w-full"><Plus className="mr-2 h-4 w-4" /> Adicionar Produto</Button>
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
                      if (totalKg > 0) return (<div className="mt-4 pt-4 border-t"><p className="text-sm font-semibold text-right">Total Produzido: {totalKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</p></div>);
                    }
                    return null;
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials" forceMount className={cn(activeTabId !== "materials" && "hidden")} >
              <Card>
                <CardHeader><CardTitle>Insumos Adicionais</CardTitle><CardDescription>Liste os insumos adicionais utilizados na produção.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {usedMaterialFields.map((item, index) => {
                    const selMatBatchId = form.watch(`usedMaterials.${index}.materialBatchId`);
                    const matBatchDetails = getMaterialBatchDetails(selMatBatchId);
                    const isCons = matBatchDetails && matBatchDetails.materialType === "Conservante";
                    return (
                      <Card key={item.id} className="p-4 relative bg-muted/30">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeUsedMaterial(index)}><Trash className="h-4 w-4" /></Button>
                        <div className={cn("grid grid-cols-2 gap-4 items-end", isMobile && "grid-cols-1")}>
                          <FormField control={form.control} name={`usedMaterials.${index}.materialBatchId`} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Lote do Insumo</FormLabel><Combobox options={availableMaterialBatches.map(b => ({ value: b.id, label: `${b.materialName} (Lote: ${b.batchNumber}, Rest: ${b.remainingQuantity} ${b.unitOfMeasure})`}))} value={field.value} onValueChange={field.onChange} placeholder="Selecione um lote de insumo" searchPlaceholder="Buscar lote..." notFoundMessage="Nenhum lote de insumo encontrado."/><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name={`usedMaterials.${index}.quantity`} render={({ field }) => {
                              const currentQty = form.watch(`usedMaterials.${index}.quantity`);
                              React.useEffect(() => {
                                if (selMatBatchId && typeof currentQty === 'number') {
                                  const cBatchDetails = getMaterialBatchDetails(selMatBatchId);
                                  if (cBatchDetails && cBatchDetails.materialType !== "Conservante") { 
                                    if (currentQty > cBatchDetails.remainingQuantity) form.setError(`usedMaterials.${index}.quantity`, { type: 'manual', message: `Máx: ${cBatchDetails.remainingQuantity} ${cBatchDetails.unitOfMeasure}` });
                                    else if (currentQty <= 0 && cBatchDetails.remainingQuantity > 0) { const err = form.formState.errors.usedMaterials?.[index]?.quantity; if (err && err.type === 'manual') form.clearErrors(`usedMaterials.${index}.quantity`); }
                                    else { const err = form.formState.errors.usedMaterials?.[index]?.quantity; if (err && err.type === 'manual') form.clearErrors(`usedMaterials.${index}.quantity`);}
                                  } else if (cBatchDetails && cBatchDetails.materialType === "Conservante") form.clearErrors(`usedMaterials.${index}.quantity`);
                                  else form.clearErrors(`usedMaterials.${index}.quantity`);
                                } else if (!selMatBatchId) form.clearErrors(`usedMaterials.${index}.quantity`);
                              }, [selMatBatchId, currentQty, index, form, getMaterialBatchDetails]);
                              if (isCons) {
                                if (directlyCalculatedConservantMaterialsCount > 1 && isDistributeSectionVisible) return null; 
                                const uInfo = conservantUsages.find(u => u.materialBatchId === selMatBatchId);
                                const calcQty = uInfo ? uInfo.quantity : 0;
                                return (<FormItem><FormLabel>Quantidade Utilizada (Calculada)</FormLabel><FormControl><Input type="number" value={calcQty.toFixed(3)} readOnly className="bg-muted/50 cursor-default"/></FormControl>{globalConservantUsageFactor !== null && (<FormDescription>Base: {globalConservantUsageFactor.toFixed(3)} {matBatchDetails.unitOfMeasure}/mexida</FormDescription>)}<FormMessage /></FormItem>);
                              } else return (
                                <FormItem>
                                  <FormLabel>Quantidade Utilizada</FormLabel>
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
                              );
                            }} />
                        </div>
                         {(() => { if (selMatBatchId && matBatchDetails) return (<FormDescription className="mt-2 text-xs">Lote selecionado: {matBatchDetails.materialName} / {matBatchDetails.batchNumber} {' - '} Disponível: {matBatchDetails.remainingQuantity} {matBatchDetails.unitOfMeasure}</FormDescription>); return null; })()}
                      </Card>
                    );
                  })}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendUsedMaterial({ materialBatchId: "", quantity: null as any })} className="mt-4 w-full"><Plus className="mr-2 h-4 w-4" /> Adicionar Insumo</Button>
                  
                  {shouldShowMixFieldsSection && (
                    <>
                      {!conservantDataIsReadyForMixFields && (
                        <div className="mt-4 p-4 border-t text-center">
                          <p className="text-sm text-muted-foreground">Preparando dados da distribuição...</p>
                        </div>
                      )}
                      {conservantDataIsReadyForMixFields && (
                        <ConservantMixFields
                          key={conservantUsages.map(u => u.materialBatchId).join('-')} 
                          conservantUsages={conservantUsages}
                          isValid={conservantValid}
                          validationError={conservantError}
                          onMixCountChange={updateMixCount}
                          form={form} 
                        />
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <AlertDialog open={showConservantConflictModal} onOpenChange={setShowConservantConflictModal}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Múltiplos Lotes de Conservantes Detectados</AlertDialogTitle><AlertDialogDescription>Você selecionou mais de um lote para o insumo "{conflictingConservantInfo?.materialName || 'Conservante'}". Deseja remover o último lote adicionado ou continuar e distribuir as mexidas entre eles?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  if (conflictingConservantInfo !== null) {
                    removeUsedMaterial(conflictingConservantInfo.index);
                    setShowConservantConflictModal(false);
                    setIsDistributeSectionVisible(false); 
                    setConflictingConservantInfo(null);
                  }
                }}>Remover Último Lote Adicionado</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  setIsDistributeSectionVisible(true);
                  setShowConservantConflictModal(false);
                  setConflictingConservantInfo(null);
                }}>Continuar e Distribuir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex justify-between mt-8 p-0">
            {currentTabIndex > 0 && (<Button type="button" variant="outline" onClick={handlePrevious} className="md:w-auto">Voltar</Button>)}
            {currentTabIndex < TABS.length - 1 && (<Button type="button" onClick={handleNext} className="ml-auto md:w-auto">Avançar</Button>)}
            {currentTabIndex === TABS.length - 1 && (
              <Button 
                type="submit" 
                disabled={
                  form.formState.isSubmitting || 
                  isLoadingMixes || 
                  availableMixes.length === 0 || 
                  !form.watch("mixProductionBatchId")
                } 
                className="ml-auto md:w-auto"
              >
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

