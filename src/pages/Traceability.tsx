import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Package, Truck, ShoppingCart, Factory, AlertTriangle, CheckCircle, Printer, Loader, ArrowLeft, Clock, FileText } from "lucide-react";
import { traceProductBatch, traceMaterialBatch, findRelatedBatches, ProductTraceability, MaterialTraceability } from "@/services/traceabilityService";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const Traceability = () => {
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [productTrace, setProductTrace] = useState<ProductTraceability | null>(null);
  const [materialTrace, setMaterialTrace] = useState<MaterialTraceability | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
        toast({ 
          variant: "destructive", 
          title: "Lote Não Encontrado", 
          description: `O lote "${currentBatchToTrace}" não foi encontrado no sistema.` 
        });
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
      toast({ 
        variant: "destructive", 
        title: "Erro na Rastreabilidade", 
        description: "Ocorreu um erro ao buscar os dados. Verifique o console para mais detalhes." 
      });
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
              {headers.map(header => <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>)}
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Rastreabilidade do Produto
        </h2>
        <Button 
          onClick={handlePrint} 
          variant="outline" 
          size={isMobile ? "sm" : "default"}
          className="w-full sm:w-auto"
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Factory className="h-4 md:h-5 w-4 md:w-5" />
            Detalhes da Produção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Lote de Produção</p>
              <p className="font-bold text-green-600">{trace.productionDetails.batchNumber}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Data de Produção</p>
              <p className="font-semibold">{formatDate(trace.productionDetails.productionDate)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Dia da Mexida</p>
              <p className="font-semibold">{trace.productionDetails.mixDay}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Qtd. de Mexidas</p>
              <p className="font-semibold">{trace.productionDetails.mixCount}</p>
            </div>
            {trace.productionDetails.notes && (
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="font-medium text-muted-foreground">Observações</p>
                <div className="mt-1 p-3 bg-muted rounded text-sm">
                  <span className="whitespace-pre-wrap">{trace.productionDetails.notes}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Accordion {...productAccordionProps}>
        <AccordionItem value="materials">
          <AccordionTrigger className="text-base hover:no-underline">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Insumos Utilizados ({trace.usedMaterials.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {renderAccordionContent(
              trace.usedMaterials,
              ["Material", "Tipo", "Lote", "Qtd", "Fornecedor", "NF", "Entrada", "Validade", "Laudo"],
              (material, index) => (
                <TableRow key={material.id || index}>
                  <TableCell className="font-medium">{material.materialName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{material.materialType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800" 
                      onClick={() => handleTraceInvoked(material.batchNumber)}
                    >
                      {material.batchNumber}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{material.quantity} {material.unitOfMeasure}</TableCell>
                  <TableCell>{material.supplier?.name || "-"}</TableCell>
                  <TableCell>{material.supplier?.invoiceNumber || "-"}</TableCell>
                  <TableCell>{formatDate(material.supplier?.orderDate)}</TableCell>
                  <TableCell>{formatDate(material.expiryDate)}</TableCell>
                  <TableCell>
                    {material.hasReport ? (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" /> 
                        Sim
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs flex items-center gap-1 w-fit">
                        <AlertTriangle className="h-3 w-3" /> 
                        Não
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sales">
          <AccordionTrigger className="text-base hover:no-underline">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Vendas ({trace.sales.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {renderAccordionContent(
              trace.sales,
              ["Produto", "Data", "Cliente", "NF", "Qtd", "Un."],
              (sale, index) => (
                <TableRow key={sale.id || index}>
                  <TableCell className="font-medium">{sale.productName || "-"}</TableCell>
                  <TableCell>{formatDate(sale.date)}</TableCell>
                  <TableCell>{sale.customerName}</TableCell>
                  <TableCell>{sale.invoiceNumber}</TableCell>
                  <TableCell className="font-medium">{sale.quantity}</TableCell>
                  <TableCell>{sale.unitOfMeasure}</TableCell>
                </TableRow>
              )
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="related-products">
          <AccordionTrigger className="text-base hover:no-underline">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos Relacionados ({trace.relatedProducts.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {renderAccordionContent(
              trace.relatedProducts,
              ["Produto", "Lote", "Quantidade", "Un."],
              (product, index) => (
                <TableRow key={product.id || index}>
                  <TableCell className="font-medium">{product.productName}</TableCell>
                  <TableCell>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800" 
                      onClick={() => handleTraceInvoked(product.batchNumber)}
                    >
                      {product.batchNumber}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{product.quantity}</TableCell>
                  <TableCell>{product.unitOfMeasure}</TableCell>
                </TableRow>
              )
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="reverse-trace">
          <AccordionTrigger className="text-base hover:no-underline">
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Rastreabilidade Reversa ({trace.reverseTraceability.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {trace.reverseTraceability.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma rastreabilidade reversa encontrada.</p>
              ) : (
                trace.reverseTraceability.map((reverseTrace, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                          Produção: {reverseTrace.productionBatchNumber}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {formatDate(reverseTrace.productionDate)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {reverseTrace.producedItems.map((item, itemIndex) => (
                          <div key={itemIndex} className="p-2 bg-muted/50 rounded text-xs">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-muted-foreground">
                              Lote: {item.batchNumber} | {item.quantity} kg
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  const renderMaterialTraceability = (trace: MaterialTraceability) => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Rastreabilidade do Material
        </h2>
        <Button 
          onClick={handlePrint} 
          variant="outline"
          size={isMobile ? "sm" : "default"}
          className="w-full sm:w-auto"
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Package className="h-4 md:h-5 w-4 md:w-5" />
            Detalhes do Material
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Material</p>
              <p className="font-bold text-blue-600">{trace.materialDetails.materialName}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Tipo</p>
              <Badge variant="outline">{trace.materialDetails.materialType}</Badge>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Lote</p>
              <p className="font-semibold">{trace.materialDetails.batchNumber}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Quantidade Fornecida</p>
              <p className="font-semibold">{trace.materialDetails.suppliedQuantity} {trace.materialDetails.unitOfMeasure}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Restante</p>
              <p className="font-semibold text-green-600">{trace.materialDetails.remainingQuantity} {trace.materialDetails.unitOfMeasure}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Validade</p>
              <p className="font-semibold">{formatDate(trace.materialDetails.expiryDate)}</p>
            </div>
            {trace.materialDetails.supplier && (
              <>
                <div>
                  <p className="font-medium text-muted-foreground">Fornecedor</p>
                  <p className="font-semibold">{trace.materialDetails.supplier.name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">NF</p>
                  <p className="font-semibold">{trace.materialDetails.supplier.invoiceNumber}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Data Pedido</p>
                  <p className="font-semibold">{formatDate(trace.materialDetails.supplier.orderDate)}</p>
                </div>
              </>
            )}
            <div>
              <p className="font-medium text-muted-foreground">Laudo</p>
              {trace.materialDetails.hasReport ? (
                <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
                  <CheckCircle className="h-3 w-3" /> 
                  Disponível
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs flex items-center gap-1 w-fit">
                  <AlertTriangle className="h-3 w-3" /> 
                  Não Disponível
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion {...materialAccordionProps}>
        <AccordionItem value="productions">
          <AccordionTrigger className="text-base hover:no-underline">
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Utilizado em Produções ({trace.usedInProductions.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {trace.usedInProductions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Este material ainda não foi utilizado em nenhuma produção.</p>
              ) : (
                trace.usedInProductions.map((production, index) => (
                  <Card key={index} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <CardTitle className="text-sm font-semibold">
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-sm font-semibold text-green-600 hover:text-green-800" 
                            onClick={() => handleTraceInvoked(production.productionBatchNumber)}
                          >
                            Produção: {production.productionBatchNumber}
                          </Button>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {formatDate(production.productionDate)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {production.quantityUsed} kg utilizados
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {production.producedItems.map((item, itemIndex) => (
                          <div key={itemIndex} className="p-2 bg-muted/50 rounded text-xs">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-muted-foreground">
                              Lote: {item.batchNumber} | {item.quantity} kg
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="related-sales-material">
          <AccordionTrigger className="text-base hover:no-underline">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Vendas Relacionadas ({trace.relatedSales.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {renderAccordionContent(
              trace.relatedSales,
              ["Produto", "Lote Produto", "Data Venda", "Cliente", "NF", "Qtd"],
              (sale, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{sale.productName}</TableCell>
                  <TableCell>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800" 
                      onClick={() => handleTraceInvoked(sale.productBatchNumber)}
                    >
                      {sale.productBatchNumber}
                    </Button>
                  </TableCell>
                  <TableCell>{formatDate(sale.saleDate)}</TableCell>
                  <TableCell>{sale.customerName}</TableCell>
                  <TableCell>{sale.invoiceNumber}</TableCell>
                  <TableCell className="font-medium">{sale.quantity} kg</TableCell>
                </TableRow>
              )
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)} 
              className="hover:bg-blue-50 dark:hover:bg-blue-900/20 flex-shrink-0"
              size={isMobile ? "sm" : "default"}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent truncate">
                Rastreabilidade
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Rastreie a origem e destino de produtos e materiais
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Search className="h-4 md:h-5 w-4 md:w-5" />
              Buscar Rastreabilidade
            </CardTitle>
            <CardDescription className="text-sm">
              Digite o número do lote de produto ou material para rastrear
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Ex: PROD-2024-001, FEC-2024-001..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button 
                onClick={handleButtonClick} 
                disabled={isLoading || !searchInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                size={isMobile ? "sm" : "default"}
              >
                {isLoading ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Rastrear
              </Button>
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Buscas Recentes:</p>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((item, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchInput(item)}
                      className="text-xs"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="py-8">
          <CardContent className="text-center">
            <Loader className="h-8 w-8 mx-auto animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-semibold mb-2">Buscando dados...</p>
            <p className="text-muted-foreground">
              Processando rastreabilidade para o lote "{searchInput}"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!isLoading && (productTrace || materialTrace) && (
        <>
          {productTrace && renderProductTraceability(productTrace)}
          {materialTrace && renderMaterialTraceability(materialTrace)}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !productTrace && !materialTrace && searchInput.trim() === "" && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">Rastreabilidade de Produtos e Materiais</p>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Digite o número de um lote de produto ou material na barra de busca acima para iniciar a rastreabilidade.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto text-sm">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                <Package className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="font-medium">Produtos</p>
                <p className="text-muted-foreground">Ex: PROD-2024-001</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <FileText className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="font-medium">Materiais</p>
                <p className="text-muted-foreground">Ex: FEC-2024-001</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Traceability;
