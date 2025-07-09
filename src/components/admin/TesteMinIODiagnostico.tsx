import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MinIOService } from '@/services/minioService';

interface DiagnosticoResult {
  sucesso: boolean;
  mensagem: string;
  detalhes?: any;
  erro?: string;
}

export default function TesteMinIODiagnostico() {
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<DiagnosticoResult | null>(null);

  const executarDiagnostico = async () => {
    setTestando(true);
    setResultado(null);

    try {
      console.log('🔍 Iniciando diagnóstico completo do MinIO...');

      // Teste único: Upload direto (mais confiável)
      console.log('📤 Teste: Upload direto para MinIO...');

      const arquivoTeste = new Blob(['Teste MinIO Diagnóstico - ' + new Date().toISOString()], {
        type: 'text/plain'
      });

      const resultadoUpload = await MinIOService.uploadFile(
        arquivoTeste,
        `diagnostico_${Date.now()}.txt`,
        'text/plain'
      );

      if (!resultadoUpload.success) {
        const erro = resultadoUpload.error || 'Erro desconhecido';

        // Analisar tipo de erro
        if (erro.includes('CORS')) {
          setResultado({
            sucesso: false,
            mensagem: 'MinIO bloqueado por CORS',
            detalhes: {
              problema: 'CORS Policy',
              solucao: 'Configure CORS no MinIO',
              comando: 'mc admin config set myminio api cors_allow_origin="*"',
              erro: erro
            }
          });
        } else if (erro.includes('400')) {
          setResultado({
            sucesso: false,
            mensagem: 'MinIO rejeitando requisições (400 Bad Request)',
            detalhes: {
              problema: 'Bucket ou configuração incorreta',
              solucao: 'Verifique se bucket "contratos" existe e tem permissões públicas',
              endpoint: 'https://minio0.nossagoma.com',
              bucket: 'contratos',
              erro: erro
            }
          });
        } else {
          setResultado({
            sucesso: false,
            mensagem: 'Falha no upload para MinIO',
            detalhes: {
              teste: 'Upload direto',
              erro: erro,
              endpoint: 'https://minio0.nossagoma.com',
              bucket: 'contratos'
            }
          });
        }
        return;
      }

      console.log('✅ Upload direto OK:', resultadoUpload.url);

      // Sucesso completo
      setResultado({
        sucesso: true,
        mensagem: 'Todos os testes passaram! MinIO está funcionando corretamente.',
        detalhes: {
          conectividade: '✅ OK',
          bucket: '✅ OK',
          upload: '✅ OK',
          urlTeste: resultadoUpload.url
        }
      });

    } catch (error) {
      console.error('❌ Erro no diagnóstico:', error);
      setResultado({
        sucesso: false,
        mensagem: 'Erro durante o diagnóstico',
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        detalhes: error
      });
    } finally {
      setTestando(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Diagnóstico MinIO
        </CardTitle>
        <CardDescription>
          Teste completo de conectividade e funcionalidade do MinIO
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={executarDiagnostico}
          disabled={testando}
          className="w-full"
        >
          {testando ? '🔍 Executando diagnóstico...' : '🚀 Executar Diagnóstico Completo'}
        </Button>

        {resultado && (
          <div className={`p-4 rounded-lg border ${
            resultado.sucesso 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={resultado.sucesso ? "default" : "destructive"}>
                {resultado.sucesso ? '✅ Sucesso' : '❌ Falha'}
              </Badge>
            </div>
            
            <p className="font-medium mb-2">{resultado.mensagem}</p>
            
            {resultado.detalhes && (
              <div className="text-sm space-y-1">
                <p className="font-medium">Detalhes:</p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(resultado.detalhes, null, 2)}
                </pre>
              </div>
            )}

            {resultado.erro && (
              <div className="text-sm mt-2">
                <p className="font-medium text-red-600">Erro:</p>
                <p className="text-red-600">{resultado.erro}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <h4 className="font-medium mb-2">ℹ️ Informações do MinIO:</h4>
          <ul className="space-y-1 text-xs">
            <li>• <strong>Endpoint Interno:</strong> http://192.168.0.3:9000 (upload)</li>
            <li>• <strong>Endpoint Público:</strong> https://minio0.nossagoma.com (download)</li>
            <li>• <strong>Bucket:</strong> contratos</li>
            <li>• <strong>Console:</strong> https://minio1.nossagoma.com</li>
            <li>• <strong>Credenciais:</strong> admin / minha_senha</li>
          </ul>

          <h4 className="font-medium mb-2 mt-4">🔍 Teste executado:</h4>
          <ul className="space-y-1 text-xs">
            <li>• <strong>Upload direto:</strong> Teste real de upload de arquivo para o bucket</li>
            <li>• <strong>Diagnóstico automático:</strong> Identifica problemas de CORS, configuração e permissões</li>
            <li>• <strong>Soluções específicas:</strong> Comandos e instruções para resolver problemas</li>
          </ul>

          <h4 className="font-medium mb-2 mt-4">🛠️ Configuração do Bucket:</h4>
          <ol className="space-y-1 text-xs list-decimal list-inside">
            <li>Acesse: <a href="https://minio1.nossagoma.com" target="_blank" className="text-blue-600 underline">MinIO Console</a></li>
            <li>Faça login com: admin / minha_senha</li>
            <li>Se bucket não existir: "Create Bucket" → nome: <code className="bg-gray-200 px-1 rounded">contratos</code></li>
            <li>Clique no bucket "contratos"</li>
            <li>Vá em "Access" → "Access Policy"</li>
            <li>Selecione: <strong>"Public"</strong> (para permitir uploads)</li>
            <li>Clique em "Set"</li>
            <li><strong>Importante:</strong> Sistema agora usa IP local (192.168.0.3:9000) como Chatwoot/Evolution</li>
          </ol>

          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Importante:</strong> O bucket precisa ter política "Public" para permitir uploads via API REST.
            </p>
          </div>

          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
            <p className="text-xs text-green-800 dark:text-green-200">
              <strong>✅ Nova Configuração:</strong>
              <br />• <strong>Upload:</strong> Via IP local (192.168.0.3:9000) - sem CORS
              <br />• <strong>Download:</strong> Via domínio público (minio0.nossagoma.com)
              <br />• <strong>Compatível:</strong> Mesma estratégia do Chatwoot e Evolution
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
