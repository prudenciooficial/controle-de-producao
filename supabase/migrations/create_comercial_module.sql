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
    
    -- Tipo de assinatura
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('interna_qualificada', 'externa_simples')),
    
    -- Dados do signatário
    signatario_nome VARCHAR(255) NOT NULL,
    signatario_email VARCHAR(255) NOT NULL,
    signatario_documento VARCHAR(20) NOT NULL,
    
    -- Dados da assinatura interna (certificado digital)
    certificado_dados JSONB, -- Dados do certificado ICP-Brasil
    certificado_valido_ate TIMESTAMP WITH TIME ZONE,
    
    -- Dados da assinatura externa (token)
    token_verificacao VARCHAR(6), -- Token de 6 dígitos
    token_valido_ate TIMESTAMP WITH TIME ZONE,
    token_validado_em TIMESTAMP WITH TIME ZONE,
    
    -- Evidências técnicas obrigatórias
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    timestamp_assinatura TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'assinado', 'expirado', 'cancelado')),
    assinado_em TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de logs de auditoria (Audit Trail)
CREATE TABLE IF NOT EXISTS public.logs_auditoria_contratos_comerciais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE,
    
    -- Dados do evento
    evento VARCHAR(100) NOT NULL, -- Ex: 'contrato_criado', 'assinatura_solicitada', 'token_validado'
    descricao TEXT NOT NULL,
    dados_evento JSONB DEFAULT '{}'::jsonb, -- Dados específicos do evento
    
    -- Evidências técnicas
    ip_address INET,
    user_agent TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    
    -- Timestamp
    timestamp_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de tokens de verificação
CREATE TABLE IF NOT EXISTS public.tokens_verificacao_contratos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE,
    token VARCHAR(6) NOT NULL,
    email_destinatario VARCHAR(255) NOT NULL,
    valido_ate TIMESTAMP WITH TIME ZONE NOT NULL,
    usado_em TIMESTAMP WITH TIME ZONE,
    ip_uso INET,
    user_agent_uso TEXT,
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

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_status ON public.contratos_comerciais(status);
CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_criado_por ON public.contratos_comerciais(criado_por);
CREATE INDEX IF NOT EXISTS idx_assinaturas_contratos_comerciais_contrato_id ON public.assinaturas_contratos_comerciais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_logs_contratos_comerciais_contrato_id ON public.logs_auditoria_contratos_comerciais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_tokens_contratos_contrato_id ON public.tokens_verificacao_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_tokens_contratos_token ON public.tokens_verificacao_contratos(token);

CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_contrato_id ON public.evidencias_juridicas_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_tipo ON public.evidencias_juridicas_contratos(tipo_evidencia);
CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_timestamp ON public.evidencias_juridicas_contratos(timestamp_coleta);
CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_valida ON public.evidencias_juridicas_contratos(valida);

-- 7. Triggers para atualizar timestamp
CREATE OR REPLACE FUNCTION atualizar_timestamp_modificacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_modelos_contratos_timestamp
    BEFORE UPDATE ON public.modelos_contratos
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_modificacao();

CREATE TRIGGER trigger_contratos_comerciais_timestamp
    BEFORE UPDATE ON public.contratos_comerciais
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_modificacao();

-- 8. Função para gerar token de 6 dígitos
CREATE OR REPLACE FUNCTION gerar_token_verificacao()
RETURNS VARCHAR(6) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 9. Função para extrair variáveis do conteúdo do modelo
CREATE OR REPLACE FUNCTION extrair_variaveis_modelo(conteudo TEXT)
RETURNS JSONB AS $$
DECLARE
    variaveis TEXT[];
    variavel TEXT;
    resultado JSONB := '[]'::jsonb;
BEGIN
    -- Extrair todas as variáveis no formato [NOME_VARIAVEL]
    SELECT array_agg(DISTINCT matches[1])
    INTO variaveis
    FROM regexp_matches(conteudo, '\[([A-Z_]+)\]', 'g') AS matches;
    
    -- Converter para JSONB
    IF variaveis IS NOT NULL THEN
        FOREACH variavel IN ARRAY variaveis
        LOOP
            resultado := resultado || jsonb_build_array(jsonb_build_object(
                'nome', variavel,
                'label', replace(replace(variavel, '_', ' '), 'NOME', 'Nome'),
                'tipo', 'text',
                'obrigatorio', true
            ));
        END LOOP;
    END IF;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger para extrair variáveis automaticamente
CREATE OR REPLACE FUNCTION trigger_extrair_variaveis()
RETURNS TRIGGER AS $$
BEGIN
    NEW.variaveis := extrair_variaveis_modelo(NEW.conteudo);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_modelos_extrair_variaveis
    BEFORE INSERT OR UPDATE ON public.modelos_contratos
    FOR EACH ROW EXECUTE FUNCTION trigger_extrair_variaveis();

-- 11. RLS (Row Level Security) - Configuração básica
ALTER TABLE public.modelos_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_contratos_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria_contratos_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens_verificacao_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias_juridicas_contratos ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (usuários autenticados podem ver seus próprios dados)
CREATE POLICY "Usuários podem ver seus modelos" ON public.modelos_contratos
    FOR ALL USING (auth.uid() = criado_por);

CREATE POLICY "Usuários podem ver seus contratos comerciais" ON public.contratos_comerciais
    FOR ALL USING (auth.uid() = criado_por OR auth.uid() = assinante_interno_id);

-- Política especial para assinatura externa (acesso público com token)
CREATE POLICY "Acesso público para assinatura externa comercial" ON public.contratos_comerciais
    FOR SELECT USING (status = 'aguardando_assinatura_externa');

CREATE POLICY "Usuários podem ver assinaturas de seus contratos comerciais" ON public.assinaturas_contratos_comerciais
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.contratos_comerciais
            WHERE id = contrato_id
            AND (criado_por = auth.uid() OR assinante_interno_id = auth.uid())
        )
    );

CREATE POLICY "Usuários podem ver evidências de seus contratos comerciais" ON public.evidencias_juridicas_contratos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.contratos_comerciais
            WHERE id = contrato_id
            AND (criado_por = auth.uid() OR assinante_interno_id = auth.uid())
        )
    );

-- 12. Comentários para documentação
COMMENT ON TABLE public.modelos_contratos IS 'Modelos de contratos com variáveis substituíveis';
COMMENT ON TABLE public.contratos_comerciais IS 'Contratos comerciais gerados a partir de modelos com dados preenchidos';
COMMENT ON TABLE public.assinaturas_contratos_comerciais IS 'Registro de assinaturas eletrônicas qualificadas e simples';
COMMENT ON TABLE public.logs_auditoria_contratos_comerciais IS 'Log de auditoria completo para validade jurídica';
COMMENT ON TABLE public.tokens_verificacao_contratos IS 'Tokens de verificação para assinatura externa';
COMMENT ON TABLE public.evidencias_juridicas_contratos IS 'Evidências jurídicas para validação de contratos eletrônicos';

-- Finalização
SELECT 'Módulo Comercial criado com sucesso!' as resultado;
