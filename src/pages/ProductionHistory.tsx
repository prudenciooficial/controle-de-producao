import React, { useState, useEffect, useMemo } from "react";
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
  Sparkles,
  Factory,
  FlaskConical,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductionBatch, ProducedItem, UsedMaterial } from "../types";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumberBR } from "@/components/helpers/dateFormatUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fetchMixBatches } from "@/services/mixService";
import type { MixBatch } from "@/types/mix";

const ProductionHistory = () => {
  const { 
    productionBatches, 
    products, 
    updateProductionBatch, 
    deleteProductionBatch, 
    refetchProductionBatches,
    isLoading,
    materialBatches,
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Added for product and material editing
  const [producedItems, setProducedItems] = useState<ProducedItem[]>([]);
  const [usedMaterials, setUsedMaterials] = useState<UsedMaterial[]>([]);
  
  // Global calculation factors
  const [globalFactors, setGlobalFactors] = useState({
    feculaConversionFactor: 25,
    productionPredictionFactor: 1.5
  });

  // Estado para armazenar as mexidas
  const [mixBatches, setMixBatches] = useState<MixBatch[]>([]);
  const [isLoadingMixes, setIsLoadingMixes] = useState(true);

  const { hasPermission, user, getUserDisplayName } = useAuth();

  // Fetch global factors on component mount
  useEffect(() => {
    fetchGlobalFactors();
    loadMixBatches();
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

  const loadMixBatches = async () => {
    try {
      setIsLoadingMixes(true);
      const batches = await fetchMixBatches();
      setMixBatches(batches);
    } catch (error) {
      console.error("Error loading mix batches:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar dados das mexidas.",
      });
    } finally {
      setIsLoadingMixes(false);
    }
  };

  // Função para buscar dados da mexida vinculada
  const getLinkedMixData = (batch: ProductionBatch): MixBatch | null => {
    if (!batch.mixProductionBatchId) return null;
    return mixBatches.find(mix => mix.id === batch.mixProductionBatchId) || null;
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
    // Se não há mexida vinculada, retornar valores zerados
    if (!batch.mixProductionBatchId) {
      return {
        totalWeight: calculateTotalWeightInKg(batch),
        totalItems: batch.producedItems.reduce((sum, item) => sum + item.quantity, 0),
        efficiency: 0,
        feculaUtilizada: 0,
        kgsPrevistos: 0,
        kgsProduzidos: 0,
        diferenca: 0,
        mediaDaProducao: 0
      };
    }

    // Buscar dados da mexida vinculada
    const linkedMix = getLinkedMixData(batch);
    
    // Calculate kg's produzidos (considering weight factor for each product)
    let kgProduzidos = 0;
    for (const item of batch.producedItems) {
      const product = products.find(p => p.id === item.productId);
      const weightFactor = product?.weightFactor || 1;
      kgProduzidos += item.quantity * weightFactor;
    }
    
    // Calcular fécula utilizada usando dados da mexida vinculada
    let feculaUtilizada = 0;
    let sacosPerMexida = 0;
    
    if (linkedMix) {
      // Buscar material de fécula na mexida vinculada
      const feculaMaterialInMix = linkedMix.usedMaterials.find(
        m => m.materialType.toLowerCase().includes('fécula') || m.materialName.toLowerCase().includes('fécula')
      );
      
      if (feculaMaterialInMix) {
        // A quantity na mexida representa sacos por mexida
        sacosPerMexida = feculaMaterialInMix.quantity;
      }
    }
    
    // Fécula utilizada = Quantidade de Mexidas × Sacos por Mexida × Fator de Conversão
    const quantidadeMexidas = linkedMix ? linkedMix.mixCount : batch.mixCount;
    const totalSacosFeculas = quantidadeMexidas * sacosPerMexida;
    feculaUtilizada = totalSacosFeculas * globalFactors.feculaConversionFactor;
    
    // Kg previstos = Fécula Utilizada × Fator de Previsão de Produção
    const kgPrevistos = feculaUtilizada * globalFactors.productionPredictionFactor;
    
    // Diferença = Kg Produzidos - Kg Previstos
    const diferenca = kgProduzidos - kgPrevistos;
    
    // Média de produção = Kg Produzidos / kg fécula usados
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
                    {format(productionDate, "dd/MM/yyyy", { locale: ptBR })}
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
                    className={`h-8 w-8 p-0 transition-all duration-300 hover:bg-green-50 dark:hover:bg-green-900/20 ${
                      isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Histórico de Produção</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/producao")}>
            <Factory className="mr-2 h-4 w-4" />
            Nova Produção
          </Button>
          <Button variant="outline" onClick={() => navigate("/mexida")}>
            <FlaskConical className="mr-2 h-4 w-4" />
            Nova Mexida
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {(isLoading.productionBatches || isLoadingMixes) && (
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">
              {isLoading.productionBatches ? "Carregando dados de produção..." : "Carregando dados das mexidas..."}
            </p>
          </div>
        </div>
      )}

      {/* Content - Only show when not loading */}
      {!isLoading.productionBatches && !isLoadingMixes && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total de Lotes</p>
                    <p className="text-2xl font-bold">{totalBatches}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Factory className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Produtos Produzidos</p>
                    <p className="text-2xl font-bold">{formatNumberBR(totalProducts)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Peso Total</p>
                    <p className="text-2xl font-bold">{formatNumberBR(totalWeight)} kg</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Média por Lote</p>
                    <p className="text-2xl font-bold">
                      {totalBatches > 0 ? formatNumberBR(totalWeight / totalBatches) : "0"} kg
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por lote ou produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Tabela
              </Button>
            </div>
          </div>

          {/* Content */}
          {viewMode === 'cards' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredBatches.map((batch, index) => (
                <ProductionCard key={batch.id} batch={batch} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Visualização em tabela em desenvolvimento</p>
            </div>
          )}
        </>
      )}

      {/* Dialogs remain the same */}
      {/* ... existing dialogs ... */}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
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

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Detalhes do Lote {selectedBatch?.batchNumber}
            </DialogTitle>
            <DialogDescription>
              Informações completas do registro de produção
            </DialogDescription>
          </DialogHeader>
          
          {selectedBatch && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Produção</Label>
                    <p className="font-medium">
                      {format(new Date(selectedBatch.productionDate), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
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

              {/* Production Metrics */}
              <Card>
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
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Status de Eficiência:</span>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <span className="text-xs text-muted-foreground block mb-1">Fécula utilizada</span>
                            <span className="text-lg font-bold">
                              {formatNumberBR(metrics.feculaUtilizada)} kg
                            </span>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <span className="text-xs text-blue-600 dark:text-blue-400 block mb-1">Kg's previstos</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {formatNumberBR(metrics.kgsPrevistos)} kg
                            </span>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <span className="text-xs text-green-600 dark:text-green-400 block mb-1">Kg's produzidos</span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatNumberBR(metrics.kgsProduzidos)} kg
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <span className="text-xs text-muted-foreground block mb-1">Diferença</span>
                            <span className={`text-lg font-bold ${metrics.diferenca >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {metrics.diferenca >= 0 ? '+' : ''}{formatNumberBR(metrics.diferenca)} kg
                            </span>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
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
                    Insumos Adicionais ({selectedBatch.usedMaterials.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedBatch.usedMaterials.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Insumo</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead>Tipo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBatch.usedMaterials.map((material, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{material.materialName}</TableCell>
                            <TableCell>{material.batchNumber}</TableCell>
                            <TableCell>{material.materialType}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum insumo adicional utilizado nesta produção.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedBatch.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{selectedBatch.notes}</p>
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Editar Lote {selectedBatch?.batchNumber}
            </DialogTitle>
            <DialogDescription>
              Edite as informações do registro de produção
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
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
                    value={editForm.productionDate ? 
                      (editForm.productionDate instanceof Date ? 
                        editForm.productionDate.toISOString().split('T')[0] : 
                        new Date(editForm.productionDate).toISOString().split('T')[0]
                      ) : ''
                    }
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      productionDate: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Input
                    id="edit-notes"
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações sobre esta produção..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Products Section */}
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
                    <div key={index} className="grid grid-cols-12 gap-4 p-4 border rounded-lg bg-muted/50">
                      <div className="col-span-4">
                        <Label>Produto</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={item.productId}
                          onChange={(e) => {
                            const selectedProduct = products.find(p => p.id === e.target.value);
                            updateProducedItem(index, 'productId', e.target.value);
                            updateProducedItem(index, 'productName', selectedProduct?.name || '');
                            updateProducedItem(index, 'unitOfMeasure', selectedProduct?.unitOfMeasure || 'kg');
                          }}
                        >
                          <option value="">Selecione um produto</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <Label>Lote</Label>
                        <Input
                          value={item.batchNumber}
                          onChange={(e) => updateProducedItem(index, 'batchNumber', e.target.value)}
                          placeholder="Lote do produto"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateProducedItem(index, 'quantity', Number(e.target.value))}
                          min="0"
                          step="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Unidade</Label>
                        <Input
                          value={item.unitOfMeasure}
                          onChange={(e) => updateProducedItem(index, 'unitOfMeasure', e.target.value)}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="col-span-2 flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setProducedItems(prev => prev.filter((_, i) => i !== index))}
                          className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setProducedItems(prev => [...prev, {
                      productId: '',
                      productName: '',
                      batchNumber: '',
                      quantity: 0,
                      unitOfMeasure: 'kg',
                      remainingQuantity: 0
                    }])}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Produto
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Materials Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Insumos Adicionais ({usedMaterials.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usedMaterials.map((material, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 p-4 border rounded-lg bg-muted/50">
                      <div className="col-span-4">
                        <Label>Insumo</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={material.materialBatchId}
                          onChange={(e) => {
                            const selectedBatch = materialBatches.find(b => b.id === e.target.value);
                            updateUsedMaterial(index, 'materialBatchId', e.target.value);
                            updateUsedMaterial(index, 'materialName', selectedBatch?.materialName || '');
                            updateUsedMaterial(index, 'materialType', selectedBatch?.materialType || '');
                            updateUsedMaterial(index, 'batchNumber', selectedBatch?.batchNumber || '');
                          }}
                        >
                          <option value="">Selecione um insumo</option>
                          {materialBatches
                            .filter(batch => batch.remainingQuantity > 0)
                            .map(batch => (
                              <option key={batch.id} value={batch.id}>
                                {batch.materialName} - Lote: {batch.batchNumber} 
                                ({formatNumberBR(batch.remainingQuantity)} {batch.unitOfMeasure} disponível)
                              </option>
                            ))
                          }
                        </select>
                      </div>
                      <div className="col-span-3">
                        <Label>Lote</Label>
                        <Input
                          value={material.batchNumber}
                          onChange={(e) => updateUsedMaterial(index, 'batchNumber', e.target.value)}
                          placeholder="Lote do insumo"
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>Tipo</Label>
                        <Input
                          value={material.materialType}
                          onChange={(e) => updateUsedMaterial(index, 'materialType', e.target.value)}
                          placeholder="Tipo do material"
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="col-span-2 flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setUsedMaterials(prev => prev.filter((_, i) => i !== index))}
                          className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUsedMaterials(prev => [...prev, {
                      id: crypto.randomUUID(),
                      materialBatchId: '',
                      materialName: '',
                      materialType: '',
                      batchNumber: '',
                      quantity: 0,
                      unitOfMeasure: 'kg'
                    }])}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Insumo
                  </Button>
                </div>
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
