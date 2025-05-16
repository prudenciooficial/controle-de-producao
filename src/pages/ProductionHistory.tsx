import React, { useState, useEffect } from "react";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, MoreVertical, Eye, Trash, Loader, Edit, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductionBatch, ProducedItem, UsedMaterial } from "../types";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";

const ProductionHistory = () => {
  const { 
    productionBatches, 
    deleteProductionBatch, 
    updateProductionBatch, 
    isLoading,
    products,
    materialBatches
  } = useData();
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProductionBatch>>({});
  
  // Added for product and material editing
  const [producedItems, setProducedItems] = useState<ProducedItem[]>([]);
  const [usedMaterials, setUsedMaterials] = useState<UsedMaterial[]>([]);
  
  // Calculation helper functions
  const calculateFeculaUsed = (batch: ProductionBatch, products: Product[]) => {
    const conversionFactor = products.find(p => p.name.includes("Fécula"))?.feculaConversionFactor || 25;
    return (batch.mixCount * (batch.feculaBags || 0)) * conversionFactor;
  };
  
  const calculatePredictedKg = (feculaKg: number, products: Product[]) => {
    const predictionFactor = products.find(p => p.name.includes("Fécula"))?.productionPredictionFactor || 5;
    return feculaKg * predictionFactor;
  };
  
  const calculateProducedKg = (items: ProducedItem[], products: Product[]) => {
    return items.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      const weightFactor = product?.weightFactor || 1;
      return total + (item.quantity * weightFactor);
    }, 0);
  };
  
  const filteredBatches = productionBatches.filter(
    (batch) =>
      batch.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      batch.producedItems.some((item) =>
        item.productName.toLowerCase().includes(search.toLowerCase())
      )
  );
  
  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await deleteProductionBatch(id);
      
      toast({
        title: "Produção excluída",
        description: "O registro de produção foi excluído com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir produção:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao excluir o registro de produção.",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedBatch || !editForm) return;

    try {
      setIsSaving(true);
      
      // Include edited produced items and used materials in the update
      const updateData: Partial<ProductionBatch> = {
        ...editForm,
        producedItems: producedItems,
        usedMaterials: usedMaterials
      };
      
      await updateProductionBatch(selectedBatch.id, updateData);
      
      toast({
        title: "Produção atualizada",
        description: "O registro de produção foi atualizado com sucesso.",
      });
      setShowEditDialog(false);
    } catch (error) {
      console.error("Erro ao atualizar produção:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar o registro de produção.",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const openDeleteDialog = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setShowDeleteDialog(true);
  };
  
  const openDetailsDialog = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setShowDetailsDialog(true);
  };

  const openEditDialog = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    
    // Copy the batch details to edit form
    setEditForm({
      batchNumber: batch.batchNumber,
      productionDate: batch.productionDate,
      mixDay: batch.mixDay,
      mixCount: batch.mixCount,
      notes: batch.notes,
    });
    
    // Copy the produced items and used materials for editing
    setProducedItems([...batch.producedItems]);
    setUsedMaterials([...batch.usedMaterials]);
    
    setShowEditDialog(true);
  };
  
  const handleDeleteDialogClose = () => {
    if (!isDeleting) {
      setShowDeleteDialog(false);
      setTimeout(() => {
        setSelectedBatch(null);
      }, 300);
    }
  };
  
  const handleDetailsDialogClose = () => {
    setShowDetailsDialog(false);
    setTimeout(() => {
      setSelectedBatch(null);
    }, 300);
  };

  const handleEditDialogClose = () => {
    if (!isSaving) {
      setShowEditDialog(false);
      setTimeout(() => {
        setSelectedBatch(null);
        setEditForm({});
        setProducedItems([]);
        setUsedMaterials([]);
      }, 300);
    }
  };
  
  // Update a specific produced item
  const updateProducedItem = (index: number, field: keyof ProducedItem, value: any) => {
    const updatedItems = [...producedItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setProducedItems(updatedItems);
  };
  
  // Update a specific used material
  const updateUsedMaterial = (index: number, field: keyof UsedMaterial, value: any) => {
    const updatedMaterials = [...usedMaterials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: value
    };
    setUsedMaterials(updatedMaterials);
  };
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/producao")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Histórico de Produção</h1>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar por lote ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Registros de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading.productionBatches ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="w-8 h-8 animate-spin" />
              <span className="ml-2">Carregando dados...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Quantidade Total</TableHead>
                  <TableHead>Dia da Mexida</TableHead>
                  <TableHead>Qtd. Mexidas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>{batch.batchNumber}</TableCell>
                      <TableCell>
                        {new Date(batch.productionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {batch.producedItems
                          .map((item) => item.productName)
                          .join(", ")}
                      </TableCell>
                      <TableCell>
                        {batch.producedItems.reduce(
                          (total, item) => total + item.quantity,
                          0
                        )}{" "}
                        kg
                      </TableCell>
                      <TableCell>{batch.mixDay}</TableCell>
                      <TableCell>{batch.mixCount}</TableCell>
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
                                openDetailsDialog(batch);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Detalhes
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                openEditDialog(batch);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                              onClick={() => openDeleteDialog(batch)}
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
                    <TableCell colSpan={7} className="text-center py-4">
                      Nenhum registro de produção encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={handleDetailsDialogClose}>
        {selectedBatch && (
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Detalhes da Produção - Lote {selectedBatch.batchNumber}
              </DialogTitle>
              <DialogDescription>
                Data: {new Date(selectedBatch.productionDate).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Informações Gerais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Dia da Mexida:</p>
                    <p className="text-sm">{selectedBatch.mixDay}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Qtd. de Mexidas:</p>
                    <p className="text-sm">{selectedBatch.mixCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sacos de Fécula:</p>
                    <p className="text-sm">{selectedBatch.feculaBags || 0}</p>
                  </div>
                </div>
              </div>
              
              {/* Production Metrics */}
              <div className="bg-muted/30 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">
                  Métricas de Produção
                </h3>
                
                {(() => {
                  // Calculate metrics
                  const feculaKg = calculateFeculaUsed(selectedBatch, products);
                  const predictedKg = calculatePredictedKg(feculaKg, products);
                  const producedKg = calculateProducedKg(selectedBatch.producedItems, products);
                  const difference = producedKg - predictedKg;
                  const average = feculaKg > 0 ? (producedKg / feculaKg).toFixed(2) : "N/A";
                  
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow">
                        <p className="text-xs text-muted-foreground">Fécula Utilizada</p>
                        <p className="text-lg font-bold">{feculaKg.toFixed(2)} kg</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow">
                        <p className="text-xs text-muted-foreground">KG's Previstos</p>
                        <p className="text-lg font-bold">{predictedKg.toFixed(2)} kg</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow">
                        <p className="text-xs text-muted-foreground">KG's Produzidos</p>
                        <p className="text-lg font-bold">{producedKg.toFixed(2)} kg</p>
                      </div>
                      <div className={`bg-white dark:bg-gray-800 p-3 rounded-md shadow ${difference >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        <p className="text-xs text-muted-foreground">Diferença</p>
                        <p className="text-lg font-bold">{difference.toFixed(2)} kg</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow">
                        <p className="text-xs text-muted-foreground">Média Produção</p>
                        <p className="text-lg font-bold">{average}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Produtos Produzidos
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Un.</TableHead>
                      <TableHead>Estoque Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBatch.producedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.batchNumber}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unitOfMeasure}</TableCell>
                        <TableCell>{item.remainingQuantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Insumos Utilizados
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Un.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBatch.usedMaterials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell>{material.materialName}</TableCell>
                        <TableCell>{material.materialType}</TableCell>
                        <TableCell>{material.batchNumber}</TableCell>
                        <TableCell>{material.quantity}</TableCell>
                        <TableCell>{material.unitOfMeasure}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {selectedBatch.notes && (
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Observações
                  </h3>
                  <p className="text-sm">{selectedBatch.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
      
      {/* Enhanced Edit Dialog with Products and Materials editing */}
      <Dialog open={showEditDialog} onOpenChange={handleEditDialogClose}>
        {selectedBatch && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Editar Produção - Lote {selectedBatch.batchNumber}
              </DialogTitle>
              <DialogDescription>
                Modifique as informações necessárias e salve as alterações
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número do Lote</label>
                  <Input 
                    value={editForm.batchNumber || ''}
                    onChange={(e) => setEditForm({...editForm, batchNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data de Produção</label>
                  <Input 
                    type="date"
                    value={editForm.productionDate ? new Date(editForm.productionDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditForm({
                      ...editForm, 
                      productionDate: e.target.value ? new Date(e.target.value) : undefined
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dia da Mexida</label>
                  <Input 
                    value={editForm.mixDay || ''}
                    onChange={(e) => setEditForm({...editForm, mixDay: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantidade de Mexidas</label>
                  <Input 
                    type="number"
                    value={editForm.mixCount || 0}
                    onChange={(e) => setEditForm({...editForm, mixCount: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              {/* Produtos Produzidos - Edição */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Produtos Produzidos</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Un.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {producedItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>
                          <Input 
                            value={item.batchNumber} 
                            onChange={(e) => updateProducedItem(index, 'batchNumber', e.target.value)} 
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => updateProducedItem(index, 'quantity', parseFloat(e.target.value))} 
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>{item.unitOfMeasure}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-sm text-amber-600">
                  Atenção: Alterar a quantidade de um produto ajustará automaticamente o estoque disponível.
                </div>
              </div>
              
              {/* Insumos Utilizados - Edição */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Insumos Utilizados</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Un.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usedMaterials.map((material, index) => (
                      <TableRow key={material.id}>
                        <TableCell>{material.materialName}</TableCell>
                        <TableCell>{material.materialType}</TableCell>
                        <TableCell>{material.batchNumber}</TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={material.quantity} 
                            onChange={(e) => updateUsedMaterial(index, 'quantity', parseFloat(e.target.value))} 
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>{material.unitOfMeasure}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-sm text-amber-600">
                  Atenção: Alterar a quantidade de um insumo ajustará automaticamente o estoque disponível.
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Observações</label>
                <textarea 
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  rows={3}
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                />
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isSaving}>Cancelar</Button>
                </DialogClose>
                <Button 
                  onClick={handleEditSubmit} 
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        )}
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={handleDeleteDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta produção?
              <br />
              Esta ação não pode ser desfeita.
              <br />
              <strong>Os insumos utilizados serão retornados ao estoque.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBatch && handleDelete(selectedBatch.id)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductionHistory;
