import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { getStockReductions, deleteStockReduction, updateStockReduction } from "@/services/stockReductionService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { 
  ArrowLeft, 
  MoreVertical, 
  Eye, 
  Trash, 
  Loader, 
  Search,
  Calendar,
  TrendingDown,
  Package,
  Minus,
  FileText,
  Filter,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumberBR } from "@/components/helpers/dateFormatUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface para baixa de estoque
interface StockReduction {
  id: string;
  date: string;
  materialBatchId: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Dados relacionados que serão buscados via join
  materialBatch?: {
    id: string;
    materialName: string;
    materialType: string;
    batchNumber: string;
    unitOfMeasure: string;
    remainingQuantity: number;
  };
}

const StockReductionHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { hasPermission, user } = useAuth();
  const { materialBatches, refetchMaterialBatches } = useData();
  
  const [stockReductions, setStockReductions] = useState<StockReduction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedReduction, setSelectedReduction] = useState<StockReduction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  
  // Estados para edição
  const [editForm, setEditForm] = useState({
    date: "",
    quantity: 0,
    notes: ""
  });

  // Fetch stock reductions on component mount
  useEffect(() => {
    loadStockReductions();
  }, []);

  const loadStockReductions = async () => {
    try {
      setIsLoading(true);
      
      const data = await getStockReductions();

      const formattedData: StockReduction[] = data?.map(item => ({
        id: item.id,
        date: item.data,
        materialBatchId: item.lote_material_id,
        quantity: item.quantidade,
        notes: item.observacoes,
        createdAt: item.criado_em,
        updatedAt: item.atualizado_em,
        materialBatch: item.material_batches ? {
          id: item.material_batches.id,
          materialName: item.material_batches.materials?.name || "Material não identificado",
          materialType: item.material_batches.materials?.type || "Tipo não identificado",
          batchNumber: item.material_batches.batch_number,
          unitOfMeasure: item.material_batches.unit_of_measure,
          remainingQuantity: item.material_batches.remaining_quantity,
        } : undefined
      })) || [];

      setStockReductions(formattedData);
    } catch (error) {
      console.error("Error loading stock reductions:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar histórico de baixas.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter stock reductions
  const filteredReductions = useMemo(() => {
    return stockReductions.filter((reduction) =>
      reduction.materialBatch?.materialName.toLowerCase().includes(search.toLowerCase()) ||
      reduction.materialBatch?.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      reduction.materialBatch?.materialType.toLowerCase().includes(search.toLowerCase())
    );
  }, [stockReductions, search]);

  // Calculate statistics
  const totalReductions = filteredReductions.length;
  const totalQuantity = filteredReductions.reduce((sum, reduction) => sum + reduction.quantity, 0);
  const uniqueMaterials = new Set(filteredReductions.map(r => r.materialBatch?.materialName)).size;
  const recentReductions = filteredReductions.filter(r => {
    const reductionDate = new Date(r.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return reductionDate >= thirtyDaysAgo;
  }).length;

  // Handle edit
  const handleEdit = async () => {
    if (!selectedReduction) return;

    try {
      setIsUpdating(true);
      
      await updateStockReduction(
        selectedReduction.id,
        {
          date: editForm.date,
          quantity: editForm.quantity,
          notes: editForm.notes,
        },
        user?.id,
        user?.user_metadata?.full_name || user?.email
      );

      toast({
        title: "Baixa Atualizada",
        description: "A baixa de estoque foi atualizada com sucesso.",
      });

      await loadStockReductions();
      await refetchMaterialBatches();
      setShowEditDialog(false);
      setSelectedReduction(null);
    } catch (error) {
      console.error("Error updating stock reduction:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar a baixa de estoque.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedReduction) return;

    try {
      setIsDeleting(true);
      
      await deleteStockReduction(
        selectedReduction.id,
        user?.id,
        user?.user_metadata?.full_name || user?.email
      );

      toast({
        title: "Baixa Excluída",
        description: "A baixa de estoque foi excluída com sucesso.",
      });

      await loadStockReductions();
      setShowDeleteDialog(false);
      setSelectedReduction(null);
    } catch (error) {
      console.error("Error deleting stock reduction:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir a baixa de estoque.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Dialog handlers
  const openDetailsDialog = (reduction: StockReduction) => {
    setSelectedReduction(reduction);
    setShowDetailsDialog(true);
  };

  const openEditDialog = (reduction: StockReduction) => {
    setSelectedReduction(reduction);
    setEditForm({
      date: reduction.date,
      quantity: reduction.quantity,
      notes: reduction.notes || ""
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (reduction: StockReduction) => {
    setSelectedReduction(reduction);
    setShowDeleteDialog(true);
  };

  // Stock Reduction Card Component
  const StockReductionCard = ({ reduction, index }: { reduction: StockReduction; index: number }) => {
    const reductionDate = new Date(reduction.date);
    
    return (
      <Card key={reduction.id} className="relative group hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">
                {reduction.materialBatch?.materialName || "Material não identificado"}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(reductionDate, "dd/MM/yyyy", { locale: ptBR })}
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  Lote: {reduction.materialBatch?.batchNumber || "N/A"}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {reduction.materialBatch?.materialType || "Tipo não identificado"}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => openDetailsDialog(reduction)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  {hasPermission('inventory', 'edit') && (
                    <DropdownMenuItem onClick={() => openEditDialog(reduction)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {hasPermission('inventory', 'delete') && (
                    <DropdownMenuItem 
                      onClick={() => openDeleteDialog(reduction)}
                      className="text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Quantidade:</span>
              <p className="font-medium text-lg">
                {formatNumberBR(reduction.quantity)} {reduction.materialBatch?.unitOfMeasure || ""}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Registrado em:</span>
              <p className="font-medium">
                {format(new Date(reduction.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          {reduction.notes && (
            <div className="mt-3 p-2 bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground">Observações:</span>
              <p className="text-sm mt-1">{reduction.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium">Carregando histórico de baixas...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/estoque")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Histórico de Baixas</h1>
            <p className="text-muted-foreground">Visualize todas as baixas de estoque registradas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/estoque?tab=baixa")}>
            <Minus className="mr-2 h-4 w-4" />
            Nova Baixa
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Baixas</p>
                <p className="text-2xl font-bold">{totalReductions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Materiais Diferentes</p>
                <p className="text-2xl font-bold">{uniqueMaterials}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Últimos 30 dias</p>
                <p className="text-2xl font-bold">{recentReductions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Quantidade Total</p>
                <p className="text-2xl font-bold">{formatNumberBR(totalQuantity)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por material, lote ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'cards' ? 'default' : 'outline'}
            onClick={() => setView('cards')}
            size="sm"
          >
            Cards
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'outline'}
            onClick={() => setView('table')}
            size="sm"
          >
            Tabela
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredReductions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Minus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhuma baixa encontrada
            </h3>
            <p className="text-sm text-muted-foreground">
              {search ? "Tente ajustar os filtros de busca." : "Ainda não há baixas de estoque registradas."}
            </p>
          </CardContent>
        </Card>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReductions.map((reduction, index) => (
            <StockReductionCard key={reduction.id} reduction={reduction} index={index} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReductions.map((reduction) => (
                  <TableRow key={reduction.id}>
                    <TableCell className="font-medium">
                      {reduction.materialBatch?.materialName || "N/A"}
                    </TableCell>
                    <TableCell>{reduction.materialBatch?.batchNumber || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {reduction.materialBatch?.materialType || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(reduction.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {formatNumberBR(reduction.quantity)} {reduction.materialBatch?.unitOfMeasure || ""}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetailsDialog(reduction)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {hasPermission('inventory', 'edit') && (
                            <DropdownMenuItem onClick={() => openEditDialog(reduction)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {hasPermission('inventory', 'delete') && (
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(reduction)}
                              className="text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Baixa de Estoque</DialogTitle>
            <DialogDescription>
              Informações completas sobre a baixa registrada
            </DialogDescription>
          </DialogHeader>
          
          {selectedReduction && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Material</Label>
                  <p className="text-sm font-medium">{selectedReduction.materialBatch?.materialName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tipo</Label>
                  <p className="text-sm">{selectedReduction.materialBatch?.materialType || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Lote</Label>
                  <p className="text-sm">{selectedReduction.materialBatch?.batchNumber || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data da Baixa</Label>
                  <p className="text-sm">{format(new Date(selectedReduction.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quantidade</Label>
                  <p className="text-sm font-medium text-lg">
                    {formatNumberBR(selectedReduction.quantity)} {selectedReduction.materialBatch?.unitOfMeasure || ""}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Registrado em</Label>
                  <p className="text-sm">{format(new Date(selectedReduction.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedReduction.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Observações</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedReduction.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Baixa de Estoque</DialogTitle>
            <DialogDescription>
              Modifique os dados da baixa. A quantidade em estoque será ajustada automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReduction && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Material</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedReduction.materialBatch?.materialName} - Lote: {selectedReduction.materialBatch?.batchNumber}
                </p>
              </div>
              
              <div>
                <Label htmlFor="edit-date">Data</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-quantity">Quantidade ({selectedReduction.materialBatch?.unitOfMeasure})</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-notes">Observações</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações sobre a baixa..."
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEdit} 
              disabled={isUpdating || editForm.quantity <= 0}
            >
              {isUpdating ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir esta baixa de estoque? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockReductionHistory; 