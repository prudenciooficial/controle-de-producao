import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Trash, Plus, Loader, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the schema for form validation
const updateSaleFormSchema = z.object({
  date: z.string().nonempty({ message: "Data é obrigatória" }),
  customerName: z.string().nonempty({ message: "Cliente é obrigatório" }),
  invoiceNumber: z.string().nonempty({ message: "Número da fatura é obrigatório" }),
  type: z.string().nonempty({ message: "Tipo é obrigatório" }),
  notes: z.string().optional(),
});

type UpdateSaleFormValues = z.infer<typeof updateSaleFormSchema>;

const SalesHistory = () => {
  const { sales, deleteSale, updateSale, isLoading, refetchSales } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<string | null>(null);

  const form = useForm<UpdateSaleFormValues>({
    resolver: zodResolver(updateSaleFormSchema),
    defaultValues: {
      date: "",
      customerName: "",
      invoiceNumber: "",
      type: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (selectedSale) {
      const sale = sales.find((sale) => sale.id === selectedSale);
      if (sale) {
        form.reset({
          date: format(new Date(sale.date), "yyyy-MM-dd"),
          customerName: sale.customerName,
          invoiceNumber: sale.invoiceNumber,
          type: sale.type,
          notes: sale.notes || "",
        });
      }
    }
  }, [selectedSale, sales, form]);

  const handleDeleteSale = async (saleId: string) => {
    if (!hasPermission('sales', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para excluir vendas",
      });
      return;
    }

    try {
      await deleteSale(saleId);
      toast({ title: "Venda Excluída", description: "Venda excluída com sucesso." });
      await refetchSales();
    } catch (error) {
      console.error("Erro ao excluir venda:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir venda",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir a venda.",
      });
    }
  };

  const handleUpdateSale = async (data: UpdateSaleFormValues) => {
    if (!hasPermission('sales', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para editar vendas",
      });
      return;
    }

    try {
      if (!selectedSale) {
        throw new Error("Nenhuma venda selecionada para atualizar.");
      }

      const updatedSale = {
        id: selectedSale,
        date: new Date(data.date),
        customerName: data.customerName,
        invoiceNumber: data.invoiceNumber,
        type: data.type,
        notes: data.notes,
      };

      await updateSale(updatedSale);
      toast({ title: "Venda Atualizada", description: "Venda atualizada com sucesso." });
      setOpen(false);
      setSelectedSale(null);
      await refetchSales();
    } catch (error) {
      console.error("Erro ao atualizar venda:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar venda",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar a venda.",
      });
    }
  };

  const canEdit = hasPermission('sales', 'module');
  const canDelete = hasPermission('sales', 'module');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Histórico de Vendas</h1>
        <Button variant="outline" onClick={() => navigate("/vendas")}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Nova Venda
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Vendas Registradas</CardTitle>
          <CardDescription>Visualize e gerencie as vendas registradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading.sales ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="w-8 h-8 animate-spin" />
              <span className="ml-2">Carregando histórico de vendas...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {sales.length === 0 ? (
                <div className="flex justify-center items-center p-8">
                  <ShoppingCart className="w-6 h-6 mr-2" />
                  <span>Nenhuma venda registrada ainda.</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Nº da Fatura</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{format(new Date(sale.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell>{sale.customerName}</TableCell>
                        <TableCell>{sale.invoiceNumber}</TableCell>
                        <TableCell>{sale.type}</TableCell>
                        <TableCell>{sale.notes}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedSale(sale.id);
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
                                onClick={() => handleDeleteSale(sale.id)}
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
            <DialogTitle>Editar Venda</DialogTitle>
            <DialogDescription>
              Atualize os detalhes da venda registrada.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateSale)} className="space-y-4">
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
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Fatura</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Venda">Venda</SelectItem>
                          <SelectItem value="Troca">Troca</SelectItem>
                          <SelectItem value="Devolução">Devolução</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Textarea placeholder="Adicione detalhes ou observações sobre a venda..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Atualizar Venda
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesHistory;
