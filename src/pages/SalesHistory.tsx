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
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Plus,
  Sparkles,
  PlusCircle, 
  MinusCircle, 
  AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sale, SaleItem, ProducedItem } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumberBR } from "@/components/helpers/dateFormatUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SalesHistory = () => {
  const { sales, products, getAvailableProducts, deleteSale, updateSale, isLoading } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [view, setView] = useState<'cards' | 'table'>('cards');
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
  
  // Calculate sales statistics
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((total, sale) => 
    total + calculateTotalWeightInKg(sale), 0
  );
  const totalProducts = filteredSales.reduce((total, sale) => 
    total + sale.items.reduce((sum, item) => sum + item.quantity, 0), 0
  );
  
  // Calculate sales by type
  const salesByType = filteredSales.reduce((acc, sale) => {
    acc[sale.type] = (acc[sale.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
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
  
  const handleDelete = async (id: string) => {
    if (!hasPermission('sales', 'delete')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para excluir registros de vendas.",
      });
      setShowDeleteDialog(false);
      return;
    }
    try {
      setIsDeleting(true);
      await deleteSale(id);
      setShowDeleteDialog(false);
      toast({ title: "Registro Excluído", description: "O registro de venda foi excluído com sucesso." });
      
      // Refresh automático para sincronizar dados
      window.location.reload();
      
    } catch (error) {
      console.error("Erro ao excluir venda no SalesHistory:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Excluir Venda",
        description: error instanceof Error ? error.message : "Ocorreu um problema ao tentar excluir o registro.",
      });
    } finally {
      setIsDeleting(false);
    }
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
      
      // Refresh automático para sincronizar dados
      window.location.reload();
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
      case "Venda": return "bg-green-100 text-green-800 border-green-200";
      case "Devolução": return "bg-red-100 text-red-800 border-red-200";
      case "Troca": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Amostra": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get status badge based on sale type and amount
  const getStatusBadge = (sale: Sale) => {
    const totalWeight = calculateTotalWeightInKg(sale);
    
    if (sale.type === "Devolução") {
      return { variant: "destructive" as const, label: "Devolução" };
    } else if (sale.type === "Troca") {
      return { variant: "secondary" as const, label: "Troca" };
    } else if (sale.type === "Amostra") {
      return { variant: "outline" as const, label: "Amostra" };
    } else if (totalWeight >= 1000) {
      return { variant: "default" as const, label: "Grande Volume" };
    } else if (totalWeight >= 500) {
      return { variant: "secondary" as const, label: "Médio Volume" };
    } else {
      return { variant: "outline" as const, label: "Pequeno Volume" };
    }
  };

  // Render modern sale card
  const SaleCard = ({ sale, index }: { sale: Sale; index: number }) => {
    const status = getStatusBadge(sale);
    const saleDate = new Date(sale.date);
    
    return (
      <Card className="group relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-xl hover:shadow-green-500/10 dark:hover:shadow-green-400/10 transition-all duration-500 hover:-translate-y-2">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Sparkle effect */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Sparkles className="h-4 w-4 text-green-400 animate-pulse" />
        </div>

        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg group-hover:shadow-green-500/25 transition-shadow duration-300">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <CardTitle 
                  className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300 cursor-pointer hover:underline"
                  onClick={() => { setSelectedSale(sale); setShowDetailsDialog(true); }}
                >
                  {sale.customerName}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {format(saleDate, "dd 'de' MMMM", { locale: ptBR })}
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
                  <DropdownMenuItem onClick={() => { setSelectedSale(sale); setShowDetailsDialog(true); }} className="cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  {hasPermission('sales', 'update') && (
                    <DropdownMenuItem onClick={() => { setSelectedSale(sale); setShowEditDialog(true); }} className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {hasPermission('sales', 'delete') && (
                    <DropdownMenuItem 
                      onClick={() => { setSelectedSale(sale); setShowDeleteDialog(true); }} 
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
          {/* Cliente e Tipo */}
          <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200/30 dark:border-green-700/30">
            <h4 className="text-sm font-bold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Informações da Venda
            </h4>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">NF</span>
                <span className="font-bold text-gray-900 dark:text-gray-100 truncate block">
                  {sale.invoiceNumber}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Tipo</span>
                <Badge variant="outline" className={getSaleTypeColor(sale.type)}>
                  {sale.type}
                </Badge>
              </div>
            </div>
          </div>

          {/* Métricas da Venda */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Peso Total
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumberBR(calculateTotalWeightInKg(sale))} kg
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Produtos
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {sale.items.length}
              </p>
            </div>
          </div>

          {/* Products Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Produtos ({sale.items.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {sale.items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {item.productName}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {formatNumberBR(item.quantity)} {item.unitOfMeasure === 'kg' ? 'unidades' : item.unitOfMeasure}
                  </Badge>
                </div>
              ))}
              {sale.items.length > 3 && (
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    +{sale.items.length - 3} mais produtos
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                NF: {sale.invoiceNumber}
              </span>
              <div className="h-2 w-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  if (isLoading.sales) {
    return (
      <div className="space-y-6 animate-fade-in flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-medium">Carregando histórico de vendas...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)} 
              className="hover:bg-green-50 dark:hover:bg-green-900/20 flex-shrink-0"
              size={isMobile ? "sm" : "default"}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent truncate">
                Histórico de Vendas
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
                Gerencie e visualize todos os registros de vendas
              </p>
            </div>
          </div>
          
          {hasPermission('sales', 'create') && (
            <div className="flex-shrink-0 w-full md:w-auto">
              <Button 
                onClick={() => navigate('/vendas')} 
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 w-full md:w-auto"
                size={isMobile ? "sm" : "default"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Venda
              </Button>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50">
            <CardContent className="flex items-center justify-between p-4 md:p-6">
              <div>
                <p className="text-xs md:text-sm font-medium text-green-600 dark:text-green-400">
                  Total de Vendas
                </p>
                <p className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100">
                  {totalSales}
                </p>
              </div>
              <ShoppingCart className="h-8 md:h-12 w-8 md:w-12 text-green-500" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/50">
            <CardContent className="flex items-center justify-between p-4 md:p-6">
              <div>
                <p className="text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400">
                  Volume Total
                </p>
                <p className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {formatNumberBR(totalRevenue)} kg
                </p>
              </div>
              <TrendingUp className="h-8 md:h-12 w-8 md:w-12 text-blue-500" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200/50 dark:border-purple-700/50">
            <CardContent className="flex items-center justify-between p-4 md:p-6">
              <div>
                <p className="text-xs md:text-sm font-medium text-purple-600 dark:text-purple-400">
                  Total de Produtos
                </p>
                <p className="text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {formatNumberBR(totalProducts)}
                </p>
              </div>
              <DollarSign className="h-8 md:h-12 w-8 md:w-12 text-purple-500" />
            </CardContent>
          </Card>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nota, cliente ou produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 text-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={view === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('cards')}
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-xs md:text-sm"
            >
              Cards
            </Button>
            <Button
              variant={view === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-xs md:text-sm"
            >
              Tabela
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'cards' ? (
        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSales.map((sale, index) => (
            <SaleCard key={sale.id} sale={sale} index={index} />
          ))}
          {filteredSales.length === 0 && (
            <div className="col-span-full text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Nenhuma venda encontrada
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                {search ? 'Tente ajustar sua busca' : 'Não há registros de vendas ainda'}
              </p>
              {hasPermission('sales', 'create') && !search && (
                <Button onClick={() => navigate('/vendas')} size={isMobile ? "sm" : "default"}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Venda
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        // Table view - with responsive scroll
        <Card className="shadow-xl border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50">
                    <TableHead className="font-semibold whitespace-nowrap">Nota Fiscal</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Data</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Cliente</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Produtos</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Quantidade Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                      <TableCell className="font-medium whitespace-nowrap text-sm">{sale.invoiceNumber}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{new Date(sale.date).toLocaleDateString()}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{sale.customerName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${getSaleTypeColor(sale.type)} text-xs whitespace-nowrap`}>
                          {sale.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <div className="flex flex-wrap gap-1">
                          {sale.items.slice(0, isMobile ? 1 : 2).map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {item.productName}
                            </Badge>
                          ))}
                          {sale.items.length > (isMobile ? 1 : 2) && (
                            <Badge variant="secondary" className="text-xs">
                              +{sale.items.length - (isMobile ? 1 : 2)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-sm">
                        {calculateTotalWeightInKg(sale).toFixed(2)} kg
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 transition-all duration-300 hover:bg-green-50 dark:hover:bg-green-900/20 ${
                              isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedSale(sale); setShowDetailsDialog(true); }}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {hasPermission('sales', 'update') && (
                              <DropdownMenuItem onClick={() => { setSelectedSale(sale); setShowEditDialog(true); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {hasPermission('sales', 'delete') && (
                              <DropdownMenuItem 
                                onClick={() => { setSelectedSale(sale); setShowDeleteDialog(true); }}
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
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredSales.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Nenhuma venda encontrada
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {search ? 'Tente ajustar sua busca' : 'Não há registros de vendas ainda'}
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
              Tem certeza que deseja excluir a venda <strong>NF {selectedSale?.invoiceNumber}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSale && handleDelete(selectedSale.id)}
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
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Detalhes da Venda - NF {selectedSale?.invoiceNumber}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Informações completas do registro de venda
            </DialogDescription>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <ShoppingCart className="h-4 md:h-5 w-4 md:w-5" />
                    Informações da Venda
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Data da Venda</Label>
                    <p className="font-medium text-sm md:text-base">{format(new Date(selectedSale.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Cliente</Label>
                    <p className="font-medium text-sm md:text-base">{selectedSale.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Tipo de Venda</Label>
                    <Badge variant="outline" className={`${getSaleTypeColor(selectedSale.type)} text-xs`}>
                      {selectedSale.type}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm">Peso Total</Label>
                    <p className="font-medium text-sm md:text-base">{formatNumberBR(calculateTotalWeightInKg(selectedSale))} kg</p>
                  </div>
                </CardContent>
              </Card>

              {/* Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <ShoppingCart className="h-4 md:h-5 w-4 md:w-5" />
                    Produtos Vendidos ({selectedSale.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-sm">Produto</TableHead>
                          <TableHead className="text-sm">Lote</TableHead>
                          <TableHead className="text-sm">Quantidade</TableHead>
                          <TableHead className="text-sm">Unidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSale.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                            <TableCell className="text-sm">{item.batchNumber}</TableCell>
                            <TableCell className="text-sm">{formatNumberBR(item.quantity)}</TableCell>
                            <TableCell className="text-sm">{item.unitOfMeasure === 'kg' ? 'unidades' : item.unitOfMeasure}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedSale.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base">{selectedSale.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Editar Venda - NF {selectedSale?.invoiceNumber}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Edite as informações da venda e dos produtos vendidos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <ShoppingCart className="h-4 md:h-5 w-4 md:w-5" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-invoice-number" className="text-sm">Nota Fiscal</Label>
                  <Input
                    id="edit-invoice-number"
                    value={editForm.invoiceNumber || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-date" className="text-sm">Data da Venda</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editForm.date ? (typeof editForm.date === 'string' ? editForm.date : new Date(editForm.date).toISOString().split('T')[0]) : ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value ? new Date(e.target.value) : undefined }))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-customer" className="text-sm">Cliente</Label>
                  <Input
                    id="edit-customer"
                    value={editForm.customerName || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-type" className="text-sm">Tipo de Venda</Label>
                  <Select
                    value={editForm.type || 'Venda'}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Venda">Venda</SelectItem>
                      <SelectItem value="Devolução">Devolução</SelectItem>
                      <SelectItem value="Troca">Troca</SelectItem>
                      <SelectItem value="Amostra">Amostra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <Label htmlFor="edit-notes" className="text-sm">Observações</Label>
                  <Input
                    id="edit-notes"
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Adicione observações sobre esta venda..."
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <ShoppingCart className="h-4 md:h-5 w-4 md:w-5" />
                  Produtos Vendidos ({editedItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {editedItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                      <div>
                        <Label className="text-sm">Produto</Label>
                        <Input
                          value={item.productName}
                          disabled
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Lote</Label>
                        <Input
                          value={item.batchNumber}
                          disabled
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Quantidade</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-end md:items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 w-full md:w-auto"
                        >
                          <Trash className="h-4 w-4" />
                          <span className="ml-2 md:hidden">Remover</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEdit} 
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
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

export default SalesHistory;
