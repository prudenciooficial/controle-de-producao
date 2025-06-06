
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useConservantLogic } from "@/hooks/useConservantLogic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { ConservantMixFields } from "@/components/production/ConservantMixFields";
import { History, Plus, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";
import { supabase } from "@/integrations/supabase/client";
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

const mixFormSchema = z.object({
  mixDate: z.string().nonempty({ message: "Data da mexida é obrigatória" }),
  mixCount: z
    .number()
    .int()
    .positive({ message: "Quantidade de mexidas deve ser maior que zero" }),
  notes: z.string().optional(),
  usedMaterials: z.array(
    z.object({
      materialBatchId: z.string().nonempty({ message: "Insumo é obrigatório" }),
      quantity: z
        .number()
        .min(0, { message: "Quantidade não pode ser negativa" }),
    })
  ).nonempty({ message: "Adicione pelo menos um insumo utilizado" }),
});

type MixFormValues = z.infer<typeof mixFormSchema>;

const MixRegistration = () => {
  const { materialBatches, addProductionBatch } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  
  const today = getTodayDateString();
  const [globalConservantUsageFactor, setGlobalConservantUsageFactor] = useState<number | null>(null);
  const [isLoadingFactor, setIsLoadingFactor] = useState<boolean>(true);
  const [isDistributeSectionVisible, setIsDistributeSectionVisible] = useState(false);
  const [showConservantConflictModal, setShowConservantConflictModal] = useState(false);
  const [conflictingConservantInfo, setConflictingConservantInfo] = useState<{ index: number; materialName: string } | null>(null);
  const previousConservantCountRef = React.useRef(0);

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
  
  const form = useForm<MixFormValues>({
    resolver: zodResolver(mixFormSchema),
    defaultValues: {
      mixDate: today,
      mixCount: 1,
      notes: "",
      usedMaterials: [
        { materialBatchId: "", quantity: 0 },
      ],
    },
  });
  
  const { fields: usedMaterialFields, append: appendUsedMaterial, remove: removeUsedMaterial } = 
    useFieldArray({
      control: form.control,
      name: "usedMaterials",
    });
  
  const availableMaterialBatches = materialBatches.filter(
    (batch) => batch.remainingQuantity > 0
  );

  const watchedUsedMaterials = form.watch("usedMaterials");
  const watchedMixCount = form.watch("mixCount");
  
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
  } = useConservantLogic(conservantMaterials, watchedMixCount, globalConservantUsageFactor !== null ? globalConservantUsageFactor : 0.1);

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

  const onSubmit = (data: MixFormValues) => {
    if (!hasPermission('production', 'create')) {
      toast({ variant: "destructive", title: "Acesso Negado", description: "Você não tem permissão para registrar mexidas." });
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
      let usedMaterialsPayload: any[] = []; 
      if (conservantMaterials.length > 0 && isDistributeSectionVisible) { 
        const conservantUsedData = getConservantMaterials(); 
        const nonConservantMaterialsData = data.usedMaterials
          .filter(item => {
            const batchDetails = getMaterialBatchDetails(item.materialBatchId);
            return batchDetails && batchDetails.materialType !== "Conservante";
          })
          .map((item) => {
            const materialBatch = getMaterialBatchDetails(item.materialBatchId);
            if (!materialBatch) throw new Error(`Lote de insumo não encontrado: ${item.materialBatchId}`);
            if (materialBatch.remainingQuantity < item.quantity) throw new Error(`Quantidade insuficiente de ${materialBatch.materialName} no lote ${materialBatch.batchNumber}`);
            return {
              materialBatchId: item.materialBatchId, materialName: materialBatch.materialName, materialType: materialBatch.materialType,
              batchNumber: materialBatch.batchNumber, quantity: item.quantity, unitOfMeasure: materialBatch.unitOfMeasure, mixCountUsed: null,
            };
          });
        usedMaterialsPayload = [...conservantUsedData, ...nonConservantMaterialsData];
      } else {
        usedMaterialsPayload = data.usedMaterials
          .map((item) => {
            const materialBatch = getMaterialBatchDetails(item.materialBatchId);
            if (!materialBatch) throw new Error(`Lote de insumo não encontrado: ${item.materialBatchId}`);
            let finalQuantity = item.quantity;
            let mixCountToUse = null;
            if (materialBatch.materialType === "Conservante") {
              if (directlyCalculatedConservantMaterialsCount === 1) {
                finalQuantity = item.quantity; mixCountToUse = watchedMixCount; 
              } else if (directlyCalculatedConservantMaterialsCount > 1 && (!isDistributeSectionVisible || !conservantValid)) {
                finalQuantity = 0; mixCountToUse = null;
              }
            } else {
                if (materialBatch.remainingQuantity < item.quantity) throw new Error(`Quantidade insuficiente de ${materialBatch.materialName} no lote ${materialBatch.batchNumber}`);
            }
            return {
              materialBatchId: item.materialBatchId, materialName: materialBatch.materialName, materialType: materialBatch.materialType,
              batchNumber: materialBatch.batchNumber, quantity: finalQuantity, unitOfMeasure: materialBatch.unitOfMeasure, mixCountUsed: mixCountToUse,
            };
          });
      }
      
      const mixBatchPayload = {
        batchNumber: `MIX-${new Date().getTime()}`, // Gera um número único para a mexida
        productionDate: parseDateString(data.mixDate), 
        mixDay: data.mixDate,
        mixCount: data.mixCount, 
        notes: data.notes, 
        producedItems: [], // Mexida não tem produtos acabados
        usedMaterials: usedMaterialsPayload,
        isMixOnly: true,
        status: 'mix_only' as const,
      };
      
      addProductionBatch(mixBatchPayload);
      toast({ title: "Mexida Registrada", description: `Mexida registrada com sucesso.` });
      
      // Refresh automático para sincronizar dados
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
      form.reset({
        mixDate: today, 
        mixCount: 1, 
        notes: "",
        usedMaterials: [{ materialBatchId: "", quantity: 0 }],
      });
      setIsDistributeSectionVisible(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao registrar mexida", description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar a mexida." });
    }
  };

  const shouldShowMixFieldsSection = isDistributeSectionVisible && directlyCalculatedConservantMaterialsCount > 1;
  const conservantDataIsReadyForMixFields = shouldShowMixFieldsSection && conservantUsages.length === directlyCalculatedConservantMaterialsCount;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Registrar Nova Mexida</h1>
        <Button variant="outline" onClick={() => navigate("/producao/historico")}>
          <History className="mr-2 h-4 w-4" /> Histórico
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Mexida</CardTitle>
              <CardDescription>Registre os detalhes da mexida que será utilizada posteriormente na produção.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="mixDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Mexida</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mixCount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de Mexidas</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0"
                        value={field.value === 0 ? "" : field.value}
                        onChange={e => {
                          const inputValue = e.target.value;
                          if (inputValue === "") {
                            field.onChange(null);
                          } else {
                            const value = parseInt(inputValue, 10) || 0;
                            field.onChange(value);
                          }
                        }}
                        onBlur={e => {
                          const inputValue = e.target.value;
                          if (inputValue === "") {
                            field.onChange(0);
                          } else {
                            const value = parseInt(inputValue, 10) || 0;
                            field.onChange(value);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Alguma observação relevante sobre a mexida..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Insumos Utilizados na Mexida</CardTitle>
              <CardDescription>Adicione os insumos utilizados na mexida (fécula, sorbato, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {usedMaterialFields.map((item, index) => {
                const selMatBatchId = form.watch(`usedMaterials.${index}.materialBatchId`);
                const matBatchDetails = getMaterialBatchDetails(selMatBatchId);
                const isCons = matBatchDetails && matBatchDetails.materialType === "Conservante";
                return (
                  <Card key={item.id} className="p-4 relative bg-muted/30">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeUsedMaterial(index)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <FormField control={form.control} name={`usedMaterials.${index}.materialBatchId`} render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Lote do Insumo</FormLabel>
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
                      )} />
                      <FormField control={form.control} name={`usedMaterials.${index}.quantity`} render={({ field }) => {
                          if (isCons) {
                            if (directlyCalculatedConservantMaterialsCount > 1 && isDistributeSectionVisible) return null; 
                            const uInfo = conservantUsages.find(u => u.materialBatchId === selMatBatchId);
                            const calcQty = uInfo ? uInfo.quantity : 0;
                            return (
                              <FormItem>
                                <FormLabel>Quantidade Utilizada (Calculada)</FormLabel>
                                <FormControl>
                                  <Input type="number" value={calcQty.toFixed(3)} readOnly className="bg-muted/50 cursor-default"/>
                                </FormControl>
                                {globalConservantUsageFactor !== null && watchedMixCount > 0 && matBatchDetails && (
                                  <FormDescription>
                                    Base: {watchedMixCount} mexida(s) × {globalConservantUsageFactor.toFixed(3)} {matBatchDetails.unitOfMeasure}/mexida
                                  </FormDescription>
                                )}
                                <FormMessage />
                              </FormItem>
                            );
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
              <Button type="button" variant="outline" size="sm" onClick={() => appendUsedMaterial({ materialBatchId: "", quantity: null as any })} className="mt-4 w-full">
                <Plus className="mr-2 h-4 w-4" /> Adicionar Insumo
              </Button>
              
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

          <AlertDialog open={showConservantConflictModal} onOpenChange={setShowConservantConflictModal}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Múltiplos Lotes de Conservantes Detectados</AlertDialogTitle>
                <AlertDialogDescription>
                  Você selecionou mais de um lote para o insumo "{conflictingConservantInfo?.materialName || 'Conservante'}". Deseja remover o último lote adicionado ou continuar e distribuir as mexidas entre eles?
                </AlertDialogDescription>
              </AlertDialogHeader>
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

          <div className="flex justify-end mt-8">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : "Salvar Mexida"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default MixRegistration;
