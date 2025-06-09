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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { ConservantMixFields } from "@/components/production/ConservantMixFields";
import { History, Plus, Trash, Factory, ClipboardList, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTodayDateString } from "@/components/helpers/dateUtils";
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
} from "@/components/ui/alert-dialog";
import { createMixBatch } from "@/services/mixService";

// Schema for mix registration form validation
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
        .min(0, { message: "Quantidade não pode ser negativa" })
        .nullable()
        .transform((val) => val ?? 0), // Transforma null em 0
    })
  ).nonempty({ message: "Adicione pelo menos um insumo utilizado" }),
});

type MixFormValues = z.infer<typeof mixFormSchema>;

// Definindo os passos/abas para mexida
const TABS = [
  { id: "info", name: "Informações da Mexida", fields: ["mixDate", "mixCount", "notes"] as const, icon: ClipboardList },
  { id: "materials", name: "Insumos da Mexida", fields: ["usedMaterials"] as const, icon: Factory },
];

// Função para gerar o nome da mexida no formato "Dia da Semana + Data DD/MM/AAAA" + sufixo se necessário
const generateMixBatchName = async (dateString: string): Promise<string> => {
  // Criar data local para obter o dia da semana correto
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  const dayNames = [
    'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
  ];
  
  const dayName = dayNames[date.getDay()];
  
  // Formatar data manualmente para DD/MM/AAAA
  const formattedDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  
  const baseName = `${dayName} ${formattedDate}`;
  
  // Verificar se já existe uma mexida com esse nome
  const { data: existingMixes, error } = await supabase
    .from("mix_batches")
    .select("batch_number")
    .like("batch_number", `${baseName}%`);
  
  if (error) {
    console.error("Erro ao verificar mexidas existentes:", error);
    return baseName; // Retorna o nome base em caso de erro
  }
  
  if (!existingMixes || existingMixes.length === 0) {
    return baseName; // Não há mexidas com esse nome
  }
  
  // Encontrar o próximo número disponível
  let nextNumber = 2;
  const existingNames = existingMixes.map(mix => mix.batch_number);
  
  while (existingNames.includes(`${baseName} - ${nextNumber}`)) {
    nextNumber++;
  }
  
  return `${baseName} - ${nextNumber}`;
};

const MixRegistration = () => {
  const { materialBatches, addProductionBatch } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission, user, getUserDisplayName } = useAuth();
  const isMobile = useIsMobile();
  
  const today = getTodayDateString();
  const [activeTabId, setActiveTabId] = useState<string>(TABS[0].id);
  const [globalConservantUsageFactor, setGlobalConservantUsageFactor] = useState<number | null>(null);
  const [isLoadingFactor, setIsLoadingFactor] = useState<boolean>(true);
  const [isDistributeSectionVisible, setIsDistributeSectionVisible] = useState(false);
  const [showConservantConflictModal, setShowConservantConflictModal] = useState(false);
  const [conflictingConservantInfo, setConflictingConservantInfo] = useState<{ index: number; materialName: string } | null>(null);
  const previousConservantCountRef = React.useRef(0);

  // useEffect para buscar fatores globais
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
    return materialBatches.find((batch) => batch.id === materialBatchId);
  }, [materialBatches]);

  // Lógica do conservante - usando hook existente
  const conservantMaterials = React.useMemo(() => {
    return watchedUsedMaterials
      .map((material, index) => ({ ...material, index }))
      .filter(material => {
        const details = getMaterialBatchDetails(material.materialBatchId);
        return details && details.materialType === "Conservante";
      });
  }, [watchedUsedMaterials, getMaterialBatchDetails]);

  const directlyCalculatedConservantMaterialsCount = conservantMaterials.length;

  React.useEffect(() => {
    const currentConservantCount = directlyCalculatedConservantMaterialsCount;
    const previousConservantCount = previousConservantCountRef.current;
    
    if (currentConservantCount > 1 && previousConservantCount <= 1) {
      const lastConservantMaterial = conservantMaterials[conservantMaterials.length - 1];
      if (lastConservantMaterial) {
        const details = getMaterialBatchDetails(lastConservantMaterial.materialBatchId);
        setConflictingConservantInfo({ 
          index: lastConservantMaterial.index, 
          materialName: details?.materialName || 'Conservante' 
        });
        setShowConservantConflictModal(true);
      }
    } else if (currentConservantCount <= 1) {
      setIsDistributeSectionVisible(false);
    }
    
    previousConservantCountRef.current = currentConservantCount;
  }, [directlyCalculatedConservantMaterialsCount, conservantMaterials, getMaterialBatchDetails]);

  // Lógica do conservante - precisa adaptar para o formato esperado pelo hook
  const conservantMaterialsForHook = React.useMemo(() => {
    return conservantMaterials.map(cm => {
      const details = getMaterialBatchDetails(cm.materialBatchId);
      if (!details) return null;
      return {
        id: details.id,
        materialBatchId: details.id,
        materialName: details.materialName,
        materialType: details.materialType,
        batchNumber: details.batchNumber,
        quantity: details.remainingQuantity,
        unitOfMeasure: details.unitOfMeasure,
      };
    }).filter(Boolean) as any[];
  }, [conservantMaterials, getMaterialBatchDetails]);

  const { 
    conservantUsages, 
    isValid: conservantValid, 
    validationError: conservantError, 
    updateMixCount 
  } = useConservantLogic(
    conservantMaterialsForHook,
    watchedMixCount,
    globalConservantUsageFactor !== null ? globalConservantUsageFactor : 0.1
  );

  React.useEffect(() => {
    conservantUsages.forEach((usage, idx) => {
      const matchingMaterial = conservantMaterials.find(cm => cm.materialBatchId === usage.materialBatchId);
      if (matchingMaterial) {
        // Garantir que a quantidade nunca seja null ou undefined
        const quantity = typeof usage.quantity === 'number' ? usage.quantity : 0;
        form.setValue(`usedMaterials.${matchingMaterial.index}.quantity`, quantity, { shouldValidate: false });
      }
    });
  }, [conservantUsages, conservantMaterials, form]);

  const onSubmit = async (data: MixFormValues) => {
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
      const usedMaterialsData = data.usedMaterials.map((material, index) => {
        const materialBatch = getMaterialBatchDetails(material.materialBatchId);
        if (!materialBatch) throw new Error(`Lote de material não encontrado: ${material.materialBatchId}`);
        
        const conservantUsage = conservantUsages.find(u => u.materialBatchId === material.materialBatchId);
        const mixCountUsed = conservantUsage ? conservantUsage.assignedMixes : undefined;
        
        return {
          id: `temp-${index}`, // ID temporário para satisfazer o tipo
          materialBatchId: material.materialBatchId,
          materialName: materialBatch.materialName,
          materialType: materialBatch.materialType,
          batchNumber: materialBatch.batchNumber,
          quantity: material.quantity,
          unitOfMeasure: materialBatch.unitOfMeasure,
          mixCountUsed,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });

      // Gerar nome da mexida no formato "Dia da Semana + Data DD/MM/AAAA" + sufixo se necessário
      const mixBatchNumber = await generateMixBatchName(data.mixDate);

      const mixBatchPayload = {
        batchNumber: mixBatchNumber,
        mixDate: new Date(data.mixDate + 'T12:00:00'), // Data local com horário fixo
        mixDay: data.mixDate,
        mixCount: data.mixCount,
        notes: data.notes || "",
        status: 'available' as const,
        usedMaterials: usedMaterialsData,
      };
      
      // Usar o serviço específico de mexidas
      await createMixBatch(mixBatchPayload, user?.id, getUserDisplayName());
      toast({ title: "Mexida Registrada", description: `Mexida ${mixBatchNumber} registrada com sucesso.` });
      
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
  
  const shouldShowMixFieldsSection = isDistributeSectionVisible && directlyCalculatedConservantMaterialsCount > 1;
  const conservantDataIsReadyForMixFields = shouldShowMixFieldsSection && conservantUsages.length === directlyCalculatedConservantMaterialsCount;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Registrar Nova Mexida</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/producao")}>
            <Factory className="mr-2 h-4 w-4" /> Ir para Produção
          </Button>
          <Button variant="outline" onClick={() => navigate("/mexida/historico")}>
            <History className="mr-2 h-4 w-4" /> Histórico de Mexidas
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
            <TabsList className={cn("grid w-full grid-cols-2 mb-6", isMobile && "grid-cols-1 h-auto")}>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center">
                  <tab.icon className="mr-2 h-4 w-4" /> {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="info" forceMount className={cn(activeTabId !== "info" && "hidden")}>
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da Mexida</CardTitle>
                  <CardDescription>Forneça os detalhes básicos da mexida de insumos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                            <Input 
                              type="number" 
                              placeholder="0"
                              value={field.value === 0 ? "" : field.value}
                              onChange={e => {
                                const inputValue = e.target.value;
                                if (inputValue === "") {
                                  field.onChange(0);
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
                          <Textarea placeholder="Alguma observação relevante sobre a mexida..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials" forceMount className={cn(activeTabId !== "materials" && "hidden")}>
              <Card>
                <CardHeader>
                  <CardTitle>Insumos da Mexida</CardTitle>
                  <CardDescription>Adicione os insumos utilizados nesta mexida (fécula, sorbato, etc.).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {usedMaterialFields.map((item, index) => {
                    const selMatBatchId = form.watch(`usedMaterials.${index}.materialBatchId`);
                    const matBatchDetails = getMaterialBatchDetails(selMatBatchId);
                    const isCons = matBatchDetails && matBatchDetails.materialType === "Conservante";
                    
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
                        
                        <div className={cn("grid grid-cols-2 gap-4 items-end", isMobile && "grid-cols-1")}>
                          <FormField 
                            control={form.control} 
                            name={`usedMaterials.${index}.materialBatchId`} 
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Insumo</FormLabel>
                                <Combobox
                                  options={availableMaterialBatches.map(batch => ({ 
                                    value: batch.id, 
                                    label: `${batch.materialName} / ${batch.batchNumber} (${batch.remainingQuantity} ${batch.unitOfMeasure})`
                                  }))}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  placeholder="Selecione um insumo"
                                  searchPlaceholder="Buscar insumo..."
                                  notFoundMessage="Nenhum insumo encontrado."
                                />
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                          
                          <FormField 
                            control={form.control} 
                            name={`usedMaterials.${index}.quantity`} 
                            render={({ field }) => {
                              const currentQty = form.watch(`usedMaterials.${index}.quantity`) || 0;
                              
                              React.useEffect(() => {
                                if (selMatBatchId) {
                                  const cBatchDetails = getMaterialBatchDetails(selMatBatchId);
                                  if (cBatchDetails && cBatchDetails.materialType !== "Conservante") { 
                                    // Para fécula, calcular o total que será descontado do estoque
                                    const watchedMixCount = form.watch("mixCount") || 0;
                                    const totalSacos = (currentQty || 0) * watchedMixCount;
                                    
                                    if (totalSacos > cBatchDetails.remainingQuantity) {
                                      form.setError(`usedMaterials.${index}.quantity`, { 
                                        type: 'manual', 
                                        message: `Total de sacos (${currentQty} × ${watchedMixCount} = ${totalSacos}) excede estoque: ${cBatchDetails.remainingQuantity} ${cBatchDetails.unitOfMeasure}` 
                                      });
                                    } else if (currentQty <= 0 && cBatchDetails.remainingQuantity > 0) { 
                                      const err = form.formState.errors.usedMaterials?.[index]?.quantity; 
                                      if (err && err.type === 'manual') form.clearErrors(`usedMaterials.${index}.quantity`); 
                                    } else { 
                                      const err = form.formState.errors.usedMaterials?.[index]?.quantity; 
                                      if (err && err.type === 'manual') form.clearErrors(`usedMaterials.${index}.quantity`);
                                    }
                                  } else {
                                    form.clearErrors(`usedMaterials.${index}.quantity`);
                                  }
                                } else if (!selMatBatchId) {
                                  form.clearErrors(`usedMaterials.${index}.quantity`);
                                }
                              }, [selMatBatchId, currentQty, index, form, getMaterialBatchDetails]);
                              
                              if (isCons) {
                                if (directlyCalculatedConservantMaterialsCount > 1 && isDistributeSectionVisible) return null; 
                                const uInfo = conservantUsages.find(u => u.materialBatchId === selMatBatchId);
                                const calcQty = uInfo ? uInfo.quantity : 0;
                                return (
                                  <FormItem>
                                    <FormLabel>Quantidade Utilizada (Calculada)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        value={calcQty.toFixed(3)} 
                                        readOnly 
                                        className="bg-muted/50 cursor-default"
                                      />
                                    </FormControl>
                                    {globalConservantUsageFactor !== null && watchedMixCount > 0 && matBatchDetails && (
                                      <FormDescription>
                                        Base: {watchedMixCount} mexida(s) × {globalConservantUsageFactor.toFixed(3)} {matBatchDetails.unitOfMeasure}/mexida
                                      </FormDescription>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                );
                              } else {
                                const isFecula = matBatchDetails && 
                                  (matBatchDetails.materialType.toLowerCase().includes('fécula') || 
                                   matBatchDetails.materialName.toLowerCase().includes('fécula'));
                                const watchedMixCount = form.watch("mixCount") || 0;
                                const totalSacos = currentQty * watchedMixCount;
                                
                                return (
                                  <FormItem>
                                    <FormLabel>
                                      {isFecula ? 'Sacos por Mexida' : 'Quantidade Utilizada'}
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="0"
                                        value={field.value === null || field.value === undefined || field.value === 0 ? "" : field.value}
                                        onChange={e => {
                                          const inputValue = e.target.value;
                                          if (inputValue === "") {
                                            field.onChange(0);
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
                                    {isFecula && watchedMixCount > 0 && currentQty > 0 && (
                                      <FormDescription className="text-blue-600 font-medium">
                                        Total de sacos que serão descontados do estoque: {totalSacos} sacos
                                      </FormDescription>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                );
                              }
                            }} 
                          />
                        </div>
                        {(() => { 
                          if (selMatBatchId && matBatchDetails) {
                            return (
                              <FormDescription className="mt-2 text-xs">
                                Lote selecionado: {matBatchDetails.materialName} / {matBatchDetails.batchNumber} 
                                {' - '} Disponível: {matBatchDetails.remainingQuantity} {matBatchDetails.unitOfMeasure}
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
                    onClick={() => appendUsedMaterial({ materialBatchId: "", quantity: 0 })} 
                    className="mt-4 w-full"
                  >
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
            </TabsContent>
          </Tabs>

          <AlertDialog open={showConservantConflictModal} onOpenChange={setShowConservantConflictModal}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Múltiplos Lotes de Conservantes Detectados</AlertDialogTitle>
                <AlertDialogDescription>
                  Você selecionou mais de um lote para o insumo "{conflictingConservantInfo?.materialName || 'Conservante'}". 
                  Deseja remover o último lote adicionado ou continuar e distribuir as mexidas entre eles?
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
                }}>
                  Remover Último Lote Adicionado
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  setIsDistributeSectionVisible(true);
                  setShowConservantConflictModal(false);
                  setConflictingConservantInfo(null);
                }}>
                  Continuar e Distribuir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentTabIndex === 0}
            >
              Anterior
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Passo {currentTabIndex + 1} de {TABS.length}
            </span>
            
            {currentTabIndex === TABS.length - 1 ? (
              <Button type="submit">
                <FlaskConical className="mr-2 h-4 w-4" />
                Registrar Mexida
              </Button>
            ) : (
              <Button type="button" onClick={handleNext}>
                Próximo
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default MixRegistration;
