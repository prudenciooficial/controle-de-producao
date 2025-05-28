import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Package, Truck, ShoppingCart, Factory, AlertTriangle, CheckCircle, Printer, Loader } from "lucide-react";
import { traceProductBatch, traceMaterialBatch, findRelatedBatches, ProductTraceability, MaterialTraceability } from "@/services/traceabilityService";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Traceability = () => {
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [productTrace, setProductTrace] = useState<ProductTraceability | null>(null);
  const [materialTrace, setMaterialTrace] = useState<MaterialTraceability | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);

  const accordionProductItems = ["materials", "sales", "related-products", "reverse-trace"];
  const accordionMaterialItems = ["productions", "related-sales-material"];

  useEffect(() => {
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => window.print(), 100);
  };

  const handleTrace = async (batchToTraceParam?: string) => {
    const currentBatchToTrace = batchToTraceParam || searchInput.trim();
    if (!currentBatchToTrace) {
      toast({ variant: "destructive", title: "Entrada Inválida", description: "Por favor, insira um número de lote para rastrear." });
      return;
    }
    setIsLoading(true);
    setProductTrace(null);
    setMaterialTrace(null);
    try {
      const batchInfo = await findRelatedBatches(currentBatchToTrace);
      if (!batchInfo.exists) {
        toast({ variant: "destructive", title: "Lote Não Encontrado", description: `O lote "${currentBatchToTrace}" não foi encontrado no sistema.` });
        setIsLoading(false); 
        return;
      }
      if (!searchHistory.includes(currentBatchToTrace)) {
        setSearchHistory(prev => [currentBatchToTrace, ...prev.slice(0, 4)]);
      }
      if (batchInfo.type === 'product') {
        const result = await traceProductBatch(currentBatchToTrace);
        if (result) setProductTrace(result);
      } else {
        const result = await traceMaterialBatch(currentBatchToTrace);
        if (result) setMaterialTrace(result);
      }
    } catch (error) {
      console.error("Erro na rastreabilidade:", error);
      toast({ variant: "destructive", title: "Erro na Rastreabilidade", description: "Ocorreu um erro ao buscar os dados. Verifique o console para mais detalhes." });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      console.error("Erro ao formatar data:", date, e);
      return "Data inválida";
    }
  };
  
  const commonAccordionProps = {
    collapsible: true,
    className: "w-full",
  };

  const productAccordionProps = isPrinting
      ? { ...commonAccordionProps, type: "multiple" as const, value: accordionProductItems } 
      : { ...commonAccordionProps, type: "single" as const, value: undefined };

  const materialAccordionProps = isPrinting
      ? { ...commonAccordionProps, type: "multiple" as const, value: accordionMaterialItems }
      : { ...commonAccordionProps, type: "single" as const, value: undefined };

  const renderAccordionContent = (items: any[], headers: string[], renderRow: (item: any, index: number) => JSX.Element) => {
    if (!items || items.length === 0) {
      return <p className="px-4 py-2 text-sm text-muted-foreground">Nenhum dado encontrado.</p>;
    }
    return (
      <div className="overflow-x-auto">
        <Table className="text-xs sm:text-sm">
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

  const renderProductTraceability = (trace: ProductTraceability) => (
    <div className="space-y-6 printable-content">
      <div className="flex justify-between items-center no-print mb-4">
        <h2 className="text-xl font-semibold">Resultado da Rastreabilidade do Produto</h2>
        <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Factory className="h-5 w-5" />Detalhes da Produção</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><p><strong>Lote de Produção:</strong> {trace.productionDetails.batchNumber}</p></div>
            <div><p><strong>Data de Produção:</strong> {formatDate(trace.productionDetails.productionDate)}</p></div>
            <div><p><strong>Dia da Mexida:</strong> {trace.productionDetails.mixDay}</p></div>
            <div><p><strong>Qtd. de Mexidas:</strong> {trace.productionDetails.mixCount}</p></div>
            {trace.productionDetails.notes && <div className="md:col-span-2"><p><strong>Observações:</strong> <span className="whitespace-pre-wrap">{trace.productionDetails.notes}</span></p></div>}
        </div></CardContent>
      </Card>
      <Accordion {...productAccordionProps}>
        <AccordionItem value="materials">
          <AccordionTrigger className="accordion-trigger-print text-base"><div className="flex items-center gap-2"><Package className="h-4 w-4" />Insumos Utilizados ({trace.usedMaterials.length})</div></AccordionTrigger>
          <AccordionContent className="accordion-content-print">
            {renderAccordionContent(
              trace.usedMaterials,
              ["Material", "Tipo", "Lote", "Qtd", "Fornecedor", "NF", "Entrada", "Validade", "Laudo"],
              (material, index) => (
                <TableRow key={material.id || index}>
                  <TableCell>{material.materialName}</TableCell>
                  <TableCell><Badge variant="outline">{material.materialType}</Badge></TableCell>
                  <TableCell>
                    <Button variant="link" className="p-0 h-auto no-print text-xs sm:text-sm" onClick={() => handleTrace(material.batchNumber)}>{material.batchNumber}</Button>
                    <span className="print-only">{material.batchNumber}</span>
                  </TableCell>
                  <TableCell>{material.quantity} {material.unitOfMeasure}</TableCell>
                  <TableCell>{material.supplier?.name || "-"}</TableCell>
                  <TableCell>{material.supplier?.invoiceNumber || "-"}</TableCell>
                  <TableCell>{formatDate(material.supplier?.orderDate)}</TableCell>
                  <TableCell>{formatDate(material.expiryDate)}</TableCell>
                  <TableCell>{material.hasReport ? <Badge variant="secondary" className="text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Sim</Badge> : <Badge variant="destructive" className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Não</Badge>}</TableCell>
                </TableRow>
              )
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="sales">
          <AccordionTrigger className="accordion-trigger-print text-base"><div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Vendas ({trace.sales.length})</div></AccordionTrigger>
          <AccordionContent className="accordion-content-print">
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
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="related-products">
          <AccordionTrigger className="accordion-trigger-print text-base"><div className="flex items-center gap-2"><Package className="h-4 w-4" />Outros Produtos no Lote ({trace.relatedProducts.length})</div></AccordionTrigger>
          <AccordionContent className="accordion-content-print">
            {renderAccordionContent(
              trace.relatedProducts,
              ["Produto", "Lote do Item", "Qtd", "Un."],
              (prod, index) => (
                <TableRow key={prod.id || index}>
                  <TableCell>{prod.productName}</TableCell>
                  <TableCell>{prod.batchNumber}</TableCell>
                  <TableCell>{prod.quantity}</TableCell>
                  <TableCell>{prod.unitOfMeasure}</TableCell>
                </TableRow>
              )
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="reverse-trace">
          <AccordionTrigger className="accordion-trigger-print text-base"><div className="flex items-center gap-2"><Truck className="h-4 w-4" />Rastreabilidade Reversa ({trace.reverseTraceability.length})</div></AccordionTrigger>
          <AccordionContent className="accordion-content-print">
            {trace.reverseTraceability.length > 0 ? trace.reverseTraceability.map((reverseProd, pIndex) => (
              <div key={pIndex} className="mb-4 p-2 border rounded">
                <p className="font-semibold">Produção: Lote {reverseProd.productionBatchNumber} ({formatDate(reverseProd.productionDate)})</p>
                {renderAccordionContent(
                  reverseProd.producedItems,
                  ["Produto", "Lote do Item", "Qtd"],
                  (item, iIndex) => (
                    <TableRow key={item.batchNumber || iIndex}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.batchNumber}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                    </TableRow>
                  )
                )}
              </div>
            )) : <p className="px-4 py-2 text-sm text-muted-foreground">Nenhuma outra produção encontrada.</p>}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  const renderMaterialTraceability = (trace: MaterialTraceability) => (
    <div className="space-y-6 printable-content">
       <div className="flex justify-between items-center no-print mb-4">
        <h2 className="text-xl font-semibold">Resultado da Rastreabilidade do Material</h2>
        <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5" />Detalhes do Lote de Material</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><p><strong>Material:</strong> {trace.materialDetails.materialName}</p></div>
            <div><p><strong>Tipo:</strong> <Badge variant="outline">{trace.materialDetails.materialType}</Badge></p></div>
            <div><p><strong>Lote:</strong> {trace.materialDetails.batchNumber}</p></div>
            <div><p><strong>Fornecedor:</strong> {trace.materialDetails.supplier?.name || "-"}</p></div>
            <div><p><strong>NF:</strong> {trace.materialDetails.supplier?.invoiceNumber || "-"}</p></div>
            <div><p><strong>Entrada:</strong> {formatDate(trace.materialDetails.supplier?.orderDate)}</p></div>
            <div><p><strong>Validade:</strong> {formatDate(trace.materialDetails.expiryDate)}</p></div>
            <div><p><strong>Qtd. Fornecida:</strong> {trace.materialDetails.suppliedQuantity} {trace.materialDetails.unitOfMeasure}</p></div>
            <div><p><strong>Qtd. Restante:</strong> {trace.materialDetails.remainingQuantity} {trace.materialDetails.unitOfMeasure}</p></div>
            <div><p><strong>Laudo:</strong> {trace.materialDetails.hasReport ? <Badge variant="secondary" className="text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Sim</Badge> : <Badge variant="destructive" className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Não</Badge>}</p></div>
        </div></CardContent>
      </Card>
      <Accordion {...materialAccordionProps}>
        <AccordionItem value="productions">
          <AccordionTrigger className="accordion-trigger-print text-base"><div className="flex items-center gap-2"><Factory className="h-4 w-4" />Utilizado nas Produções ({trace.usedInProductions.length})</div></AccordionTrigger>
          <AccordionContent className="accordion-content-print">
            {trace.usedInProductions.length > 0 ? trace.usedInProductions.map((prod, index) => (
              <div key={index} className="mb-4 p-2 border rounded">
                <p className="font-semibold">Lote Produção: 
                  <Button variant="link" className="p-0 h-auto no-print text-xs sm:text-sm" onClick={() => handleTrace(prod.productionBatchNumber)}>{prod.productionBatchNumber}</Button>
                  <span className="print-only">{prod.productionBatchNumber}</span> ({formatDate(prod.productionDate)}) - Qtd. Usada: {prod.quantityUsed}
                </p>
                {renderAccordionContent(
                  prod.producedItems,
                  ["Produto", "Lote do Item", "Qtd"],
                   (item, iIndex) => (
                    <TableRow key={item.batchNumber || iIndex}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.batchNumber}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                    </TableRow>
                  )
                )}
              </div>
            )) : <p className="px-4 py-2 text-sm text-muted-foreground">Não utilizado em produções.</p>}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="related-sales-material">
          <AccordionTrigger className="accordion-trigger-print text-base"><div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Vendas de Produtos Relacionados ({trace.relatedSales.length})</div></AccordionTrigger>
          <AccordionContent className="accordion-content-print">
            {renderAccordionContent(
              trace.relatedSales,
              ["Produto", "Lote Produto", "Data Venda", "Cliente", "NF", "Qtd"],
              (sale, index) => (
                <TableRow key={sale.invoiceNumber + index}>
                  <TableCell>{sale.productName}</TableCell>
                  <TableCell>
                    <Button variant="link" className="p-0 h-auto no-print text-xs sm:text-sm" onClick={() => handleTrace(sale.productBatchNumber)}>{sale.productBatchNumber}</Button>
                    <span className="print-only">{sale.productBatchNumber}</span>
                  </TableCell>
                  <TableCell>{formatDate(sale.saleDate)}</TableCell>
                  <TableCell>{sale.customerName}</TableCell>
                  <TableCell>{sale.invoiceNumber}</TableCell>
                  <TableCell>{sale.quantity}</TableCell>
                </TableRow>
              )
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

 return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <Card className="mb-6 no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rastrear Lote
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Input
            type="text"
            placeholder="Digite o número do lote (produto ou material)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-grow"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleTrace(searchInput);
              }
            }}
          />
          <Button onClick={() => handleTrace(searchInput)} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <><Loader className="mr-2 h-4 w-4 animate-spin" /> Rastreando...</>
            ) : (
              <><Search className="mr-2 h-4 w-4" /> Rastrear</>
            )}
          </Button>
        </CardContent>
      </Card>

      {searchHistory.length > 0 && (
        <div className="mb-6 no-print">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Buscas recentes:</h3>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((term, index) => (
              <Button key={index} variant="outline" size="sm" onClick={() => { setSearchInput(term); handleTrace(term); }}>
                {term}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Loader className="h-10 w-10 animate-spin mb-3" />
          <p>Rastreando lote, por favor aguarde...</p>
        </div>
      )}

      {!isLoading && productTrace && renderProductTraceability(productTrace)}
      {!isLoading && materialTrace && renderMaterialTraceability(materialTrace)}
      
      {!isLoading && !productTrace && !materialTrace && searchInput && (
         <div className="text-center py-10">
            <p className="text-muted-foreground">Nenhum resultado encontrado para "{searchInput}". Verifique o lote e tente novamente.</p>
         </div>
      )}
       {!isLoading && !productTrace && !materialTrace && !searchInput && (
         <div className="text-center py-10">
            <p className="text-muted-foreground">Digite um número de lote para iniciar a rastreabilidade.</p>
         </div>
      )}
    </div>
  );
};

export default Traceability;
