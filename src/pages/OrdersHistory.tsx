
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, MoreVertical, Eye, Trash, Check, X, Edit, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Order } from "../types";

const OrdersHistory = () => {
  const { orders, deleteOrder, updateOrder } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Order>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const filteredOrders = orders.filter(
    (order) =>
      order.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      order.items.some((item) =>
        item.materialName.toLowerCase().includes(search.toLowerCase())
      )
  );
  
  const handleDelete = (id: string) => {
    deleteOrder(id);
    setShowDeleteDialog(false);
    toast({
      title: "Pedido excluído",
      description: "O registro de pedido foi excluído com sucesso.",
    });
  };

  const handleEdit = async () => {
    if (!selectedOrder || !editForm) return;
    
    try {
      setIsSubmitting(true);
      await updateOrder(selectedOrder.id, editForm);
      setShowEditDialog(false);
      toast({
        title: "Pedido atualizado",
        description: "O registro de pedido foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar o pedido.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/pedidos")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Histórico de Pedidos</h1>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar por nota fiscal, fornecedor ou insumo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Registros de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nota Fiscal</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Insumos</TableHead>
                <TableHead>Quantidade Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.invoiceNumber}</TableCell>
                    <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                    <TableCell>{order.supplierName}</TableCell>
                    <TableCell>
                      {order.items
                        .map((item) => item.materialName)
                        .join(", ")}
                    </TableCell>
                    <TableCell>
                      {order.items.reduce((total, item) => total + item.quantity, 0)}{" "}
                      {order.items.length > 0 ? order.items[0].unitOfMeasure : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setSelectedOrder(order);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Detalhes
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Detalhes do Pedido - NF {order.invoiceNumber}
                                </DialogTitle>
                                <DialogDescription>
                                  Data: {new Date(order.date).toLocaleDateString()}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="grid gap-6">
                                <div>
                                  <h3 className="text-lg font-medium mb-2">
                                    Informações Gerais
                                  </h3>
                                  <div>
                                    <p className="text-sm font-medium">Fornecedor:</p>
                                    <p className="text-sm">{order.supplierName}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <h3 className="text-lg font-medium mb-2">
                                    Insumos Pedidos
                                  </h3>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Insumo</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Lote</TableHead>
                                        <TableHead>Quantidade</TableHead>
                                        <TableHead>Un.</TableHead>
                                        <TableHead>Validade</TableHead>
                                        <TableHead>Laudo</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {order.items.map((item) => (
                                        <TableRow key={item.id}>
                                          <TableCell>{item.materialName}</TableCell>
                                          <TableCell>{item.materialType}</TableCell>
                                          <TableCell>{item.batchNumber}</TableCell>
                                          <TableCell>{item.quantity}</TableCell>
                                          <TableCell>{item.unitOfMeasure}</TableCell>
                                          <TableCell>
                                            {item.expiryDate
                                              ? new Date(item.expiryDate).toLocaleDateString()
                                              : "-"}
                                          </TableCell>
                                          <TableCell>
                                            {item.hasReport ? (
                                              <Check className="h-4 w-4 text-green-600" />
                                            ) : (
                                              <X className="h-4 w-4 text-red-600" />
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                                
                                {order.notes && (
                                  <div>
                                    <h3 className="text-lg font-medium mb-2">
                                      Observações
                                    </h3>
                                    <p className="text-sm">{order.notes}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setSelectedOrder(order);
                              setEditForm({
                                invoiceNumber: order.invoiceNumber,
                                date: order.date,
                                notes: order.notes
                              });
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Nenhum registro de pedido encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!isSubmitting) setShowEditDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
            <DialogDescription>
              Edite as informações do pedido conforme necessário.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="invoiceNumber" className="text-sm font-medium">
                  Nota Fiscal
                </label>
                <Input
                  id="invoiceNumber"
                  value={editForm.invoiceNumber || ''}
                  onChange={(e) => setEditForm({...editForm, invoiceNumber: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label htmlFor="date" className="text-sm font-medium">
                  Data
                </label>
                <Input
                  id="date"
                  type="date"
                  value={editForm.date ? new Date(editForm.date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditForm({
                    ...editForm, 
                    date: e.target.value ? new Date(e.target.value) : undefined
                  })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="notes" className="text-sm font-medium">
                Observações
              </label>
              <textarea
                id="notes"
                rows={3}
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                className="w-full rounded-md border border-input bg-background px-3 py-2 mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button 
              onClick={handleEdit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este pedido?
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => selectedOrder && handleDelete(selectedOrder.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersHistory;
