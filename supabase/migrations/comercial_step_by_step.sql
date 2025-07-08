-- EXECUTE ESTE SCRIPT PASSO A PASSO NO SUPABASE SQL EDITOR
-- Copie e cole cada seção separadamente

-- PASSO 1: Criar tabela de modelos de contratos
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

-- PASSO 2: Criar tabela de contratos comerciais
CREATE TABLE IF NOT EXISTS public.contratos_comerciais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    modelo_id UUID REFERENCES public.modelos_contratos(id) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    dados_variaveis JSONB DEFAULT '{}'::jsonb,
    assinante_externo_nome VARCHAR(255) NOT NULL,
    assinante_externo_email VARCHAR(255) NOT NULL,
    assinante_externo_documento VARCHAR(20) NOT NULL,
    assinante_interno_id UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'editando' CHECK (status IN ('editando', 'aguardando_assinatura_interna', 'aguardando_assinatura_externa', 'concluido', 'cancelado')),
    hash_documento VARCHAR(64),
    pdf_url TEXT,
    criado_por UUID REFERENCES auth.users(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalizado_em TIMESTAMP WITH TIME ZONE
);

-- PASSO 3: Criar tabela de assinaturas
CREATE TABLE IF NOT EXISTS public.assinaturas_contratos_comerciais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('interna_qualificada', 'externa_simples')),
    signatario_nome VARCHAR(255) NOT NULL,
    signatario_email VARCHAR(255) NOT NULL,
    signatario_documento VARCHAR(20) NOT NULL,
    certificado_dados JSONB,
    certificado_valido_ate TIMESTAMP WITH TIME ZONE,
    token_verificacao VARCHAR(6),
    token_validado_em TIMESTAMP WITH TIME ZONE,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    timestamp_assinatura TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'assinado', 'rejeitado')),
    assinado_em TIMESTAMP WITH TIME ZONE,
    hash_assinatura VARCHAR(128),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASSO 4: Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.logs_auditoria_contratos_comerciais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE,
    evento VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    dados_evento JSONB DEFAULT '{}'::jsonb,
    usuario_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    timestamp_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASSO 5: Criar tabela de tokens de verificação
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

-- PASSO 6: Criar índices
CREATE INDEX IF NOT EXISTS idx_modelos_contratos_ativo ON public.modelos_contratos(ativo);
CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_modelo_id ON public.contratos_comerciais(modelo_id);
CREATE INDEX IF NOT EXISTS idx_contratos_comerciais_status ON public.contratos_comerciais(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_contrato_id ON public.assinaturas_contratos_comerciais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_contrato_id ON public.logs_auditoria_contratos_comerciais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_tokens_contrato_id ON public.tokens_verificacao_contratos(contrato_id);

-- PASSO 7: Habilitar RLS
ALTER TABLE public.modelos_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_contratos_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria_contratos_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens_verificacao_contratos ENABLE ROW LEVEL SECURITY;

-- PASSO 8: Criar políticas de segurança
CREATE POLICY "Acesso para usuários autenticados" ON public.modelos_contratos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso para usuários autenticados" ON public.contratos_comerciais FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso para usuários autenticados" ON public.assinaturas_contratos_comerciais FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso para usuários autenticados" ON public.logs_auditoria_contratos_comerciais FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso público para tokens" ON public.tokens_verificacao_contratos FOR ALL USING (true);
