import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  Package, 
  Calendar, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle,
  Scale,
  Archive,
  Beaker,
  Factory,
  Package2
} from "lucide-react";

interface InventoryItem {
  id: string;
  productName?: string;
  materialName?: string;
  materialType?: string;
  batchNumber: string;
  quantity: number;
  remainingQuantity: number;
  unitOfMeasure: string;
  expiryDate?: Date;
  hasReport?: boolean;
}

interface InventoryDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  type: "product" | "material";
  batches: InventoryItem[];
}

export const InventoryDetailsDialog = React.memo(function InventoryDetailsDialog({
  open,
  onOpenChange,
  item,
  type,
  batches
}: InventoryDetailsDialogProps) {
  if (!item) return null;

  const name = type === "product" ? item.productName : item.materialName;
  
  // Format expiry date as a string (memoized)
  const formatExpiryDate = useMemo(() => {
    return (date: Date | undefined) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString('pt-BR');
    };
  }, []);

  // Get expiry status with enhanced styling (memoized)
  const getExpiryStatus = useMemo(() => {
    return (expiryDate: Date | undefined) => {
      if (!expiryDate) {
        return {
          badge: <Badge variant="secondary" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Sem validade
          </Badge>,
          status: "none",
          daysLeft: null
        };
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(expiryDate);
      expiry.setHours(0, 0, 0, 0);
      
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return {
          badge: <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Vencido há {Math.abs(diffDays)} dias
          </Badge>,
          status: "expired",
          daysLeft: diffDays
        };
      } else if (diffDays === 0) {
        return {
          badge: <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Vence hoje
          </Badge>,
          status: "today",
          daysLeft: diffDays
        };
      } else if (diffDays <= 7) {
        return {
          badge: <Badge className="bg-red-500 text-white flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {diffDays} dias
          </Badge>,
          status: "critical",
          daysLeft: diffDays
        };
      } else if (diffDays <= 30) {
        return {
          badge: <Badge className="bg-orange-500 text-white flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {diffDays} dias
          </Badge>,
          status: "warning",
          daysLeft: diffDays
        };
      } else {
        return {
          badge: <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            {formatExpiryDate(expiryDate)}
          </Badge>,
          status: "good",
          daysLeft: diffDays
        };
      }
    };
  }, [formatExpiryDate]);

  // Calculate summary statistics (memoized)
  const summaryStats = useMemo(() => {
    const totalQuantity = batches.reduce((sum, batch) => sum + batch.remainingQuantity, 0);
    const totalBatches = batches.length;
    const unitOfMeasure = batches[0]?.unitOfMeasure || "kg";

    return { totalQuantity, totalBatches, unitOfMeasure };
  }, [batches]);

  // Material type statistics (only for materials) (memoized)
  const materialStats = useMemo(() => {
    if (type !== "material") return null;
    
    const withReport = batches.filter(b => b.hasReport).length;
    const withoutReport = batches.filter(b => !b.hasReport).length;
    const expired = batches.filter(b => {
      if (!b.expiryDate) return false;
      return new Date(b.expiryDate) < new Date();
    }).length;
    const expiringSoon = batches.filter(b => {
      if (!b.expiryDate) return false;
      const today = new Date();
      const expiry = new Date(b.expiryDate);
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays >= 0;
    }).length;

    return { withReport, withoutReport, expired, expiringSoon };
  }, [type, batches]);

  // Get material type icon (memoized)
  const getMaterialTypeIcon = useMemo(() => {
    return (materialType?: string) => {
      switch (materialType) {
        case "Fécula":
          return <Beaker className="h-5 w-5 text-blue-600" />;
        case "Conservante":
          return <Package2 className="h-5 w-5 text-green-600" />;
        case "Embalagem":
          return <Archive className="h-5 w-5 text-yellow-600" />;
        case "Saco":
          return <Package className="h-5 w-5 text-purple-600" />;
        case "Caixa":
          return <Factory className="h-5 w-5 text-orange-600" />;
        default:
          return <Package className="h-5 w-5 text-gray-600" />;
      }
    };
  }, []);

  // Stats summary cards (memoized)
  const StatsSummary = useMemo(() => {
    return () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Lotes</p>
                <p className="text-2xl font-bold text-blue-900">{summaryStats.totalBatches}</p>
              </div>
              <Archive className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Quantidade</p>
                <p className="text-2xl font-bold text-purple-900">{summaryStats.totalQuantity.toFixed(1)}</p>
                <p className="text-xs text-purple-600">{summaryStats.unitOfMeasure}</p>
              </div>
              <Scale className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {materialStats && (
          <>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Com Laudo</p>
                    <p className="text-2xl font-bold text-green-900">{materialStats.withReport}</p>
                    <p className="text-xs text-green-600">
                      {((materialStats.withReport / summaryStats.totalBatches) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <FileCheck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Alertas</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {materialStats.expired + materialStats.expiringSoon}
                    </p>
                    <p className="text-xs text-orange-600">
                      {materialStats.expired} vencidos
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }, [summaryStats, materialStats]);

  // Batch card component (memoized)
  const BatchCard = React.memo(({ batch, index }: { batch: InventoryItem, index: number }) => {
    const expiryInfo = type === "material" ? getExpiryStatus(batch.expiryDate) : null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className="hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center">
                  {type === "product" ? (
                    <Package className="h-5 w-5 text-gray-600" />
                  ) : (
                    getMaterialTypeIcon(batch.materialType)
                  )}
                </div>
                <div>
                  <h4 className="font-semibold">{batch.batchNumber}</h4>
                  <p className="text-sm text-muted-foreground">
                    Lote {type === "product" ? "de produto" : "de material"}
                  </p>
                </div>
              </div>
              
              {type === "material" && (
                <div className="flex flex-col gap-2">
                  {expiryInfo?.badge}
                  <Badge variant={batch.hasReport ? "outline" : "secondary"} 
                         className={`flex items-center gap-1 ${
                           batch.hasReport 
                             ? "bg-green-50 text-green-700 border-green-200" 
                             : "bg-red-50 text-red-700 border-red-200"
                         }`}>
                    <FileCheck className="h-3 w-3" />
                    {batch.hasReport ? "Com laudo" : "Sem laudo"}
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quantidade Disponível</span>
                <span className="font-semibold">
                  {batch.remainingQuantity} {batch.unitOfMeasure}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quantidade Original</span>
                <span className="text-sm">
                  {batch.quantity} {batch.unitOfMeasure}
                </span>
              </div>
              
              {batch.quantity > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${(batch.remainingQuantity / batch.quantity) * 100}%` 
                    }}
                  ></div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {((batch.remainingQuantity / batch.quantity) * 100).toFixed(1)}% disponível
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  });

  // Memoize batches rendering
  const renderBatches = useMemo(() => {
    if (batches.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhum lote disponível
            </h4>
            <p className="text-sm text-muted-foreground">
              Não há lotes disponíveis para este {type === "product" ? "produto" : "material"}.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {batches.map((batch, index) => (
          <BatchCard key={batch.id} batch={batch} index={index} />
        ))}
      </div>
    );
  }, [batches, type]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            {type === "product" ? (
              <Package className="h-6 w-6" />
            ) : (
              getMaterialTypeIcon(item.materialType)
            )}
            <span>Detalhes do {type === "product" ? "Produto" : "Material"}</span>
          </DialogTitle>
          <DialogDescription className="text-base">
            <span className="font-medium">{name}</span>
            {type === "material" && item.materialType && (
              <span className="text-muted-foreground"> • {item.materialType}</span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
          <StatsSummary />
          
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Lotes Disponíveis ({batches.length})
            </h3>
            
            {renderBatches}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
