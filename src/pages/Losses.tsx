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
import { History, Loader, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Combobox } from "@/components/ui/combobox";

// Schema for form validation
const lossFormSchema = z.object({
  date: z.string().nonempty({ message: "Data é obrigatória" }),
  productionBatchId: z.string().nonempty({ message: "Lote de produção é obrigatório" }),
  machine: z.string().nonempty({ message: "Máquina é obrigatória" }),
  quantity: z.number().positive({ message: "Quantidade deve ser maior que zero" }),
  productType: z.string().nonempty({ message: "Tipo de produto é obrigatório" }),
  notes: z.string().optional(),
});

type LossFormValues = z.infer<typeof lossFormSchema>;

// Definindo os passos/abas
const LOSS_TABS = [
  { id: "lossInfo", name: "Informações da Perda", fields: ["date", "productionBatchId", "machine", "quantity", "productType", "notes"] as const, icon: AlertTriangle },
];

const Losses = () => {
  const { productionBatches, addLoss, isLoading } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [activeTabId, setActiveTabId] = React.useState<string>(LOSS_TABS[0].id);

  const form = useForm<LossFormValues>({
    resolver: zodResolver(lossFormSchema),
    defaultValues: {
      date: getTodayDateString(),
      productionBatchId: "",
      machine: "",
      quantity: 0,
      productType: "",
      notes: "",
    },
  });
  
  const getBatchDetails = (batchId: string) => productionBatches.find((b) => b.id === batchId);
  
  const onSubmit = async (data: LossFormValues) => {
    if (!hasPermission('losses', 'create')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para registrar novas perdas.",
      });
      return;
    }

    try {
      const batch = getBatchDetails(data.productionBatchId);
      
      if (!batch) {
        throw new Error(`Lote de produção não encontrado: ${data.productionBatchId}`);
      }
      
      // Create and add loss
      const loss = {
        date: parseDateString(data.date),
        productionBatchId: data.productionBatchId,
        batchNumber: batch.batchNumber,
        machine: data.machine as "Moinho" | "Mexedor" | "Tombador" | "Embaladora" | "Outro",
        quantity: data.quantity,
        unitOfMeasure: "kg",
        productType: data.productType as "Goma" | "Fécula" | "Embalagem" | "Sorbato" | "Produto Acabado" | "Outro",
        notes: data.notes,
      };
      
      await addLoss(loss);
      
      // Refresh automático para sincronizar dados
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
      // Reset form
      form.reset({
        date: getTodayDateString(),
        productionBatchId: "",
        machine: "",
        quantity: 0,
        productType: "",
        notes: "",
      });
    } catch (error) {
      console.error("Erro ao registrar perda:", error);
      toast({
        variant: "destructive",
        title: "Erro ao registrar perda",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar a perda.",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Registrar Nova Perda</h1>
        <Button variant="outline" onClick={() => navigate("/perdas/historico")}>
          <History className="mr-2 h-4 w-4" />
          Histórico de Perdas
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
            <TabsList className={cn("grid w-full mb-6", isMobile ? "grid-cols-1 h-auto" : `grid-cols-${LOSS_TABS.length}`)}>
              {LOSS_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} /* disabled e onClick não são críticos para aba única */ >
                  <tab.icon className="mr-2 h-4 w-4" /> {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="lossInfo" forceMount /* className para hidden não é necessário se sempre visível */>
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da Perda</CardTitle>
                  <CardDescription>Registre os detalhes da perda ocorrida.</CardDescription>
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
                          name="machine"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Máquina</FormLabel>
                              <Combobox
                                options={[
                                  { value: "Moinho", label: "Moinho" },
                                  { value: "Mexedor", label: "Mexedor" },
                                  { value: "Tombador", label: "Tombador" },
                                  { value: "Embaladora", label: "Embaladora" },
                                  { value: "Outro", label: "Outro" },
                                ]}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Selecione a máquina"
                                searchPlaceholder="Buscar máquina..."
                                notFoundMessage="Nenhuma máquina encontrada."
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", isMobile && "grid-cols-1")}>
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantidade Perdida (kg)</FormLabel>
                              <FormControl><Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="productType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Produto/Material</FormLabel>
                              <Combobox
                                options={[
                                  { value: "Goma", label: "Goma" },
                                  { value: "Fécula", label: "Fécula" },
                                  { value: "Embalagem", label: "Embalagem" },
                                  { value: "Sorbato", label: "Sorbato" },
                                  { value: "Produto Acabado", label: "Produto Acabado" },
                                  { value: "Outro", label: "Outro" },
                                ]}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Selecione o tipo"
                                searchPlaceholder="Buscar tipo..."
                                notFoundMessage="Nenhum tipo encontrado."
                              />
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
                            <FormControl><Textarea placeholder="Descreva a causa ou detalhes adicionais da perda..." {...field} /></FormControl>
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
              {form.formState.isSubmitting ? "Salvando..." : "Salvar Perda"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default Losses;
