import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { traceProductBatch, traceMaterialBatch, findRelatedBatches, ProductTraceability, MaterialTraceability } from '@/services/traceabilityService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader, Package, Truck, ShoppingCart, Factory, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Estilos para a página de impressão
const printStyles = `
  html {
    display: flex;
    justify-content: center;
    align-items: flex-start; 
    min-height: 100vh;
    background-color: #E0E0E0; /* Um cinza claro para o fundo fora do "papel" */
    padding: 20px 0; 
    box-sizing: border-box;
  }
  body {
    background-image: url('/images/papeltimbrado.jpg') !important;
    background-size: contain !important;
    background-repeat: no-repeat !important;
    background-position: center center !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    margin: 0 !important; /* Removido auto, pois html é flex */
    padding: 0;
    width: 210mm; 
    height: 297mm;
    box-shadow: 0 0 10px rgba(0,0,0,0.2); /* Sombra para destacar o "papel" na tela */
    position: relative; /* Para contexto de posicionamento se necessário */
  }
  @media print {
    html, body {
      background-color: transparent !important; /* Remove o fundo cinza e sombra na impressão */
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      display: block !important; /* Reset flex para impressão */
    }
    body {
        /* Mantém as dimensões e background para impressão */
        width: 210mm !important; 
        height: 297mm !important;
        background-image: url('/images/papeltimbrado.jpg') !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center center !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .printable-content-area {
       /* Os paddings já estão corretos para o conteúdo */
    }
  }
  .printable-content-area {
    padding-top: 6.5cm;
    padding-bottom: 5.5cm;
    padding-left: 2cm;
    padding-right: 2cm;
    width: 100%;
    height: 100%; /* Faz com que a área de conteúdo ocupe toda a altura do body A4 */
    box-sizing: border-box;
    overflow: auto; /* Adiciona rolagem se o conteúdo exceder a página, para visualização */
  }
  table, tr, td, th, .card-print-item {
    page-break-inside: avoid !important;
  }
  thead {
    display: table-header-group !important;
  }
  .table-print-tight td,
  .table-print-tight th {
    padding: 3px 5px !important; 
    font-size: 0.85em !important; 
  }
  .card-print-clean {
    border: 1px solid #eee !important; 
    box-shadow: none !important;
    margin-bottom: 10px; 
  }
  .accordion-content-print {
    display: block !important;
  }
`;

const PrintableTraceabilityPage = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [productTrace, setProductTrace] = useState<ProductTraceability | null>(null);
  const [materialTrace, setMaterialTrace] = useState<MaterialTraceability | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Funções de renderização e busca de dados (serão adaptadas de Traceability.tsx)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      console.error("Erro ao formatar data:", date, e);
      return "Data inválida";
    }
  };

  const fetchTraceDataForPrint = useCallback(async () => {
    if (!batchId) {
      setError("ID do lote não fornecido.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const batchInfo = await findRelatedBatches(batchId);
      if (!batchInfo.exists) {
        setError(`O lote "${batchId}" não foi encontrado.`);
        setProductTrace(null);
        setMaterialTrace(null);
        setIsLoading(false);
        return;
      }
      if (batchInfo.type === 'product') {
        const result = await traceProductBatch(batchId);
        setProductTrace(result);
        setMaterialTrace(null);
      } else {
        const result = await traceMaterialBatch(batchId);
        setMaterialTrace(result);
        setProductTrace(null);
      }
    } catch (fetchError) {
      console.error("Erro na rastreabilidade para impressão:", fetchError);
      setError("Ocorreu um erro ao buscar os dados para impressão.");
      setProductTrace(null);
      setMaterialTrace(null);
    } finally {
      setIsLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchTraceDataForPrint();
  }, [fetchTraceDataForPrint]);

  useEffect(() => {
    if (!isLoading && (productTrace || materialTrace) && !error) {
      // Garante que o conteúdo está renderizado antes de tentar imprimir
      const printTimeout = setTimeout(() => {
        window.print();
        // Opcional: window.close(); // Pode ser bloqueado pelo navegador
      }, 500); // Delay para garantir renderização completa
      return () => clearTimeout(printTimeout);
    }
  }, [isLoading, productTrace, materialTrace, error]);

  // Funções de renderização de conteúdo (adaptadas de Traceability.tsx)
  // Estas funções devem retornar JSX puro, sem elementos de UI interativos (botões de rastrear, etc.)
  const renderAccordionContent = (items: any[], headers: string[], renderRow: (item: any, index: number) => JSX.Element) => {
    if (!items || items.length === 0) {
      return <p className="px-1 py-1 text-xs text-gray-600">Nenhum dado encontrado.</p>;
    }
    return (
      <div className="overflow-x-auto">
        <Table className="text-xs table-print-tight">
          <TableHeader>
            <TableRow>
              {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(renderRow)}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Renderização do ProductTraceability (simplificada para impressão)
  const renderPrintableProductTrace = (trace: ProductTraceability) => (
    <div className="space-y-3">
      <Card className="card-print-item card-print-clean">
        <CardHeader className="p-2"><CardTitle className="text-sm font-semibold flex items-center gap-1"><Factory className="h-4 w-4" />Detalhes da Produção</CardTitle></CardHeader>
        <CardContent className="p-2"><div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div><strong>Lote:</strong> {trace.productionDetails.batchNumber}</div>
            <div><strong>Data Prod.:</strong> {formatDate(trace.productionDetails.productionDate)}</div>
            <div><strong>Dia Mexida:</strong> {trace.productionDetails.mixDay}</div>
            <div><strong>Qtd. Mexidas:</strong> {trace.productionDetails.mixCount}</div>
            {trace.productionDetails.notes && <div className="col-span-2"><strong>Obs:</strong> <span className="whitespace-pre-wrap">{trace.productionDetails.notes}</span></div>}
        </div></CardContent>
      </Card>
      {/* Insumos */} 
      <Card className="card-print-item card-print-clean">
        <CardHeader className="p-2"><CardTitle className="text-sm font-semibold flex items-center gap-1"><Package className="h-4 w-4" />Insumos Utilizados ({trace.usedMaterials.length})</CardTitle></CardHeader>
        <CardContent className="p-0 accordion-content-print">
          {renderAccordionContent(
            trace.usedMaterials,
            ["Material", "Tipo", "Lote", "Qtd", "Fornec.", "NF", "Entr.", "Valid.", "Laudo"],
            (material, index) => (
              <TableRow key={material.id || index}>
                <TableCell>{material.materialName}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs p-0.5">{material.materialType}</Badge></TableCell>
                <TableCell>{material.batchNumber}</TableCell>
                <TableCell>{material.quantity} {material.unitOfMeasure}</TableCell>
                <TableCell>{material.supplier?.name || "-"}</TableCell>
                <TableCell>{material.supplier?.invoiceNumber || "-"}</TableCell>
                <TableCell>{formatDate(material.supplier?.orderDate)}</TableCell>
                <TableCell>{formatDate(material.expiryDate)}</TableCell>
                <TableCell>{material.hasReport ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertTriangle className="h-3 w-3 text-red-600" />}</TableCell>
              </TableRow>
            )
          )}
        </CardContent>
      </Card>
      {/* Vendas */} 
      <Card className="card-print-item card-print-clean">
        <CardHeader className="p-2"><CardTitle className="text-sm font-semibold flex items-center gap-1"><ShoppingCart className="h-4 w-4" />Vendas ({trace.sales.length})</CardTitle></CardHeader>
        <CardContent className="p-0 accordion-content-print">
          {renderAccordionContent(
            trace.sales,
            ["Data", "Cliente", "NF", "Qtd", "Un."],
            (sale, index) => (
              <TableRow key={sale.id || index}>
                <TableCell>{formatDate(sale.date)}</TableCell>
                <TableCell>{sale.customerName}</TableCell>
                <TableCell>{sale.invoiceNumber}</TableCell>
                <TableCell>{sale.quantity}</TableCell>
                <TableCell>{sale.unitOfMeasure}</TableCell>
              </TableRow>
            )
          )}
        </CardContent>
      </Card>
       {/* Outros Produtos no Lote */} 
      <Card className="card-print-item card-print-clean">
        <CardHeader className="p-2"><CardTitle className="text-sm font-semibold flex items-center gap-1"><Package className="h-4 w-4" />Outros Produtos no Lote ({trace.relatedProducts.length})</CardTitle></CardHeader>
        <CardContent className="p-0 accordion-content-print">
          {renderAccordionContent(
            trace.relatedProducts,
            ["Produto", "Lote Item", "Qtd", "Un."],
            (prod, index) => (
              <TableRow key={prod.id || index}>
                <TableCell>{prod.productName}</TableCell>
                <TableCell>{prod.batchNumber}</TableCell>
                <TableCell>{prod.quantity}</TableCell>
                <TableCell>{prod.unitOfMeasure}</TableCell>
              </TableRow>
            )
          )}
        </CardContent>
      </Card>
      {/* Rastreabilidade Reversa */} 
      <Card className="card-print-item card-print-clean">
        <CardHeader className="p-2"><CardTitle className="text-sm font-semibold flex items-center gap-1"><Truck className="h-4 w-4" />Rastreabilidade Reversa ({trace.reverseTraceability.length})</CardTitle></CardHeader>
        <CardContent className="p-0 accordion-content-print">
          {trace.reverseTraceability.length > 0 ? trace.reverseTraceability.map((reverseProd, pIndex) => (
            <div key={pIndex} className="mb-2 p-1 border rounded card-print-item text-xs">
              <p className="font-semibold">Produção: Lote {reverseProd.productionBatchNumber} ({formatDate(reverseProd.productionDate)})</p>
              {renderAccordionContent(
                reverseProd.producedItems,
                ["Produto", "Lote Item", "Qtd"],
                (item, iIndex) => (
                  <TableRow key={item.batchNumber || iIndex}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.batchNumber}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                  </TableRow>
                )
              )}
            </div>
          )) : <p className="px-1 py-1 text-xs text-gray-600">Nenhuma outra produção encontrada.</p>}
        </CardContent>
      </Card>
    </div>
  );

  // Renderização do MaterialTraceability (simplificada para impressão)
  const renderPrintableMaterialTrace = (trace: MaterialTraceability) => (
    <div className="space-y-3">
      <Card className="card-print-item card-print-clean">
        <CardHeader className="p-2"><CardTitle className="text-sm font-semibold flex items-center gap-1"><Package className="h-4 w-4" />Detalhes do Insumo</CardTitle></CardHeader>
        <CardContent className="p-2"><div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div><strong>Material:</strong> {trace.materialDetails.materialName}</div>
          <div><strong>Tipo:</strong> <Badge variant="outline" className="text-xs p-0.5">{trace.materialDetails.materialType}</Badge></div>
          <div><strong>Lote:</strong> {trace.materialDetails.batchNumber}</div>
          <div><strong>Fornec.:</strong> {trace.materialDetails.supplier?.name || "-"}</div>
          <div><strong>NF:</strong> {trace.materialDetails.supplier?.invoiceNumber || "-"}</div>
          <div><strong>Entrada:</strong> {formatDate(trace.materialDetails.supplier?.orderDate)}</div>
          <div><strong>Validade:</strong> {formatDate(trace.materialDetails.expiryDate)}</div>
          <div><strong>Qtd. Forn.:</strong> {trace.materialDetails.suppliedQuantity} {trace.materialDetails.unitOfMeasure}</div>
          <div><strong>Qtd. Rest.:</strong> {trace.materialDetails.remainingQuantity} {trace.materialDetails.unitOfMeasure}</div>
          <div><strong>Laudo:</strong> {trace.materialDetails.hasReport ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertTriangle className="h-3 w-3 text-red-600" /> }</div>
        </div></CardContent>
      </Card>
      {/* Utilizado nas Produções */} 
      <Card className="card-print-item card-print-clean">
        <CardHeader className="p-2"><CardTitle className="text-sm font-semibold flex items-center gap-1"><Factory className="h-4 w-4" />Utilizado nas Produções ({trace.usedInProductions.length})</CardTitle></CardHeader>
        <CardContent className="p-0 accordion-content-print">
          {trace.usedInProductions.length > 0 ? trace.usedInProductions.map((prod, index) => (
            <div key={index} className="mb-2 p-1 border rounded text-xs">
              <p className="font-semibold">Lote Produção: {prod.productionBatchNumber} ({formatDate(prod.productionDate)}) - Qtd. Usada: {prod.quantityUsed} {trace.materialDetails.unitOfMeasure}</p>
              {renderAccordionContent(
                prod.producedItems,
                ["Produto", "Lote Item", "Qtd"],
                (item, iIndex) => (
                  <TableRow key={item.batchNumber || iIndex}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.batchNumber}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                  </TableRow>
                )
              )}
            </div>
          )) : <p className="px-1 py-1 text-xs text-gray-600">Não utilizado em produções.</p>}
        </CardContent>
      </Card>
      {/* Vendas de Produtos Relacionados */} 
      <Card className="card-print-item card-print-clean">
        <CardHeader className="p-2"><CardTitle className="text-sm font-semibold flex items-center gap-1"><ShoppingCart className="h-4 w-4" />Vendas de Produtos Relacionados ({trace.relatedSales.length})</CardTitle></CardHeader>
        <CardContent className="p-0 accordion-content-print">
          {renderAccordionContent(
            trace.relatedSales,
            ["Produto", "Lote Produto", "Data Venda", "Cliente", "NF", "Qtd"],
            (sale, index) => (
              <TableRow key={sale.invoiceNumber + index}>
                <TableCell>{sale.productName}</TableCell>
                <TableCell>{sale.productBatchNumber}</TableCell>
                <TableCell>{formatDate(sale.saleDate)}</TableCell>
                <TableCell>{sale.customerName}</TableCell>
                <TableCell>{sale.invoiceNumber}</TableCell>
                <TableCell>{sale.quantity}</TableCell>
              </TableRow>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <Loader className="h-8 w-8 animate-spin" /> 
        <p style={{ marginLeft: '10px' }}>Carregando dados para impressão...</p>
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif', color: 'red' }}>Erro: {error}</div>;
  }

  return (
    <>
      <style>{printStyles}</style>
      <div className="printable-content-area">
        {productTrace && renderPrintableProductTrace(productTrace)}
        {materialTrace && renderPrintableMaterialTrace(materialTrace)}
        {!productTrace && !materialTrace && <p>Nenhum dado de rastreabilidade para exibir.</p>}
      </div>
    </>
  );
};

export default PrintableTraceabilityPage; 