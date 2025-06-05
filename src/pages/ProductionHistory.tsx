import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { 
  ArrowLeft, 
  MoreVertical, 
  Eye, 
  Trash, 
  Loader, 
  Edit, 
  Search,
  Package,
  Calendar,
  TrendingUp,
  Zap,
  Plus,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductionBatch, ProducedItem, UsedMaterial } from "../types";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumberBR } from "@/components/helpers/dateFormatUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ProductionHistory = () => {
  const { 
    productionBatches, 
    deleteProductionBatch, 
    updateProductionBatch, 
    isLoading,
    products,
    materialBatches,
    refetchProductionBatches
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
  const [view, setView] = useState<'cards' | 'table'>('cards');
  
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

  // Update selectedBatch when productionBatches changes (after refetch)
  useEffect(() => {
    if (selectedBatch && productionBatches.length > 0) {
      const updatedBatch = productionBatches.find(b => b.id === selectedBatch.id);
      if (updatedBatch) {
        setSelectedBatch(updatedBatch);
      }
    }
  }, [productionBatches, selectedBatch?.id]);

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
  
  // Calculate statistics
  const totalBatches = filteredBatches.length;
  const totalProducts = filteredBatches.reduce((total, batch) => 
    total + batch.producedItems.reduce((sum, item) => sum + item.quantity, 0), 0
  );
  const totalWeight = filteredBatches.reduce((total, batch) => 
    total + calculateTotalWeightInKg(batch), 0
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
      
      // Refresh automático para sincronizar dados
      await refetchProductionBatches();
      
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
      
      // Recarregar dados para atualizar métricas e status
      await refetchProductionBatches();
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

    // Copy the produced items for editing
    setProducedItems([...batch.producedItems]);
    
    // Copy the used materials for editing
    setUsedMaterials([...batch.usedMaterials]);
    
    setShowEditDialog(true);
  };

  const handleDeleteDialogClose = () => {
    setShowDeleteDialog(false);
    setSelectedBatch(null);
  };

  const handleDetailsDialogClose = () => {
    setShowDetailsDialog(false);
    setSelectedBatch(null);
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    setSelectedBatch(null);
  };

  const updateProducedItem = (index: number, field: keyof ProducedItem, value: any) => {
    setProducedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const updateUsedMaterial = (index: number, field: keyof UsedMaterial, value: any) => {
    setUsedMaterials(prev => prev.map((material, i) => 
      i === index ? { ...material, [field]: value } : material
    ));
  };

  const calculateProductionMetrics = (batch: ProductionBatch) => {
    // Find fécula material in used materials (LÓGICA ORIGINAL)
    const feculaMaterial = batch.usedMaterials.find(
      m => m.materialType.toLowerCase() === "fécula" || m.materialName.toLowerCase().includes("fécula")
    );
    
    // Calculate fécula utilizada (LÓGICA ORIGINAL)
    const feculaQuantity = feculaMaterial ? feculaMaterial.quantity : 0;
    const feculaUtilizada = batch.mixCount * feculaQuantity * globalFactors.feculaConversionFactor;
    
    // Calculate kg's previstos (LÓGICA ORIGINAL)
    const kgPrevistos = feculaUtilizada * globalFactors.productionPredictionFactor;
    
    // Calculate kg's produzidos (considering weight factor for each product) (LÓGICA ORIGINAL)
    let kgProduzidos = 0;
    
    for (const item of batch.producedItems) {
      const product = products.find(p => p.id === item.productId);
      const weightFactor = product?.weightFactor || 1;
      kgProduzidos += item.quantity * weightFactor;
    }
    
    // Calculate diferença (LÓGICA ORIGINAL)
    const diferenca = kgProduzidos - kgPrevistos;
    
    // Calculate média da produção (LÓGICA ORIGINAL)
    const mediaProducao = feculaUtilizada > 0 ? kgProduzidos / feculaUtilizada : 0;
    
    const totalWeight = calculateTotalWeightInKg(batch);
    const totalItems = batch.producedItems.reduce((sum, item) => sum + item.quantity, 0);
    const efficiency = totalItems > 0 ? (totalWeight / totalItems) * 100 : 0;
    
    return {
      totalWeight,
      totalItems,
      efficiency,
      feculaUtilizada,
      kgsPrevistos: kgPrevistos,
      kgsProduzidos: kgProduzidos,
      diferenca,
      mediaDaProducao: mediaProducao
    };
  };

  // Get status badge variant based on production metrics
  const getStatusBadge = (batch: ProductionBatch) => {
    const metrics = calculateProductionMetrics(batch);
    const mediaProducao = metrics.mediaDaProducao;
    
    if (mediaProducao <= 1.30) {
      return { variant: "destructive" as const, label: "Crítica" };
    } else if (mediaProducao <= 1.40) {
      return { variant: "secondary" as const, label: "Baixa" };
    } else if (mediaProducao <= 1.45) {
      return { variant: "outline" as const, label: "Regular" };
    } else if (mediaProducao >= 1.60) {
      return { variant: "default" as const, label: "Ótima" };
    } else if (mediaProducao >= 1.55) {
      return { variant: "default" as const, label: "Boa" };
    } else if (mediaProducao >= 1.50) {
      return { variant: "secondary" as const, label: "Padrão" };
    } else {
      return { variant: "outline" as const, label: "Regular" };
    }
  };

  // Render modern production card
  const ProductionCard = ({ batch, index }: { batch: ProductionBatch; index: number }) => {
    const metrics = calculateProductionMetrics(batch);
    const status = getStatusBadge(batch);
    const productionDate = new Date(batch.productionDate);
    
    return (
      <Card className="group relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transition-all duration-500 hover:-translate-y-2">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Sparkle effect */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
        </div>

        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg group-hover:shadow-blue-500/25 transition-shadow duration-300">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <CardTitle 
                  className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 cursor-pointer hover:underline"
                  onClick={() => openDetailsDialog(batch)}
                >
                  {batch.batchNumber}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3 w-3 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {format(productionDate, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={status.variant} className="font-medium shadow-sm">
                {status.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => openDetailsDialog(batch)} className="cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  {hasPermission('production', 'update') && (
                    <DropdownMenuItem onClick={() => openEditDialog(batch)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {hasPermission('production', 'delete') && (
                    <DropdownMenuItem 
                      onClick={() => openDeleteDialog(batch)} 
                      className="cursor-pointer text-red-600 dark:text-red-400"
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

        <CardContent className="relative space-y-4">
          {/* Métricas de Produção - EXATAS DO PRINT */}
          <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-indigo-200/30 dark:border-indigo-700/30">
            <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Métricas de Produção
            </h4>
            
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Fécula utilizada</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {formatNumberBR(metrics.feculaUtilizada)} kg
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Kg's previstos</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {formatNumberBR(metrics.kgsPrevistos)} kg
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Kg's produzidos</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatNumberBR(metrics.kgsProduzidos)} kg
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs mt-3 pt-3 border-t border-indigo-200/50 dark:border-indigo-700/50">
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Diferença</span>
                <span className={`font-bold ${metrics.diferenca >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {metrics.diferenca >= 0 ? '+' : ''}{formatNumberBR(metrics.diferenca)} kg
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Média da produção</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {metrics.mediaDaProducao.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Métricas Adicionais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mexidas
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {batch.mixCount}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Produtos
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {batch.producedItems.length}
              </p>
            </div>
          </div>

          {/* Products Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos ({batch.producedItems.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {batch.producedItems.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {item.productName}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {formatNumberBR(item.quantity)} {item.unitOfMeasure === 'kg' ? 'unidades' : item.unitOfMeasure}
                  </Badge>
                </div>
              ))}
              {batch.producedItems.length > 3 && (
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    +{batch.producedItems.length - 3} mais produtos
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Mix Day Badge */}
          <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Dia da mexida: {batch.mixDay}
              </span>
              <div className="h-2 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading.productionBatches) {
    return (
      <div className="space-y-6 animate-fade-in flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium">Carregando histórico de produção...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Histórico de Produção
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gerencie e visualize todos os registros de produção
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasPermission('production', 'create') && (
              <Button 
                onClick={() => navigate('/production')} 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Produção
              </Button>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/50">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Total de Lotes
                </p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {totalBatches}
                </p>
              </div>
              <Package className="h-12 w-12 text-blue-500" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Peso Produzido
                </p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {formatNumberBR(totalWeight)} kg
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200/50 dark:border-purple-700/50">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Total de Produtos
                </p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {formatNumberBR(totalProducts)}
                </p>
              </div>
              <Zap className="h-12 w-12 text-purple-500" />
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por lote ou produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={view === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('cards')}
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
            >
              Cards
            </Button>
            <Button
              variant={view === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
            >
              Tabela
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'cards' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBatches.map((batch, index) => (
            <ProductionCard key={batch.id} batch={batch} index={index} />
          ))}
          {filteredBatches.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Nenhum registro encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {search ? 'Tente ajustar sua busca' : 'Não há registros de produção ainda'}
              </p>
              {hasPermission('production', 'create') && !search && (
                <Button onClick={() => navigate('/production')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Produção
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        // Table view - keeping the original table but with better styling
        <Card className="shadow-xl border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50">
                  <TableHead className="font-semibold">Lote</TableHead>
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold">Produtos</TableHead>
                  <TableHead className="font-semibold">Peso Total</TableHead>
                  <TableHead className="font-semibold">Mexidas</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => {
                  const metrics = calculateProductionMetrics(batch);
                  const status = getStatusBadge(batch);
                  
                  return (
                    <TableRow key={batch.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                      <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                      <TableCell>
                        {format(new Date(batch.productionDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {batch.producedItems.slice(0, 2).map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {item.productName}
                            </Badge>
                          ))}
                          {batch.producedItems.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{batch.producedItems.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatNumberBR(metrics.totalWeight)} kg
                      </TableCell>
                      <TableCell>{batch.mixCount}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailsDialog(batch)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {hasPermission('production', 'update') && (
                              <DropdownMenuItem onClick={() => openEditDialog(batch)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {hasPermission('production', 'delete') && (
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(batch)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {filteredBatches.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Nenhum registro encontrado
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {search ? 'Tente ajustar sua busca' : 'Não há registros de produção ainda'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rest of the dialogs remain the same but I'll update their styling */}
      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-red-200 dark:border-red-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400">
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lote <strong>{selectedBatch?.batchNumber}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteDialogClose}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBatch && handleDelete(selectedBatch.id)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog - keeping existing functionality with better styling */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Detalhes do Lote {selectedBatch?.batchNumber}
            </DialogTitle>
            <DialogDescription>
              Informações completas do registro de produção
            </DialogDescription>
          </DialogHeader>
          
          {selectedBatch && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Produção</Label>
                    <p className="font-medium">{format(new Date(selectedBatch.productionDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <Label>Dia da Mexida</Label>
                    <p className="font-medium">{selectedBatch.mixDay}</p>
                  </div>
                  <div>
                    <Label>Número de Mexidas</Label>
                    <p className="font-medium">{selectedBatch.mixCount}</p>
                  </div>
                  <div>
                    <Label>Peso Total</Label>
                    <p className="font-medium">{formatNumberBR(calculateTotalWeightInKg(selectedBatch))} kg</p>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de Produção - IGUAL AOS CARDS */}
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Métricas de Produção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const metrics = calculateProductionMetrics(selectedBatch);
                    const status = getStatusBadge(selectedBatch);
                    return (
                      <div className="space-y-4">
                        {/* Status Badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status de Eficiência:</span>
                          <Badge variant={status.variant} className="font-medium shadow-sm">
                            {status.label}
                          </Badge>
                        </div>
                        
                        {/* Métricas em Grid */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                            <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Fécula utilizada</span>
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatNumberBR(metrics.feculaUtilizada)} kg
                            </span>
                          </div>
                          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                            <span className="text-xs text-blue-600 dark:text-blue-400 block mb-1">Kg's previstos</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {formatNumberBR(metrics.kgsPrevistos)} kg
                            </span>
                          </div>
                          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                            <span className="text-xs text-green-600 dark:text-green-400 block mb-1">Kg's produzidos</span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatNumberBR(metrics.kgsProduzidos)} kg
                            </span>
                          </div>
                        </div>
                        
                        {/* Segunda linha de métricas */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                            <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Diferença</span>
                            <span className={`text-lg font-bold ${metrics.diferenca >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {metrics.diferenca >= 0 ? '+' : ''}{formatNumberBR(metrics.diferenca)} kg
                            </span>
                          </div>
                          <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                            <span className="text-xs text-purple-600 dark:text-purple-400 block mb-1">Média da produção</span>
                            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                              {metrics.mediaDaProducao.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produtos Produzidos ({selectedBatch.producedItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Unidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBatch.producedItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.batchNumber}</TableCell>
                          <TableCell>{formatNumberBR(item.quantity)}</TableCell>
                          <TableCell>{item.unitOfMeasure}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Materials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Materiais Utilizados ({selectedBatch.usedMaterials.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Mexidas</TableHead>
                        <TableHead>Unidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBatch.usedMaterials.map((material, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{material.materialName}</TableCell>
                          <TableCell>{material.batchNumber}</TableCell>
                          <TableCell>{formatNumberBR(material.quantity)}</TableCell>
                          <TableCell>{material.mixCountUsed || '-'}</TableCell>
                          <TableCell>{material.unitOfMeasure}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedBatch.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300">{selectedBatch.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - COM TODAS AS OPÇÕES DE EDIÇÃO */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Editar Lote {selectedBatch?.batchNumber}
            </DialogTitle>
            <DialogDescription>
              Edite as informações completas do registro de produção
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-batch-number">Número do Lote</Label>
                  <Input
                    id="edit-batch-number"
                    value={editForm.batchNumber || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, batchNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-production-date">Data de Produção</Label>
                  <Input
                    id="edit-production-date"
                    type="date"
                    value={editForm.productionDate ? (typeof editForm.productionDate === 'string' ? editForm.productionDate : new Date(editForm.productionDate).toISOString().split('T')[0]) : ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, productionDate: e.target.value ? new Date(e.target.value) : undefined }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mix-day">Dia da Mexida</Label>
                  <Input
                    id="edit-mix-day"
                    value={editForm.mixDay || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, mixDay: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mix-count">Número de Mexidas</Label>
                  <Input
                    id="edit-mix-count"
                    type="number"
                    value={editForm.mixCount || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, mixCount: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Produtos Produzidos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produtos Produzidos ({producedItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {producedItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                      <div>
                        <Label>Produto</Label>
                        <Input
                          value={item.productName}
                          onChange={(e) => updateProducedItem(index, 'productName', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Lote</Label>
                        <Input
                          value={item.batchNumber}
                          onChange={(e) => updateProducedItem(index, 'batchNumber', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateProducedItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Unidade</Label>
                        <Input
                          value={item.unitOfMeasure}
                          onChange={(e) => updateProducedItem(index, 'unitOfMeasure', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Materiais Utilizados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Materiais Utilizados ({usedMaterials.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usedMaterials.map((material, index) => (
                    <div key={index} className="grid grid-cols-5 gap-4 p-4 border rounded-lg">
                      <div>
                        <Label>Material</Label>
                        <Input
                          value={material.materialName}
                          onChange={(e) => updateUsedMaterial(index, 'materialName', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Lote</Label>
                        <Input
                          value={material.batchNumber}
                          onChange={(e) => updateUsedMaterial(index, 'batchNumber', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          value={material.quantity}
                          onChange={(e) => updateUsedMaterial(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Mexidas</Label>
                        <Input
                          type="number"
                          value={material.mixCountUsed || ''}
                          onChange={(e) => updateUsedMaterial(index, 'mixCountUsed', parseInt(e.target.value) || undefined)}
                        />
                      </div>
                      <div>
                        <Label>Unidade</Label>
                        <Input
                          value={material.unitOfMeasure}
                          onChange={(e) => updateUsedMaterial(index, 'unitOfMeasure', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Observações */}
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="edit-notes">Observações</Label>
                <Input
                  id="edit-notes"
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Adicione observações sobre esta produção..."
                />
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleEditDialogClose}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionHistory;
