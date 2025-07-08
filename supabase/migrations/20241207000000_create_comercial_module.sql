-- Migração para criar o módulo Comercial completo
-- Sistema de contratos com assinaturas eletrônicas qualificadas e simples

-- 1. Tabela de modelos de contratos
CREATE TABLE IF NOT EXISTS public.modelos_contratos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    conteudo TEXT NOT NULL, -- Conteúdo do modelo com variáveis [NOME_VARIAVEL]
    variaveis JSONB DEFAULT '[]'::jsonb, -- Array de variáveis extraídas do conteúdo
    ativo BOOLEAN DEFAULT true,
    criado_por UUID REFERENCES auth.users(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de contratos comerciais (novo módulo)
CREATE TABLE IF NOT EXISTS public.contratos_comerciais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    modelo_id UUID REFERENCES public.modelos_contratos(id) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL, -- Conteúdo final com variáveis preenchidas
    dados_variaveis JSONB DEFAULT '{}'::jsonb, -- Dados preenchidos pelo usuário
    
    -- Dados do signatário externo
    assinante_externo_nome VARCHAR(255) NOT NULL,
    assinante_externo_email VARCHAR(255) NOT NULL,
    assinante_externo_documento VARCHAR(20) NOT NULL, -- CPF ou CNPJ
    
    -- Dados do signatário interno
    assinante_interno_id UUID REFERENCES auth.users(id),
    
    -- Status do contrato
    status VARCHAR(50) DEFAULT 'editando' CHECK (status IN ('editando', 'aguardando_assinatura_interna', 'aguardando_assinatura_externa', 'concluido', 'cancelado')),
    
    -- Dados de integridade
    hash_documento VARCHAR(64), -- SHA-256 do PDF final
    pdf_url TEXT, -- URL do PDF gerado
    
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
    
    -- Dados da assinatura digital qualificada (para assinatura interna)
    certificado_dados JSONB, -- Dados do certificado ICP-Brasil
    certificado_valido_ate TIMESTAMP WITH TIME ZONE,
    
    -- Dados da assinatura simples (para assinatura externa)
    token_verificacao VARCHAR(6), -- Token de 6 dígitos
    token_validado_em TIMESTAMP WITH TIME ZONE,
    
    -- Evidências técnicas obrigatórias
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    timestamp_assinatura TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status e dados da assinatura
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'assinado', 'rejeitado')),
    assinado_em TIMESTAMP WITH TIME ZONE,
    hash_assinatura VARCHAR(128), -- Hash da assinatura digital
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.logs_auditoria_contratos_comerciais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE,
    
    -- Dados do evento
    evento VARCHAR(100) NOT NULL, -- Tipo do evento
    descricao TEXT NOT NULL, -- Descrição detalhada
    dados_evento JSONB DEFAULT '{}'::jsonb, -- Dados específicos do evento
    
    -- Evidências técnicas
    usuario_id UUID REFERENCES auth.users(id), -- Usuário que executou a ação (se aplicável)
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    timestamp_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de tokens de verificação
CREATE TABLE IF NOT EXISTS public.tokens_verificacao_contratos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE,
    token VARCHAR(6) NOT NULL, -- Token de 6 dígitos
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_modelos_contratos_ativo ON public.modelos_contratos(ativo);
CREATE INDEX IF NOT EXISTS idx_modelos_contratos_criado_por ON public.modelos_contratos(criado_por);

CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_modelo_id ON public.contratos_comerciais(modelo_id);
CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_status ON public.contratos_comerciais(status);
CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_criado_por ON public.contratos_comerciais(criado_por);
CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_assinante_interno ON public.contratos_comerciais(assinante_interno_id);

CREATE INDEX IF NOT EXISTS idx_assinaturas_contrato_id ON public.assinaturas_contratos_comerciais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_tipo ON public.assinaturas_contratos_comerciais(tipo);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON public.assinaturas_contratos_comerciais(status);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_contrato_id ON public.logs_auditoria_contratos_comerciais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_evento ON public.logs_auditoria_contratos_comerciais(evento);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_timestamp ON public.logs_auditoria_contratos_comerciais(timestamp_evento);

CREATE INDEX IF NOT EXISTS idx_tokens_contrato_id ON public.tokens_verificacao_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON public.tokens_verificacao_contratos(token);
CREATE INDEX IF NOT EXISTS idx_tokens_valido_ate ON public.tokens_verificacao_contratos(valido_ate);

-- Função para extrair variáveis do conteúdo do modelo
CREATE OR REPLACE FUNCTION extrair_variaveis_modelo()
RETURNS TRIGGER AS $$
BEGIN
    -- Simplesmente atualizar o timestamp, as variáveis serão extraídas no frontend
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para extrair variáveis automaticamente
DROP TRIGGER IF EXISTS trigger_extrair_variaveis ON public.modelos_contratos;
CREATE TRIGGER trigger_extrair_variaveis
    BEFORE INSERT OR UPDATE ON public.modelos_contratos
    FOR EACH ROW
    EXECUTE FUNCTION extrair_variaveis_modelo();

-- Função para atualizar timestamp de atualização
CREATE OR REPLACE FUNCTION atualizar_timestamp_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
DROP TRIGGER IF EXISTS trigger_atualizar_contratos ON public.contratos_comerciais;
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

-- Políticas para modelos_contratos
CREATE POLICY "Usuários autenticados podem ver modelos ativos" ON public.modelos_contratos
    FOR SELECT USING (auth.role() = 'authenticated' AND ativo = true);

CREATE POLICY "Usuários autenticados podem criar modelos" ON public.modelos_contratos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Criadores podem editar seus modelos" ON public.modelos_contratos
    FOR UPDATE USING (auth.uid() = criado_por);

CREATE POLICY "Criadores podem deletar seus modelos" ON public.modelos_contratos
    FOR DELETE USING (auth.uid() = criado_por);

-- Políticas para contratos_comerciais
CREATE POLICY "Usuários autenticados podem ver contratos" ON public.contratos_comerciais
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem criar contratos" ON public.contratos_comerciais
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Criadores e responsáveis podem editar contratos" ON public.contratos_comerciais
    FOR UPDATE USING (auth.uid() = criado_por OR auth.uid() = assinante_interno_id);

CREATE POLICY "Criadores podem deletar contratos em edição" ON public.contratos_comerciais
    FOR DELETE USING (auth.uid() = criado_por AND status IN ('editando', 'cancelado'));

-- Políticas para assinaturas (leitura para usuários autenticados)
CREATE POLICY "Usuários autenticados podem ver assinaturas" ON public.assinaturas_contratos_comerciais
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sistema pode inserir assinaturas" ON public.assinaturas_contratos_comerciais
    FOR INSERT WITH CHECK (true);

-- Políticas para logs de auditoria (apenas leitura)
CREATE POLICY "Usuários autenticados podem ver logs" ON public.logs_auditoria_contratos_comerciais
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sistema pode inserir logs" ON public.logs_auditoria_contratos_comerciais
    FOR INSERT WITH CHECK (true);

-- Políticas para tokens (acesso público para validação)
CREATE POLICY "Acesso público para validação de tokens" ON public.tokens_verificacao_contratos
    FOR SELECT USING (true);

CREATE POLICY "Sistema pode gerenciar tokens" ON public.tokens_verificacao_contratos
    FOR ALL USING (true);

-- Comentários nas tabelas
COMMENT ON TABLE public.modelos_contratos IS 'Modelos de contratos com variáveis substituíveis';
COMMENT ON TABLE public.contratos_comerciais IS 'Contratos gerados a partir de modelos';
COMMENT ON TABLE public.assinaturas_contratos_comerciais IS 'Assinaturas eletrônicas dos contratos';
COMMENT ON TABLE public.logs_auditoria_contratos_comerciais IS 'Log de auditoria completo do processo';
COMMENT ON TABLE public.tokens_verificacao_contratos IS 'Tokens de verificação para assinatura externa';
