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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, MoreVertical, Eye, Trash, Edit, Loader, PlusCircle, MinusCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Sale, SaleItem, ProducedItem } from "../types";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SalesHistory = () => {
  const { sales, products, getAvailableProducts, deleteSale, updateSale } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Sale>>({});
  const [editedItems, setEditedItems] = useState<SaleItem[]>([]);
  const [availableItems, setAvailableItems] = useState<ProducedItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SaleItem>>({
    productId: "",
    producedItemId: "",
    quantity: 0,
    unitOfMeasure: "kg"
  });
  const [availableBatchesForProduct, setAvailableBatchesForProduct] = useState<ProducedItem[]>([]);
  
  // Calculate total weight in kg for a sale
  const calculateTotalWeightInKg = (sale: Sale) => {
    return sale.items.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      const weightFactor = product?.weightFactor || 1;
      return total + (item.quantity * weightFactor);
    }, 0);
  };
  
  const filteredSales = sales.filter(
    (sale) =>
      sale.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      sale.customerName.toLowerCase().includes(search.toLowerCase()) ||
      sale.items.some((item) =>
        item.productName.toLowerCase().includes(search.toLowerCase())
      )
  );
  
  useEffect(() => {
    if (selectedSale) {
      setEditForm({
        invoiceNumber: selectedSale.invoiceNumber,
        date: selectedSale.date,
        customerName: selectedSale.customerName,
        type: selectedSale.type,
        notes: selectedSale.notes
      });
      
      setEditedItems(selectedSale.items.map(item => ({ ...item })));
      
      // Get all available produced items with remaining quantity > 0
      const available = getAvailableProducts();
      setAvailableItems(available);
    }
  }, [selectedSale, getAvailableProducts]);
  
  useEffect(() => {
    if (newItem.productId) {
      const availableProducts = getAvailableProducts();
      const batches = availableProducts.filter(
        item => item.productId === newItem.productId && item.remainingQuantity > 0
      );
      setAvailableBatchesForProduct(batches);
      
      if (batches.length > 0) {
        setNewItem(prev => ({
          ...prev,
          producedItemId: batches[0].id,
          unitOfMeasure: batches[0].unitOfMeasure
        }));
      }
    } else {
      setAvailableBatchesForProduct([]);
    }
  }, [newItem.productId, getAvailableProducts]);
  
  const handleDelete = (id: string) => {
    if (!hasPermission('sales', 'delete')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para excluir registros de vendas.",
      });
      setShowDeleteDialog(false);
      return;
    }
    deleteSale(id);
    setShowDeleteDialog(false);
    toast({ title: "Registro Excluído", description: "O registro de venda foi excluído com sucesso." });
  };
  
  const handleEdit = async () => {
    if (!selectedSale || !editForm) return;

    if (!hasPermission('sales', 'update')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para atualizar registros de vendas.",
      });
      setShowEditDialog(false);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Combine basic info with edited items
      const updatedSale: Partial<Sale> = {
        ...editForm,
        items: editedItems
      };
      
      await updateSale(selectedSale.id, updatedSale);
      setShowEditDialog(false);
      toast({ title: "Registro Atualizado", description: "O registro de venda foi atualizado com sucesso." });
    } catch (error) {
      console.error("Erro ao atualizar venda:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar a venda.",
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
    if (!newItem.productId || !newItem.producedItemId || !newItem.quantity || newItem.quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos do item corretamente.",
      });
      return;
    }
    
    // Find the product and batch data
    const product = products.find(p => p.id === newItem.productId);
    const batch = getAvailableProducts().find(p => p.id === newItem.producedItemId);
    
    if (!product || !batch) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Produto ou lote não encontrado.",
      });
      return;
    }
    
    // Check if quantity is available
    if (batch.remainingQuantity < newItem.quantity) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Quantidade insuficiente disponível. Máximo: ${batch.remainingQuantity} ${batch.unitOfMeasure}.`,
      });
      return;
    }
    
    const itemToAdd: SaleItem = {
      id: "", // Empty id signals it's a new item
      productId: newItem.productId,
      productName: product.name,
      producedItemId: newItem.producedItemId,
      batchNumber: batch.batchNumber,
      quantity: newItem.quantity,
      unitOfMeasure: newItem.unitOfMeasure || batch.unitOfMeasure
    };
    
    setEditedItems(prev => [...prev, itemToAdd]);
    
    // Reset the new item form
    setNewItem({
      productId: "",
      producedItemId: "",
      quantity: 0,
      unitOfMeasure: "kg"
    });
    
    setIsAddingItem(false);
  };
  
  const getSaleTypeColor = (type: string) => {
    switch (type) {
      case "Venda":
        return "bg-blue-500";
      case "Doação":
        return "bg-yellow-500";
      case "Descarte":
        return "bg-red-500";
      case "Devolução":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/vendas")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Histórico de Vendas</h1>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar por nota fiscal, cliente ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Registros de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nota Fiscal</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Quantidade Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.invoiceNumber}</TableCell>
                    <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                    <TableCell>{sale.customerName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getSaleTypeColor(sale.type)}>
                        {sale.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.items
                        .map((item) => item.productName)
                        .join(", ")}
                    </TableCell>
                    <TableCell>
                      {calculateTotalWeightInKg(sale).toFixed(2)} kg
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
                              setSelectedSale(sale);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Detalhes
                          </DropdownMenuItem>
                          
                          {hasPermission('sales', 'update') && (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setSelectedSale(sale);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          
                          {hasPermission('sales', 'delete') && (
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                              onClick={() => {
                                setSelectedSale(sale);
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
                  <TableCell colSpan={7} className="text-center py-4">
                    Nenhum registro de venda encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        {selectedSale && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Detalhes da Venda - NF {selectedSale.invoiceNumber}
              </DialogTitle>
              <DialogDescription>
                Data: {new Date(selectedSale.date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Informações Gerais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Cliente:</p>
                    <p className="text-sm">{selectedSale.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tipo:</p>
                    <Badge variant="secondary" className={getSaleTypeColor(selectedSale.type)}>
                      {selectedSale.type}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Produtos Vendidos
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Un. Vendidas</TableHead>
                      <TableHead>Quantidade (kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      const weightFactor = product?.weightFactor || 1;
                      const quantityInKg = item.quantity * weightFactor;
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.batchNumber}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{quantityInKg.toFixed(2)} kg</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {selectedSale.notes && (
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Observações
                  </h3>
                  <p className="text-sm">{selectedSale.notes}</p>
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
            <DialogTitle>Editar Venda</DialogTitle>
            <DialogDescription>
              Edite as informações da venda e dos produtos vendidos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Atenção: Alterar quantidades dos produtos afetará diretamente o estoque. Adições e reduções de quantidade serão automaticamente aplicadas.
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
                  <label htmlFor="customerName" className="text-sm font-medium">
                    Cliente
                  </label>
                  <Input
                    id="customerName"
                    value={editForm.customerName || ''}
                    onChange={(e) => setEditForm({...editForm, customerName: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label htmlFor="type" className="text-sm font-medium">
                    Tipo
                  </label>
                  <Select
                    value={editForm.type || 'Venda'}
                    onValueChange={(value) => setEditForm({...editForm, type: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Venda">Venda</SelectItem>
                      <SelectItem value="Doação">Doação</SelectItem>
                      <SelectItem value="Descarte">Descarte</SelectItem>
                      <SelectItem value="Devolução">Devolução</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label htmlFor="notes" className="text-sm font-medium">
                  Observações
                </label>
                <Input
                  id="notes"
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Produtos Vendidos</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddingItem(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>
              
              {editedItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Un.</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editedItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.batchNumber}</TableCell>
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
                  Nenhum produto adicionado.
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
            <DialogTitle>Adicionar Produto</DialogTitle>
            <DialogDescription>
              Selecione o produto e a quantidade para adicionar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium">Produto</label>
                <Select
                  value={newItem.productId}
                  onValueChange={(value) => setNewItem({...newItem, productId: value})}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {newItem.productId && (
                <div>
                  <label className="text-sm font-medium">Lote</label>
                  <Select
                    value={newItem.producedItemId}
                    onValueChange={(value) => {
                      const batch = availableBatchesForProduct.find(b => b.id === value);
                      setNewItem({
                        ...newItem, 
                        producedItemId: value,
                        unitOfMeasure: batch?.unitOfMeasure || "kg"
                      });
                    }}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Selecione o lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBatchesForProduct.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.batchNumber} - Disponível: {batch.remainingQuantity} {batch.unitOfMeasure}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">Quantidade</label>
                <Input
                  type="number"
                  value={newItem.quantity || ''}
                  onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                  className="w-full mt-1"
                />
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
              Tem certeza que deseja excluir esta venda?
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
              onClick={() => selectedSale && handleDelete(selectedSale.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesHistory;
