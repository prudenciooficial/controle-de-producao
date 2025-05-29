import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
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
import { 
  ArrowLeft, 
  MoreVertical, 
  Eye, 
  Trash, 
  Check, 
  X, 
  PencilIcon, 
  Loader,
  PlusCircle,
  MinusCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderItem, Material } from "../types";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const OrdersHistory = () => {
  const { orders, materials, suppliers, deleteOrder, updateOrder } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Order>>({});
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<OrderItem>>({
    materialId: "",
    materialName: "",
    quantity: 0,
    unitOfMeasure: "kg",
    batchNumber: "",
    hasReport: false
  });
  
  const filteredOrders = orders.filter(
    (order) =>
      order.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      order.items.some((item) =>
        item.materialName.toLowerCase().includes(search.toLowerCase())
      )
  );
  
  useEffect(() => {
    if (selectedOrder) {
      setEditForm({
        invoiceNumber: selectedOrder.invoiceNumber,
        date: selectedOrder.date,
        supplierId: selectedOrder.supplierId,
        supplierName: selectedOrder.supplierName,
        notes: selectedOrder.notes
      });
      
      setEditedItems(selectedOrder.items.map(item => ({ ...item })));
    }
  }, [selectedOrder]);
  
  useEffect(() => {
    if (newItem.materialId) {
      const material = materials.find(m => m.id === newItem.materialId);
      if (material) {
        setNewItem(prev => ({
          ...prev,
          materialName: material.name,
          materialType: material.type,
          unitOfMeasure: material.unitOfMeasure
        }));
      }
    }
  }, [newItem.materialId, materials]);
  
  const handleDelete = (id: string) => {
    if (!hasPermission('orders', 'delete')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para excluir pedidos.",
      });
      setShowDeleteDialog(false);
      return;
    }
    deleteOrder(id);
    setShowDeleteDialog(false);
    toast({ title: "Pedido excluído", description: "O pedido foi excluído com sucesso." });
  };

  const handleEdit = async () => {
    if (!selectedOrder || !editForm) return;
    
    if (!hasPermission('orders', 'update')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para atualizar pedidos.",
      });
      setShowEditDialog(false);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Combine basic info with edited items
      const updatedOrder: Partial<Order> = {
        ...editForm,
        items: editedItems
      };
      
      await updateOrder(selectedOrder.id, updatedOrder);
      setShowEditDialog(false);
      toast({ title: "Pedido atualizado", description: "O pedido foi atualizado com sucesso." });
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
  
  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    setEditedItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: newQuantity };
      return updated;
    });
  };
  
  const handleRemoveItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, idx) => idx !== index));
  };
  
  const handleAddItem = () => {
    if (
      !newItem.materialId || 
      !newItem.batchNumber || 
      !newItem.quantity || 
      newItem.quantity <= 0 || 
      !newItem.expiryDate
    ) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos do item corretamente.",
      });
      return;
    }
    
    // Find the material data
    const material = materials.find(m => m.id === newItem.materialId);
    
    if (!material) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Material não encontrado.",
      });
      return;
    }
    
    const itemToAdd: OrderItem = {
      id: "", // Empty id signals it's a new item
      materialId: newItem.materialId,
      materialName: material.name,
      materialType: material.type,
      batchNumber: newItem.batchNumber,
      quantity: newItem.quantity,
      unitOfMeasure: newItem.unitOfMeasure,
      expiryDate: newItem.expiryDate,
      hasReport: newItem.hasReport || false
    };
    
    setEditedItems(prev => [...prev, itemToAdd]);
    
    // Reset the new item form
    setNewItem({
      materialId: "",
      materialName: "",
      quantity: 0,
      unitOfMeasure: "kg",
      batchNumber: "",
      hasReport: false
    });
    
    setIsAddingItem(false);
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
                <TableHead>Data</TableHead>
                <TableHead>Nota Fiscal</TableHead>                
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
                    <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                    <TableCell>{order.invoiceNumber}</TableCell>
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
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setSelectedOrder(order);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Detalhes
                          </DropdownMenuItem>
                          
                          {hasPermission('orders', 'update') && (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setSelectedOrder(order);
                                setShowEditDialog(true);
                              }}
                            >
                              <PencilIcon className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          
                          {hasPermission('orders', 'delete') && (
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
                          )}
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
      
      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        {selectedOrder && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Detalhes do Pedido - NF {selectedOrder.invoiceNumber}
              </DialogTitle>
              <DialogDescription>
                Data: {new Date(selectedOrder.date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Informações Gerais
                </h3>
                <div>
                  <p className="text-sm font-medium">Fornecedor:</p>
                  <p className="text-sm">{selectedOrder.supplierName}</p>
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
                    {selectedOrder.items.map((item) => (
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
              
              {selectedOrder.notes && (
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Observações
                  </h3>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!isSubmitting) setShowEditDialog(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
            <DialogDescription>
              Edite as informações do pedido e dos insumos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Atenção: Alterar quantidades dos insumos afetará diretamente o estoque. Adições e reduções de quantidade serão automaticamente aplicadas.
              </AlertDescription>
            </Alert>
            
            <div className="grid gap-4">
              <h3 className="text-lg font-medium">Informações Gerais</h3>
              
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="supplierName" className="text-sm font-medium">
                    Fornecedor
                  </label>
                  <Input
                    id="supplierName"
                    value={editForm.supplierName || ''}
                    disabled={true}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O fornecedor não pode ser alterado diretamente.
                  </p>
                </div>
              </div>
              
              <div>
                <label htmlFor="notes" className="text-sm font-medium">
                  Observações
                </label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 mt-1"
                />
              </div>
            </div>
            
            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Insumos do Pedido</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddingItem(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Adicionar Insumo
                </Button>
              </div>
              
              {editedItems.length > 0 ? (
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
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editedItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.materialName}</TableCell>
                        <TableCell>{item.materialType}</TableCell>
                        <TableCell>
                          <Input
                            value={item.batchNumber}
                            onChange={(e) => {
                              const updated = [...editedItems];
                              updated[index] = { ...updated[index], batchNumber: e.target.value };
                              setEditedItems(updated);
                            }}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, Number(e.target.value))}
                              className="w-20 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(index, item.quantity + 1)}
                            >
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{item.unitOfMeasure}</TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const updated = [...editedItems];
                              updated[index] = { 
                                ...updated[index], 
                                expiryDate: e.target.value ? new Date(e.target.value) : undefined 
                              };
                              setEditedItems(updated);
                            }}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={item.hasReport}
                              onChange={(e) => {
                                const updated = [...editedItems];
                                updated[index] = { ...updated[index], hasReport: e.target.checked };
                                setEditedItems(updated);
                              }}
                              className="h-4 w-4"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 bg-muted rounded-md">
                  Nenhum insumo adicionado.
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="mt-6">
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
      
      {/* New Item Dialog */}
      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Insumo</DialogTitle>
            <DialogDescription>
              Selecione o insumo e preencha as informações necessárias.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Insumo</label>
              <Select
                value={newItem.materialId}
                onValueChange={(value) => setNewItem({...newItem, materialId: value})}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Selecione o insumo" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name} ({material.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Lote</label>
                <Input
                  value={newItem.batchNumber || ''}
                  onChange={(e) => setNewItem({...newItem, batchNumber: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Quantidade</label>
                <Input
                  type="number"
                  value={newItem.quantity || ''}
                  onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Validade</label>
                <Input
                  type="date"
                  value={newItem.expiryDate ? new Date(newItem.expiryDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setNewItem({
                    ...newItem, 
                    expiryDate: e.target.value ? new Date(e.target.value) : undefined
                  })}
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-end mt-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newItem.hasReport || false}
                    onChange={(e) => setNewItem({...newItem, hasReport: e.target.checked})}
                    id="has-report"
                  />
                  <label htmlFor="has-report" className="text-sm">Possui laudo</label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingItem(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem}>
              Adicionar
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
