
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Package, Truck, ShoppingCart, Factory, AlertTriangle, CheckCircle } from "lucide-react";
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

  const handleTrace = async (batchNumber?: string) => {
    const batchToTrace = batchNumber || searchInput.trim();
    
    if (!batchToTrace) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, insira um número de lote para rastrear.",
      });
      return;
    }

    setIsLoading(true);
    setProductTrace(null);
    setMaterialTrace(null);

    try {
      // First, determine what type of batch this is
      const batchInfo = await findRelatedBatches(batchToTrace);
      
      if (!batchInfo.exists) {
        toast({
          variant: "destructive",
          title: "Lote não encontrado",
          description: `O lote "${batchToTrace}" não foi encontrado no sistema.`,
        });
        return;
      }

      // Add to search history if not already there
      if (!searchHistory.includes(batchToTrace)) {
        setSearchHistory(prev => [batchToTrace, ...prev.slice(0, 4)]);
      }

      if (batchInfo.type === 'product') {
        const result = await traceProductBatch(batchToTrace);
        if (result) {
          setProductTrace(result);
          toast({
            title: "Rastreabilidade concluída",
            description: `Dados do lote de produto "${batchToTrace}" carregados com sucesso.`,
          });
        }
      } else {
        const result = await traceMaterialBatch(batchToTrace);
        if (result) {
          setMaterialTrace(result);
          toast({
            title: "Rastreabilidade concluída",
            description: `Dados do lote de material "${batchToTrace}" carregados com sucesso.`,
          });
        }
      }
    } catch (error) {
      console.error("Erro na rastreabilidade:", error);
      toast({
        variant: "destructive",
        title: "Erro na rastreabilidade",
        description: "Ocorreu um erro ao buscar os dados de rastreabilidade.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const renderProductTraceability = (trace: ProductTraceability) => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Detalhes da Produção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Lote de Produção:</strong> {trace.productionDetails.batchNumber}</p>
              <p><strong>Data de Produção:</strong> {formatDate(trace.productionDetails.productionDate)}</p>
            </div>
            <div>
              <p><strong>Dia da Mexida:</strong> {trace.productionDetails.mixDay}</p>
              <p><strong>Quantidade de Mexidas:</strong> {trace.productionDetails.mixCount}</p>
            </div>
            {trace.productionDetails.notes && (
              <div className="col-span-full">
                <p><strong>Observações:</strong> {trace.productionDetails.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="materials">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Insumos Utilizados ({trace.usedMaterials.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Nota Fiscal</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Laudo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trace.usedMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell>{material.materialName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{material.materialType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto"
                        onClick={() => handleTrace(material.batchNumber)}
                      >
                        {material.batchNumber}
                      </Button>
                    </TableCell>
                    <TableCell>{material.quantity} {material.unitOfMeasure}</TableCell>
                    <TableCell>{material.supplier?.name || "-"}</TableCell>
                    <TableCell>{material.supplier?.invoiceNumber || "-"}</TableCell>
                    <TableCell>
                      {material.expiryDate ? formatDate(material.expiryDate) : "-"}
                    </TableCell>
                    <TableCell>
                      {material.hasReport ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Não
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sales">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Vendas deste Lote ({trace.sales.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {trace.sales.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nota Fiscal</TableHead>
                    <TableHead>Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trace.sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{formatDate(sale.date)}</TableCell>
                      <TableCell>{sale.customerName}</TableCell>
                      <TableCell>{sale.invoiceNumber}</TableCell>
                      <TableCell>{sale.quantity} {sale.unitOfMeasure}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Nenhuma venda registrada para este lote.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {trace.relatedProducts.length > 0 && (
          <AccordionItem value="related-products">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Outros Produtos do Mesmo Lote de Produção ({trace.relatedProducts.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trace.relatedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.productName}</TableCell>
                      <TableCell>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto"
                          onClick={() => handleTrace(product.batchNumber)}
                        >
                          {product.batchNumber}
                        </Button>
                      </TableCell>
                      <TableCell>{product.quantity} {product.unitOfMeasure}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        )}

        {trace.reverseTraceability.length > 0 && (
          <AccordionItem value="reverse-trace">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Rastreabilidade Reversa ({trace.reverseTraceability.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {trace.reverseTraceability.map((reverse, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Produção: {reverse.productionBatchNumber} - {formatDate(reverse.productionDate)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Quantidade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reverse.producedItems.map((item, itemIndex) => (
                            <TableRow key={itemIndex}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="link" 
                                  className="p-0 h-auto"
                                  onClick={() => handleTrace(item.batchNumber)}
                                >
                                  {item.batchNumber}
                                </Button>
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );

  const renderMaterialTraceability = (trace: MaterialTraceability) => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalhes do Lote de Material
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Material:</strong> {trace.materialDetails.materialName}</p>
              <p><strong>Tipo:</strong> <Badge variant="outline">{trace.materialDetails.materialType}</Badge></p>
              <p><strong>Lote:</strong> {trace.materialDetails.batchNumber}</p>
            </div>
            <div>
              <p><strong>Quantidade Fornecida:</strong> {trace.materialDetails.suppliedQuantity} {trace.materialDetails.unitOfMeasure}</p>
              <p><strong>Quantidade Restante:</strong> {trace.materialDetails.remainingQuantity} {trace.materialDetails.unitOfMeasure}</p>
              <p><strong>Validade:</strong> {trace.materialDetails.expiryDate ? formatDate(trace.materialDetails.expiryDate) : "-"}</p>
            </div>
            {trace.materialDetails.supplier && (
              <div className="col-span-full">
                <p><strong>Fornecedor:</strong> {trace.materialDetails.supplier.name}</p>
                <p><strong>Nota Fiscal:</strong> {trace.materialDetails.supplier.invoiceNumber}</p>
                <p><strong>Data do Pedido:</strong> {formatDate(trace.materialDetails.supplier.orderDate)}</p>
              </div>
            )}
            <div>
              <p><strong>Laudo:</strong> {trace.materialDetails.hasReport ? (
                <Badge variant="secondary" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Disponível
                </Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Não disponível
                </Badge>
              )}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="productions">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Produções que Utilizaram este Material ({trace.usedInProductions.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {trace.usedInProductions.map((production, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Produção: {production.productionBatchNumber}</span>
                      <span className="text-muted-foreground">{formatDate(production.productionDate)}</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Quantidade utilizada: {production.quantityUsed}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead>Quantidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {production.producedItems.map((item, itemIndex) => (
                          <TableRow key={itemIndex}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>
                              <Button 
                                variant="link" 
                                className="p-0 h-auto"
                                onClick={() => handleTrace(item.batchNumber)}
                              >
                                {item.batchNumber}
                              </Button>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {trace.relatedSales.length > 0 && (
          <AccordionItem value="related-sales">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Vendas dos Produtos que Utilizaram este Material ({trace.relatedSales.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Lote do Produto</TableHead>
                    <TableHead>Data da Venda</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nota Fiscal</TableHead>
                    <TableHead>Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trace.relatedSales.map((sale, index) => (
                    <TableRow key={index}>
                      <TableCell>{sale.productName}</TableCell>
                      <TableCell>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto"
                          onClick={() => handleTrace(sale.productBatchNumber)}
                        >
                          {sale.productBatchNumber}
                        </Button>
                      </TableCell>
                      <TableCell>{formatDate(sale.saleDate)}</TableCell>
                      <TableCell>{sale.customerName}</TableCell>
                      <TableCell>{sale.invoiceNumber}</TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Rastreabilidade</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Lote
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Digite o número do lote (produto final ou matéria-prima)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTrace()}
              />
            </div>
            <Button onClick={() => handleTrace()} disabled={isLoading}>
              {isLoading ? "Buscando..." : "Rastrear Lote"}
            </Button>
          </div>
          
          {searchHistory.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Histórico de buscas:</p>
              <div className="flex gap-2 flex-wrap">
                {searchHistory.map((batch, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTrace(batch)}
                  >
                    {batch}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {productTrace && renderProductTraceability(productTrace)}
      {materialTrace && renderMaterialTraceability(materialTrace)}

      {!productTrace && !materialTrace && !isLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Digite um número de lote para iniciar a rastreabilidade.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Traceability;
