import React, { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  PackageCheck, 
  Loader2, 
  Info, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Scale,
  Search,
  Package2,
  Factory,
  Beaker,
  Archive,
  Minus
} from "lucide-react";
import { InventoryDetailsDialog } from "@/components/inventory/InventoryDetailsDialog";
import { motion } from "framer-motion";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";

// Schema para baixa de estoque
const stockReductionSchema = z.object({
  date: z.string().nonempty({ message: "Data é obrigatória" }),
  materialBatchId: z.string().nonempty({ message: "Insumo/Lote é obrigatório" }),
  quantity: z.number().positive({ message: "Quantidade deve ser maior que zero" }),
  productionBatchId: z.string().optional(),
  mixBatchId: z.string().optional(),
  reason: z.string().nonempty({ message: "Motivo é obrigatório" }),
  notes: z.string().optional(),
}).refine(data => {
  return data.productionBatchId || data.mixBatchId || data.reason;
}, {
  message: "Deve ser vinculado a uma produção, mexida ou ter um motivo específico",
  path: ["reason"],
});

type StockReductionValues = z.infer<typeof stockReductionSchema>;

const Inventory = () => {
  const { 
    getAvailableProducts, 
    getAvailableMaterials, 
    materialBatches, 
    productionBatches,
    globalSettings, 
    isLoading,
    getFeculaInventory,
    refetchMaterialBatches
  } = useData();
  const { hasPermission, user, getUserDisplayName } = useAuth();
  const { toast } = useToast();
  const [productSearch, setProductSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"product" | "material">("product");
  const [selectedBatches, setSelectedBatches] = useState<any[]>([]);
  
  const availableProducts = getAvailableProducts();
  const availableMaterials = getAvailableMaterials();

  // Form para baixa de estoque
  const stockForm = useForm<StockReductionValues>({
    resolver: zodResolver(stockReductionSchema),
    defaultValues: {
      date: getTodayDateString(),
      materialBatchId: "",
      quantity: 0,
      productionBatchId: "",
      mixBatchId: "",
      reason: "",
      notes: "",
    },
  });

  // Função para processar baixa de estoque
  const onStockReductionSubmit = async (data: StockReductionValues) => {
    if (!hasPermission('inventory', 'edit')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para dar baixa no estoque.",
      });
      return;
    }

    try {
      const materialBatch = materialBatches.find(batch => batch.id === data.materialBatchId);
      if (!materialBatch) {
        throw new Error("Lote de material não encontrado");
      }

      if (data.quantity > materialBatch.remainingQuantity) {
        throw new Error(`Quantidade maior que disponível em estoque (${materialBatch.remainingQuantity} ${materialBatch.unitOfMeasure})`);
      }

      // Aqui você implementaria a lógica de baixa no estoque
      // Por exemplo, chamar um serviço que atualize o banco de dados
      
      // Simulação da baixa
      console.log("Processando baixa de estoque:", {
        materialBatch: materialBatch.materialName,
        batchNumber: materialBatch.batchNumber,
        quantity: data.quantity,
        reason: data.reason,
        productionBatch: data.productionBatchId,
        mixBatch: data.mixBatchId,
        notes: data.notes
      });

      toast({
        title: "Baixa Processada",
        description: `Baixa de ${data.quantity} ${materialBatch.unitOfMeasure} de ${materialBatch.materialName} processada com sucesso.`,
      });

      // Refetch dos dados
      await refetchMaterialBatches();

      // Reset form
      stockForm.reset({
        date: getTodayDateString(),
        materialBatchId: "",
        quantity: 0,
        productionBatchId: "",
        mixBatchId: "",
        reason: "",
        notes: "",
      });

    } catch (error) {
      console.error("Erro ao processar baixa:", error);
      toast({
        variant: "destructive",
        title: "Erro ao processar baixa",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar a baixa.",
      });
    }
  };

  // Get material batch details
  const getMaterialBatchDetails = (materialBatchId: string) => {
    return materialBatches.find((batch) => batch.id === materialBatchId);
  };

  // Filter products (memoized)
  const filteredProducts = useMemo(() => {
    return availableProducts.filter(
      (product) =>
        product.productName.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.batchNumber.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [availableProducts, productSearch]);
  
  // Filter materials (memoized)
  const filteredMaterials = useMemo(() => {
    return availableMaterials.filter(
      (material) =>
        material.materialName?.toLowerCase().includes(materialSearch.toLowerCase()) ||
        material.batchNumber?.toLowerCase().includes(materialSearch.toLowerCase()) ||
        material.materialType?.toLowerCase().includes(materialSearch.toLowerCase())
    );
  }, [availableMaterials, materialSearch]);
  
  // Group materials by type with null/undefined check (memoized)
  const groupedMaterials = useMemo(() => {
    return filteredMaterials.reduce((acc, material) => {
      const type = material.materialType || "Desconhecido";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(material);
      return acc;
    }, {} as Record<string, typeof filteredMaterials>);
  }, [filteredMaterials]);
  
  // Get material type icon and color (memoized)
  const getMaterialTypeConfig = useMemo(() => {
    return (type: string) => {
      switch (type) {
        case "Fécula":
          return { 
            icon: <Beaker className="h-5 w-5" />, 
            color: "text-blue-600 bg-blue-50 border-blue-200",
            gradientClass: "from-blue-50 to-blue-100"
          };
        case "Conservante":
          return { 
            icon: <Package2 className="h-5 w-5" />, 
            color: "text-green-600 bg-green-50 border-green-200",
            gradientClass: "from-green-50 to-green-100"
          };
        case "Embalagem":
          return { 
            icon: <Archive className="h-5 w-5" />, 
            color: "text-yellow-600 bg-yellow-50 border-yellow-200",
            gradientClass: "from-yellow-50 to-yellow-100"
          };
        case "Saco":
          return { 
            icon: <Package className="h-5 w-5" />, 
            color: "text-purple-600 bg-purple-50 border-purple-200",
            gradientClass: "from-purple-50 to-purple-100"
          };
        case "Caixa":
          return { 
            icon: <Factory className="h-5 w-5" />, 
            color: "text-orange-600 bg-orange-50 border-orange-200",
            gradientClass: "from-orange-50 to-orange-100"
          };
        default:
          return { 
            icon: <Package className="h-5 w-5" />, 
            color: "text-gray-600 bg-gray-50 border-gray-200",
            gradientClass: "from-gray-50 to-gray-100"
          };
      }
    };
  }, []);
  
  // Group products by name (memoized)
  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce((acc, product) => {
      const name = product.productName;
      if (!acc[name]) {
        acc[name] = [];
      }
      acc[name].push(product);
      return acc;
    }, {} as Record<string, typeof filteredProducts>);
  }, [filteredProducts]);
  
  // Calculate total quantity for each product (memoized)
  const productTotals = useMemo(() => {
    return Object.entries(groupedProducts).map(([name, products]) => {
      const total = products.reduce((sum, p) => sum + p.remainingQuantity, 0);
      const unitOfMeasure = products[0]?.unitOfMeasure || "kg";
      const firstProduct = products[0];
      
      return {
        name,
        total,
        unitOfMeasure,
        products,
        firstProduct,
        batches: products.length
      };
    });
  }, [groupedProducts]);
  
  // Calculate total quantity for each material type (memoized)
  const materialTypeTotals = useMemo(() => {
    return Object.entries(groupedMaterials).map(([type, materials]) => {
      // Aplicar conversão para fécula APENAS no total do tipo (título)
      const isFecula = type.toLowerCase().includes('fécula');
      const feculaConversionFactor = globalSettings?.fecula_conversion_factor || 25;
      
      // Para o total do tipo, aplicar conversão se for fécula
      const total = materials.reduce((sum, m) => {
        const quantity = m.remainingQuantity;
        // Se é fécula, converter unidades para KG
        return sum + (isFecula ? quantity * feculaConversionFactor : quantity);
      }, 0);
      
      // Group materials by name within each type
      const groupedByName = materials.reduce((acc, material) => {
        const name = material.materialName || "";
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(material);
        return acc;
      }, {} as Record<string, typeof materials>);
      
      // Calculate total for each material name
      const materialTotals = Object.entries(groupedByName).map(([name, materials]) => {
        // Para materiais individuais de fécula, NÃO converter - manter unidades originais
        const total = materials.reduce((sum, m) => {
          const quantity = m.remainingQuantity;
          // Não aplicar conversão aqui - manter unidades originais
          return sum + quantity;
        }, 0);
        
        // Para fécula, mostrar unidade original (sacos), para outros manter kg
        const unitOfMeasure = isFecula ? "sacos" : (materials[0]?.unitOfMeasure || "kg");
        const firstMaterial = materials[0];
        
        // Check expiry status
        const hasExpired = materials.some(m => {
          if (!m.expiryDate) return false;
          const today = new Date();
          return new Date(m.expiryDate) < today;
        });
        
        const hasExpiringSoon = materials.some(m => {
          if (!m.expiryDate) return false;
          const today = new Date();
          const expiry = new Date(m.expiryDate);
          const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 30 && diffDays >= 0;
        });
        
        return {
          name,
          total,
          unitOfMeasure,
          materials,
          firstMaterial,
          batches: materials.length,
          hasExpired,
          hasExpiringSoon,
          isFecula // Adicionar flag para identificar fécula
        };
      });
      
      return {
        type,
        total, // Este continua convertido para o título
        materials: materialTotals,
        totalBatches: materials.length,
        isFecula // Adicionar flag para o tipo
      };
    });
  }, [groupedMaterials, globalSettings]);

  // Calculate stats (memoized)
  const productStats = useMemo(() => {
    return {
      totalTypes: productTotals.length,
      totalBatches: productTotals.reduce((sum, p) => sum + p.batches, 0),
      totalQuantity: productTotals.reduce((sum, p) => sum + p.total, 0)
    };
  }, [productTotals]);

  const materialStats = useMemo(() => {
    return {
      totalTypes: materialTypeTotals.length,
      totalBatches: materialTypeTotals.reduce((sum, m) => sum + m.totalBatches, 0),
      totalQuantity: materialTypeTotals.reduce((sum, m) => sum + m.total, 0),
      expiredItems: materialTypeTotals.reduce((sum, typeGroup) => 
        sum + typeGroup.materials.filter(m => m.hasExpired).length, 0),
      expiringSoon: materialTypeTotals.reduce((sum, typeGroup) => 
        sum + typeGroup.materials.filter(m => m.hasExpiringSoon).length, 0)
    };
  }, [materialTypeTotals]);
  
  // Handle view details (optimized to prevent recalculation)
  const handleViewDetails = useMemo(() => {
    return (item: any, type: "product" | "material") => {
      setSelectedItem(item);
      setDialogType(type);
      
      if (type === "product") {
        setSelectedBatches(item.products);
      } else {
        setSelectedBatches(item.materials);
      }
      
      setDialogOpen(true);
    };
  }, []);
  
  // Get expiry badge (memoized)
  const getExpiryBadge = useMemo(() => {
    return (expiryDate: Date | undefined) => {
      if (!expiryDate) return <Badge variant="secondary">Sem data</Badge>;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(expiryDate);
      expiry.setHours(0, 0, 0, 0);

      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return <Badge variant="destructive" className="font-bold">Vencido</Badge>;
      } else if (diffDays === 0) {
        return <Badge variant="destructive" className="font-semibold">Vence hoje</Badge>;
      } else if (diffDays < 30) {
        return <Badge className="bg-orange-500 text-white">Vence em {diffDays} dia{diffDays === 1 ? '' : 's'}</Badge>;
      } else {
        const day = expiry.getDate().toString().padStart(2, '0');
        const month = (expiry.getMonth() + 1).toString().padStart(2, '0');
        const year = expiry.getFullYear();
        return <Badge variant="outline">{`${day}/${month}/${year}`}</Badge>;
      }
    };
  }, []);

  // Stats cards component (memoized)
  const StatsCards = useMemo(() => {
    return React.memo(({ stats, type }: { stats: any, type: 'products' | 'materials' }) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total de Tipos</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalTypes}</p>
                </div>
                <div className="h-12 w-12 bg-blue-200 dark:bg-blue-800/50 rounded-lg flex items-center justify-center">
                  {type === 'products' ? <PackageCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" /> : <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Total de Lotes</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.totalBatches}</p>
                </div>
                <div className="h-12 w-12 bg-green-200 dark:bg-green-800/50 rounded-lg flex items-center justify-center">
                  <Archive className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Quantidade Total</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.totalQuantity.toFixed(0)} kg</p>
                </div>
                <div className="h-12 w-12 bg-purple-200 dark:bg-purple-800/50 rounded-lg flex items-center justify-center">
                  <Scale className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {(stats.expiredItems > 0 || stats.expiringSoon > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Alertas</p>
                    <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.expiredItems + stats.expiringSoon}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">{stats.expiredItems} vencidos, {stats.expiringSoon} próximos</p>
                  </div>
                  <div className="h-12 w-12 bg-orange-200 dark:bg-orange-800/50 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    ));
  }, []);

  // Product Card Component (memoized)
  const ProductCard = useMemo(() => {
    return React.memo(({ product, index }: { product: any, index: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className="hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-blue-50 dark:bg-blue-950/50 rounded-lg flex items-center justify-center">
                  <PackageCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.batches} lote{product.batches > 1 ? 's' : ''}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleViewDetails(product, "product")}
                className="hover:bg-primary hover:text-primary-foreground"
              >
                <Info className="h-4 w-4 mr-1" />
                Detalhes
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quantidade Total</span>
                <span className="font-semibold text-lg">{product.total} {product.unitOfMeasure === 'kg' ? 'unidades' : product.unitOfMeasure}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ));
  }, [handleViewDetails]);

  // Material Card Component (memoized)
  const MaterialCard = useMemo(() => {
    return React.memo(({ material, typeConfig, index }: { material: any, typeConfig: any, index: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className="hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                  {typeConfig.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{material.name}</h3>
                  <p className="text-sm text-muted-foreground">{material.batches} lote{material.batches > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {material.hasExpired && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Vencido
                  </Badge>
                )}
                {material.hasExpiringSoon && !material.hasExpired && (
                  <Badge className="bg-orange-500 text-white text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    Próximo
                  </Badge>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewDetails(material, "material")}
                  className="hover:bg-primary hover:text-primary-foreground"
                >
                  <Info className="h-4 w-4 mr-1" />
                  Detalhes
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quantidade Total</span>
                <span className="font-semibold text-lg">{material.total} {material.unitOfMeasure}</span>
              </div>
              
              {/* Progress bar para mostrar quantidade disponível vs original */}
              {(() => {
                // Calcular a quantidade original total e disponível total
                const totalOriginal = material.materials.reduce((sum: number, batch: any) => sum + batch.quantity, 0);
                const totalRemaining = material.materials.reduce((sum: number, batch: any) => sum + batch.remainingQuantity, 0);
                const percentage = totalOriginal > 0 ? (totalRemaining / totalOriginal) * 100 : 0;
                
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Quantidade Disponível</span>
                      <span>{totalRemaining} {material.unitOfMeasure}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Quantidade Original</span>
                      <span>{totalOriginal} {material.unitOfMeasure}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {percentage.toFixed(1)}% disponível
                    </p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ));
  }, [handleViewDetails]);
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu inventário de produtos e matérias-primas</p>
        </div>
      </div>
      
      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="produtos" className="flex items-center space-x-2">
            <PackageCheck className="h-4 w-4" />
            <span>Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="materiais" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Matérias-Primas</span>
          </TabsTrigger>
          <TabsTrigger value="baixa" className="flex items-center space-x-2">
            <Minus className="h-4 w-4" />
            <span>Baixa de Estoque</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="produtos" className="space-y-6">
          {isLoading.productionBatches ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PackageCheck className="h-5 w-5" />
                  <span>Produtos Disponíveis</span>
                </CardTitle>
                <CardDescription>
                  Produtos prontos para venda em estoque
                </CardDescription>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por produto ou lote..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {productTotals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {productTotals.map((product, index) => (
                      <ProductCard key={product.name} product={product} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <PackageCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Nenhum produto encontrado</h3>
                    <p className="text-sm text-muted-foreground">Não há produtos disponíveis em estoque no momento.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="materiais" className="space-y-6">
          {isLoading.materialBatches ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Matérias-Primas</span>
                </CardTitle>
                <CardDescription>
                  Insumos organizados por categoria para produção
                </CardDescription>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por insumo, tipo ou lote..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    className="pl-10 max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {materialTypeTotals.length > 0 ? (
                  <div className="space-y-8">
                    {materialTypeTotals.map((typeGroup, typeIndex) => {
                      const typeConfig = getMaterialTypeConfig(typeGroup.type);
                      return (
                        <motion.div
                          key={typeGroup.type}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: typeIndex * 0.2 }}
                          className="space-y-4"
                        >
                          <div className={`flex items-center justify-between p-4 rounded-lg bg-gradient-to-r ${typeConfig.gradientClass} border border-${typeConfig.color.split(' ')[2]} dark:border-opacity-30`}>
                            <div className="flex items-center space-x-3">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                                {typeConfig.icon}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold">{typeGroup.type}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {typeGroup.totalBatches} lotes • {typeGroup.total.toFixed(1)} {typeGroup.isFecula ? 'kg (convertido)' : 'kg total'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {typeGroup.materials.length} tipo{typeGroup.materials.length > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {typeGroup.materials.map((material, index) => (
                              <MaterialCard 
                                key={material.name} 
                                material={material} 
                                typeConfig={typeConfig}
                                index={index}
                              />
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Nenhum material encontrado</h3>
                    <p className="text-sm text-muted-foreground">Não há materiais disponíveis em estoque no momento.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="baixa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Minus className="h-5 w-5" />
                <span>Baixa de Estoque</span>
              </CardTitle>
              <CardDescription>
                Registre a saída de materiais do estoque vinculando a produções ou mexidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...stockForm}>
                <form onSubmit={stockForm.handleSubmit(onStockReductionSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={stockForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Baixa</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={stockForm.control}
                      name="materialBatchId"
                      render={({ field }) => {
                        const selectedMaterial = getMaterialBatchDetails(field.value);
                        return (
                          <FormItem>
                            <FormLabel>Insumo/Lote</FormLabel>
                            <Combobox
                              options={materialBatches
                                .filter(batch => batch.remainingQuantity > 0)
                                .map(batch => ({
                                  value: batch.id,
                                  label: `${batch.materialName} - ${batch.batchNumber} (${batch.remainingQuantity} ${batch.unitOfMeasure})`
                                }))}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Selecione o insumo e lote"
                              searchPlaceholder="Buscar insumo..."
                              notFoundMessage="Nenhum insumo encontrado."
                            />
                            {selectedMaterial && (
                              <FormDescription>
                                Disponível: {selectedMaterial.remainingQuantity} {selectedMaterial.unitOfMeasure}
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={stockForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0"
                              value={field.value === 0 ? "" : field.value}
                              onChange={e => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={stockForm.control}
                      name="productionBatchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Produção (Opcional)</FormLabel>
                          <Combobox
                            options={productionBatches.map(batch => ({
                              value: batch.id,
                              label: `${batch.batchNumber} - ${new Date(batch.productionDate).toLocaleDateString()}`
                            }))}
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            placeholder="Vincular à produção"
                            searchPlaceholder="Buscar produção..."
                            notFoundMessage="Nenhuma produção encontrada."
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={stockForm.control}
                      name="mixBatchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mexida (Opcional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="ID ou nome da mexida"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Informe o ID ou nome da mexida relacionada
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={stockForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo da Baixa</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Utilizado na produção, Consumo na mexida, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Descreva o motivo da baixa no estoque
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={stockForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Observações adicionais sobre a baixa..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={stockForm.formState.isSubmitting}>
                    {stockForm.formState.isSubmitting ? "Processando..." : "Processar Baixa"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <InventoryDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem?.firstProduct || selectedItem}
        type={dialogType}
        batches={selectedBatches}
      />
    </div>
  );
};

export default Inventory;
