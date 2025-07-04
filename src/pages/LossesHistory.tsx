import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash, Loader, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Combobox } from "@/components/ui/combobox";

// Schema for form validation
const updateLossFormSchema = z.object({
  date: z.string().nonempty({ message: "Data é obrigatória" }),
  machine: z.string().nonempty({ message: "Máquina é obrigatória" }),
  quantity: z.number().positive({ message: "Quantidade deve ser maior que zero" }),
  productType: z.string().nonempty({ message: "Tipo de produto é obrigatório" }),
  notes: z.string().optional(),
});

type UpdateLossFormValues = z.infer<typeof updateLossFormSchema>;

const LossesHistory = () => {
  const { losses, deleteLoss, updateLoss, productionBatches, isLoading, refetchLosses, refetchProductionBatches } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedLoss, setSelectedLoss] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const form = React.useForm<UpdateLossFormValues>({
    resolver: zodResolver(updateLossFormSchema),
    defaultValues: {
      date: "",
      machine: "",
      quantity: 0,
      productType: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (selectedLoss) {
      const loss = losses.find((loss) => loss.id === selectedLoss);
      if (loss) {
        form.reset({
          date: format(new Date(loss.date), "yyyy-MM-dd"),
          machine: loss.machine,
          quantity: loss.quantity,
          productType: loss.productType,
          notes: loss.notes || "",
        });
      }
    }
  }, [selectedLoss, losses, form]);

  const handleDeleteLoss = async (lossId: string) => {
    if (!hasPermission('losses', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para excluir perdas",
      });
      return;
    }

    try {
      await deleteLoss(lossId);
      toast({ title: "Perda Excluída", description: "Perda excluída com sucesso." });
      await refetchLosses();
      await refetchProductionBatches();
    } catch (error) {
      console.error("Erro ao excluir perda:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir perda",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir a perda.",
      });
    }
  };

  const handleUpdateLoss = async () => {
    if (!hasPermission('losses', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado", 
        description: "Você não tem permissão para editar perdas",
      });
      return;
    }

    try {
      const data = form.getValues();
      if (!selectedLoss) {
        throw new Error("Nenhuma perda selecionada para atualizar.");
      }

      const updatedLoss = {
        id: selectedLoss,
        date: new Date(data.date),
        machine: data.machine as "Moinho" | "Mexedor" | "Tombador" | "Embaladora" | "Outro",
        quantity: data.quantity,
        unitOfMeasure: "kg",
        productType: data.productType as "Goma" | "Fécula" | "Embalagem" | "Sorbato" | "Produto Acabado" | "Outro",
        notes: data.notes,
      };

      await updateLoss(updatedLoss);
      toast({ title: "Perda Atualizada", description: "Perda atualizada com sucesso." });
      setOpen(false);
      setSelectedLoss(null);
      await refetchLosses();
      await refetchProductionBatches();
    } catch (error) {
      console.error("Erro ao atualizar perda:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perda",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar a perda.",
      });
    }
  };

  const canEdit = hasPermission('losses', 'module');
  const canDelete = hasPermission('losses', 'module');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Histórico de Perdas</h1>
        <Button variant="outline" onClick={() => navigate("/perdas")}>
          <AlertTriangle className="mr-2 h-4 w-4" />
          Registrar Nova Perda
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Perdas Registradas</CardTitle>
          <CardDescription>Visualize e gerencie as perdas registradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading.losses || isLoading.productionBatches ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="w-8 h-8 animate-spin" />
              <span className="ml-2">Carregando histórico de perdas...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {losses.length === 0 ? (
                <div className="flex justify-center items-center p-8">
                  <AlertTriangle className="w-6 h-6 mr-2" />
                  <span>Nenhuma perda registrada ainda.</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {losses.map((loss) => (
                      <TableRow key={loss.id}>
                        <TableCell>{format(new Date(loss.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell>{loss.batchNumber}</TableCell>
                        <TableCell>{loss.machine}</TableCell>
                        <TableCell>{loss.quantity} kg</TableCell>
                        <TableCell>{loss.productType}</TableCell>
                        <TableCell>{loss.notes}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedLoss(loss.id);
                                  setOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteLoss(loss.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Editar Perda</DialogTitle>
            <DialogDescription>
              Atualize os detalhes da perda registrada.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateLoss)} className="space-y-4">
              <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", isMobile && "grid-cols-1")}>
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
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Perdida (kg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00"
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
              <div className={cn("grid grid-cols-1 md:grid-cols-1 gap-6", isMobile && "grid-cols-1")}>
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
                    <FormControl>
                      <Textarea placeholder="Descreva a causa ou detalhes adicionais da perda..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Atualizar Perda
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LossesHistory;
