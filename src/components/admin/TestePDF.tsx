import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, CheckCircle, XCircle, Download } from 'lucide-react';
import { PDFService, type DadosContratoPDF } from '@/services/pdfService';
import { MinIOService } from '@/services/minioService';
import { useToast } from '@/components/ui/use-toast';

interface TestePDFProps {
  className?: string;
}

export function TestePDF({ className }: TestePDFProps) {
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
    detalhes?: any;
    pdfUrl?: string;
  } | null>(null);
  const { toast } = useToast();

  const contratoTeste: DadosContratoPDF = {
    id: 'teste-pdf-' + Date.now(),
    titulo: 'Contrato de Prestação de Serviços de Teste',
    conteudo: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: Empresa Teste Ltda.
CNPJ: 12.345.678/0001-90
Endereço: Rua das Flores, 123 - Centro - São Paulo/SP

CONTRATADO: João da Silva
CPF: 123.456.789-00
Endereço: Av. Principal, 456 - Jardim - São Paulo/SP

CLÁUSULA PRIMEIRA - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de teste para validação do sistema de geração de PDF de contratos eletrônicos.

CLÁUSULA SEGUNDA - DO VALOR
O valor total do contrato é de R$ 1.500,00 (mil e quinhentos reais), a ser pago em 3 (três) parcelas mensais de R$ 500,00 (quinhentos reais).

CLÁUSULA TERCEIRA - DO PRAZO
O prazo de vigência deste contrato é de 90 (noventa) dias, iniciando-se na data de assinatura eletrônica.

CLÁUSULA QUARTA - DAS OBRIGAÇÕES
O CONTRATADO obriga-se a:
- Executar os serviços com qualidade e pontualidade
- Manter sigilo sobre informações confidenciais
- Cumprir os prazos estabelecidos

CLÁUSULA QUINTA - DA RESCISÃO
Este contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 30 (trinta) dias.

Este é um contrato de teste gerado automaticamente em ${new Date().toLocaleString('pt-BR')} para validação do sistema de PDFs.`,
    assinante_externo_nome: 'João da Silva',
    assinante_externo_email: 'joao@teste.com',
    assinante_externo_documento: '123.456.789-00',
    criado_em: new Date().toISOString(),
    modelo: {
      nome: 'Modelo de Prestação de Serviços'
    }
  };

  const testarGeracaoPDF = async () => {
    setTestando(true);
    setResultado(null);

    try {
      console.log('🧪 Testando geração de PDF...');

      // Verificar MinIO primeiro (sem falhar se não funcionar)
      try {
        await PDFService.criarBucketSeNecessario();
        console.log('✅ MinIO verificado');
      } catch (minioError) {
        console.warn('⚠️ MinIO não disponível, usando fallback local:', minioError);
      }

      // Gerar PDF
      const resultadoPDF = await PDFService.gerarPDFContrato(contratoTeste);

      const isLocal = resultadoPDF.pdfUrl.includes('local-storage');

      setResultado({
        sucesso: true,
        mensagem: `PDF gerado com sucesso! ${isLocal ? '(Salvo localmente)' : '(Salvo no MinIO)'}`,
        detalhes: {
          url: resultadoPDF.pdfUrl,
          hash: resultadoPDF.hashSHA256,
          tamanho: resultadoPDF.tamanhoBytes,
          geradoEm: resultadoPDF.geradoEm,
          storage: isLocal ? 'Local' : 'MinIO'
        },
        pdfUrl: resultadoPDF.pdfUrl
      });

      toast({
        title: "Teste concluído",
        description: `PDF de teste gerado com sucesso! ${isLocal ? '(Local)' : '(MinIO)'}`,
      });

    } catch (error) {
      console.error('Erro no teste de PDF:', error);
      setResultado({
        sucesso: false,
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
        detalhes: error
      });

      toast({
        variant: "destructive",
        title: "Erro no teste",
        description: "Falha na geração do PDF de teste.",
      });
    } finally {
      setTestando(false);
    }
  };

  const baixarPDFTeste = async () => {
    if (!resultado?.pdfUrl) return;

    try {
      const fileName = resultado.pdfUrl.split('/').pop() || 'teste.pdf';

      // Verificar se é arquivo local
      if (resultado.pdfUrl.includes('local-storage')) {
        const localStorage = (window as any).localPDFStorage;
        if (localStorage && localStorage[fileName]) {
          const link = document.createElement('a');
          link.href = localStorage[fileName];
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast({
            title: "Download iniciado",
            description: "Arquivo de teste baixado do storage local.",
          });
          return;
        }
      }

      // Tentar baixar do MinIO
      const blob = await MinIOService.downloadFile(fileName);

      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Download iniciado",
          description: "Arquivo de teste baixado do MinIO.",
        });
      } else {
        throw new Error('Não foi possível baixar o arquivo');
      }
    } catch (error) {
      console.error('Erro ao baixar PDF teste:', error);
      toast({
        variant: "destructive",
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo de teste.",
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Teste de Geração de PDF
        </CardTitle>
        <CardDescription>
          Teste a funcionalidade de geração e download de PDFs de contratos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={testarGeracaoPDF}
            disabled={testando}
            className="w-full"
          >
            {testando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Testar Geração PDF
              </>
            )}
          </Button>

          {resultado?.sucesso && resultado.pdfUrl && (
            <Button 
              onClick={baixarPDFTeste}
              variant="outline"
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF Teste
            </Button>
          )}
        </div>

        {resultado && (
          <Alert className={resultado.sucesso ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {resultado.sucesso ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={resultado.sucesso ? 'text-green-800' : 'text-red-800'}>
                <div className="font-medium mb-2">{resultado.mensagem}</div>
                {resultado.detalhes && (
                  <div className="text-xs bg-white p-2 rounded border overflow-x-auto">
                    <pre>{JSON.stringify(resultado.detalhes, null, 2)}</pre>
                  </div>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <h4 className="font-medium mb-2">ℹ️ Sobre o Teste:</h4>
          <ul className="space-y-1 text-xs">
            <li>• Gera um contrato de teste com conteúdo simulado</li>
            <li>• Testa a conversão HTML para PDF</li>
            <li>• Verifica o upload para MinIO</li>
            <li>• Testa o download do arquivo gerado</li>
            <li>• Inclui fallback para HTML se PDF falhar</li>
          </ul>
        </div>

        <div className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <h4 className="font-medium mb-2">🔧 Diagnóstico:</h4>
          <ul className="space-y-1 text-xs">
            <li>• Se o teste falhar, verifique o console do navegador</li>
            <li>• Confirme se o MinIO está funcionando</li>
            <li>• Verifique se as bibliotecas jsPDF estão carregadas</li>
            <li>• Em caso de erro, será usado fallback HTML</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
