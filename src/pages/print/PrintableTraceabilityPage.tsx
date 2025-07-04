import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader } from 'lucide-react';

interface TraceabilityData {
  productName: string;
  batchNumber: string;
  productionDate: string;
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

const PrintableTraceabilityPage = () => {
  const { id } = useParams<{ id: string }>();
  const [traceabilityData, setTraceabilityData] = useState<TraceabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTraceabilityData(id);
    }
  }, [id]);

  const fetchTraceabilityData = async (batchNumber: string) => {
    setIsLoading(true);
    try {
      const { data: productionData, error: productionError } = await supabase
        .from('production_batches')
        .select('productName, productionDate')
        .eq('batchNumber', batchNumber)
        .single();

      if (productionError) throw productionError;

      const { data: materialsData, error: materialsError } = await supabase
        .from('materials_used')
        .select(`
          id,
          batch_number,
          material_name,
          material_type,
          quantity_used,
          unit_of_measure,
          supplier_name,
          expiry_date,
          has_report
        `)
        .eq('production_batch_number', batchNumber);

      if (materialsError) throw materialsError;

      const materials: RelatedBatch[] = materialsData ? materialsData.map(item => ({
        id: item.id,
        batch_number: item.batch_number,
        material_name: item.material_name,
        material_type: item.material_type,
        quantity_used: item.quantity_used,
        unit_of_measure: item.unit_of_measure,
        supplier_name: item.supplier_name,
        expiry_date: item.expiry_date,
        has_report: item.has_report
      })) : [];

      setTraceabilityData({
        productName: productionData?.productName || 'N/A',
        batchNumber: batchNumber,
        productionDate: productionData?.productionDate || 'N/A',
        materials: materials,
      });
    } catch (error) {
      console.error("Error fetching traceability data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderRelatedBatches = (batches: RelatedBatch[]) => {
    if (!batches || batches.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          Nenhum lote relacionado encontrado
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {batches.map((batch) => (
          <div key={batch.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 rounded text-sm">{batch.material_type}</span>
                  <span className="font-medium">{batch.material_name}</span>
                </div>
                <div className="text-sm text-gray-600">
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
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    Com Laudo
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!traceabilityData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Rastreabilidade não encontrada</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white print:p-0">
      <h1 className="text-2xl font-semibold mb-6">
        Rastreabilidade do Lote: {traceabilityData.batchNumber}
      </h1>

      <div className="mb-4">
        <div className="text-gray-700">
          Produto: {traceabilityData.productName}
        </div>
        <div className="text-gray-700">
          Data de Produção: {format(new Date(traceabilityData.productionDate), "dd/MM/yyyy", { locale: ptBR })}
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📦 Materiais Utilizados
        </h3>
        {renderRelatedBatches(traceabilityData?.materials || [])}
      </div>
    </div>
  );
};

export default PrintableTraceabilityPage;
