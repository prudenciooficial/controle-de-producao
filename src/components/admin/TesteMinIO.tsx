import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, CheckCircle, XCircle, Upload } from 'lucide-react';
import { MinIOService } from '@/services/minioService';

interface TesteMinIOProps {
  className?: string;
}

export function TesteMinIO({ className }: TesteMinIOProps) {
  const [testando, setTestando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem: string;
    detalhes?: any;
  } | null>(null);

  const testarConexao = async () => {
    setTestando(true);
    setResultado(null);

    try {
      console.log('🔍 Testando conexão com MinIO...');
      const result = await MinIOService.testConnection();
      
      setResultado({
        sucesso: result.success,
        mensagem: result.message,
        detalhes: result.details
      });

    } catch (error) {
      console.error('Erro no teste de conexão:', error);
      setResultado({
        sucesso: false,
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
        detalhes: error
      });
    } finally {
      setTestando(false);
    }
  };

  const testarUpload = async () => {
    setUploadando(true);
    setResultado(null);

    try {
      console.log('📤 Testando upload para MinIO...');
      
      // Criar um arquivo de teste
      const conteudoTeste = `
        <html>
          <head><title>Teste MinIO</title></head>
          <body>
            <h1>Teste de Upload para MinIO</h1>
            <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Este é um arquivo de teste para verificar o upload no MinIO.</p>
          </body>
        </html>
      `;
      
      const blob = new Blob([conteudoTeste], { type: 'text/html' });
      const fileName = `teste_${Date.now()}.html`;
      
      const result = await MinIOService.uploadFile(blob, fileName, 'text/html');
      
      setResultado({
        sucesso: result.success,
        mensagem: result.success 
          ? `Upload realizado com sucesso! URL: ${result.url}`
          : `Erro no upload: ${result.error}`,
        detalhes: result
      });

    } catch (error) {
      console.error('Erro no teste de upload:', error);
      setResultado({
        sucesso: false,
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
        detalhes: error
      });
    } finally {
      setUploadando(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Teste MinIO
        </CardTitle>
        <CardDescription>
          Teste a conectividade e funcionalidade do servidor MinIO
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={testarConexao}
            disabled={testando}
            variant="outline"
            className="w-full"
          >
            {testando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando Conexão...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Testar Conexão
              </>
            )}
          </Button>

          <Button 
            onClick={testarUpload}
            disabled={uploadando}
            className="w-full"
          >
            {uploadando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando Upload...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Testar Upload
              </>
            )}
          </Button>
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
          <h4 className="font-medium mb-2">ℹ️ Configuração MinIO:</h4>
          <ul className="space-y-1 text-xs">
            <li>• <strong>Endpoint:</strong> https://minio0.nossagoma.com</li>
            <li>• <strong>Bucket:</strong> contratos</li>
            <li>• <strong>Usuário:</strong> admin</li>
            <li>• <strong>Console:</strong> https://minio1.nossagoma.com</li>
            <li>• <strong>Uso:</strong> Armazenamento de PDFs e arquivos HTML</li>
          </ul>
        </div>

        <div className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <h4 className="font-medium mb-2">🔧 Solução de Problemas:</h4>
          <ul className="space-y-1 text-xs">
            <li>• Verifique se o servidor MinIO está rodando</li>
            <li>• Confirme se o bucket "contratos" existe</li>
            <li>• Verifique as credenciais (admin/minha_senha)</li>
            <li>• Teste o acesso via console: https://minio1.nossagoma.com</li>
            <li>• Verifique se as portas 9000 e 9001 estão acessíveis</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
