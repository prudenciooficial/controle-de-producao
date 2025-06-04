-- Correção de RLS para system_logs
-- Este script corrige problemas de Row Level Security na tabela system_logs

-- 1. Desabilitar RLS temporariamente (se estiver causando problemas)
ALTER TABLE public.system_logs DISABLE ROW LEVEL SECURITY;

-- 2. Reabilitar RLS com políticas adequadas
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas existentes (se houver conflitos)
DROP POLICY IF EXISTS "allow_authenticated_read" ON public.system_logs;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON public.system_logs;
DROP POLICY IF EXISTS "allow_authenticated_update" ON public.system_logs;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON public.system_logs;

-- 4. Criar política permissiva para leitura (usuários autenticados)
CREATE POLICY "allow_authenticated_read" ON public.system_logs 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 5. Criar política permissiva para inserção (usuários autenticados)
CREATE POLICY "allow_authenticated_insert" ON public.system_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 6. Criar política permissiva para atualização (usuários autenticados)
CREATE POLICY "allow_authenticated_update" ON public.system_logs 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 7. Criar política permissiva para exclusão (usuários autenticados)  
CREATE POLICY "allow_authenticated_delete" ON public.system_logs 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- 8. Garantir que as políticas estão ativas
-- Verificar resultado:
SELECT policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'system_logs';

-- 9. Teste de inserção após correção
INSERT INTO public.system_logs (action_type, entity_schema, entity_table, user_display_name) 
VALUES ('INSERT', 'public', 'rls_fix_test', 'Sistema - Teste RLS');

-- 10. Verificar se o teste funcionou
SELECT * FROM public.system_logs WHERE entity_table = 'rls_fix_test'; 