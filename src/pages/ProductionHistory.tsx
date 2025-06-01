import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowLeft, MoreVertical, Eye, Trash, Loader, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductionBatch, ProducedItem, UsedMaterial } from "../types";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
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
  
  // Global calculation factors
  const [globalFactors, setGlobalFactors] = useState({
    feculaConversionFactor: 25,
    productionPredictionFactor: 1.5
  });

  const { hasPermission } = useAuth();

  // Fetch global factors on component mount
  useEffect(() => {
    fetchGlobalFactors();
  }, []);

  const fetchGlobalFactors = async () => {
    try {
      const { data, error } = await supabase
        .from("global_settings")
        .select("fecula_conversion_factor, production_prediction_factor")
        .limit(1)
        .single();
      
      if (!error && data) {
        setGlobalFactors({
          feculaConversionFactor: data.fecula_conversion_factor || 25,
          productionPredictionFactor: data.production_prediction_factor || 1.5
        });
      }
    } catch (error) {
      console.error("Error fetching global factors:", error);
    }
  };
  
  // Calculate total weight in kg for a production batch
  const calculateTotalWeightInKg = (batch: ProductionBatch) => {
    return batch.producedItems.reduce((total, item) => {
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
    if (!hasPermission('production', 'delete')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para excluir registros de produção.",
      });
      setShowDeleteDialog(false);
      return;
    }
    try {
      setIsDeleting(true);
      await deleteProductionBatch(id);
      toast({ title: "Registro Excluído", description: "O registro de produção foi excluído com sucesso." });
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

    if (!hasPermission('production', 'update')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para atualizar registros de produção.",
      });
      setShowEditDialog(false);
      return;
    }

    try {
      setIsSaving(true);
      
      // Include edited produced items and used materials in the update
      const updateData: Partial<ProductionBatch> = {
        ...editForm,
        producedItems: producedItems,
        usedMaterials: usedMaterials
      };
      
      await updateProductionBatch(selectedBatch.id, updateData);
      toast({ title: "Registro Atualizado", description: "O registro de produção foi atualizado com sucesso." });
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

  // Calculate production metrics based on the selected batch
  const calculateProductionMetrics = (batch: ProductionBatch) => {
    // Find fécula material in used materials
    const feculaMaterial = batch.usedMaterials.find(
      m => m.materialType.toLowerCase() === "fécula" || m.materialName.toLowerCase().includes("fécula")
    );
    
    // Calculate fécula utilizada
    const feculaQuantity = feculaMaterial ? feculaMaterial.quantity : 0;
    const feculaUtilizada = batch.mixCount * feculaQuantity * globalFactors.feculaConversionFactor;
    
    // Calculate kg's previstos
    const kgPrevistos = feculaUtilizada * globalFactors.productionPredictionFactor;
    
    // Calculate kg's produzidos (considering weight factor for each product)
    let kgProduzidos = 0;
    
    for (const item of batch.producedItems) {
      const product = products.find(p => p.id === item.productId);
      const weightFactor = product?.weightFactor || 1;
      kgProduzidos += item.quantity * weightFactor;
    }
    
    // Calculate diferença
    const diferenca = kgProduzidos - kgPrevistos;
    
    // Calculate média da produção
    const mediaProducao = feculaUtilizada > 0 ? kgProduzidos / feculaUtilizada : 0;
    
    return {
      feculaUtilizada: feculaUtilizada.toFixed(2),
      kgPrevistos: kgPrevistos.toFixed(2),
      kgProduzidos: kgProduzidos.toFixed(2),
      diferenca: diferenca.toFixed(2),
      mediaProducao: mediaProducao.toFixed(2)
    };
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className={isMobile ? "hidden" : ""}>Produtos</TableHead>
                    <TableHead>Quantidade Total</TableHead>
                    <TableHead className={isMobile ? "hidden" : ""}>Dia da Mexida</TableHead>
                    <TableHead className={isMobile ? "hidden" : ""}>Qtd. Mexidas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.length > 0 ? (
                    filteredBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                        <TableCell>
                          {new Date(batch.productionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className={isMobile ? "hidden" : ""}>
                          <div className="max-w-xs truncate">
                            {batch.producedItems
                              .map((item) => item.productName)
                              .join(", ")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {calculateTotalWeightInKg(batch).toFixed(2)} kg
                        </TableCell>
                        <TableCell className={isMobile ? "hidden" : ""}>{batch.mixDay}</TableCell>
                        <TableCell className={isMobile ? "hidden" : ""}>{batch.mixCount}</TableCell>
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
                                Ver Detalhes
                              </DropdownMenuItem>

                              {hasPermission('production', 'update') && (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    openEditDialog(batch);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              
                              {hasPermission('production', 'delete') && (
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive"
                                  onClick={() => openDeleteDialog(batch)}
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
                        Nenhum registro de produção encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Enhanced Details Dialog with Mobile Responsiveness */}
      <Dialog open={showDetailsDialog} onOpenChange={handleDetailsDialogClose}>
        {selectedBatch && (
          <DialogContent className="w-[95vw] max-w-none sm:max-w-2xl overflow-y-auto max-h-[90vh] p-4 sm:p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl sm:text-2xl">
                Detalhes da Produção - Lote {selectedBatch.batchNumber}
              </DialogTitle>
              <DialogDescription>
                Data: {new Date(selectedBatch.productionDate).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 text-sm sm:text-base">
              {/* Informações Gerais */}
              <section>
                <h3 className="text-md sm:text-lg font-semibold mb-2">Informações Gerais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 p-3 bg-muted/50 rounded-md">
                  <div>
                    <p className="font-medium text-muted-foreground">Dia da Mexida</p>
                    <p>{selectedBatch.mixDay}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Qtd. de Mexidas</p>
                    <p>{selectedBatch.mixCount}</p>
                  </div>
                  {selectedBatch.notes && (
                    <div className="sm:col-span-2">
                      <p className="font-medium text-muted-foreground">Observações</p>
                      <p className="whitespace-pre-wrap text-xs sm:text-sm bg-white dark:bg-zinc-800 p-2 rounded">{selectedBatch.notes}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Métricas de Produção */}
              <section>
                <h3 className="text-md sm:text-lg font-semibold mb-2">Métricas de Produção</h3>
                {(() => {
                  const metrics = calculateProductionMetrics(selectedBatch);
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-3 bg-muted/50 rounded-md">
                      <div>
                        <p className="font-medium text-muted-foreground">Fécula utilizada</p>
                        <p>{metrics.feculaUtilizada} kg</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Kg's previstos</p>
                        <p>{metrics.kgPrevistos} kg</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Kg's produzidos</p>
                        <p>{metrics.kgProduzidos} kg</p>
                      </div>
                      <div className={metrics.diferenca && parseFloat(metrics.diferenca) < 0 ? "text-destructive" : "text-success"}>
                        <p className="font-medium text-muted-foreground">Diferença</p>
                        <p>{metrics.diferenca} kg</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Média da produção</p>
                        <p>{metrics.mediaProducao}</p>
                      </div>
                    </div>
                  );
                })()}
              </section>

              {/* Produtos Produzidos */}
              <section>
                <h3 className="text-md sm:text-lg font-semibold mb-2">Produtos Produzidos</h3>
                <div className="overflow-x-auto shadow-sm rounded-md">
                  <Table className="min-w-full">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="px-3 py-2 whitespace-nowrap">Produto</TableHead>
                        <TableHead className="px-3 py-2 whitespace-nowrap">Lote</TableHead>
                        <TableHead className="px-3 py-2 whitespace-nowrap text-right">Un. Produzidas</TableHead>
                        <TableHead className="px-3 py-2 whitespace-nowrap text-right">Quantidade (kg)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white dark:bg-zinc-800">
                      {selectedBatch.producedItems.map((item, index) => {
                        const productDetails = products.find(p => p.id === item.productId);
                        const itemWeightInKg = item.quantity * (productDetails?.weightFactor || 1);
                        return (
                          <TableRow key={index} className="border-b dark:border-zinc-700">
                            <TableCell className="px-3 py-2 whitespace-nowrap">{item.productName}</TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap">{item.batchNumber}</TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap text-right">{item.quantity}</TableCell>
                            <TableCell className="px-3 py-2 whitespace-nowrap text-right">{itemWeightInKg.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {/* Insumos Utilizados */}
              <section>
                <h3 className="text-md sm:text-lg font-semibold mb-2">Insumos Utilizados</h3>
                <div className="overflow-x-auto shadow-sm rounded-md">
                  <Table className="min-w-full">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="px-3 py-2 whitespace-nowrap">Insumo</TableHead>
                        <TableHead className="px-3 py-2 whitespace-nowrap">Tipo</TableHead>
                        <TableHead className="px-3 py-2 whitespace-nowrap">Lote</TableHead>
                        <TableHead className="px-3 py-2 whitespace-nowrap text-right">Quantidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white dark:bg-zinc-800">
                      {selectedBatch.usedMaterials.map((material, index) => (
                        <TableRow key={index} className="border-b dark:border-zinc-700">
                          <TableCell className="px-3 py-2 whitespace-nowrap">{material.materialName}</TableCell>
                          <TableCell className="px-3 py-2 whitespace-nowrap">{material.materialType}</TableCell>
                          <TableCell className="px-3 py-2 whitespace-nowrap">{material.batchNumber}</TableCell>
                          <TableCell className="px-3 py-2 whitespace-nowrap text-right">{material.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </div>
            
            <DialogFooter className="mt-6 pt-4 border-t dark:border-zinc-700">
              <DialogClose asChild>
                <Button variant="outline">Fechar</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
      
      {/* Enhanced Edit Dialog with Products and Materials editing */}
      <Dialog open={showEditDialog} onOpenChange={handleEditDialogClose}>
        {selectedBatch && (
          <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[90vh] p-4' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle className={isMobile ? 'text-lg' : 'text-xl'}>
                Editar Produção - Lote {selectedBatch.batchNumber}
              </DialogTitle>
              <DialogDescription className={isMobile ? 'text-sm' : ''}>
                Modifique as informações necessárias e salve as alterações
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6">
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
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
              
              {/* Produtos Produzidos - Edição com responsividade */}
              <div className="space-y-4">
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Produtos Produzidos</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Produto</TableHead>
                        <TableHead className="min-w-[100px]">Lote</TableHead>
                        <TableHead className="min-w-[100px]">Quantidade</TableHead>
                        <TableHead className="min-w-[60px]">Un.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {producedItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>
                            <Input 
                              value={item.batchNumber} 
                              onChange={(e) => updateProducedItem(index, 'batchNumber', e.target.value)} 
                              className="min-w-[100px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={item.quantity} 
                              onChange={(e) => updateProducedItem(index, 'quantity', parseFloat(e.target.value))} 
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="text-sm">{item.unitOfMeasure}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                  Atenção: Alterar a quantidade de um produto ajustará automaticamente o estoque disponível.
                </div>
              </div>
              
              {/* Insumos Utilizados - Edição com responsividade */}
              <div className="space-y-4">
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Insumos Utilizados</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Insumo</TableHead>
                        <TableHead className="min-w-[80px]">Tipo</TableHead>
                        <TableHead className="min-w-[100px]">Lote</TableHead>
                        <TableHead className="min-w-[100px]">Quantidade</TableHead>
                        <TableHead className="min-w-[60px]">Un.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usedMaterials.map((material, index) => (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">{material.materialName}</TableCell>
                          <TableCell>{material.materialType}</TableCell>
                          <TableCell>{material.batchNumber}</TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={material.quantity} 
                              onChange={(e) => updateUsedMaterial(index, 'quantity', parseFloat(e.target.value))} 
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="text-sm">{material.unitOfMeasure}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
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
              
              <DialogFooter className={isMobile ? 'flex-col space-y-2' : ''}>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isSaving} className={isMobile ? 'w-full' : ''}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button 
                  onClick={handleEditSubmit} 
                  disabled={isSaving}
                  className={isMobile ? 'w-full' : ''}
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
        <AlertDialogContent className={isMobile ? 'max-w-[90vw]' : ''}>
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
          <AlertDialogFooter className={isMobile ? 'flex-col space-y-2' : ''}>
            <AlertDialogCancel disabled={isDeleting} className={isMobile ? 'w-full' : ''}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBatch && handleDelete(selectedBatch.id)}
              disabled={isDeleting}
              className={`bg-destructive text-destructive-foreground hover:bg-destructive/90 ${isMobile ? 'w-full' : ''}`}
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
