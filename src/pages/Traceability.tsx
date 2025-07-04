import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader, Search, Package, ArrowRight, Calendar, FileText, AlertTriangle, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TraceabilityData {
  productName: string;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  quantityProduced: number;
  operatorName: string;
  machineUsed: string;
  materials: RelatedBatch[];
}

interface RelatedBatch {
  id: string;
  batch_number: string;
  material_name: string;
  material_type: string;
  quantity_used: number;
  unit_of_measure: string;
  supplier_name?: string;
  expiry_date?: string;
  has_report: boolean;
}

const Traceability = () => {
  const [searchParams] = useSearchParams();
  const [batchNumber, setBatchNumber] = useState(searchParams.get("batch") || "");
  const [traceabilityData, setTraceabilityData] = useState<TraceabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (batchNumber) {
      fetchTraceabilityData(batchNumber);
    }
  }, [batchNumber]);

  const fetchTraceabilityData = async (batch: string) => {
    setIsLoading(true);
    setSearchPerformed(true);
    try {
      const { data, error } = await supabase
        .from('traceability_data')
        .select(`
          productName,
          batchNumber,
          productionDate,
          expiryDate,
          quantityProduced,
          operatorName,
          machineUsed,
          materials: related_batches (
            id,
            batch_number,
            material_name,
            material_type,
            quantity_used,
            unit_of_measure,
            supplier_name,
            expiry_date,
            has_report
          )
        `)
        .eq('batchNumber', batch)
        .single();

      if (error) throw error;

      setTraceabilityData(data);
    } catch (error) {
      console.error("Erro ao buscar dados de rastreabilidade:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao buscar informações de rastreabilidade.",
      });
      setTraceabilityData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (batchNumber) {
      fetchTraceabilityData(batchNumber);
    } else {
      toast({
        title: "Atenção",
        description: "Por favor, insira um número de lote para buscar.",
      });
    }
  };

  const renderRelatedBatches = (batches: RelatedBatch[]) => {
    if (!batches || batches.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          Nenhum lote relacionado encontrado
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {batches.map((batch) => (
          <Card key={batch.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{batch.material_type}</Badge>
                  <span className="font-medium">{batch.material_name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>Lote: {batch.batch_number}</div>
                  <div>Quantidade utilizada: {batch.quantity_used} {batch.unit_of_measure}</div>
                  {batch.supplier_name && <div>Fornecedor: {batch.supplier_name}</div>}
                  {batch.expiry_date && (
                    <div>Validade: {format(new Date(batch.expiry_date), "dd/MM/yyyy", { locale: ptBR })}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {batch.has_report && (
                  <Badge variant="secondary">
                    <FileText className="w-3 h-3 mr-1" />
                    Com Laudo
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rastreabilidade</h1>
          <p className="text-muted-foreground">
            Acompanhe a origem e o processo de produção de cada lote
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Buscar por número de lote..."
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader className="w-8 h-8 animate-spin" />
          <span className="ml-2">Buscando informações de rastreabilidade...</span>
        </div>
      ) : traceabilityData ? (
        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Produto</CardTitle>
              <CardDescription>
                Detalhes sobre o produto rastreado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">Produto:</span>
                <span>{traceabilityData.productName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Lote:</span>
                <span>{traceabilityData.batchNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Data de Produção:</span>
                <span>{format(new Date(traceabilityData.productionDate), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Data de Validade:</span>
                <span>{format(new Date(traceabilityData.expiryDate), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Production Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Produção</CardTitle>
              <CardDescription>
                Informações sobre o processo de produção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">Quantidade Produzida:</span>
                <span>{traceabilityData.quantityProduced}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Operador:</span>
                <span>{traceabilityData.operatorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Máquina Utilizada:</span>
                <span>{traceabilityData.machineUsed}</span>
              </div>
            </CardContent>
          </Card>

          {/* Materials Used */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Materiais Utilizados
              </CardTitle>
              <CardDescription>
                Lotes de materiais utilizados nesta produção
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderRelatedBatches(traceabilityData.materials)}
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardContent>
              <Button onClick={() => window.print()}>
                Imprimir Rastreabilidade
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : searchPerformed && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Lote não encontrado
            </h3>
            <p className="text-sm text-muted-foreground">
              Verifique se o número do lote está correto e tente novamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Traceability;
