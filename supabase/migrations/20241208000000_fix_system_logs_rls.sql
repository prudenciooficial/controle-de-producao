-- Migração para corrigir RLS no system_logs
-- Data: 2024-12-08
-- Descrição: Corrige problemas de Row Level Security na tabela system_logs

-- 1. Remover políticas existentes que podem estar conflitando
DROP POLICY IF EXISTS "allow_authenticated_read" ON public.system_logs;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON public.system_logs;
DROP POLICY IF EXISTS "allow_authenticated_update" ON public.system_logs;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON public.system_logs;

-- 2. Recriar políticas permissivas para usuários autenticados
CREATE POLICY "Enable read access for authenticated users" ON public.system_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.system_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.system_logs
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.system_logs
  FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Garantir que RLS está habilitado
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 4. Verificar as policies criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'system_logs'
ORDER BY policyname;

-- 5. Inserir um log de teste para verificar se está funcionando
INSERT INTO public.system_logs (action_type, entity_schema, entity_table, user_display_name, entity_id) 
VALUES ('INSERT', 'public', 'migration_test', 'Sistema - Migração RLS', 'migration_' || extract(epoch from now()));

-- 6. Comentários sobre o fix
COMMENT ON TABLE public.system_logs IS 'Tabela de logs do sistema com RLS habilitado para usuários autenticados';
COMMENT ON POLICY "Enable read access for authenticated users" ON public.system_logs IS 'Permite leitura de logs para usuários autenticados';
COMMENT ON POLICY "Enable insert access for authenticated users" ON public.system_logs IS 'Permite inserção de logs para usuários autenticados';
COMMENT ON POLICY "Enable update access for authenticated users" ON public.system_logs IS 'Permite atualização de logs para usuários autenticados';
COMMENT ON POLICY "Enable delete access for authenticated users" ON public.system_logs IS 'Permite exclusão de logs para usuários autenticados'; 