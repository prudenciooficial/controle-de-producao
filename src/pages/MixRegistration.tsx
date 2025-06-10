import React from "react";
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
import { History, Plus, Trash, Factory, ClipboardList, FlaskConical, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTodayDateString } from "@/components/helpers/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { createMixBatch } from "@/services/mixService";

// Schema for mix registration form validation
const mixFormSchema = z.object({
  mixDate: z.string().nonempty({ message: "Data da mexida é obrigatória" }),
  mixCount: z
    .number()
    .int()
    .positive({ message: "Quantidade de mexidas deve ser maior que zero" }),
  sacksPerMix: z
    .number()
    .min(0, { message: "Quantidade de sacos não pode ser negativa" })
    .nullable()
    .transform((val) => val ?? 0),
  notes: z.string().optional(),
  usedMaterials: z.array(
    z.object({
      materialBatchId: z.string().nonempty({ message: "Insumo é obrigatório" }),
    })
  ).nonempty({ message: "Adicione pelo menos um insumo utilizado" }),
});

type MixFormValues = z.infer<typeof mixFormSchema>;

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
  const { materialBatches, addProductionBatch, refetchMaterialBatches, refetchProductionBatches } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission, user, getUserDisplayName } = useAuth();
  const isMobile = useIsMobile();
  
  const today = getTodayDateString();
  
  const form = useForm<MixFormValues>({
    resolver: zodResolver(mixFormSchema),
    defaultValues: {
      mixDate: today,
      mixCount: 1,
      sacksPerMix: 0,
      notes: "",
      usedMaterials: [
        { materialBatchId: "" },
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
  const watchedSacksPerMix = form.watch("sacksPerMix");

  const getMaterialBatchDetails = React.useCallback((materialBatchId: string) => {
    return materialBatches.find((batch) => batch.id === materialBatchId);
  }, [materialBatches]);

  const onSubmit = async (data: MixFormValues) => {
    if (!hasPermission('production', 'create')) {
      toast({ variant: "destructive", title: "Acesso Negado", description: "Você não tem permissão para registrar mexidas." });
      return;
    }

    try {
      const usedMaterialsData = data.usedMaterials.map((material, index) => {
        const materialBatch = getMaterialBatchDetails(material.materialBatchId);
        if (!materialBatch) throw new Error(`Lote de material não encontrado: ${material.materialBatchId}`);
        
        return {
          id: `temp-${index}`, // ID temporário para satisfazer o tipo
          materialBatchId: material.materialBatchId,
          materialName: materialBatch.materialName,
          materialType: materialBatch.materialType,
          batchNumber: materialBatch.batchNumber,
          quantity: data.sacksPerMix || 0, // Usar a quantidade geral de sacos por mexida
          unitOfMeasure: materialBatch.unitOfMeasure,
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
      
      // Refetch apenas dos dados de produção (mexidas criadas)
      await refetchProductionBatches();
      
      form.reset({
        mixDate: today, 
        mixCount: 1, 
        sacksPerMix: 0,
        notes: "",
        usedMaterials: [{ materialBatchId: "" }],
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao registrar mexida", description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar a mexida." });
    }
  };

  // Função para adicionar material sem duplicatas
  const handleAppendUsedMaterial = () => {
    // Verificar se ainda há materiais disponíveis que não foram selecionados
    const currentlySelectedMaterials = form.getValues("usedMaterials");
    const selectedMaterialIds = currentlySelectedMaterials
      .map(material => material.materialBatchId)
      .filter(id => id !== ""); // Filtrar IDs vazios
    
    const availableUnselectedMaterials = availableMaterialBatches.filter(
      batch => !selectedMaterialIds.includes(batch.id)
    );
    
    if (availableUnselectedMaterials.length === 0) {
      toast({
        variant: "default",
        title: "Nenhum material disponível",
        description: "Todos os materiais disponíveis já foram selecionados ou não há mais materiais em estoque.",
      });
      return;
    }
    
    // Adicionar novo campo vazio
    appendUsedMaterial({ materialBatchId: "" });
  };

  // Calcular total de sacos
  const totalSacks = watchedMixCount * (watchedSacksPerMix || 0);

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
          {/* Informações da Mexida */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClipboardList className="h-5 w-5" />
                <span>Informações da Mexida</span>
              </CardTitle>
              <CardDescription>Forneça os detalhes básicos da mexida de insumos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={cn("grid grid-cols-3 gap-6", isMobile && "grid-cols-1")}>
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
                <FormField 
                  control={form.control} 
                  name="sacksPerMix" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sacos por Mexida</FormLabel>
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
                      {totalSacks > 0 && (
                        <FormDescription className="text-orange-600 font-medium">
                          Total: {totalSacks} sacos
                        </FormDescription>
                      )}
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

          {/* Insumos da Mexida */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Factory className="h-5 w-5" />
                <span>Insumos da Mexida</span>
              </CardTitle>
              <CardDescription>Selecione os insumos utilizados nesta mexida.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aviso sobre o registro */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Informação sobre Controle</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Selecione apenas os lotes de insumos utilizados na mexida.
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
                          <FormItem className="flex flex-col h-full">
                            <FormLabel>Insumo e Lote</FormLabel>
                            <div className="flex-grow">
                              <Combobox
                                options={availableMaterialBatches
                                  .filter(batch => {
                                    // Filtrar materiais já selecionados em outros campos
                                    const currentlySelected = form.getValues("usedMaterials");
                                    const selectedIds = currentlySelected
                                      .map((material, idx) => idx !== index ? material.materialBatchId : null)
                                      .filter(id => id && id !== "");
                                    
                                    return !selectedIds.includes(batch.id);
                                  })
                                  .map(batch => ({ 
                                    value: batch.id, 
                                    label: `${batch.materialName} / ${batch.batchNumber} (${batch.remainingQuantity} ${batch.unitOfMeasure} disponíveis)`
                                  }))
                                }
                                value={field.value}
                                onValueChange={(value) => {
                                  // Verificar se o material já foi selecionado em outro campo
                                  const currentlySelected = form.getValues("usedMaterials");
                                  const alreadySelected = currentlySelected.some((material, idx) => 
                                    idx !== index && material.materialBatchId === value
                                  );
                                  
                                  if (alreadySelected) {
                                    toast({
                                      variant: "destructive",
                                      title: "Material já selecionado",
                                      description: "Este material já foi selecionado em outro campo.",
                                    });
                                    return;
                                  }
                                  
                                  field.onChange(value);
                                }}
                                placeholder="Selecione um insumo e lote"
                                searchPlaceholder="Buscar insumo..."
                                notFoundMessage="Nenhum insumo encontrado."
                              />
                            </div>
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
                onClick={handleAppendUsedMaterial} 
                className="mt-4 w-full"
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar Insumo
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">
              <FlaskConical className="mr-2 h-4 w-4" />
              Registrar Mexida
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default MixRegistration;
