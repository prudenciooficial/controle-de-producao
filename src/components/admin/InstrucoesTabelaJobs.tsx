import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Code,
  Play
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function InstrucoesTabelaJobs() {
  const [copiado, setCopiado] = useState(false);
  const { toast } = useToast();

  const sqlScript = `-- Script para criar tabela jobs_pdf_contratos
-- Execute este SQL diretamente no Supabase Dashboard > SQL Editor

-- Criar tabela para jobs de geração de PDF dos contratos
CREATE TABLE IF NOT EXISTS jobs_pdf_contratos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID NOT NULL REFERENCES contratos_comerciais(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
    pdf_url TEXT,
    hash_sha256 TEXT,
    tamanho_bytes BIGINT,
    tentativas INTEGER DEFAULT 0,
    max_tentativas INTEGER DEFAULT 3,
    erro_mensagem TEXT,
    dados_processamento JSONB DEFAULT '{}',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processado_em TIMESTAMP WITH TIME ZONE,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_jobs_pdf_contratos_status ON jobs_pdf_contratos(status);
CREATE INDEX IF NOT EXISTS idx_jobs_pdf_contratos_contrato_id ON jobs_pdf_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_jobs_pdf_contratos_criado_em ON jobs_pdf_contratos(criado_em);
CREATE INDEX IF NOT EXISTS idx_jobs_pdf_contratos_tentativas ON jobs_pdf_contratos(tentativas);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_jobs_pdf_contratos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_jobs_pdf_contratos_updated_at
    BEFORE UPDATE ON jobs_pdf_contratos
    FOR EACH ROW
    EXECUTE FUNCTION update_jobs_pdf_contratos_updated_at();

-- RLS (Row Level Security)
ALTER TABLE jobs_pdf_contratos ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso completo para usuários autenticados
CREATE POLICY "Usuários autenticados podem gerenciar jobs PDF" ON jobs_pdf_contratos
    FOR ALL USING (auth.role() = 'authenticated');`;

  const handleCopiarSQL = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript);
      setCopiado(true);
      toast({
        title: "SQL copiado!",
        description: "O script SQL foi copiado para a área de transferência.",
      });
      
      setTimeout(() => setCopiado(false), 3000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao copiar",
        description: "Não foi possível copiar o SQL. Copie manualmente.",
      });
    }
  };

  const abrirSupabase = () => {
    window.open('https://supabase.com/dashboard/projects', '_blank');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-500" />
          Configuração Necessária: Tabela jobs_pdf_contratos
        </CardTitle>
        <CardDescription>
          Para que o sistema de geração automática de PDFs funcione, é necessário criar uma tabela no banco de dados.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ Ação Necessária:</strong><br />
            A tabela <code>jobs_pdf_contratos</code> não foi encontrada no banco de dados. 
            Execute o script SQL abaixo para criá-la.
          </AlertDescription>
        </Alert>

        {/* Instruções Passo a Passo */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Instruções Passo a Passo:</h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">1</Badge>
              <div>
                <p className="font-medium">Acesse o Supabase Dashboard</p>
                <p className="text-sm text-gray-600">Faça login no seu projeto Supabase</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={abrirSupabase}
                  className="mt-2 flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Supabase Dashboard
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">2</Badge>
              <div>
                <p className="font-medium">Vá para o SQL Editor</p>
                <p className="text-sm text-gray-600">No menu lateral, clique em "SQL Editor"</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">3</Badge>
              <div>
                <p className="font-medium">Copie e execute o script SQL</p>
                <p className="text-sm text-gray-600">Cole o script abaixo e clique em "Run"</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">4</Badge>
              <div>
                <p className="font-medium">Recarregue a página</p>
                <p className="text-sm text-gray-600">Após executar o SQL, recarregue esta página</p>
              </div>
            </div>
          </div>
        </div>

        {/* Script SQL */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Code className="h-5 w-5" />
              Script SQL
            </h3>
            <Button 
              onClick={handleCopiarSQL}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {copiado ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar SQL
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{sqlScript}</code>
            </pre>
          </div>
        </div>

        {/* Informações Adicionais */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>ℹ️ Sobre a Tabela:</strong><br />
            A tabela <code>jobs_pdf_contratos</code> é usada para gerenciar a geração automática de PDFs dos contratos.
            Ela permite processamento em background, retry automático e logs de auditoria.
          </AlertDescription>
        </Alert>

        {/* Funcionalidades que serão habilitadas */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Funcionalidades que serão habilitadas:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Geração automática de PDFs</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Processamento em background</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Retry automático em caso de erro</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Logs de auditoria completos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Validação de integridade (SHA-256)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Estatísticas de processamento</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
