import React, { useState } from 'react';
import { Download, Eye, FileText, Hash, Calendar, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { PDFService, type DadosContratoPDF } from '@/services/pdfService';

interface PDFViewerProps {
  contrato: DadosContratoPDF;
  mostrarBotoes?: boolean;
  onPDFGerado?: (resultado: any) => void;
}

export default function PDFViewer({ 
  contrato, 
  mostrarBotoes = true, 
  onPDFGerado 
}: PDFViewerProps) {
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [pdfGerado, setPdfGerado] = useState<any>(null);
  const { toast } = useToast();

  const handleGerarPDF = async () => {
    setGerandoPDF(true);
    try {
      await PDFService.criarBucketSeNecessario();
      const resultado = await PDFService.gerarPDFContrato(contrato);
      
      setPdfGerado(resultado);
      onPDFGerado?.(resultado);
      
      toast({
        title: "PDF gerado com sucesso!",
        description: "O documento foi processado e está pronto para download.",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o documento PDF.",
      });
    } finally {
      setGerandoPDF(false);
    }
  };

  const handleVisualizarPDF = () => {
    PDFService.abrirParaImpressao(contrato);
  };

  const handleBaixarPDF = () => {
    if (pdfGerado?.pdfUrl) {
      window.open(pdfGerado.pdfUrl, '_blank');
    } else {
      // Gerar e baixar
      handleGerarPDF();
    }
  };

  const formatarTamanho = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatarHash = (hash: string): string => {
    if (hash.length <= 16) return hash;
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documento PDF
        </CardTitle>
        <CardDescription>
          Visualize, gere ou baixe o PDF do contrato com assinaturas eletrônicas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Informações do documento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium">Signatário</div>
                <div className="text-sm text-gray-600">{contrato.assinante_externo_nome}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium">Criado em</div>
                <div className="text-sm text-gray-600">
                  {new Date(contrato.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>

            {contrato.finalizado_em && (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-sm font-medium">Finalizado em</div>
                  <div className="text-sm text-gray-600">
                    {new Date(contrato.finalizado_em).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium">Status</div>
                <Badge variant={contrato.finalizado_em ? "default" : "secondary"}>
                  {contrato.finalizado_em ? "Concluído" : "Em andamento"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Informações do PDF gerado */}
          {pdfGerado && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">
                  PDF Gerado com Sucesso
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-green-700 dark:text-green-300">Tamanho</div>
                  <div className="text-green-600 dark:text-green-400">
                    {formatarTamanho(pdfGerado.tamanhoBytes)}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-green-700 dark:text-green-300">Gerado em</div>
                  <div className="text-green-600 dark:text-green-400">
                    {new Date(pdfGerado.geradoEm).toLocaleString('pt-BR')}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Hash SHA-256
                  </div>
                  <div className="text-green-600 dark:text-green-400 font-mono text-xs">
                    {formatarHash(pdfGerado.hashSHA256)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assinaturas */}
          {contrato.assinaturas && contrato.assinaturas.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Assinaturas Eletrônicas ({contrato.assinaturas.length})
              </h4>
              {contrato.assinaturas.map((assinatura, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium text-sm">{assinatura.signatario_nome}</div>
                      <div className="text-xs text-gray-500">
                        {assinatura.tipo === 'interna_qualificada' ? 'Assinatura Digital Qualificada' : 'Assinatura Eletrônica Simples'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {assinatura.assinado_em ? (
                      <div>
                        <Badge variant="default" className="mb-1">Assinado</Badge>
                        <div className="text-xs text-gray-500">
                          {new Date(assinatura.assinado_em).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botões de ação */}
          {mostrarBotoes && (
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleVisualizarPDF}
                variant="outline"
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
              
              <Button 
                onClick={handleGerarPDF}
                disabled={gerandoPDF}
                variant="outline"
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                {gerandoPDF ? 'Gerando...' : 'Gerar PDF'}
              </Button>
              
              <Button 
                onClick={handleBaixarPDF}
                disabled={gerandoPDF}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          )}

          {/* Informações de integridade */}
          <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <div className="flex items-center gap-1 mb-1">
              <Shield className="h-3 w-3" />
              <span className="font-medium">Integridade do Documento</span>
            </div>
            <p>
              Este documento utiliza hash SHA-256 para garantir sua integridade. 
              Qualquer alteração no conteúdo resultará em um hash diferente, 
              permitindo verificar se o documento foi modificado.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
