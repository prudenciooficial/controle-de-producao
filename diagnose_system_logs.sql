-- Script de diagnóstico para system_logs

-- 1. Verificar se RLS está ativo
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'system_logs';

-- 2. Verificar políticas existentes
SELECT policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'system_logs';

-- 3. Verificar dados na tabela (contagem)
SELECT COUNT(*) as total_records FROM public.system_logs;

-- 4. Verificar últimos registros
SELECT id, created_at, user_id, user_display_name, action_type, entity_table 
FROM public.system_logs 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Desabilitar RLS temporariamente para teste (se necessário)
-- ALTER TABLE public.system_logs DISABLE ROW LEVEL SECURITY;

-- 6. Criar política para permitir leitura para usuários autenticados
-- CREATE POLICY "allow_authenticated_read" ON public.system_logs 
-- FOR SELECT USING (auth.role() = 'authenticated');

-- 7. Criar política para permitir inserção para usuários autenticados  
-- CREATE POLICY "allow_authenticated_insert" ON public.system_logs 
-- FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 8. Teste de inserção básica
-- INSERT INTO public.system_logs (action_type, entity_schema, entity_table) 
-- VALUES ('INSERT', 'public', 'test_table_diagnostic'); 