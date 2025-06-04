-- Script para investigar constraints da tabela system_logs

-- 1. Verificar todas as constraints da tabela
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.system_logs'::regclass;

-- 2. Verificar especificamente a constraint check_data_for_action
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.system_logs'::regclass 
AND conname = 'check_data_for_action';

-- 3. Verificar estrutura da tabela
\d public.system_logs;

-- 4. Verificar se há triggers ativos
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'system_logs';

-- 5. Testar inserção simples para identificar o problema
INSERT INTO public.system_logs (action_type, entity_schema, entity_table, user_display_name) 
VALUES ('INSERT', 'public', 'test_simple', 'Teste Simples');

-- 6. Testar inserção com new_data
INSERT INTO public.system_logs (action_type, entity_schema, entity_table, user_display_name, new_data) 
VALUES ('INSERT', 'public', 'test_with_data', 'Teste Com Dados', '{"test": "value"}');

-- 7. Verificar últimos registros para comparar
SELECT * FROM public.system_logs ORDER BY created_at DESC LIMIT 3; 