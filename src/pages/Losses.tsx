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
import { History, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";

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

const Losses = () => {
  const { productionBatches, addLoss, isLoading } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  
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
  
  // Get batch details
  const getBatchDetails = (batchId: string) => {
    return productionBatches.find((b) => b.id === batchId);
  };
  
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
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Perdas</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate("/perdas/historico")}>
            <History className="mr-2 h-4 w-4" />
            Histórico
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="nova-perda" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="nova-perda">Nova Perda</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nova-perda">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Nova Perda</CardTitle>
              <CardDescription>
                Registre as perdas de insumos ou produtos durante a produção.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading.productionBatches ? (
                <div className="flex justify-center items-center p-8">
                  <Loader className="w-8 h-8 animate-spin" />
                  <span className="ml-2">Carregando dados...</span>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
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
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o lote" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {productionBatches.map((batch) => (
                                  <SelectItem key={batch.id} value={batch.id}>
                                    {batch.batchNumber} - {new Date(batch.productionDate).toLocaleDateString()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a máquina" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Moinho">Moinho</SelectItem>
                                <SelectItem value="Mexedor">Mexedor</SelectItem>
                                <SelectItem value="Tombador">Tombador</SelectItem>
                                <SelectItem value="Embaladora">Embaladora</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantidade (kg)</FormLabel>
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
                      
                      <FormField
                        control={form.control}
                        name="productType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Produto</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Goma">Goma</SelectItem>
                                <SelectItem value="Fécula">Fécula</SelectItem>
                                <SelectItem value="Embalagem">Embalagem</SelectItem>
                                <SelectItem value="Sorbato">Sorbato</SelectItem>
                                <SelectItem value="Produto Acabado">Produto Acabado</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
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
                            <Textarea
                              placeholder="Observações sobre a perda"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full">
                      Registrar Perda
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Losses;
