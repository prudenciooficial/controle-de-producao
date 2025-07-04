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
import { Edit, Trash, Plus, Loader, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";

// Define the schema for form validation
const updateOrderFormSchema = z.object({
  date: z.string().nonempty({ message: "Data é obrigatória" }),
  supplierName: z.string().nonempty({ message: "Fornecedor é obrigatório" }),
  invoiceNumber: z.string().nonempty({ message: "Número da fatura é obrigatório" }),
  notes: z.string().optional(),
});

type UpdateOrderFormValues = z.infer<typeof updateOrderFormSchema>;

const OrdersHistory = () => {
  const { orders, deleteOrder, updateOrder, suppliers, isLoading, refetchOrders, refetchSuppliers } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const form = useForm<UpdateOrderFormValues>({
    resolver: zodResolver(updateOrderFormSchema),
    defaultValues: {
      date: "",
      supplierName: "",
      invoiceNumber: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (selectedOrder) {
      const order = orders.find((order) => order.id === selectedOrder);
      if (order) {
        form.reset({
          date: format(new Date(order.date), "yyyy-MM-dd"),
          supplierName: order.supplierName,
          invoiceNumber: order.invoiceNumber,
          notes: order.notes || "",
        });
      }
    }
  }, [selectedOrder, orders, form]);

  const handleDeleteOrder = async (orderId: string) => {
    if (!hasPermission('orders', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para excluir pedidos",
      });
      return;
    }

    try {
      await deleteOrder(orderId);
      toast({ title: "Pedido Excluído", description: "Pedido excluído com sucesso." });
      await refetchOrders();
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir pedido",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir o pedido.",
      });
    }
  };

  const handleUpdateOrder = async (data: UpdateOrderFormValues) => {
    if (!hasPermission('orders', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para editar pedidos",
      });
      return;
    }

    try {
      if (!selectedOrder) {
        throw new Error("Nenhum pedido selecionado para atualizar.");
      }

      const updatedOrder = {
        id: selectedOrder,
        date: new Date(data.date),
        supplierName: data.supplierName,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes,
      };

      await updateOrder(updatedOrder);
      toast({ title: "Pedido Atualizado", description: "Pedido atualizado com sucesso." });
      setOpen(false);
      setSelectedOrder(null);
      await refetchOrders();
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar pedido",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar o pedido.",
      });
    }
  };

  const canEdit = hasPermission('orders', 'module');
  const canDelete = hasPermission('orders', 'module');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Histórico de Pedidos</h1>
        <Button variant="outline" onClick={() => navigate("/pedidos")}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Novo Pedido
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos Registrados</CardTitle>
          <CardDescription>Visualize e gerencie os pedidos registrados no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading.orders || isLoading.suppliers ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="w-8 h-8 animate-spin" />
              <span className="ml-2">Carregando histórico de pedidos...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                <div className="flex justify-center items-center p-8">
                  <FileText className="w-6 h-6 mr-2" />
                  <span>Nenhum pedido registrado ainda.</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Nº da Fatura</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{format(new Date(order.date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell>{order.supplierName}</TableCell>
                        <TableCell>{order.invoiceNumber}</TableCell>
                        <TableCell>{order.notes}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedOrder(order.id);
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
                                onClick={() => handleDeleteOrder(order.id)}
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
            <DialogTitle>Editar Pedido</DialogTitle>
            <DialogDescription>
              Atualize os detalhes do pedido registrado.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateOrder)} className="space-y-4">
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
                name="supplierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Combobox
                      options={suppliers.map(supplier => ({ value: supplier.name, label: supplier.name }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Selecione o fornecedor"
                      searchPlaceholder="Buscar fornecedor..."
                      notFoundMessage="Nenhum fornecedor encontrado."
                    />
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Adicione detalhes ou observações sobre o pedido..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Atualizar Pedido
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersHistory;
