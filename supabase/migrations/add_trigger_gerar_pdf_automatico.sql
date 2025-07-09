-- Função para gerar PDF automaticamente após criação/atualização de contrato
CREATE OR REPLACE FUNCTION trigger_gerar_pdf_contrato()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se o contrato foi criado ou se mudou para status que requer PDF
    IF (TG_OP = 'INSERT' AND NEW.status = 'aguardando_assinatura_interna') OR
       (TG_OP = 'UPDATE' AND OLD.status != 'aguardando_assinatura_interna' AND NEW.status = 'aguardando_assinatura_interna') THEN
        
        -- Inserir job para gerar PDF (será processado pelo frontend)
        INSERT INTO jobs_pdf_contratos (
            contrato_id,
            status,
            criado_em,
            tentativas
        ) VALUES (
            NEW.id,
            'pendente',
            NOW(),
            0
        ) ON CONFLICT (contrato_id) DO UPDATE SET
            status = 'pendente',
            tentativas = 0,
            atualizado_em = NOW();
            
        -- Log de auditoria
        INSERT INTO logs_auditoria_contratos_comerciais (
            contrato_id,
            evento,
            descricao,
            dados_evento,
            timestamp_evento
        ) VALUES (
            NEW.id,
            'pdf_agendado',
            'Geração de PDF agendada automaticamente',
            jsonb_build_object(
                'trigger', 'auto',
                'status_anterior', COALESCE(OLD.status, 'novo'),
                'status_atual', NEW.status
            ),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela para jobs de PDF se não existir
CREATE TABLE IF NOT EXISTS jobs_pdf_contratos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID NOT NULL REFERENCES contratos_comerciais(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
    pdf_url TEXT,
    hash_sha256 TEXT,
    tamanho_bytes BIGINT,
    erro_mensagem TEXT,
    tentativas INTEGER DEFAULT 0,
    max_tentativas INTEGER DEFAULT 3,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processado_em TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(contrato_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_jobs_pdf_status ON jobs_pdf_contratos(status);
CREATE INDEX IF NOT EXISTS idx_jobs_pdf_criado_em ON jobs_pdf_contratos(criado_em);

-- RLS para jobs_pdf_contratos
ALTER TABLE jobs_pdf_contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver jobs de PDF de seus contratos" ON jobs_pdf_contratos
    FOR SELECT USING (
        contrato_id IN (
            SELECT id FROM contratos_comerciais 
            WHERE criado_por = auth.uid()
        )
    );

CREATE POLICY "Sistema pode gerenciar jobs de PDF" ON jobs_pdf_contratos
    FOR ALL USING (true);

-- Trigger para contratos comerciais
DROP TRIGGER IF EXISTS trigger_auto_pdf_contrato ON contratos_comerciais;
CREATE TRIGGER trigger_auto_pdf_contrato
    AFTER INSERT OR UPDATE ON contratos_comerciais
    FOR EACH ROW
    EXECUTE FUNCTION trigger_gerar_pdf_contrato();

-- Função para atualizar timestamp de atualização
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp
DROP TRIGGER IF EXISTS trigger_update_jobs_pdf_updated_at ON jobs_pdf_contratos;
CREATE TRIGGER trigger_update_jobs_pdf_updated_at
    BEFORE UPDATE ON jobs_pdf_contratos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE jobs_pdf_contratos IS 'Fila de jobs para geração automática de PDFs de contratos';
COMMENT ON COLUMN jobs_pdf_contratos.status IS 'Status do job: pendente, processando, concluido, erro';
COMMENT ON COLUMN jobs_pdf_contratos.tentativas IS 'Número de tentativas de processamento';
COMMENT ON COLUMN jobs_pdf_contratos.max_tentativas IS 'Máximo de tentativas antes de marcar como erro';

-- Inserir jobs para contratos existentes que precisam de PDF
INSERT INTO jobs_pdf_contratos (contrato_id, status, criado_em, tentativas)
SELECT 
    id,
    'pendente',
    NOW(),
    0
FROM contratos_comerciais 
WHERE status = 'aguardando_assinatura_interna' 
  AND pdf_url IS NULL
ON CONFLICT (contrato_id) DO NOTHING;
