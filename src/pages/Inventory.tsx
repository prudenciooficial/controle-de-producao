import React, { useState, useEffect } from "react";
import { Package, History, AlertTriangle, TrendingDown, Calendar, User, FileText, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialBatch } from "@/types";

interface StockMovement {
  id: string;
  materialBatchId: string;
  materialName: string;
  batchNumber: string;
  movementType: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  reason: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

const Inventory = () => {
  const { materialBatches, refetchMaterialBatches } = useData();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<MaterialBatch | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    materialBatchId: '',
    movementType: 'saida' as 'entrada' | 'saida' | 'ajuste',
    quantity: 0,
    reason: '',
    notes: ''
  });

  const canEdit = hasPermission('inventory', 'module');

  useEffect(() => {
    if (showHistory) {
      loadMovements();
    }
  }, [showHistory]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      // Simulated API call - replace with actual implementation
      const mockMovements: StockMovement[] = [];
      setMovements(mockMovements);
    } catch (error) {
      console.error('Error loading movements:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de movimentações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEdit) {
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para fazer movimentações de estoque",
        variant: "destructive"
      });
      return;
    }

    if (!formData.materialBatchId || !formData.reason || formData.quantity <= 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Simulated API call - replace with actual implementation
      const movement: Omit<StockMovement, 'id' | 'createdAt' | 'createdBy'> = {
        materialBatchId: formData.materialBatchId,
        materialName: materialBatches.find(b => b.id === formData.materialBatchId)?.materialName || '',
        batchNumber: materialBatches.find(b => b.id === formData.materialBatchId)?.batchNumber || '',
        movementType: formData.movementType,
        quantity: formData.quantity,
        reason: formData.reason,
        notes: formData.notes
      };

      // Here you would make the actual API call to save the movement
      console.log('Saving movement:', movement);

      toast({
        title: "Sucesso",
        description: "Movimentação registrada com sucesso",
      });

      setShowForm(false);
      setFormData({
        materialBatchId: '',
        movementType: 'saida',
        quantity: 0,
        reason: '',
        notes: ''
      });

      await refetchMaterialBatches();
    } catch (error) {
      console.error('Error saving movement:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar movimentação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getLowStockBatches = () => {
    return materialBatches.filter(batch => {
      const threshold = batch.suppliedQuantity * 0.2; // 20% threshold
      return batch.remainingQuantity <= threshold;
    });
  };

  const getExpiringBatches = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return materialBatches.filter(batch => 
      batch.expiryDate && new Date(batch.expiryDate) <= thirtyDaysFromNow
    );
  };

  const lowStockBatches = getLowStockBatches();
  const expiringBatches = getExpiringBatches();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Estoque</h1>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={() => setShowForm(true)}>
              <Package className="w-4 h-4 mr-2" />
              Nova Baixa de Estoque
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <History className="w-4 h-4 mr-2" />
            Histórico de Baixas
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockBatches.length > 0 || expiringBatches.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockBatches.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-orange-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Estoque Baixo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-orange-700 mb-2">
                  {lowStockBatches.length} lote(s) com estoque baixo
                </p>
                <div className="space-y-1">
                  {lowStockBatches.slice(0, 3).map(batch => (
                    <div key={batch.id} className="text-xs text-orange-600">
                      {batch.materialName} - Lote {batch.batchNumber}: {batch.remainingQuantity}{batch.unitOfMeasure}
                    </div>
                  ))}
                  {lowStockBatches.length > 3 && (
                    <div className="text-xs text-orange-600">
                      +{lowStockBatches.length - 3} outros...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {expiringBatches.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Próximos ao Vencimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700 mb-2">
                  {expiringBatches.length} lote(s) vencem em 30 dias
                </p>
                <div className="space-y-1">
                  {expiringBatches.slice(0, 3).map(batch => (
                    <div key={batch.id} className="text-xs text-red-600">
                      {batch.materialName} - Lote {batch.batchNumber}: {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                    </div>
                  ))}
                  {expiringBatches.length > 3 && (
                    <div className="text-xs text-red-600">
                      +{expiringBatches.length - 3} outros...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materialBatches.map((batch) => (
          <Card key={batch.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{batch.materialName}</CardTitle>
                  <CardDescription>Lote: {batch.batchNumber}</CardDescription>
                </div>
                <Badge variant={batch.remainingQuantity > 0 ? "default" : "secondary"}>
                  {batch.materialType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Estoque Atual</p>
                  <p className="font-semibold">{batch.remainingQuantity} {batch.unitOfMeasure}</p>
                </div>
                <div>
                  <p className="text-gray-500">Quantidade Original</p>
                  <p className="font-semibold">{batch.suppliedQuantity} {batch.unitOfMeasure}</p>
                </div>
              </div>
              
              {batch.expiryDate && (
                <div className="text-sm">
                  <p className="text-gray-500">Validade</p>
                  <p className="font-semibold">{new Date(batch.expiryDate).toLocaleDateString()}</p>
                </div>
              )}

              {batch.supplierName && (
                <div className="text-sm">
                  <p className="text-gray-500">Fornecedor</p>
                  <p className="font-semibold">{batch.supplierName}</p>
                </div>
              )}

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${Math.max(0, Math.min(100, (batch.remainingQuantity / batch.suppliedQuantity) * 100))}%` 
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {materialBatches.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum material em estoque</h3>
          <p className="text-gray-500">Registre pedidos para adicionar materiais ao estoque</p>
        </div>
      )}

      {/* Movement Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
            <DialogDescription>
              Registre uma movimentação de entrada, saída ou ajuste de estoque
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="materialBatch">Material/Lote *</Label>
              <Select 
                value={formData.materialBatchId} 
                onValueChange={(value) => setFormData({...formData, materialBatchId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o material e lote" />
                </SelectTrigger>
                <SelectContent>
                  {materialBatches.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.materialName} - Lote {batch.batchNumber} ({batch.remainingQuantity} {batch.unitOfMeasure})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="movementType">Tipo de Movimentação *</Label>
              <Select 
                value={formData.movementType} 
                onValueChange={(value: 'entrada' | 'saida' | 'ajuste') => setFormData({...formData, movementType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="reason">Motivo *</Label>
              <Select 
                value={formData.reason} 
                onValueChange={(value) => setFormData({...formData, reason: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="producao">Uso em Produção</SelectItem>
                  <SelectItem value="perda">Perda/Desperdício</SelectItem>
                  <SelectItem value="vencimento">Vencimento</SelectItem>
                  <SelectItem value="devolucao">Devolução</SelectItem>
                  <SelectItem value="ajuste_inventario">Ajuste de Inventário</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[800px] max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Histórico de Movimentações</DialogTitle>
            <DialogDescription>
              Histórico de todas as movimentações de estoque
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Carregando...</p>
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma movimentação registrada</p>
              </div>
            ) : (
              movements.map((movement) => (
                <Card key={movement.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{movement.materialName}</h4>
                        <p className="text-sm text-gray-500">Lote: {movement.batchNumber}</p>
                        <p className="text-sm text-gray-500">Motivo: {movement.reason}</p>
                        {movement.notes && (
                          <p className="text-sm text-gray-500">Obs: {movement.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          movement.movementType === 'entrada' ? 'default' : 
                          movement.movementType === 'saida' ? 'destructive' : 'secondary'
                        }>
                          {movement.movementType === 'entrada' ? '+' : '-'}{movement.quantity}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {movement.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
