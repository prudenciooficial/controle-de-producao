import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, MoreVertical, Eye, Trash, Loader, PencilIcon, AlertCircle, TrendingDown, Calendar, Factory, Package, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loss } from "../types";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const LossesHistory = () => {
  const { losses, deleteLoss, updateLoss, isLoading } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [machineFilter, setMachineFilter] = useState<string>("all");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [selectedLoss, setSelectedLoss] = useState<Loss | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Define the form for editing losses
  const form = useForm<Partial<Loss>>({
    defaultValues: {
      date: new Date(),
      batchNumber: "",
      machine: "Outro",
      quantity: 0,
      unitOfMeasure: "kg",
      productType: "Outro",
      notes: ""
    }
  });
  
  // Filtered losses with search and filters
  const filteredLosses = useMemo(() => {
    return losses.filter(loss => {
      const matchesSearch = 
      loss.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      loss.machine.toLowerCase().includes(search.toLowerCase()) ||
        loss.productType.toLowerCase().includes(search.toLowerCase());
      
      const matchesMachine = machineFilter === "all" || loss.machine === machineFilter;
      const matchesProductType = productTypeFilter === "all" || loss.productType === productTypeFilter;
      
      return matchesSearch && matchesMachine && matchesProductType;
    });
  }, [losses, search, machineFilter, productTypeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalLosses = filteredLosses.length;
    const totalQuantity = filteredLosses.reduce((sum, loss) => sum + loss.quantity, 0);
    const uniqueMachines = new Set(filteredLosses.map(loss => loss.machine)).size;
    const uniqueProductTypes = new Set(filteredLosses.map(loss => loss.productType)).size;

    return {
      totalLosses,
      totalQuantity,
      uniqueMachines,
      uniqueProductTypes
    };
  }, [filteredLosses]);

  // Get unique values for filters
  const uniqueMachines = [...new Set(losses.map(loss => loss.machine))];
  const uniqueProductTypes = [...new Set(losses.map(loss => loss.productType))];
  
  const handleDelete = async (id: string) => {
    if (!hasPermission('losses', 'delete')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para excluir registros de perdas.",
      });
      setShowDeleteDialog(false);
      setSelectedLoss(null); 
      return;
    }
    try {
      setIsDeleting(true);
      await deleteLoss(id);
      toast({ title: "Registro Excluído", description: "O registro de perda foi excluído com sucesso." });
      
      // Refresh automático para sincronizar dados
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Erro ao excluir perda:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao excluir o registro de perda.",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedLoss(null);
    }
  };
  
  const handleEditSubmit = async (values: Partial<Loss>) => {
    if (!selectedLoss) return;

    if (!hasPermission('losses', 'update')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para atualizar registros de perdas.",
      });
      setShowEditDialog(false);
      setSelectedLoss(null);
      return;
    }
    
    try {
      setIsUpdating(true);
      await updateLoss(selectedLoss.id, values);
      setShowEditDialog(false);
      setSelectedLoss(null);
      toast({ title: "Registro Atualizado", description: "O registro de perda foi atualizado com sucesso." });
      
      // Refresh automático para sincronizar dados
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Erro ao atualizar perda:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar o registro de perda.",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const openEditDialog = (loss: Loss) => {
    setSelectedLoss(loss);
    // Reset form with current loss values
    form.reset({
      date: loss.date,
      batchNumber: loss.batchNumber,
      machine: loss.machine,
      quantity: loss.quantity,
      unitOfMeasure: loss.unitOfMeasure,
      productType: loss.productType,
      notes: loss.notes
    });
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (loss: Loss) => {
    setSelectedLoss(loss);
    setShowDeleteDialog(true);
  };
  
  const openDetailsDialog = (loss: Loss) => {
    setSelectedLoss(loss);
    setShowDetailsDialog(true);
  };
  
  const getMachineColor = (machine: string) => {
    switch (machine) {
      case "Moinho":
        return "bg-blue-500";
      case "Mexedor":
        return "bg-green-500";
      case "Tombador":
        return "bg-yellow-500";
      case "Embaladora":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };
  
  const getProductTypeColor = (type: string) => {
    switch (type) {
      case "Goma":
        return "bg-blue-500";
      case "Fécula":
        return "bg-green-500";
      case "Polvilho":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };
  
  const LossCard = ({ loss, index }: { loss: Loss; index: number }) => (
    <Card 
      key={loss.id} 
      className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border-l-4 border-l-red-500"
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1 flex-1 min-w-0">
          <CardTitle className="text-lg font-bold text-red-600 truncate">
            Lote: {loss.batchNumber}
          </CardTitle>
          <CardDescription className="text-sm">
            {format(new Date(loss.date), "dd/MM/yyyy", { locale: ptBR })}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            className={`${getMachineColor(loss.machine)} text-white text-xs`}
          >
                            {loss.machine}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 w-8 p-0 transition-all duration-300 hover:bg-red-50 dark:hover:bg-red-900/20 ${
                  isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDetailsDialog(loss)}>
                                <Eye className="mr-2 h-4 w-4" />
                Ver Detalhes
                              </DropdownMenuItem>
                              {hasPermission('losses', 'update') && (
                <DropdownMenuItem onClick={() => openEditDialog(loss)}>
                                  <PencilIcon className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              {hasPermission('losses', 'delete') && (
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(loss)}
                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Máquina:</span>
            </div>
            <Badge variant="outline" className="w-fit">
              {loss.machine}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Produto:</span>
            </div>
            <Badge 
              className={`${getProductTypeColor(loss.productType)} text-white w-fit`}
            >
              {loss.productType}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Quantidade:</span>
          </div>
          <span className="text-lg font-bold text-red-600">
            {loss.quantity.toLocaleString()} {loss.unitOfMeasure}
          </span>
        </div>
        
        {loss.notes && (
          <div className="bg-muted/50 p-2 rounded text-xs">
            <span className="font-medium">Observações:</span>
            <p className="text-muted-foreground mt-1 line-clamp-2">{loss.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)} 
              className="hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
              size={isMobile ? "sm" : "default"}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent truncate">
                Histórico de Perdas
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Visualize e gerencie registros de perdas de produção
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => navigate("/perdas")} 
              className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto"
              size={isMobile ? "sm" : "default"}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Nova Perda
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Total de Perdas</p>
                  <p className="text-2xl md:text-3xl font-bold text-red-600">{stats.totalLosses}</p>
                </div>
                <AlertCircle className="h-8 md:h-12 w-8 md:w-12 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Quantidade Total</p>
                  <p className="text-2xl md:text-3xl font-bold text-orange-600">
                    {stats.totalQuantity.toLocaleString()} kg
                  </p>
                </div>
                <TrendingDown className="h-8 md:h-12 w-8 md:w-12 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Máquinas Afetadas</p>
                  <p className="text-2xl md:text-3xl font-bold text-blue-600">{stats.uniqueMachines}</p>
                </div>
                <Factory className="h-8 md:h-12 w-8 md:w-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Tipos de Produto</p>
                  <p className="text-2xl md:text-3xl font-bold text-purple-600">{stats.uniqueProductTypes}</p>
                </div>
                <Package className="h-8 md:h-12 w-8 md:w-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Filter className="h-4 md:h-5 w-4 md:w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por lote, máquina ou produto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:w-auto w-full">
                <Select value={machineFilter} onValueChange={setMachineFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as máquinas</SelectItem>
                    {uniqueMachines.map(machine => (
                      <SelectItem key={machine} value={machine}>{machine}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtos</SelectItem>
                    {uniqueProductTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading.losses ? (
        <div className="flex justify-center items-center py-8">
          <Loader className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : (
        <>
          {/* Results Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredLosses.length} de {losses.length} registro(s)
            </p>
            {(search || machineFilter !== "all" || productTypeFilter !== "all") && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSearch("");
                  setMachineFilter("all");
                  setProductTypeFilter("all");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          {/* Content */}
          {filteredLosses.length === 0 ? (
            <Card className="py-8">
              <CardContent className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">Nenhuma perda encontrada</p>
                <p className="text-muted-foreground mb-4">
                  {search || machineFilter !== "all" || productTypeFilter !== "all"
                    ? "Tente ajustar os filtros ou limpar a busca."
                    : "Não há registros de perdas cadastrados no sistema."}
                </p>
                <Button onClick={() => navigate("/perdas")} className="bg-red-600 hover:bg-red-700">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Registrar Nova Perda
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredLosses.map((loss, index) => (
                <LossCard key={loss.id} loss={loss} index={index} />
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
              Detalhes da Perda - Lote {selectedLoss?.batchNumber}
              </DialogTitle>
            <DialogDescription className="text-sm">
              Informações completas do registro de perda
              </DialogDescription>
            </DialogHeader>
            
          {selectedLoss && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Informações Básicas</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Lote:</strong> {selectedLoss.batchNumber}</div>
                    <div><strong>Data:</strong> {format(new Date(selectedLoss.date), "dd/MM/yyyy", { locale: ptBR })}</div>
                    <div><strong>Máquina:</strong> {selectedLoss.machine}</div>
                    <div><strong>Produto:</strong> {selectedLoss.productType}</div>
                </div>
              </div>
              
                <div>
                  <h4 className="font-semibold text-sm mb-2">Quantidade</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Quantidade:</strong> {selectedLoss.quantity.toLocaleString()} {selectedLoss.unitOfMeasure}</div>
                </div>
                </div>
              </div>
              
              {selectedLoss.notes && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Observações</h4>
                  <div className="p-3 bg-muted rounded text-sm">
                    {selectedLoss.notes}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Fechar
              </Button>
            </DialogClose>
            {hasPermission('losses', 'update') && (
              <Button 
                onClick={() => {
                  setShowDetailsDialog(false);
                  if (selectedLoss) openEditDialog(selectedLoss);
                }}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogFooter>
          </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold">
              Editar Registro de Perda
            </DialogTitle>
            <DialogDescription className="text-sm">
              Atualize as informações do registro de perda
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                      <FormLabel>Lote de Produção</FormLabel>
                    <FormControl>
                        <Input {...field} placeholder="Ex: PROD-2024-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
                <FormField
                  control={form.control}
                  name="machine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máquina</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a máquina" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Moinho">Moinho</SelectItem>
                          <SelectItem value="Mexedor">Mexedor</SelectItem>
                          <SelectItem value="Tombador">Tombador</SelectItem>
                          <SelectItem value="Embaladora">Embaladora</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="productType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Produto</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Goma">Goma</SelectItem>
                          <SelectItem value="Fécula">Fécula</SelectItem>
                          <SelectItem value="Polvilho">Polvilho</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Descreva as causas ou observações sobre a perda..."
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancelar
                </Button>
                </DialogClose>
                <Button 
                  type="submit"
                  disabled={isUpdating}
                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                >
                  {isUpdating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir este registro de perda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedLoss && handleDelete(selectedLoss.id)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {isDeleting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LossesHistory;
