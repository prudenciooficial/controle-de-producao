import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { traceProductBatch, traceMaterialBatch, findRelatedBatches, ProductTraceability, MaterialTraceability } from '@/services/traceabilityService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader, Package, Truck, ShoppingCart, Factory, AlertTriangle, CheckCircle, Printer, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// Estilos para a página de impressão
const printStyles = `
  /* Força um tema claro e reseta algumas propriedades globais para o preview */
  html.print-preview-active {
    background-color: #E0E0E0 !important; /* Fundo cinza FORA do papel */
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    padding: 20px 0;
    box-sizing: border-box;
    color-scheme: light !important; /* Força tema claro */
    -webkit-font-smoothing: antialiased; /* Melhora renderização de fontes */
    -moz-osx-font-smoothing: grayscale;
  }

  /* Estiliza o BODY para simular a folha A4 com papel timbrado */
  body.print-page-body {
    background-image: url('/images/papeltimbrado.jpg') !important;
    background-size: contain !important;
    background-repeat: no-repeat !important;
    background-position: center center !important;
    background-color: white !important; /* Fundo branco do papel */
    color: black !important; /* Texto preto padrão */
    width: 210mm;
    height: 297mm; /* Altura fixa para o preview em tela */
    overflow-y: auto; /* Adiciona scroll vertical se conteúdo interno exceder 297mm */
    margin: 0 auto !important; /* Centraliza o "papel" */
    padding: 0;
    box-shadow: 0 0 10px rgba(0,0,0,0.2);
    position: relative;
    box-sizing: border-box; /* Adicionado para consistência de dimensionamento */
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    /* Reset de variáveis de tema que podem estar afetando */
    --background: white !important;
    --foreground: black !important;
    --card: white !important;
    --card-foreground: black !important;
    --popover: white !important;
    --popover-foreground: black !important;
    --primary: black !important;
    --primary-foreground: white !important;
    --secondary: #f0f0f0 !important;
    --secondary-foreground: black !important;
    --muted: #f0f0f0 !important;
    --muted-foreground: #555 !important;
    --accent: #f0f0f0 !important;
    --accent-foreground: black !important;
    --destructive: #ff0000 !important;
    --destructive-foreground: white !important;
    --border: #ccc !important;
    --input: #ccc !important;
    --ring: #999 !important;
  }

  /* Header com botões - visível apenas na tela */
  .print-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: white;
    border-bottom: 1px solid #ddd;
    padding: 1rem;
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  /* Área de conteúdo principal DENTRO do "papel" */
  body.print-page-body .printable-content-area {
    background-color: transparent !important; /* ESSENCIAL: para o papel timbrado do body aparecer */
    color: black !important;
    padding-top: 6.5cm; /* Ajustar conforme o design do papel timbrado */
    padding-bottom: 5.5cm; /* Ajustar conforme o design do papel timbrado */
    padding-left: 2cm;
    padding-right: 2cm;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: auto; /* Permite scroll no preview se conteúdo for grande */
    margin-top: 80px; /* Espaço para o header fixo */
  }

  /* Garante que elementos DENTRO da área imprimível tenham cores corretas */
  body.print-page-body .printable-content-area *,
  body.print-page-body .printable-content-area ::before,
  body.print-page-body .printable-content-area ::after {
    color: inherit !important; /* Herda cor do pai (que é preto) */
    background-color: transparent !important;
    border-color: #555 !important;
    text-shadow: none !important;
    box-shadow: none !important;
    /* Resetar variáveis de tema também para elementos internos se necessário */
    --background: transparent !important;
    --foreground: inherit !important;
    --card: transparent !important;
    --card-foreground: inherit !important;
     /* Manter bordas de cards e tabelas visíveis se desejado */
    --border: #ccc !important;
  }
  
  body.print-page-body .card-print-item,
  body.print-page-body .card-print-clean {
    /* border: 1px solid #999 !important; */
    border: none !important; /* Remove bordas dos cards */
    margin-bottom: 8px !important; /* Adiciona espaço entre seções */
    page-break-inside: avoid !important;
    background-color: transparent !important; /* Fundo transparente para cards na impressão */
  }
  
  body.print-page-body .card-print-item > *,
  body.print-page-body .card-print-clean > * {
     background-color: transparent !important; /* Conteúdo do card transparente sobre o fundo branco do card */
  }

  @media print {
    /* Oculta o header com botões na impressão */
    .print-header {
      display: none !important;
    }

    /* Oculta a instrução sobre margens durante a impressão */
    .print-instruction {
      display: none !important;
    }

    /* Configurações de página para impressão */
    @page {
      size: A4;
      margin: 0 !important; /* Remove margens da página para evitar conflitos */
    }

    html,
    body {
      color: black !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-size: 12pt !important;
    }
    
    html {
      background-color: white !important; /* Garante que a "tela" fora do body seja branca */
    }

    body { /* O body na impressão é o próprio papel A4 */
      background-image: url('/images/papeltimbrado.jpg') !important;
      background-size: cover !important; /* Mudado para cover para melhor ajuste */
      background-repeat: no-repeat !important;
      background-position: center top !important; /* Alinha papel timbrado no topo */
      background-color: white !important; /* Fundo branco para todas as páginas */
      width: 210mm !important;
      height: 297mm !important;
      min-height: 297mm !important;
      max-width: 210mm !important;
      box-sizing: border-box !important;
      page-break-before: auto;
      page-break-after: auto;
      overflow: visible !important;
    }

    .printable-content-area {
      background-color: transparent !important; /* Para o papel timbrado do body ser visível */
      color: black !important;
      padding-top: 7cm !important;    /* Margens internas ajustadas para diferentes configurações */
      padding-bottom: 4cm !important;
      padding-left: 1.5cm !important;
      padding-right: 1.5cm !important;
      width: 100% !important;
      height: auto !important; /* Altura determinada pelo fluxo do conteúdo */
      min-height: calc(297mm - 7cm - 4cm) !important; /* Garante espaço mínimo útil */
      box-sizing: border-box !important;
      overflow: visible !important; /* Permite que o conteúdo interno flua e quebre páginas */
      margin-top: 0 !important; /* Remove margem superior na impressão */
      margin-left: 0 !important;
      margin-right: 0 !important;
      margin-bottom: 0 !important;
      position: relative !important;
    }

    .printable-content-area *,
    .printable-content-area > * {
      color: black !important;
      background-color: transparent !important;
      border-color: #555 !important;
      text-shadow: none !important;
      box-shadow: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .card-print-item,
    .card-print-clean {
      border: none !important; /* Remove bordas dos cards */
      margin-bottom: 12px !important; /* Adiciona espaço entre seções */
      page-break-inside: avoid !important;
      background-color: transparent !important; /* Fundo transparente para cards na impressão */
    }
    
    .card-print-item [class*="text-gray-"],
    .card-print-clean [class*="text-gray-"] {
      color: #111 !important; 
    }

    .table-print-tight th,
    .table-print-tight td {
      padding: 3px 5px !important;
      font-size: 10pt !important;
      border: none !important; /* Remove todas as bordas padrão */
      border-bottom: 1px solid #ddd !important; /* Adiciona apenas linha inferior */
    }
    .table-print-tight th {
      font-weight: bold !important;
      border-bottom-width: 1.5px !important; /* Linha do cabeçalho mais espessa */
      border-bottom-color: #bbb !important;
    }
    .table-print-tight tr:last-child td {
      border-bottom: none !important; /* Remove borda da última linha da tabela */
    }
    .table-print-tight {
      border-collapse: collapse !important;
      border: none !important; /* Remove borda da tabela em si */
      width: 100% !important;
      margin-bottom: 8px !important;
    }

    .badge,
    span[class*="badge"] {
      border: 1px solid #333 !important;
      color: black !important;
      background-color: white !important; /* Badge com fundo branco e borda preta */
      padding: 2px 4px !important;
      font-weight: normal !important;
      display: inline-block !important;
      font-size: 9pt !important;
    }

    .lucide { color: black !important; }
    .text-green-600, .lucide.text-green-600 { color: #004000 !important; }
    .text-red-600, .lucide.text-red-600 { color: #500000 !important; }

    thead { display: table-header-group !important; }
    table, tr, td, th, .card-print-item { page-break-inside: avoid !important; }
  }

  /* Instrução visível apenas na tela (removida da impressão) */
  .print-instruction {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fffacd;
    border: 2px solid #ffa500;
    padding: 10px;
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    color: #333;
    z-index: 9999;
    display: block;
  }

  /* Estilos gerais para o conteúdo na visualização e impressão (se não sobrescrito em @media print) */
  .table-print-tight td,
  .table-print-tight th {
    padding: 3px 5px !important; 
    font-size: 0.85em !important; 
  }
  .card-print-clean { /* Já estilizado para body.print-page-body e @media print */
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

  useLayoutEffect(() => { // Usar useLayoutEffect para manipulação de DOM síncrona antes da pintura
    const originalHtmlClass = document.documentElement.className;
    const originalBodyClass = document.body.className;
    const originalHtmlStyle = document.documentElement.getAttribute('style');
    const originalBodyStyle = document.body.getAttribute('style');

    document.documentElement.className = 'print-preview-active'; // Sobrescreve todas as classes do html
    document.body.className = 'print-page-body'; // Sobrescreve todas as classes do body
    
    // Forçar reset de estilos inline que podem ter sido definidos pelo ThemeProvider ou outros
    document.documentElement.setAttribute('style', ''); 
    document.body.setAttribute('style', '');
    
    // Aplicar color-scheme diretamente para garantir
    document.documentElement.style.colorScheme = 'light';

    return () => {
      document.documentElement.className = originalHtmlClass;
      document.body.className = originalBodyClass;
      
      if (originalHtmlStyle) {
        document.documentElement.setAttribute('style', originalHtmlStyle);
      } else {
        document.documentElement.removeAttribute('style');
      }
      if (originalBodyStyle) {
        document.body.setAttribute('style', originalBodyStyle);
      } else {
        document.body.removeAttribute('style');
      }
      document.documentElement.style.removeProperty('color-scheme');
    };
  }, []);

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

  const handlePrint = () => {
    window.print();
  };

  const handleClosePage = () => {
    window.close();
  };

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
            <div key={pIndex} className="mb-2 p-1 text-xs">
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
    return <div style={{ padding: '20px', fontFamily: 'sans-serif', color: 'red', backgroundColor: 'white' }}>Erro: {error}</div>;
  }

  return (
    <>
      <style>{printStyles}</style>
      
      {/* Instrução para o usuário sobre margens - aparece apenas na impressão */}
      <div className="print-instruction">
        ⚠️ Para melhor qualidade de impressão, configure as margens como "Nenhumas" nas opções de impressão do seu navegador
      </div>
      
      {/* Header com botões - visível apenas na tela */}
      <div className="print-header">
        <Button onClick={handleClosePage} variant="outline" className="flex items-center gap-2">
          <X className="h-4 w-4" />
          Fechar página
        </Button>
        <h1 className="text-lg font-semibold">Relatório de Rastreabilidade - Lote {batchId}</h1>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div className="printable-content-area">
        {productTrace && renderPrintableProductTrace(productTrace)}
        {materialTrace && renderPrintableMaterialTrace(materialTrace)}
        {!productTrace && !materialTrace && <p>Nenhum dado de rastreabilidade para exibir.</p>}
      </div>
    </>
  );
};

export default PrintableTraceabilityPage;
