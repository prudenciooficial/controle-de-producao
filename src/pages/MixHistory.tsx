import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/context/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  FlaskConical,
  Calendar,
  TrendingUp,
  Beaker,
  Plus,
  Factory
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumberBR } from "@/components/helpers/dateFormatUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fetchMixBatches, updateMixBatch, deleteMixBatch } from "@/services/mixService";
import type { MixBatch, UsedMaterialMix } from "@/types/mix";
import { useFieldArray } from "react-hook-form";
import { Combobox } from "@/components/ui/combobox";

const MixHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { hasPermission, user, getUserDisplayName } = useAuth();
  const { materialBatches } = useData();
  
  const [mixBatches, setMixBatches] = useState<MixBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMix, setSelectedMix] = useState<MixBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogContent, setErrorDialogContent] = useState({ title: "", description: "" });
  const [editForm, setEditForm] = useState<Partial<MixBatch>>({});
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [usedMaterials, setUsedMaterials] = useState<UsedMaterialMix[]>([]);
  
  // Estados para fatores globais
  const [globalFactors, setGlobalFactors] = useState({
    feculaConversionFactor: 25,
    productionPredictionFactor: 1.5
  });
  const [isLoadingFactors, setIsLoadingFactors] = useState(true);

  // Fetch mix batches and global factors on component mount
  useEffect(() => {
    loadMixBatches();
    fetchGlobalFactors();
  }, []);

  const fetchGlobalFactors = async () => {
    try {
      setIsLoadingFactors(true);
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
    } finally {
      setIsLoadingFactors(false);
    }
  };

  const loadMixBatches = async () => {
    try {
      setIsLoading(true);
      const batches = await fetchMixBatches();
      setMixBatches(batches);
    } catch (error) {
      console.error("Error loading mix batches:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar histórico de mexidas.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMixes = mixBatches.filter(
    (mix) =>
      mix.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      mix.usedMaterials.some((material) =>
        material.materialName.toLowerCase().includes(search.toLowerCase())
      )
  );

  // Calculate statistics
  const totalMixes = filteredMixes.length;
  const totalMixCount = filteredMixes.reduce((total, mix) => total + mix.mixCount, 0);
  const availableMixes = filteredMixes.filter(mix => mix.status === 'available').length;
  const usedMixes = filteredMixes.filter(mix => mix.status === 'used').length;

  const availableMaterialBatches = materialBatches.filter(
    (batch) => batch.remainingQuantity > 0
  );

  // Função para calcular kg previsto de produto final
  const calculatePredictedKg = (mix: MixBatch) => {
    // Encontrar material de fécula
    const feculaMaterial = mix.usedMaterials.find(
      m => m.materialType.toLowerCase().includes('fécula') || m.materialName.toLowerCase().includes('fécula')
    );
    
    if (!feculaMaterial) return 0;
    
    // Calcular total de sacos de fécula (quantity × mixCount)
    const totalSacosFeculas = feculaMaterial.quantity * mix.mixCount;
    
    // Aplicar fórmula: Total de sacos × Fator de Conversão × Fator de Previsão
    const kgPrevisto = totalSacosFeculas * globalFactors.feculaConversionFactor * globalFactors.productionPredictionFactor;
    
    return kgPrevisto;
  };

  const handleDelete = async (id: string) => {
    if (!hasPermission('production', 'delete')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para excluir mexidas.",
      });
      setShowDeleteDialog(false);
      return;
    }
    
    try {
      setIsDeleting(true);
      await deleteMixBatch(id, user?.id, getUserDisplayName());
      toast({ 
        title: "Mexida Excluída", 
        description: "A mexida foi excluída com sucesso." 
      });
      
      // Refresh local data
      await loadMixBatches();
      
    } catch (error) {
      console.error("Erro ao excluir mexida:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Falha ao excluir a mexida.";
      
      // Verificar se é erro de mexida vinculada a produções (mensagem mais longa e específica)
      if (errorMessage.includes("vinculada às seguintes produções") || errorMessage.includes("Exclua primeiro")) {
        setErrorDialogContent({
          title: "Mexida Vinculada a Produções",
          description: errorMessage
        });
        setShowErrorDialog(true);
      } else {
        // Para outros erros, usar toast normal
        toast({
          variant: "destructive",
          title: "Erro",
          description: errorMessage,
        });
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedMix || !editForm) return;

    if (!hasPermission('production', 'update')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para atualizar mexidas.",
      });
      setShowEditDialog(false);
      return;
    }

    // Validar se todos os insumos são válidos
    const invalidMaterials = usedMaterials.filter(material => 
      !material.materialBatchId
    );

    if (invalidMaterials.length > 0) {
      toast({
        variant: "destructive",
        title: "Dados Inválidos",
        description: "Todos os insumos devem ter um lote selecionado.",
      });
      return;
    }

    try {
      setIsSaving(true);
      
      console.log(`[MixHistory] Atualizando mexida ${selectedMix.id}`);
      console.log(`[MixHistory] Insumos originais:`, selectedMix.usedMaterials);
      console.log(`[MixHistory] Novos insumos:`, usedMaterials);
      
      // Preparar dados dos insumos atualizados
      const updatedMixData = {
        ...editForm,
        usedMaterials: usedMaterials.filter(material => 
          material.materialBatchId
        ).map(material => ({
          materialBatchId: material.materialBatchId,
          materialName: material.materialName,
          materialType: material.materialType,
          batchNumber: material.batchNumber,
          quantity: 0, // Quantidade zerada pois não é mais controlada aqui
          unitOfMeasure: material.unitOfMeasure,
          mixCountUsed: material.mixCountUsed
        }))
      };
      
      await updateMixBatch(selectedMix.id, updatedMixData, user?.id, getUserDisplayName());
      toast({ 
        title: "Mexida Atualizada", 
        description: "A mexida foi atualizada com sucesso." 
      });
      
      // Refresh local data
      await loadMixBatches();
      
      setShowEditDialog(false);
    } catch (error) {
      console.error("Erro ao atualizar mexida:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar a mexida.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (mix: MixBatch) => {
    setSelectedMix(mix);
    setShowDeleteDialog(true);
  };

  const openDetailsDialog = (mix: MixBatch) => {
    setSelectedMix(mix);
    setShowDetailsDialog(true);
  };

  const openEditDialog = (mix: MixBatch) => {
    setSelectedMix(mix);
    setEditForm({
      batchNumber: mix.batchNumber,
      mixDate: mix.mixDate,
      mixDay: mix.mixDay,
      mixCount: mix.mixCount,
      notes: mix.notes,
      status: mix.status
    });
    setUsedMaterials([...mix.usedMaterials]);
    setShowEditDialog(true);
  };

  const getStatusBadge = (mix: MixBatch) => {
    const statusConfig = {
      'available': { label: 'Disponível', variant: 'default' as const },
      'used': { label: 'Usada', variant: 'secondary' as const },
      'expired': { label: 'Expirada', variant: 'destructive' as const }
    };
    
    const config = statusConfig[mix.status] || statusConfig['available'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const MixCard = ({ mix, index }: { mix: MixBatch; index: number }) => {
    // Calcular kg previsto
    const kgPrevisto = calculatePredictedKg(mix);
    
    return (
      <Card key={mix.id} className="relative group hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">
                {mix.batchNumber}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(mix.mixDate, "dd/MM/yyyy", { locale: ptBR })}
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Beaker className="h-4 w-4" />
                  {mix.mixCount} mexida(s)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge(mix)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => openDetailsDialog(mix)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  {hasPermission('production', 'update') && (
                    <DropdownMenuItem onClick={() => openEditDialog(mix)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {hasPermission('production', 'delete') && (
                    <DropdownMenuItem 
                      onClick={() => openDeleteDialog(mix)}
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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Insumos:</span>
              <p className="font-medium">{mix.usedMaterials.length} tipo(s)</p>
            </div>
            <div>
              <span className="text-muted-foreground">KG Previstos:</span>
              <p className="font-medium">{formatNumberBR(kgPrevisto)} kg</p>
            </div>
          </div>
          
          {/* Nova seção de previsão de produção */}
          {kgPrevisto > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200/50 dark:border-green-700/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Previsão de Produção
                </span>
              </div>
              <p className="text-lg font-bold text-green-800 dark:text-green-200">
                {formatNumberBR(kgPrevisto)} kg
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Produto final previsto
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Principais Insumos:</span>
            <div className="flex flex-wrap gap-1">
              {mix.usedMaterials.slice(0, 3).map((material, idx) => {
                return (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {material.materialName} ({material.batchNumber})
                  </Badge>
                );
              })}
              {mix.usedMaterials.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{mix.usedMaterials.length - 3} mais
                </Badge>
              )}
            </div>
          </div>
          
          {mix.notes && (
            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground">Observações:</span>
              <p className="text-sm mt-1 line-clamp-2">{mix.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Histórico de Mexidas</h1>
            <p className="text-muted-foreground">Gerencie e visualize todas as mexidas registradas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/mexida")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Mexida
          </Button>
          <Button variant="outline" onClick={() => navigate("/producao")}>
            <Factory className="mr-2 h-4 w-4" />
            Ir para Produção
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <FlaskConical className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total de Mexidas</p>
              <p className="text-2xl font-bold">{totalMixes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Beaker className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Disponíveis</p>
              <p className="text-2xl font-bold">{availableMixes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Utilizadas</p>
              <p className="text-2xl font-bold">{usedMixes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Mexidas</p>
              <p className="text-2xl font-bold">{totalMixCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por lote ou insumo..."
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
      {filteredMixes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma mexida encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              {search ? "Tente ajustar os filtros de busca." : "Comece registrando sua primeira mexida."}
            </p>
            <Button onClick={() => navigate("/mexida")}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Nova Mexida
            </Button>
          </CardContent>
        </Card>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMixes.map((mix, index) => (
            <MixCard key={mix.id} mix={mix} index={index} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Mexidas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Insumos</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMixes.map((mix) => (
                  <TableRow key={mix.id}>
                    <TableCell className="font-medium">{mix.batchNumber}</TableCell>
                    <TableCell>{format(mix.mixDate, "dd/MM/yyyy")}</TableCell>
                    <TableCell>{mix.mixCount}</TableCell>
                    <TableCell>{getStatusBadge(mix)}</TableCell>
                    <TableCell>{mix.usedMaterials.length} tipo(s)</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetailsDialog(mix)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {hasPermission('production', 'update') && (
                            <DropdownMenuItem onClick={() => openEditDialog(mix)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {hasPermission('production', 'delete') && (
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(mix)}
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Mexida</DialogTitle>
            <DialogDescription>
              Informações completas sobre a mexida {selectedMix?.batchNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMix && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Lote</Label>
                  <p className="text-sm">{selectedMix.batchNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data</Label>
                  <p className="text-sm">{format(selectedMix.mixDate, "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quantidade de Mexidas</Label>
                  <p className="text-sm">{selectedMix.mixCount}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedMix)}</div>
                </div>
              </div>

              {/* Previsão de Produção */}
              {(() => {
                const kgPrevisto = calculatePredictedKg(selectedMix);
                if (kgPrevisto > 0) {
                  return (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200/50 dark:border-green-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-green-700 dark:text-green-300">
                          Previsão de Produção
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-green-600 dark:text-green-400 mb-1">Total de Sacos de Fécula</p>
                          <p className="text-lg font-bold text-green-800 dark:text-green-200">
                            {(() => {
                              const feculaMaterial = selectedMix.usedMaterials.find(
                                m => m.materialType.toLowerCase().includes('fécula') || m.materialName.toLowerCase().includes('fécula')
                              );
                              return feculaMaterial ? formatNumberBR(feculaMaterial.quantity * selectedMix.mixCount) : '0';
                            })()} sacos
                          </p>
                        </div>
                        <div>
                          <p className="text-green-600 dark:text-green-400 mb-1">Produto Final Previsto</p>
                          <p className="text-lg font-bold text-green-800 dark:text-green-200">
                            {formatNumberBR(kgPrevisto)} kg
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-green-200/50 dark:border-green-700/50">
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Cálculo: {(() => {
                            const feculaMaterial = selectedMix.usedMaterials.find(
                              m => m.materialType.toLowerCase().includes('fécula') || m.materialName.toLowerCase().includes('fécula')
                            );
                            const totalSacos = feculaMaterial ? feculaMaterial.quantity * selectedMix.mixCount : 0;
                            return `${formatNumberBR(totalSacos)} sacos × ${globalFactors.feculaConversionFactor} kg/saco × ${globalFactors.productionPredictionFactor} fator`;
                          })()}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Notes */}
              {selectedMix.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Observações</Label>
                  <p className="text-sm mt-1">{selectedMix.notes}</p>
                </div>
              )}

              {/* Used Materials */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-3 block">
                  Insumos Utilizados
                </Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Lote</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMix.usedMaterials.map((material) => {
                      return (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">{material.materialName}</TableCell>
                          <TableCell>{material.batchNumber}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Mexida</DialogTitle>
            <DialogDescription>
              Edite as informações da mexida {selectedMix?.batchNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batchNumber">Número do Lote</Label>
                <Input
                  id="batchNumber"
                  value={editForm.batchNumber || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, batchNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="mixCount">Quantidade de Mexidas</Label>
                <Input
                  id="mixCount"
                  type="number"
                  value={editForm.mixCount || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, mixCount: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="mixDate">Data da Mexida</Label>
              <Input
                id="mixDate"
                type="date"
                value={editForm.mixDate ? format(editForm.mixDate, "yyyy-MM-dd") : ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, mixDate: new Date(e.target.value) }))}
              />
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={editForm.notes || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações sobre a mexida..."
              />
            </div>

            {/* Insumos Editáveis */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Insumos Utilizados</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUsedMaterials(prev => [...prev, {
                    id: `temp-${Date.now()}`,
                    materialBatchId: '',
                    materialName: '',
                    materialType: '',
                    batchNumber: '',
                    quantity: 0,
                    unitOfMeasure: '',
                    mixCountUsed: undefined,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Insumo
                </Button>
              </div>
              
              {usedMaterials.map((material, index) => (
                <Card key={material.id || index} className="p-4 relative bg-muted/30">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setUsedMaterials(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                  
                  <div className="grid grid-cols-1 gap-4 pr-8">
                    <div>
                      <Label htmlFor={`material-${index}`}>Insumo e Lote</Label>
                      <Combobox
                        options={availableMaterialBatches.map(batch => {
                          return {
                            value: batch.id,
                            label: `${batch.materialName} / ${batch.batchNumber} (${batch.remainingQuantity} ${batch.unitOfMeasure} disponível)`
                          };
                        })}
                        value={material.materialBatchId}
                        onValueChange={(value) => {
                          const selectedBatch = availableMaterialBatches.find(b => b.id === value);
                          if (selectedBatch) {
                            setUsedMaterials(prev => prev.map((m, i) => 
                              i === index ? {
                                ...m,
                                materialBatchId: selectedBatch.id,
                                materialName: selectedBatch.materialName,
                                materialType: selectedBatch.materialType,
                                batchNumber: selectedBatch.batchNumber,
                                unitOfMeasure: selectedBatch.unitOfMeasure
                              } : m
                            ));
                          }
                        }}
                        placeholder="Selecione um insumo e lote"
                        searchPlaceholder="Buscar insumo..."
                        notFoundMessage="Nenhum insumo encontrado."
                      />
                    </div>
                  </div>
                  
                  {material.materialBatchId && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Lote: {material.batchNumber} - Tipo: {material.materialType}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSaving}>
              {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
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
              Tem certeza que deseja excluir a mexida "{selectedMix?.batchNumber}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedMix && handleDelete(selectedMix.id)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash className="h-5 w-5" />
              {errorDialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed whitespace-pre-line">
              {errorDialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowErrorDialog(false)}>
              Entendi
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MixHistory; 