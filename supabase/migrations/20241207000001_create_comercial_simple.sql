-- Migração simplificada para criar o módulo Comercial
-- Sistema de contratos com assinaturas eletrônicas

-- 1. Tabela de modelos de contratos
CREATE TABLE IF NOT EXISTS public.modelos_contratos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    conteudo TEXT NOT NULL,
    variaveis JSONB DEFAULT '[]'::jsonb,
    ativo BOOLEAN DEFAULT true,
    criado_por UUID REFERENCES auth.users(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de contratos comerciais
CREATE TABLE IF NOT EXISTS public.contratos_comerciais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    modelo_id UUID REFERENCES public.modelos_contratos(id) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    dados_variaveis JSONB DEFAULT '{}'::jsonb,
    
    -- Dados do signatário externo
    assinante_externo_nome VARCHAR(255) NOT NULL,
    assinante_externo_email VARCHAR(255) NOT NULL,
    assinante_externo_documento VARCHAR(20) NOT NULL,
    
    -- Dados do signatário interno
    assinante_interno_id UUID REFERENCES auth.users(id),
    
    -- Status do contrato
    status VARCHAR(50) DEFAULT 'editando' CHECK (status IN ('editando', 'aguardando_assinatura_interna', 'aguardando_assinatura_externa', 'concluido', 'cancelado')),
    
    -- Dados de integridade
    hash_documento VARCHAR(64),
    pdf_url TEXT,
    
    -- Metadados
    criado_por UUID REFERENCES auth.users(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalizado_em TIMESTAMP WITH TIME ZONE
);

-- 3. Tabela de assinaturas
CREATE TABLE IF NOT EXISTS public.assinaturas_contratos_comerciais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('interna_qualificada', 'externa_simples')),
    
    -- Dados do signatário
    signatario_nome VARCHAR(255) NOT NULL,
    signatario_email VARCHAR(255) NOT NULL,
    signatario_documento VARCHAR(20) NOT NULL,
    
    -- Dados da assinatura digital qualificada
    certificado_dados JSONB,
    certificado_valido_ate TIMESTAMP WITH TIME ZONE,
    
    -- Dados da assinatura simples
    token_verificacao VARCHAR(6),
    token_validado_em TIMESTAMP WITH TIME ZONE,
    
    -- Evidências técnicas
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    timestamp_assinatura TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status e dados da assinatura
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'assinado', 'rejeitado')),
    assinado_em TIMESTAMP WITH TIME ZONE,
    hash_assinatura VARCHAR(128),
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.logs_auditoria_contratos_comerciais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE,
    
    -- Dados do evento
    evento VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    dados_evento JSONB DEFAULT '{}'::jsonb,
    
    -- Evidências técnicas
    usuario_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    timestamp_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de tokens de verificação
CREATE TABLE IF NOT EXISTS public.tokens_verificacao_contratos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE,
    token VARCHAR(6) NOT NULL,
    email_destinatario VARCHAR(255) NOT NULL,

    -- Controle de validade
    valido_ate TIMESTAMP WITH TIME ZONE NOT NULL,
    usado_em TIMESTAMP WITH TIME ZONE,

    -- Evidências de uso
    ip_uso INET,
    user_agent_uso TEXT,

    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de evidências jurídicas
CREATE TABLE IF NOT EXISTS public.evidencias_juridicas_contratos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE,

    -- Tipo de evidência
    tipo_evidencia VARCHAR(50) NOT NULL CHECK (tipo_evidencia IN ('assinatura_digital', 'token_verificacao', 'integridade_documento', 'timestamp_qualificado')),

    -- Dados da evidência (JSON)
    dados_evidencia JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Hash da evidência para verificação de integridade
    hash_evidencia VARCHAR(128) NOT NULL,

    -- Timestamp de coleta
    timestamp_coleta TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Status de validade
    valida BOOLEAN DEFAULT true,
    verificada_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,

    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_modelos_contratos_ativo ON public.modelos_contratos(ativo);
CREATE INDEX IF NOT EXISTS idx_modelos_contratos_criado_por ON public.modelos_contratos(criado_por);

CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_modelo_id ON public.contratos_comerciais(modelo_id);
CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_status ON public.contratos_comerciais(status);
CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_criado_por ON public.contratos_comerciais(criado_por);

CREATE INDEX IF NOT EXISTS idx_assinaturas_contrato_id ON public.assinaturas_contratos_comerciais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_tipo ON public.assinaturas_contratos_comerciais(tipo);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_contrato_id ON public.logs_auditoria_contratos_comerciais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_evento ON public.logs_auditoria_contratos_comerciais(evento);

CREATE INDEX IF NOT EXISTS idx_tokens_contrato_id ON public.tokens_verificacao_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON public.tokens_verificacao_contratos(token);

CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_contrato_id ON public.evidencias_juridicas_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_tipo ON public.evidencias_juridicas_contratos(tipo_evidencia);
CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_timestamp ON public.evidencias_juridicas_contratos(timestamp_coleta);

-- Função simples para atualizar timestamp
CREATE OR REPLACE FUNCTION atualizar_timestamp_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
CREATE TRIGGER trigger_atualizar_modelos
    BEFORE UPDATE ON public.modelos_contratos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_atualizacao();

CREATE TRIGGER trigger_atualizar_contratos
    BEFORE UPDATE ON public.contratos_comerciais
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_atualizacao();

-- RLS (Row Level Security) Policies
ALTER TABLE public.modelos_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_contratos_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria_contratos_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens_verificacao_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias_juridicas_contratos ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para permitir acesso
CREATE POLICY "Permitir acesso para usuários autenticados" ON public.modelos_contratos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso para usuários autenticados" ON public.contratos_comerciais
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso para usuários autenticados" ON public.assinaturas_contratos_comerciais
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso para usuários autenticados" ON public.logs_auditoria_contratos_comerciais
    FOR ALL USING (auth.role() = 'authenticated');

-- Política especial para tokens (acesso público para validação)
CREATE POLICY "Permitir acesso público para tokens" ON public.tokens_verificacao_contratos
    FOR ALL USING (true);

CREATE POLICY "Permitir acesso para usuários autenticados" ON public.evidencias_juridicas_contratos
    FOR ALL USING (auth.role() = 'authenticated');

-- Comentários nas tabelas
COMMENT ON TABLE public.modelos_contratos IS 'Modelos de contratos com variáveis substituíveis';
COMMENT ON TABLE public.contratos_comerciais IS 'Contratos gerados a partir de modelos';
COMMENT ON TABLE public.assinaturas_contratos_comerciais IS 'Assinaturas eletrônicas dos contratos';
COMMENT ON TABLE public.logs_auditoria_contratos_comerciais IS 'Log de auditoria completo do processo';
COMMENT ON TABLE public.tokens_verificacao_contratos IS 'Tokens de verificação para assinatura externa';
COMMENT ON TABLE public.evidencias_juridicas_contratos IS 'Evidências jurídicas para validação de contratos';
