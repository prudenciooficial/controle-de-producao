import React, { useState, useEffect, useCallback } from "react";
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

  const accordionProductItems = ["materials", "sales", "related-products", "reverse-trace"];
  const accordionMaterialItems = ["productions", "related-sales-material"];

  const handlePrint = () => {
    let batchToPrint = null;
    if (productTrace) {
      batchToPrint = productTrace.productionDetails.batchNumber;
    } else if (materialTrace) {
      batchToPrint = materialTrace.materialDetails.batchNumber;
    }

    if (batchToPrint) {
      window.open(`/print/traceability/${encodeURIComponent(batchToPrint)}`, '_blank');
    } else {
      toast({
        variant: "destructive",
        title: "Nenhum Lote Carregado",
        description: "Não há dados de rastreabilidade carregados para imprimir.",
      });
    }
  };

  const fetchTraceData = useCallback(async (batchToTraceParam?: string) => {
    const currentBatchToTrace = batchToTraceParam || searchInput.trim();
    if (!currentBatchToTrace) {
      return;
    }
    setIsLoading(true);
    try {
      const batchInfo = await findRelatedBatches(currentBatchToTrace);
      if (!batchInfo.exists) {
        toast({ variant: "destructive", title: "Lote Não Encontrado", description: `O lote "${currentBatchToTrace}" não foi encontrado no sistema.` });
        setProductTrace(null);
        setMaterialTrace(null);
        setIsLoading(false); 
        return;
      }
      if (!searchHistory.includes(currentBatchToTrace)) {
        setSearchHistory(prev => [currentBatchToTrace, ...prev.slice(0, 4)]);
      }
      if (batchInfo.type === 'product') {
        const result = await traceProductBatch(currentBatchToTrace);
        if (result) setProductTrace(result);
        else setProductTrace(null);
        setMaterialTrace(null);
      } else {
        const result = await traceMaterialBatch(currentBatchToTrace);
        if (result) setMaterialTrace(result);
        else setMaterialTrace(null);
        setProductTrace(null);
      }
    } catch (error) {
      console.error("Erro na rastreabilidade:", error);
      toast({ variant: "destructive", title: "Erro na Rastreabilidade", description: "Ocorreu um erro ao buscar os dados. Verifique o console para mais detalhes." });
      setProductTrace(null);
      setMaterialTrace(null);
    } finally {
      setIsLoading(false);
    }
  }, [searchInput, toast, searchHistory, setSearchHistory, setIsLoading, setProductTrace, setMaterialTrace]);

  const handleTraceInvoked = (batchToTrace?: string) => {
    setProductTrace(null);
    setMaterialTrace(null);
    setTimeout(() => {
      fetchTraceData(batchToTrace);
    }, 0);
  };

  useEffect(() => {
    if (searchInput.trim() === "") {
      setProductTrace(null);
      setMaterialTrace(null);
      setIsLoading(false);
      return;
    }

    const timerId = setTimeout(() => {
      if (searchInput.trim()) {
        handleTraceInvoked(searchInput.trim());
      }
    }, 750);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchInput]);

  const handleButtonClick = () => {
    if (searchInput.trim()) {
      handleTraceInvoked(searchInput.trim());
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

  const productAccordionProps = { ...commonAccordionProps, type: "single" as const, defaultValue: accordionProductItems[0] };
  const materialAccordionProps = { ...commonAccordionProps, type: "single" as const, defaultValue: accordionMaterialItems[0] };

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
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
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
          <AccordionTrigger className="text-base"><div className="flex items-center gap-2"><Package className="h-4 w-4" />Insumos Utilizados ({trace.usedMaterials.length})</div></AccordionTrigger>
          <AccordionContent>
            {renderAccordionContent(
              trace.usedMaterials,
              ["Material", "Tipo", "Lote", "Qtd", "Fornecedor", "NF", "Entrada", "Validade", "Laudo"],
              (material, index) => (
                <TableRow key={material.id || index}>
                  <TableCell>{material.materialName}</TableCell>
                  <TableCell><Badge variant="outline">{material.materialType}</Badge></TableCell>
                  <TableCell>
                    <Button variant="link" className="p-0 h-auto text-xs sm:text-sm" onClick={() => handleTraceInvoked(material.batchNumber)}>{material.batchNumber}</Button>
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
          <AccordionTrigger className="text-base"><div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Vendas ({trace.sales.length})</div></AccordionTrigger>
          <AccordionContent>
            {renderAccordionContent(
              trace.sales,
              ["Produto", "Data", "Cliente", "NF", "Qtd", "Un."],
              (sale, index) => (
                <TableRow key={sale.id || index}>
                  <TableCell>{sale.productName || "-"}</TableCell>
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
          <AccordionTrigger className="text-base"><div className="flex items-center gap-2"><Package className="h-4 w-4" />Outros Produtos no Lote ({trace.relatedProducts.length})</div></AccordionTrigger>
          <AccordionContent>
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
          <AccordionTrigger className="text-base"><div className="flex items-center gap-2"><Truck className="h-4 w-4" />Rastreabilidade Reversa ({trace.reverseTraceability.length})</div></AccordionTrigger>
          <AccordionContent>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Resultado da Rastreabilidade do Insumo</h2>
        <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5" />Detalhes do Insumo</CardTitle></CardHeader>
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
          <AccordionTrigger className="text-base"><div className="flex items-center gap-2"><Factory className="h-4 w-4" />Lotes de Produção que Utilizaram ({trace.usedInProductions.length})</div></AccordionTrigger>
          <AccordionContent>
            {trace.usedInProductions.length > 0 ? trace.usedInProductions.map((prod, index) => (
              <div key={index} className="mb-4 p-2 border rounded">
                <p className="font-semibold">Lote Produção: 
                  <Button variant="link" className="p-0 h-auto text-xs sm:text-sm" onClick={() => handleTraceInvoked(prod.productionBatchNumber)}>{prod.productionBatchNumber}</Button> ({formatDate(prod.productionDate)}) - Qtd. Usada: {prod.quantityUsed} {trace.materialDetails.unitOfMeasure}
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
          <AccordionTrigger className="text-base"><div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Vendas Relacionadas (via Produção) ({trace.relatedSales.length})</div></AccordionTrigger>
          <AccordionContent>
            {renderAccordionContent(
              trace.relatedSales,
              ["Produto", "Lote Produto", "Data Venda", "Cliente", "NF Venda", "Qtd. Vendida"],
              (sale, index) => (
                <TableRow key={sale.invoiceNumber + index}>
                  <TableCell>{sale.productName}</TableCell>
                  <TableCell>
                    <Button variant="link" className="p-0 h-auto text-xs sm:text-sm" onClick={() => handleTraceInvoked(sale.productBatchNumber)}>{sale.productBatchNumber}</Button>
                  </TableCell>
                  <TableCell>{formatDate(sale.saleDate)}</TableCell>
                  <TableCell>{sale.customerName}</TableCell>
                  <TableCell>{sale.saleInvoice}</TableCell>
                  <TableCell>{sale.quantitySold}</TableCell>
                </TableRow>
              )
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center"><Search className="mr-2 h-6 w-6" />Rastreabilidade de Lotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleButtonClick()}
              placeholder="Digite o lote do produto ou insumo"
              className="flex-grow"
            />
            <Button onClick={handleButtonClick} disabled={isLoading || !searchInput.trim()}>
              {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Buscar
            </Button>
          </div>
          {searchHistory.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">Buscas recentes:</p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map(batch => (
                  <Button key={batch} variant="outline" size="sm" onClick={() => { setSearchInput(batch); handleTraceInvoked(batch); }}>{batch}</Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Carregando dados da rastreabilidade...</p>
        </div>
      )}

      {!isLoading && !productTrace && !materialTrace && searchInput.trim() && (
        <p className="text-center text-muted-foreground py-10">
          Nenhum resultado encontrado para "{searchInput.trim()}" ou a busca ainda não foi realizada.
        </p>
      )}
      
      {!isLoading && !productTrace && !materialTrace && !searchInput.trim() && (
         <p className="text-center text-muted-foreground py-10">
          Digite um lote para iniciar a rastreabilidade.
        </p>
      )}

      {productTrace && renderProductTraceability(productTrace)}
      {materialTrace && renderMaterialTraceability(materialTrace)}
    </div>
  );
};

export default Traceability;
