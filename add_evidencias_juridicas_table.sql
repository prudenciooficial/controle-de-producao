-- Script para adicionar a tabela evidencias_juridicas_contratos
-- Execute este código no SQL Editor do Supabase

-- Criar tabela de evidências jurídicas
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

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_contrato_id ON public.evidencias_juridicas_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_tipo ON public.evidencias_juridicas_contratos(tipo_evidencia);
CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_timestamp ON public.evidencias_juridicas_contratos(timestamp_coleta);
CREATE INDEX IF NOT EXISTS idx_evidencias_juridicas_valida ON public.evidencias_juridicas_contratos(valida);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.evidencias_juridicas_contratos ENABLE ROW LEVEL SECURITY;

-- Criar política RLS
CREATE POLICY "Usuários podem ver evidências de seus contratos comerciais" ON public.evidencias_juridicas_contratos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.contratos_comerciais
            WHERE id = contrato_id
            AND (criado_por = auth.uid() OR assinante_interno_id = auth.uid())
        )
    );

-- Comentário na tabela
COMMENT ON TABLE public.evidencias_juridicas_contratos IS 'Evidências jurídicas para validação de contratos eletrônicos';

-- Comentários nas colunas
COMMENT ON COLUMN public.evidencias_juridicas_contratos.tipo_evidencia IS 'Tipo de evidência coletada';
COMMENT ON COLUMN public.evidencias_juridicas_contratos.dados_evidencia IS 'Dados estruturados da evidência em formato JSON';
COMMENT ON COLUMN public.evidencias_juridicas_contratos.hash_evidencia IS 'Hash SHA-256 da evidência para verificação de integridade';
COMMENT ON COLUMN public.evidencias_juridicas_contratos.timestamp_coleta IS 'Timestamp de quando a evidência foi coletada';
COMMENT ON COLUMN public.evidencias_juridicas_contratos.valida IS 'Indica se a evidência é válida';

SELECT 'Tabela evidencias_juridicas_contratos criada com sucesso!' as resultado;
