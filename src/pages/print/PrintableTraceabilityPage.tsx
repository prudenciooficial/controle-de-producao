import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { traceProductBatch, traceMaterialBatch, findRelatedBatches, ProductTraceability, MaterialTraceability } from '@/services/traceabilityService';
import { useToast } from '@/hooks/use-toast';
import { format as formatDateFn } from 'date-fns'; // Renomeado para evitar conflito
import { ptBR } from 'date-fns/locale';
import { Loader, Printer, X } from 'lucide-react'; // Printer e X para botões fora do PDF
import { Button } from "@/components/ui/button";

// Importações do @react-pdf/renderer
import { Document, Page, Text, View, StyleSheet, Image, Font, PDFViewer } from '@react-pdf/renderer';

// Registrar fontes (opcional, mas bom para consistência)
// Exemplo: Font.register({ family: 'Roboto', src: '/fonts/Roboto-Regular.ttf' });
// Certifique-se de que o arquivo de fonte exista na pasta public/fonts ou similar.
// Por enquanto, usaremos fontes padrão.

// Estilos para o PDF usando StyleSheet do @react-pdf/renderer
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  fixedHeaderSpacer: { // Novo estilo para o espaçador do cabeçalho
    height: '6.5cm',
    width: '100%',
    // fixed: true, // fixed será aplicado inline para este componente específico
  },
  backgroundImage: {
    position: 'absolute',
    minWidth: '100%',
    minHeight: '100%',
    height: '100%',
    width: '100%',
    zIndex: -1, // Para ficar no fundo
    fixed: true, // Crucial para que a imagem ignore os paddings da Page
  },
  contentWrapper: {
    paddingTop: '0.1cm',
    paddingBottom: '2.5cm', // Restaurado para 2.5cm (ou podemos tentar 3cm)
    paddingHorizontal: '2.3cm',
  },
  section: {
    marginBottom: 10,
    fontSize: 10, // Tamanho de fonte base para o conteúdo do PDF
  },
  headerText: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: 'bold',
    // fontFamily: 'Roboto', // Se registrou a fonte
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  detailLabel: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  detailValue: { flex: 1 },

  // ESTILOS PARA TABELA
  table: {
    width: '100%',
    marginTop: 8,
    borderStyle: 'solid',
    borderWidth: 0.5,
    borderColor: '#bfbfbf', // Cinza mais claro para bordas da tabela
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomStyle: 'solid',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0', // Fundo para cabeçalho
    borderBottomStyle: 'solid',
    borderBottomWidth: 0.5,
    borderBottomColor: '#333333',
  },
  tableCol: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightStyle: 'solid',
    borderRightWidth: 0.5,
    borderRightColor: '#cccccc',
  },
  // Larguras de coluna para tabela de matérias-primas (AJUSTADO)
  colMaterialName: { width: '15%' },      // Insumo
  colMaterialType: { width: '10%' },       // Tipo
  colMaterialBatch: { width: '12%' },      // Lote Insumo (ajustado)
  colMaterialQty: { width: '10%' },        // Qtd. Usada
  colMaterialSupplier: { width: '12%' },  // Fornecedor (ajustado)
  colMaterialInvoice: { width: '10%' },    // NF
  colMaterialEntryDate: { width: '10%' },   // Entrada
  colMaterialExpiryDate: { width: '10%' },  // Validade
  colMaterialReport: { width: '6%' },       // Laudo (ajustado)

  // Larguras de coluna para tabela de Testes de Qualidade
  colTestName: { width: '30%' },
  colTestResult: { width: '25%' },
  colTestDate: { width: '25%' },
  colTestResponsible: { width: '20%' },

  // Larguras de coluna para tabela de Vendas (AJUSTADO)
  colSalesProduct: { width: '30%' },      // Produto Vendido
  colSalesCustomer: { width: '25%' },   // Cliente
  colSalesInvoice: { width: '15%' },    // Nota Fiscal (ajustado)
  colSalesDate: { width: '15%' },      // Data (ajustado)
  colSalesQty: { width: '15%' },        // Qtd. Vendida (ajustado)

  // Larguras de coluna para tabela de Produções Utilizadas (materialTrace)
  colProdUsedProductName: { width: '40%' },
  colProdUsedBatch: { width: '30%' },
  colProdUsedDate: { width: '30%' },

  // Novas larguras para sub-tabela de Itens Produzidos (dentro de usedInProductions)
  colNestedItemName: { width: '50%' },
  colNestedItemBatch: { width: '30%' },
  colNestedItemQty: { width: '20%' },

  // Larguras de coluna para tabela de Outros Produtos no Lote (productTrace.relatedProducts)
  colRelatedProdName: { width: '40%' },
  colRelatedProdBatch: { width: '30%' },
  colRelatedProdQty: { width: '15%' },
  colRelatedProdUnit: { width: '15%' },

  tableCell: {
    fontSize: 8,
    // fontFamily: 'Roboto', // Mantenha comentado se não estiver usando
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    // fontFamily: 'Roboto',
  },
  lastTableCol: { // Para remover a borda direita da última coluna na linha
    borderRightWidth: 0,
  },
  // Adicione mais estilos conforme necessário para tabelas, badges, etc.
});

// Componente que define a estrutura do seu PDF
interface MyDocumentProps {
  productTrace: ProductTraceability | null;
  materialTrace: MaterialTraceability | null;
  formatDate: (date: Date | string | undefined) => string;
}

const MyDocument: React.FC<MyDocumentProps> = ({ productTrace, materialTrace, formatDate }) => (
  <Document title={`Relatório de Rastreabilidade - Lote ${productTrace?.productionDetails?.batchNumber || materialTrace?.materialDetails?.batchNumber || ''}`}>
    <Page size="A4" style={styles.page}>
      <Image src="/images/papeltimbrado.jpg" style={styles.backgroundImage} fixed={true} />
      {/* Espaçador Fixo para o Cabeçalho */}
      <View style={styles.fixedHeaderSpacer} fixed={true} /> 

      <View style={styles.contentWrapper}>
        {productTrace && (
          <>
            <View style={styles.section}>
              <Text style={styles.headerText}>Detalhes da Produção</Text>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Lote:</Text>
                <Text style={styles.detailValue}>{productTrace.productionDetails.batchNumber}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Data Prod.:</Text>
                <Text style={styles.detailValue}>{formatDate(productTrace.productionDetails.productionDate)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Dia Mexida:</Text>
                <Text style={styles.detailValue}>{productTrace.productionDetails.mixDay}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Qtd. Mexidas:</Text>
                <Text style={styles.detailValue}>{productTrace.productionDetails.mixCount}</Text>
              </View>
              {productTrace.productionDetails.notes && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Obs:</Text>
                  <Text style={styles.detailValue}>{productTrace.productionDetails.notes}</Text>
                </View>
              )}
            </View>

            {/* Seção de Matérias-Primas Consumidas */}
            {productTrace && (
              <View style={styles.section}>
                <Text style={styles.headerText}>Matérias-Primas Consumidas</Text>
                {productTrace.usedMaterials && productTrace.usedMaterials.length > 0 ? (
                  <View style={styles.table}>
                    {/* Cabeçalho da Tabela */}
                    <View style={styles.tableHeaderRow}>
                      <View style={[styles.tableCol, styles.colMaterialName]}><Text style={styles.tableCellHeader}>Insumo</Text></View>
                      <View style={[styles.tableCol, styles.colMaterialType]}><Text style={styles.tableCellHeader}>Tipo</Text></View>
                      <View style={[styles.tableCol, styles.colMaterialBatch]}><Text style={styles.tableCellHeader}>Lote</Text></View>
                      <View style={[styles.tableCol, styles.colMaterialQty]}><Text style={styles.tableCellHeader}>Qtd.</Text></View>
                      <View style={[styles.tableCol, styles.colMaterialSupplier]}><Text style={styles.tableCellHeader}>Fornecedor</Text></View>
                      <View style={[styles.tableCol, styles.colMaterialInvoice]}><Text style={styles.tableCellHeader}>NF</Text></View>
                      <View style={[styles.tableCol, styles.colMaterialEntryDate]}><Text style={styles.tableCellHeader}>Entrada</Text></View>
                      <View style={[styles.tableCol, styles.colMaterialExpiryDate]}><Text style={styles.tableCellHeader}>Validade</Text></View>
                      <View style={[styles.tableCol, styles.colMaterialReport, styles.lastTableCol]}><Text style={styles.tableCellHeader}>Laudo</Text></View>
                    </View>
                    {/* Linhas da Tabela */}
                    {productTrace.usedMaterials.map((material, index) => (
                      <View key={index} style={styles.tableRow}>
                        <View style={[styles.tableCol, styles.colMaterialName]}><Text style={styles.tableCell}>{material.materialName}</Text></View>
                        <View style={[styles.tableCol, styles.colMaterialType]}><Text style={styles.tableCell}>{material.materialType || '-'}</Text></View>
                        <View style={[styles.tableCol, styles.colMaterialBatch]}><Text style={styles.tableCell}>{material.batchNumber}</Text></View>
                        <View style={[styles.tableCol, styles.colMaterialQty]}><Text style={styles.tableCell}>{`${material.quantity} ${material.unitOfMeasure}`}</Text></View>
                        <View style={[styles.tableCol, styles.colMaterialSupplier]}><Text style={styles.tableCell}>{material.supplier?.name || '-'}</Text></View>
                        <View style={[styles.tableCol, styles.colMaterialInvoice]}><Text style={styles.tableCell}>{material.supplier?.invoiceNumber || '-'}</Text></View>
                        <View style={[styles.tableCol, styles.colMaterialEntryDate]}><Text style={styles.tableCell}>{material.supplier?.orderDate ? formatDate(material.supplier.orderDate) : '-'}</Text></View>
                        <View style={[styles.tableCol, styles.colMaterialExpiryDate]}><Text style={styles.tableCell}>{material.expiryDate ? formatDate(material.expiryDate) : '-'}</Text></View>
                        <View style={[styles.tableCol, styles.colMaterialReport, styles.lastTableCol]}><Text style={styles.tableCell}>{material.hasReport ? 'Sim' : 'Não'}</Text></View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.detailValue}>Sem registros.</Text>
                )}
              </View>
            )}

            {/* Seção de Testes de Qualidade do Produto - TEMPORARIAMENTE COMENTADA ATÉ SABER O CAMPO CORRETO */}
            {/* {productTrace.qualityTests && productTrace.qualityTests.length > 0 && (
              <View style={styles.section} wrap={false}>
                <Text style={styles.headerText}>Testes de Qualidade do Produto</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <View style={[styles.tableCol, styles.colTestName]}><Text style={styles.tableCellHeader}>Teste</Text></View>
                    <View style={[styles.tableCol, styles.colTestResult]}><Text style={styles.tableCellHeader}>Resultado</Text></View>
                    <View style={[styles.tableCol, styles.colTestDate]}><Text style={styles.tableCellHeader}>Data</Text></View>
                    <View style={[styles.tableCol, styles.colTestResponsible, styles.lastTableCol]}><Text style={styles.tableCellHeader}>Responsável</Text></View>
                  </View>
                  {productTrace.qualityTests.map((test, index) => (
                    <View key={index} style={styles.tableRow}>
                      <View style={[styles.tableCol, styles.colTestName]}><Text style={styles.tableCell}>{test.testName}</Text></View>
                      <View style={[styles.tableCol, styles.colTestResult]}><Text style={styles.tableCell}>{test.result}</Text></View>
                      <View style={[styles.tableCol, styles.colTestDate]}><Text style={styles.tableCell}>{formatDate(test.date)}</Text></View>
                      <View style={[styles.tableCol, styles.colTestResponsible, styles.lastTableCol]}><Text style={styles.tableCell}>{test.responsible || '-'}</Text></View>
                    </View>
                  ))}
                </View>
              </View>
            )} */}

            {/* Seção de Vendas do Produto */}
            {productTrace && (
              <View style={styles.section} break>
                <Text style={styles.headerText}>Vendas do Produto</Text>
                {productTrace.sales && productTrace.sales.length > 0 ? (
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <View style={[styles.tableCol, styles.colSalesProduct]}><Text style={styles.tableCellHeader}>Produto</Text></View>
                      <View style={[styles.tableCol, styles.colSalesCustomer]}><Text style={styles.tableCellHeader}>Cliente</Text></View>
                      <View style={[styles.tableCol, styles.colSalesInvoice]}><Text style={styles.tableCellHeader}>Nota Fiscal</Text></View>
                      <View style={[styles.tableCol, styles.colSalesDate]}><Text style={styles.tableCellHeader}>Data</Text></View>
                      <View style={[styles.tableCol, styles.colSalesQty, styles.lastTableCol]}><Text style={styles.tableCellHeader}>Qtd. Vendida</Text></View>
                    </View>
                    {productTrace.sales.map((sale, index) => (
                      <View key={index} style={styles.tableRow}>
                        <View style={[styles.tableCol, styles.colSalesProduct]}><Text style={styles.tableCell}>{sale.productName || '-'}</Text></View>
                        <View style={[styles.tableCol, styles.colSalesCustomer]}><Text style={styles.tableCell}>{sale.customerName}</Text></View>
                        <View style={[styles.tableCol, styles.colSalesInvoice]}><Text style={styles.tableCell}>{sale.invoiceNumber}</Text></View>
                        <View style={[styles.tableCol, styles.colSalesDate]}><Text style={styles.tableCell}>{formatDate(sale.date)}</Text></View>
                        <View style={[styles.tableCol, styles.colSalesQty, styles.lastTableCol]}><Text style={styles.tableCell}>{`${sale.quantity} ${sale.unitOfMeasure}`}</Text></View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.detailValue}>Sem registros.</Text>
                )}
              </View>
            )}

            {/* Seção de Outros Produtos Gerados neste Lote de Produção */}
            {productTrace && (
              <View style={styles.section}>
                <Text style={styles.headerText}>Produtos desse lote</Text>
                {productTrace.relatedProducts && productTrace.relatedProducts.length > 0 ? (
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <View style={[styles.tableCol, styles.colRelatedProdName]}><Text style={styles.tableCellHeader}>Produto</Text></View>
                      <View style={[styles.tableCol, styles.colRelatedProdBatch]}><Text style={styles.tableCellHeader}>Lote do Item</Text></View>
                      <View style={[styles.tableCol, styles.colRelatedProdQty]}><Text style={styles.tableCellHeader}>Qtd.</Text></View>
                      <View style={[styles.tableCol, styles.colRelatedProdUnit, styles.lastTableCol]}><Text style={styles.tableCellHeader}>Unidade</Text></View>
                    </View>
                    {productTrace.relatedProducts.map((prod, index) => (
                      <View key={prod.id || index} style={styles.tableRow}>
                        <View style={[styles.tableCol, styles.colRelatedProdName]}><Text style={styles.tableCell}>{prod.productName}</Text></View>
                        <View style={[styles.tableCol, styles.colRelatedProdBatch]}><Text style={styles.tableCell}>{prod.batchNumber}</Text></View>
                        <View style={[styles.tableCol, styles.colRelatedProdQty]}><Text style={styles.tableCell}>{prod.quantity}</Text></View>
                        <View style={[styles.tableCol, styles.colRelatedProdUnit, styles.lastTableCol]}><Text style={styles.tableCell}>{prod.unitOfMeasure}</Text></View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.detailValue}>Sem outros produtos registrados neste lote.</Text>
                )}
              </View>
            )}
          </>
        )}
        
        {materialTrace && (
          <View style={styles.section}>
            <Text style={styles.headerText}>Detalhes do Insumo</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Nome:</Text>
              <Text style={styles.detailValue}>{materialTrace.materialDetails.materialName}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Lote:</Text>
              <Text style={styles.detailValue}>{materialTrace.materialDetails.batchNumber}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Fornecedor:</Text>
              <Text style={styles.detailValue}>{materialTrace.materialDetails.supplier?.name || '-'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Data Receb.:</Text>
              <Text style={styles.detailValue}>{materialTrace.materialDetails.expiryDate ? formatDate(materialTrace.materialDetails.expiryDate) : '-'} (Validade)</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Qtd. Receb.:</Text>
              <Text style={styles.detailValue}>{`${materialTrace.materialDetails.suppliedQuantity} ${materialTrace.materialDetails.unitOfMeasure}`}</Text>
            </View>
            {/* {materialTrace.materialDetails.notes && ( */}
                 {/* <View style={styles.detailItem}> */}
                    {/* <Text style={styles.detailLabel}>Obs:</Text> */}
                    {/* <Text style={styles.detailValue}>{materialTrace.materialDetails.notes}</Text> */}{/* Temporariamente comentado - ajustar se existir */}
                {/* </View> */}
            {/* )} */}
            
            {/* Seção de Produções em que o Insumo foi Utilizado - REFETORADA */}
            {materialTrace && materialTrace.usedInProductions && (
              <View style={styles.section}>
                <Text style={styles.headerText}>Utilizado nas Seguintes Produções:</Text>
                {materialTrace.usedInProductions.length > 0 ? (
                  materialTrace.usedInProductions.map((productionEvent, pIndex) => (
                    <View key={pIndex} style={{ marginBottom: 10, borderBottomWidth: 0.5, borderBottomColor: '#eeeeee', paddingBottom: 5 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 3 }}>
                        Lote de Produção: {productionEvent.productionBatchNumber} (Data: {formatDate(productionEvent.productionDate)})
                      </Text>
                      <Text style={{ fontSize: 9, marginBottom: 5 }}>
                        Quantidade do Insumo Utilizada: {productionEvent.quantityUsed} {materialTrace.materialDetails.unitOfMeasure} {/* Assumindo que a unidade é a do insumo principal */}
                      </Text>
                      
                      {productionEvent.producedItems && productionEvent.producedItems.length > 0 && (
                        <View>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2, marginLeft: 5 }}>Itens Produzidos nesta etapa:</Text>
                          <View style={[styles.table, { marginLeft: 5, marginRight: 5, width: 'auto' }]}> {/* Tabela aninhada um pouco menor */}
                            <View style={styles.tableHeaderRow}>
                              <View style={[styles.tableCol, styles.colNestedItemName]}><Text style={styles.tableCellHeader}>Produto Gerado</Text></View>
                              <View style={[styles.tableCol, styles.colNestedItemBatch]}><Text style={styles.tableCellHeader}>Lote do Item</Text></View>
                              <View style={[styles.tableCol, styles.colNestedItemQty, styles.lastTableCol]}><Text style={styles.tableCellHeader}>Qtd. Gerada</Text></View>
                            </View>
                            {productionEvent.producedItems.map((item, iIndex) => (
                              <View key={iIndex} style={styles.tableRow}>
                                <View style={[styles.tableCol, styles.colNestedItemName]}><Text style={styles.tableCell}>{item.productName}</Text></View>
                                <View style={[styles.tableCol, styles.colNestedItemBatch]}><Text style={styles.tableCell}>{item.batchNumber}</Text></View>
                                <View style={[styles.tableCol, styles.colNestedItemQty, styles.lastTableCol]}><Text style={styles.tableCell}>{`${item.quantity}`}</Text></View>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.detailValue}>Sem registros de uso em produções.</Text>
                )}
              </View>
            )}

            {/* TODO: Adicionar renderização para materialTrace.receipts, qualityTests, losses */}
          </View>
        )}

        {!productTrace && !materialTrace && (
          <Text>Nenhum dado de rastreabilidade para exibir.</Text>
        )}
      </View>
    </Page>
  </Document>
);

const PrintableTraceabilityPage = () => {
  const { batchId } = useParams<{ batchId: string }>();
  // const { toast } = useToast(); // Pode ser usado para notificações fora do PDF
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [productTrace, setProductTrace] = useState<ProductTraceability | null>(null);
  const [materialTrace, setMaterialTrace] = useState<MaterialTraceability | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Função de formatação de data (pode ser movida para um utilitário se usada em mais lugares)
  const formatDateSafe = (date: Date | string | undefined): string => {
    if (!date) return "-";
    try {
      return formatDateFn(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      console.error("Erro ao formatar data:", date, e);
      return "Data inválida";
    }
  };

  const fetchTraceDataForPrint = useCallback(async () => {
    if (!batchId) {
      setError("ID do lote não fornecido.");
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    setError(null); // Limpa erro anterior
    setProductTrace(null); // Limpa dados anteriores
    setMaterialTrace(null);
    try {
      const batchInfo = await findRelatedBatches(batchId);
      if (!batchInfo.exists) {
        setError(`O lote "${batchId}" não foi encontrado.`);
        setIsLoadingData(false);
        return;
      }
      if (batchInfo.type === 'product') {
        const result = await traceProductBatch(batchId);
        setProductTrace(result);
      } else {
        const result = await traceMaterialBatch(batchId);
        setMaterialTrace(result);
      }
    } catch (fetchError) {
      console.error("Erro na rastreabilidade para impressão:", fetchError);
      setError("Ocorreu um erro ao buscar os dados para impressão.");
    } finally {
      setIsLoadingData(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchTraceDataForPrint();
  }, [fetchTraceDataForPrint]);

  const handleClosePage = () => {
    window.close(); // Ou navegue para outra página, dependendo do fluxo
  };

  if (isLoadingData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%', fontFamily: 'sans-serif' }}>
        <Loader className="h-8 w-8 animate-spin" /> 
        <p style={{ /* marginLeft: '10px' */ }}>Carregando dados para o relatório...</p>
        <Button onClick={handleClosePage} variant="outline" style={{marginTop: '20px'}}>Fechar</Button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', color: 'red', backgroundColor: 'white', textAlign: 'center' }}>
        <h1>Erro ao Gerar Relatório</h1>
        <p>{error}</p>
        <Button onClick={handleClosePage} variant="outline" style={{marginTop: '20px'}}>Fechar</Button>
      </div>
    );
  }
  
  // Se não estiver carregando e não houver erro, mas não houver dados (improvável se a busca de lote foi bem-sucedida)
  if (!productTrace && !materialTrace) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h1>Relatório de Rastreabilidade</h1>
            <p>Nenhum dado encontrado para o lote: {batchId}. Verifique o ID ou os dados de origem.</p>
            <Button onClick={handleClosePage} variant="outline" style={{marginTop: '20px'}}>Fechar</Button>
        </div>
      );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* A BARRA SUPERIOR ABAIXO SERÁ REMOVIDA
      <div 
        style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '1rem',
          borderBottom: '1px solid #ddd',
          backgroundColor: 'white'
        }}
      >
        <Button onClick={handleClosePage} variant="outline" className="flex items-center gap-2">
          <X className="h-4 w-4" />
          Fechar Relatório
        </Button>
        <h1 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
          Relatório de Rastreabilidade - Lote {batchId}
        </h1>
        <div></div> 
      </div>
      */}
      
      <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
        <MyDocument 
            productTrace={productTrace} 
            materialTrace={materialTrace} 
            formatDate={formatDateSafe} 
        />
      </PDFViewer>
    </div>
  );
};

export default PrintableTraceabilityPage;
