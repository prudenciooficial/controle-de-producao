import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// Validation schema for the edit form
const orderEditSchema = z.object({
  invoiceNumber: z.string().nonempty("Número da fatura é obrigatório"),
  supplierId: z.string().nonempty("Fornecedor é obrigatório"),
  notes: z.string().optional(),
});

type OrderEditValues = z.infer<typeof orderEditSchema>;

const OrdersHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { suppliers, refetchOrders, refetchSuppliers, deleteOrder, updateOrder } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();

  const form = useForm<OrderEditValues>({
    resolver: zodResolver(orderEditSchema),
    defaultValues: {
      invoiceNumber: "",
      supplierId: "",
      notes: "",
    },
  });

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        await refetchOrders();
        setOrders(prevOrders => prevOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar pedidos",
          description: "Ocorreu um erro ao carregar o histórico de pedidos.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [refetchOrders, toast]);

  const handleDeleteOrder = async (orderId: string) => {
    if (!hasPermission('orders', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para excluir pedidos",
      });
      return;
    }

    if (!window.confirm("Tem certeza que deseja excluir este pedido?")) return;

    try {
      await deleteOrder(orderId);
      toast({ title: "Pedido Excluído", description: "Pedido excluído com sucesso." });
      await refetchOrders(); // Atualiza a lista de pedidos
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir pedido",
        description: "Ocorreu um erro ao excluir o pedido.",
      });
    }
  };

  const handleUpdateOrder = async () => {
    if (!hasPermission('orders', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para editar pedidos",
      });
      return;
    }

    try {
      const data = form.getValues();
      if (!selectedOrder) {
        toast({ variant: "destructive", title: "Erro", description: "Nenhum pedido selecionado para editar." });
        return;
      }

      const updatedOrder = {
        ...selectedOrder,
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        supplierName: suppliers.find(s => s.id === data.supplierId)?.name || selectedOrder.supplierName,
        notes: data.notes,
      };

      await updateOrder(updatedOrder);
      toast({ title: "Pedido Atualizado", description: "Pedido atualizado com sucesso." });
      await refetchOrders(); // Atualiza a lista de pedidos
      setShowEditModal(false);
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar pedido",
        description: "Ocorreu um erro ao atualizar o pedido.",
      });
    }
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const canEdit = hasPermission('orders', 'module');
  const canDelete = hasPermission('orders', 'module');

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Histórico de Pedidos</h1>
        <Button onClick={() => navigate("/pedidos")}>Novo Pedido</Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col justify-center items-center space-y-4">
          <FileText className="w-12 h-12 text-gray-400" />
          <p className="text-xl text-gray-600">Nenhum pedido registrado.</p>
          <Button onClick={() => navigate("/pedidos")}>Criar Novo Pedido</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Tabela para desktop */}
          <Table className={cn("w-full rounded-md shadow-sm", isMobile && "hidden")}>
            <TableCaption>Lista de todos os pedidos registrados no sistema.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Número da Fatura</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{formatDate(order.date)}</TableCell>
                  <TableCell>{order.invoiceNumber}</TableCell>
                  <TableCell>{order.supplierName}</TableCell>
                  <TableCell className="text-right font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailsModal(true);
                      }}>
                        Detalhes
                      </Button>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            form.reset({
                              invoiceNumber: order.invoiceNumber,
                              supplierId: order.supplierId,
                              notes: order.notes || "",
                            });
                            setShowEditModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteOrder(order.id)}>
                          <Trash className="w-4 h-4 mr-2" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Lista para mobile */}
          <div className={cn("space-y-4", !isMobile && "hidden")}>
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-md shadow-sm p-4">
                <h2 className="text-lg font-semibold">Pedido #{order.invoiceNumber}</h2>
                <p>Data: {formatDate(order.date)}</p>
                <p>Fornecedor: {order.supplierName}</p>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setSelectedOrder(order);
                    setShowDetailsModal(true);
                  }}>
                    Detalhes
                  </Button>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOrder(order);
                        form.reset({
                          invoiceNumber: order.invoiceNumber,
                          supplierId: order.supplierId,
                          notes: order.notes || "",
                        });
                        setShowEditModal(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteOrder(order.id)}>
                      <Trash className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
            <DialogDescription>
              Edite os detalhes do pedido selecionado.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateOrder)} className="space-y-4">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Fatura</FormLabel>
                    <FormControl>
                      <Input placeholder="Número da Fatura" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Combobox
                      options={suppliers.map(supplier => ({ value: supplier.id, label: supplier.name }))}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Informações completas sobre o pedido selecionado.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data do Pedido</Label>
                  <p className="font-medium">{formatDate(selectedOrder.date)}</p>
                </div>
                <div>
                  <Label>Número da Fatura</Label>
                  <p className="font-medium">{selectedOrder.invoiceNumber}</p>
                </div>
                <div>
                  <Label>Fornecedor</Label>
                  <p className="font-medium">{selectedOrder.supplierName}</p>
                </div>
                <div>
                  <Label>Observações</Label>
                  <p className="font-medium">{selectedOrder.notes || "Nenhuma observação."}</p>
                </div>
              </div>
              <div>
                <Label>Itens do Pedido</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Relatório</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.materialName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unitOfMeasure}</TableCell>
                        <TableCell>{item.batchNumber}</TableCell>
                        <TableCell>{formatDate(item.expiryDate)}</TableCell>
                        <TableCell>
                          {item.hasReport ? (
                            <Badge variant="outline">Sim</Badge>
                          ) : (
                            <Badge variant="secondary">Não</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersHistory;
