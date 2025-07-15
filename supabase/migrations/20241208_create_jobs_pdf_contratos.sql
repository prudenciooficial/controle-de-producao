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
    FOR ALL USING (auth.role() = 'authenticated');

-- Comentários para documentação
COMMENT ON TABLE jobs_pdf_contratos IS 'Tabela para gerenciar jobs de geração de PDF dos contratos comerciais';
COMMENT ON COLUMN jobs_pdf_contratos.id IS 'Identificador único do job';
COMMENT ON COLUMN jobs_pdf_contratos.contrato_id IS 'Referência ao contrato comercial';
COMMENT ON COLUMN jobs_pdf_contratos.status IS 'Status do processamento: pendente, processando, concluido, erro';
COMMENT ON COLUMN jobs_pdf_contratos.pdf_url IS 'URL do PDF gerado (MinIO)';
COMMENT ON COLUMN jobs_pdf_contratos.hash_sha256 IS 'Hash SHA-256 do PDF para integridade';
COMMENT ON COLUMN jobs_pdf_contratos.tamanho_bytes IS 'Tamanho do arquivo PDF em bytes';
COMMENT ON COLUMN jobs_pdf_contratos.tentativas IS 'Número de tentativas de processamento';
COMMENT ON COLUMN jobs_pdf_contratos.max_tentativas IS 'Máximo de tentativas permitidas';
COMMENT ON COLUMN jobs_pdf_contratos.erro_mensagem IS 'Mensagem de erro se o processamento falhar';
COMMENT ON COLUMN jobs_pdf_contratos.dados_processamento IS 'Dados adicionais do processamento (JSON)';
COMMENT ON COLUMN jobs_pdf_contratos.criado_em IS 'Data/hora de criação do job';
COMMENT ON COLUMN jobs_pdf_contratos.processado_em IS 'Data/hora de conclusão do processamento';
COMMENT ON COLUMN jobs_pdf_contratos.atualizado_em IS 'Data/hora da última atualização';
