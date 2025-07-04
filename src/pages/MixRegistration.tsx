import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { History, Loader, PackagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Combobox } from "@/components/ui/combobox";

// Schema for form validation
const mixFormSchema = z.object({
  date: z.string().nonempty({ message: "Data é obrigatória" }),
  productionBatchId: z.string().nonempty({ message: "Lote de produção é obrigatório" }),
  mixDay: z.string().nonempty({ message: "Dia da mexida é obrigatório" }),
  mixCount: z.number().positive({ message: "Número da mexida deve ser maior que zero" }),
  notes: z.string().optional(),
});

type MixFormValues = z.infer<typeof mixFormSchema>;

// Definindo os passos/abas
const MIX_TABS = [
  { id: "mixInfo", name: "Informações da Mexida", fields: ["date", "productionBatchId", "mixDay", "mixCount", "notes"] as const, icon: PackagePlus },
];

const MixRegistration = () => {
  const { productionBatches, addProductionBatch, refetchProductionBatches, isLoading } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [activeTabId, setActiveTabId] = React.useState<string>(MIX_TABS[0].id);

  const form = useForm<MixFormValues>({
    resolver: zodResolver(mixFormSchema),
    defaultValues: {
      date: getTodayDateString(),
      productionBatchId: "",
      mixDay: "",
      mixCount: 0,
      notes: "",
    },
  });
  
  const getBatchDetails = (batchId: string) => productionBatches.find((b) => b.id === batchId);
  
  const onSubmit = async (data: MixFormValues) => {
    if (!hasPermission('mix', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para registrar mexidas.",
      });
      return;
    }

    try {
      const batch = getBatchDetails(data.productionBatchId);
      
      if (!batch) {
        throw new Error("Lote de produção não encontrado");
      }
      
      const mix = {
        ...batch, // Copia todos os dados do lote existente
        productionDate: parseDateString(data.date),
        mixDay: data.mixDay,
        mixCount: data.mixCount,
        notes: data.notes,
      };
      
      addProductionBatch(mix);
      toast({ title: "Mexida Registrada", description: `Mexida ${data.mixCount} do dia ${data.mixDay} registrada com sucesso no lote ${batch.batchNumber}.` });
      
      // Refetch dados atualizados imediatamente
      await refetchProductionBatches();
      
      // Reset form
      form.reset({
        date: getTodayDateString(),
        productionBatchId: "",
        mixDay: "",
        mixCount: 0,
        notes: "",
      });
    } catch (error) {
      console.error("Erro ao registrar mexida:", error);
      toast({
        variant: "destructive",
        title: "Erro ao registrar mexida",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar a mexida.",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Registrar Nova Mexida</h1>
        <Button variant="outline" onClick={() => navigate("/producao/historico-mexidas")}>
          <History className="mr-2 h-4 w-4" />
          Histórico de Mexidas
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
            <TabsList className={cn("grid w-full mb-6", isMobile ? "grid-cols-1 h-auto" : `grid-cols-${MIX_TABS.length}`)}>
              {MIX_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  <tab.icon className="mr-2 h-4 w-4" /> {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="mixInfo" forceMount>
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da Mexida</CardTitle>
                  <CardDescription>Registre os detalhes da mexida ocorrida.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading.productionBatches ? (
                    <div className="flex justify-center items-center p-8">
                      <Loader className="w-8 h-8 animate-spin" />
                      <span className="ml-2">Carregando lotes de produção...</span>
                    </div>
                  ) : (
                    <>
                      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", isMobile && "grid-cols-1")}>
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="productionBatchId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lote de Produção</FormLabel>
                              <Combobox
                                options={productionBatches.map(batch => ({ 
                                  value: batch.id, 
                                  label: `${batch.batchNumber} - ${new Date(batch.productionDate).toLocaleDateString()}` 
                                }))}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Selecione o lote"
                                searchPlaceholder="Buscar lote..."
                                notFoundMessage="Nenhum lote encontrado."
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="mixDay"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dia da Mexida</FormLabel>
                              <FormControl><Input type="text" placeholder="Ex: Segunda-feira" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", isMobile && "grid-cols-1")}>
                        <FormField
                          control={form.control}
                          name="mixCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número da Mexida</FormLabel>
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
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl><Textarea placeholder="Descreva detalhes adicionais da mexida..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Botão de Submissão */}
          <div className="flex justify-end mt-8">
            <Button type="submit" disabled={form.formState.isSubmitting || isLoading.productionBatches} className="md:w-auto">
              {form.formState.isSubmitting ? "Salvando..." : "Salvar Mexida"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default MixRegistration;
