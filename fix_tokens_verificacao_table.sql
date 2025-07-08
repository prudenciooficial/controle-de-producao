-- Script para corrigir a estrutura da tabela tokens_verificacao_contratos
-- Execute este código no SQL Editor do Supabase

-- 1. Primeiro, vamos verificar se a tabela existe e tem dados
-- Se houver dados, vamos preservá-los durante a migração

-- 2. Renomear colunas para corresponder ao código
ALTER TABLE public.tokens_verificacao_contratos 
RENAME COLUMN email TO email_destinatario;

ALTER TABLE public.tokens_verificacao_contratos 
RENAME COLUMN expira_em TO valido_ate;

ALTER TABLE public.tokens_verificacao_contratos 
RENAME COLUMN endereco_ip TO ip_uso;

ALTER TABLE public.tokens_verificacao_contratos 
RENAME COLUMN agente_usuario TO user_agent_uso;

-- 3. Atualizar a referência da foreign key para apontar para contratos_comerciais
-- Primeiro, remover a constraint existente
ALTER TABLE public.tokens_verificacao_contratos 
DROP CONSTRAINT IF EXISTS tokens_verificacao_contratos_contrato_id_fkey;

-- Adicionar nova constraint apontando para contratos_comerciais
ALTER TABLE public.tokens_verificacao_contratos 
ADD CONSTRAINT tokens_verificacao_contratos_contrato_id_fkey 
FOREIGN KEY (contrato_id) REFERENCES public.contratos_comerciais(id) ON DELETE CASCADE;

-- 4. Verificar se precisamos ajustar o tipo da coluna token para VARCHAR(6)
-- (caso esteja diferente)
ALTER TABLE public.tokens_verificacao_contratos 
ALTER COLUMN token TYPE VARCHAR(6);

-- 5. Adicionar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_tokens_contrato_id ON public.tokens_verificacao_contratos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON public.tokens_verificacao_contratos(token);
CREATE INDEX IF NOT EXISTS idx_tokens_valido_ate ON public.tokens_verificacao_contratos(valido_ate);

-- 6. Habilitar RLS se não estiver habilitado
ALTER TABLE public.tokens_verificacao_contratos ENABLE ROW LEVEL SECURITY;

-- 7. Criar política RLS se não existir
DROP POLICY IF EXISTS "Permitir acesso público para tokens" ON public.tokens_verificacao_contratos;
CREATE POLICY "Permitir acesso público para tokens" ON public.tokens_verificacao_contratos
    FOR ALL USING (true);

-- 8. Atualizar comentário da tabela
COMMENT ON TABLE public.tokens_verificacao_contratos IS 'Tokens de verificação para assinatura externa de contratos comerciais';

SELECT 'Tabela tokens_verificacao_contratos atualizada com sucesso!' as resultado;
