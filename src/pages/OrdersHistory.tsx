import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
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
  Truck,
  TrendingUp,
  Package2,
  Plus,
  Sparkles,
  Check,
  X,
  AlertCircle,
  MinusCircle,
  Calendar,
  FileCheck,
  AlertTriangle,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderItem, Material } from "../types";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumberBR } from "@/components/helpers/dateFormatUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const OrdersHistory = () => {
  const { orders, materials, suppliers, deleteOrder, updateOrder, isLoading } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Order>>({});
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [view, setView] = useState<'cards' | 'table'>('cards');
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
  
  // Get expiry status based on expiry date
  const getExpiryStatus = (expiryDate: Date | undefined) => {
    if (!expiryDate) {
      return { variant: "outline" as const, label: "Sem validade", color: "text-gray-500" };
    }
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffInDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return { variant: "destructive" as const, label: "Vencido", color: "text-red-600" };
    } else if (diffInDays <= 30) {
      return { variant: "secondary" as const, label: "Próximo ao vencimento", color: "text-yellow-600" };
    } else if (diffInDays <= 90) {
      return { variant: "outline" as const, label: "Vence em breve", color: "text-orange-600" };
    } else {
      return { variant: "default" as const, label: "Válido", color: "text-green-600" };
    }
  };

  // Get report status
  const getReportStatus = (hasReport: boolean) => {
    return hasReport 
      ? { variant: "default" as const, label: "Com laudo", color: "text-green-600" }
      : { variant: "outline" as const, label: "Sem laudo", color: "text-orange-600" };
  };

  // Calculate order health metrics
  const getOrderHealthMetrics = (order: Order) => {
    const totalItems = order.items.length;
    const itemsWithReport = order.items.filter(item => item.hasReport).length;
    const itemsWithValidDate = order.items.filter(item => {
      if (!item.expiryDate) return false;
      const status = getExpiryStatus(item.expiryDate);
      return status.label === "Válido" || status.label === "Vence em breve";
    }).length;
    
    const reportPercentage = (itemsWithReport / totalItems) * 100;
    const validityPercentage = (itemsWithValidDate / totalItems) * 100;
    
    return {
      reportPercentage,
      validityPercentage,
      reportStatus: reportPercentage >= 80 ? "Ótimo" : reportPercentage >= 50 ? "Bom" : "Atenção",
      validityStatus: validityPercentage >= 80 ? "Ótimo" : validityPercentage >= 50 ? "Bom" : "Atenção"
    };
  };

  // Get status badge based on order metrics
  const getStatusBadge = (order: Order) => {
    const healthMetrics = getOrderHealthMetrics(order);
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    
    if (healthMetrics.reportPercentage < 50 || healthMetrics.validityPercentage < 50) {
      return { variant: "destructive" as const, label: "Atenção" };
    } else if (order.items.some(item => item.materialType === "Conservante")) {
      return { variant: "default" as const, label: "Conservantes" };
    } else if (totalQuantity >= 1000) {
      return { variant: "default" as const, label: "Grande Volume" };
    } else if (totalQuantity >= 500) {
      return { variant: "secondary" as const, label: "Médio Volume" };
    } else {
      return { variant: "outline" as const, label: "Pequeno Volume" };
    }
  };

  // Get supplier color for badges
  const getSupplierColor = (supplierId: string) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200",
      "bg-green-100 text-green-800 border-green-200", 
      "bg-yellow-100 text-yellow-800 border-yellow-200",
      "bg-purple-100 text-purple-800 border-purple-200",
      "bg-pink-100 text-pink-800 border-pink-200"
    ];
    const hash = supplierId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };
  
  // Calculate statistics
  const totalOrders = filteredOrders.length;
  const totalItems = filteredOrders.reduce((total, order) => 
    total + order.items.reduce((sum, item) => sum + item.quantity, 0), 0
  );
  const totalSuppliers = new Set(filteredOrders.map(order => order.supplierId)).size;
  
  // Calculate quality metrics
  const qualityMetrics = filteredOrders.reduce((acc, order) => {
    const metrics = getOrderHealthMetrics(order);
    acc.totalReportPercentage += metrics.reportPercentage;
    acc.totalValidityPercentage += metrics.validityPercentage;
    return acc;
  }, { totalReportPercentage: 0, totalValidityPercentage: 0 });
  
  const averageReportPercentage = totalOrders > 0 ? qualityMetrics.totalReportPercentage / totalOrders : 0;
  const averageValidityPercentage = totalOrders > 0 ? qualityMetrics.totalValidityPercentage / totalOrders : 0;
  const overallQualityScore = (averageReportPercentage + averageValidityPercentage) / 2;
  
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
  
  const handleDelete = async (id: string) => {
    if (!hasPermission('orders', 'delete')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para excluir pedidos.",
      });
      setShowDeleteDialog(false);
      return;
    }
    try {
      setIsDeleting(true);
      await deleteOrder(id);
      setShowDeleteDialog(false);
      toast({ title: "Pedido excluído", description: "O pedido foi excluído com sucesso." });
      
      // Refresh automático para sincronizar dados
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao excluir o pedido.",
      });
    } finally {
      setIsDeleting(false);
    }
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
      
      // Refresh automático para sincronizar dados
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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

  const openDeleteDialog = (order: Order) => {
    setSelectedOrder(order);
    setShowDeleteDialog(true);
  };
  
  const openDetailsDialog = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  const openEditDialog = (order: Order) => {
    setSelectedOrder(order);
    setShowEditDialog(true);
  };

  // Render modern order card
  const OrderCard = ({ order, index }: { order: Order; index: number }) => {
    const status = getStatusBadge(order);
    const healthMetrics = getOrderHealthMetrics(order);
    const orderDate = new Date(order.date);
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    
    return (
      <Card className="group relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 dark:hover:shadow-orange-400/10 transition-all duration-500 hover:-translate-y-2">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Sparkle effect */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Sparkles className="h-4 w-4 text-orange-400 animate-pulse" />
        </div>

        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg group-hover:shadow-orange-500/25 transition-shadow duration-300">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle 
                  className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-300 cursor-pointer hover:underline"
                  onClick={() => openDetailsDialog(order)}
                >
                  {order.supplierName}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3 w-3 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {format(orderDate, "dd 'de' MMMM", { locale: ptBR })}
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
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => openDetailsDialog(order)} className="cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  {hasPermission('orders', 'update') && (
                    <DropdownMenuItem onClick={() => openEditDialog(order)} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {hasPermission('orders', 'delete') && (
                    <DropdownMenuItem 
                      onClick={() => openDeleteDialog(order)} 
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
          {/* Informações do Pedido */}
          <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-lg border border-orange-200/30 dark:border-orange-700/30">
            <h4 className="text-sm font-bold text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
              <Package2 className="h-4 w-4" />
              Informações do Pedido
            </h4>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Lote</span>
                <span className="font-bold text-gray-900 dark:text-gray-100 truncate block">
                  {order.items.length > 0 ? order.items[0].batchNumber : "N/A"}
                </span>
                {order.items.length > 1 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{order.items.length - 1} outros lotes
                  </span>
                )}
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Total Insumos</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  {order.items.length} tipos
                </span>
              </div>
            </div>
          </div>

          {/* Status de Qualidade - NOVO */}
          <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200/30 dark:border-blue-700/30">
            <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Status de Qualidade
            </h4>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <FileCheck className="h-3 w-3 text-blue-500" />
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block">Laudos</span>
                  <span className={`font-bold ${healthMetrics.reportStatus === 'Ótimo' ? 'text-green-600' : healthMetrics.reportStatus === 'Bom' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {healthMetrics.reportPercentage.toFixed(0)}% - {healthMetrics.reportStatus}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-blue-500" />
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block">Validade</span>
                  <span className={`font-bold ${healthMetrics.validityStatus === 'Ótimo' ? 'text-green-600' : healthMetrics.validityStatus === 'Bom' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {healthMetrics.validityPercentage.toFixed(0)}% - {healthMetrics.validityStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas do Pedido */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantidade Total
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumberBR(totalQuantity)}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Package2 className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Insumos
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {order.items.length}
              </p>
            </div>
          </div>

          {/* Materials Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Package2 className="h-4 w-4" />
              Insumos ({order.items.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {order.items.slice(0, 3).map((item, idx) => {
                const expiryStatus = getExpiryStatus(item.expiryDate);
                const reportStatus = getReportStatus(item.hasReport);
                
                return (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate block">
                        {item.materialName}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant={reportStatus.variant} className="text-xs">
                          {item.hasReport ? <FileCheck className="h-2 w-2 mr-1" /> : <AlertTriangle className="h-2 w-2 mr-1" />}
                          {reportStatus.label}
                        </Badge>
                        <Badge variant={expiryStatus.variant} className="text-xs">
                          <Calendar className="h-2 w-2 mr-1" />
                          {expiryStatus.label}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2">
                      {formatNumberBR(item.quantity)} {item.unitOfMeasure}
                    </Badge>
                  </div>
                );
              })}
              {order.items.length > 3 && (
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    +{order.items.length - 3} mais insumos
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                NF: {order.invoiceNumber}
              </span>
              <div className="h-2 w-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading.orders) {
    return (
      <div className="space-y-6 animate-fade-in flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium">Carregando histórico de pedidos...</h2>
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
            <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-orange-50 dark:hover:bg-orange-900/20">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Histórico de Pedidos
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gerencie e visualize todos os registros de pedidos
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasPermission('orders', 'create') && (
              <Button 
                onClick={() => navigate('/pedidos')} 
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200/50 dark:border-orange-700/50">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  Total de Pedidos
                </p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {totalOrders}
                </p>
              </div>
              <Truck className="h-12 w-12 text-orange-500" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/50">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Quantidade Total
                </p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {formatNumberBR(totalItems)}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-blue-500" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200/50 dark:border-purple-700/50">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Fornecedores Ativos
                </p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {totalSuppliers}
                </p>
              </div>
              <Package2 className="h-12 w-12 text-purple-500" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Qualidade Geral
                </p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {overallQualityScore.toFixed(0)}%
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Laudos: {averageReportPercentage.toFixed(0)}% | Validade: {averageValidityPercentage.toFixed(0)}%
                </p>
              </div>
              <Shield className="h-12 w-12 text-green-500" />
            </CardContent>
          </Card>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nota, fornecedor ou insumo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-gray-200 dark:border-gray-700 focus:border-orange-500 dark:focus:border-orange-400"
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
          {filteredOrders.map((order, index) => (
            <OrderCard key={order.id} order={order} index={index} />
          ))}
          {filteredOrders.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Nenhum pedido encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {search ? 'Tente ajustar sua busca' : 'Não há registros de pedidos ainda'}
              </p>
              {hasPermission('orders', 'create') && !search && (
                <Button onClick={() => navigate('/pedidos')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Pedido
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        // Table view
        <Card className="shadow-xl border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50">
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold">Nota Fiscal</TableHead>                
                  <TableHead className="font-semibold">Fornecedor</TableHead>
                  <TableHead className="font-semibold">Insumos</TableHead>
                  <TableHead className="font-semibold">Quantidade Total</TableHead>
                  <TableHead className="font-semibold">Status Laudos</TableHead>
                  <TableHead className="font-semibold">Status Validade</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const status = getStatusBadge(order);
                  const healthMetrics = getOrderHealthMetrics(order);
                  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
                  
                  return (
                    <TableRow key={order.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                      <TableCell>
                        {format(new Date(order.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">{order.invoiceNumber}</TableCell>
                      <TableCell>{order.supplierName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {item.materialName}
                            </Badge>
                          ))}
                          {order.items.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{order.items.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatNumberBR(totalQuantity)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant={healthMetrics.reportStatus === 'Ótimo' ? 'default' : healthMetrics.reportStatus === 'Bom' ? 'secondary' : 'destructive'} className="text-xs">
                            <FileCheck className="h-2 w-2 mr-1" />
                            {healthMetrics.reportPercentage.toFixed(0)}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant={healthMetrics.validityStatus === 'Ótimo' ? 'default' : healthMetrics.validityStatus === 'Bom' ? 'secondary' : 'destructive'} className="text-xs">
                            <Calendar className="h-2 w-2 mr-1" />
                            {healthMetrics.validityPercentage.toFixed(0)}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailsDialog(order)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {hasPermission('orders', 'update') && (
                              <DropdownMenuItem onClick={() => openEditDialog(order)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {hasPermission('orders', 'delete') && (
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(order)}
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
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Nenhum pedido encontrado
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {search ? 'Tente ajustar sua busca' : 'Não há registros de pedidos ainda'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-red-200 dark:border-red-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400">
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pedido <strong>NF {selectedOrder?.invoiceNumber}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedOrder && handleDelete(selectedOrder.id)}
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
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Detalhes do Pedido - NF {selectedOrder?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Informações completas do registro de pedido
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Informações do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data do Pedido</Label>
                    <p className="font-medium">{format(new Date(selectedOrder.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <Label>Fornecedor</Label>
                    <p className="font-medium">{selectedOrder.supplierName}</p>
                  </div>
                  <div>
                    <Label>Nota Fiscal</Label>
                    <p className="font-medium">{selectedOrder.invoiceNumber}</p>
                  </div>
                  <div>
                    <Label>Total de Insumos</Label>
                    <p className="font-medium">{selectedOrder.items.length} tipos</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Summary */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Resumo de Qualidade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const healthMetrics = getOrderHealthMetrics(selectedOrder);
                    return (
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <FileCheck className="h-5 w-5 text-blue-500" />
                            <span className="font-medium text-gray-700 dark:text-gray-300">Status dos Laudos</span>
                          </div>
                          <div className="text-3xl font-bold mb-1" style={{
                            color: healthMetrics.reportStatus === 'Ótimo' ? '#16a34a' : 
                                   healthMetrics.reportStatus === 'Bom' ? '#ca8a04' : '#dc2626'
                          }}>
                            {healthMetrics.reportPercentage.toFixed(0)}%
                          </div>
                          <Badge variant={healthMetrics.reportStatus === 'Ótimo' ? 'default' : healthMetrics.reportStatus === 'Bom' ? 'secondary' : 'destructive'}>
                            {healthMetrics.reportStatus}
                          </Badge>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {selectedOrder.items.filter(item => item.hasReport).length} de {selectedOrder.items.length} com laudo
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            <span className="font-medium text-gray-700 dark:text-gray-300">Status da Validade</span>
                          </div>
                          <div className="text-3xl font-bold mb-1" style={{
                            color: healthMetrics.validityStatus === 'Ótimo' ? '#16a34a' : 
                                   healthMetrics.validityStatus === 'Bom' ? '#ca8a04' : '#dc2626'
                          }}>
                            {healthMetrics.validityPercentage.toFixed(0)}%
                          </div>
                          <Badge variant={healthMetrics.validityStatus === 'Ótimo' ? 'default' : healthMetrics.validityStatus === 'Bom' ? 'secondary' : 'destructive'}>
                            {healthMetrics.validityStatus}
                          </Badge>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {selectedOrder.items.filter(item => {
                              const status = getExpiryStatus(item.expiryDate);
                              return status.label === "Válido" || status.label === "Vence em breve";
                            }).length} de {selectedOrder.items.length} válidos
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Materials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package2 className="h-5 w-5" />
                    Insumos Recebidos ({selectedOrder.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Status Validade</TableHead>
                        <TableHead>Laudo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item, index) => {
                        const expiryStatus = getExpiryStatus(item.expiryDate);
                        const reportStatus = getReportStatus(item.hasReport);
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.materialName}</TableCell>
                            <TableCell>{item.batchNumber}</TableCell>
                            <TableCell>{formatNumberBR(item.quantity)}</TableCell>
                            <TableCell>{item.unitOfMeasure}</TableCell>
                            <TableCell>
                              {item.expiryDate ? format(new Date(item.expiryDate), "dd/MM/yyyy") : "Não informado"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={expiryStatus.variant} className="text-xs">
                                <Calendar className="h-2 w-2 mr-1" />
                                {expiryStatus.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={reportStatus.variant} className="text-xs">
                                {item.hasReport ? <FileCheck className="h-2 w-2 mr-1" /> : <AlertTriangle className="h-2 w-2 mr-1" />}
                                {reportStatus.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedOrder.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300">{selectedOrder.notes}</p>
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
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Editar Pedido - NF {selectedOrder?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Edite as informações do pedido e dos insumos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-invoice-number">Nota Fiscal</Label>
                  <Input
                    id="edit-invoice-number"
                    value={editForm.invoiceNumber || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-date">Data do Pedido</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editForm.date ? (typeof editForm.date === 'string' ? editForm.date : new Date(editForm.date).toISOString().split('T')[0]) : ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value ? new Date(e.target.value) : undefined }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Input
                    id="edit-notes"
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Adicione observações sobre este pedido..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Materials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="h-5 w-5" />
                  Insumos do Pedido ({editedItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {editedItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                      <div>
                        <Label>Material</Label>
                        <Input
                          value={item.materialName}
                          disabled
                        />
                      </div>
                      <div>
                        <Label>Lote</Label>
                        <Input
                          value={item.batchNumber}
                          onChange={(e) => {
                            const updated = [...editedItems];
                            updated[index] = { ...updated[index], batchNumber: e.target.value };
                            setEditedItems(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? (
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

export default OrdersHistory;
