import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Define the schema for form validation
const mixFormSchema = z.object({
  productionBatchId: z.string().nonempty("Lote de produção é obrigatório"),
  mixDay: z.string().nonempty("Dia da mexida é obrigatório"),
  mixCount: z.number().min(1, "Número de mexidas deve ser pelo menos 1"),
  notes: z.string().optional(),
});

type MixFormValues = z.infer<typeof mixFormSchema>;

const MixHistory = () => {
  const { productionBatches, mixBatches, updateMixBatch, deleteMixBatch, refetchMixBatches, isLoading } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedMix, setSelectedMix] = useState<any>(null);
  const { hasPermission } = useAuth();

  const form = useForm<MixFormValues>({
    resolver: zodResolver(mixFormSchema),
    defaultValues: {
      productionBatchId: "",
      mixDay: "",
      mixCount: 1,
      notes: "",
    },
  });

  useEffect(() => {
    if (selectedMix) {
      form.reset({
        productionBatchId: selectedMix.productionBatchId,
        mixDay: selectedMix.mixDay,
        mixCount: selectedMix.mixCount,
        notes: selectedMix.notes || "",
      });
    }
  }, [selectedMix, form]);

  const formatDate = (date: Date) => {
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const handleDeleteMix = async (mixId: string) => {
    if (!hasPermission('mix', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para excluir mexidas",
      });
      return;
    }

    try {
      await deleteMixBatch(mixId);
      toast({
        title: "Mexida excluída",
        description: "Mexida excluída com sucesso.",
      });
      await refetchMixBatches(); // Refresh data
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Houve um erro ao excluir a mexida.",
      });
    }
  };

  const handleUpdateMix = async () => {
    if (!hasPermission('mix', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para editar mexidas",
      });
      return;
    }

    try {
      const data = form.getValues();
      if (!selectedMix) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Nenhuma mexida selecionada para atualizar.",
        });
        return;
      }

      await updateMixBatch(selectedMix.id, {
        productionBatchId: data.productionBatchId,
        mixDay: data.mixDay,
        mixCount: data.mixCount,
        notes: data.notes,
      });

      toast({
        title: "Mexida atualizada",
        description: "Mexida atualizada com sucesso.",
      });
      setOpen(false);
      setSelectedMix(null);
      await refetchMixBatches(); // Refresh data
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Houve um erro ao atualizar a mexida.",
      });
    }
  };

  const canEdit = hasPermission('mix', 'module');
  const canDelete = hasPermission('mix', 'module');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Histórico de Mexidas</h1>
        <Button variant="outline" onClick={() => navigate("/producao")}>
          Voltar para Produção
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Mexidas</CardTitle>
          <CardDescription>
            Visualize e gerencie as mexidas registradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading.mixBatches ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Carregando mexidas...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Lote de Produção</TableHead>
                  <TableHead>Dia da Mexida</TableHead>
                  <TableHead>Número de Mexidas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mixBatches.map((mix) => (
                  <TableRow key={mix.id}>
                    <TableCell>
                      {
                        productionBatches.find(
                          (batch) => batch.id === mix.productionBatchId
                        )?.batchNumber
                      }
                    </TableCell>
                    <TableCell>{formatDate(new Date(mix.mixDay))}</TableCell>
                    <TableCell>{mix.mixCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMix(mix);
                              setOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMix(mix.id)}
                            disabled={isLoading.deleteMixBatch}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Mexida</DialogTitle>
            <DialogDescription>
              Atualize os detalhes da mexida. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateMix)} className="space-y-4">
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
                          <SelectValue placeholder="Selecione um lote" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productionBatches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.batchNumber}
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
                name="mixDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia da Mexida</FormLabel>
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
                    <FormLabel>Número de Mexidas</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
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
                      <Textarea placeholder="Observações sobre a mexida" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading.updateMixBatch}>
                  {isLoading.updateMixBatch ? (
                    <>
                      Atualizando...
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MixHistory;
