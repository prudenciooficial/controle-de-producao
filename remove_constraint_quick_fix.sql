-- Script de correção rápida para constraint check_data_for_action
-- Execute este script no SQL Editor do Supabase para remover a constraint problemática

-- 1. Verificar constraints existentes
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.system_logs'::regclass 
AND conname LIKE '%check%';

-- 2. Remover a constraint problemática
ALTER TABLE public.system_logs DROP CONSTRAINT IF EXISTS check_data_for_action;
ALTER TABLE public.system_logs DROP CONSTRAINT IF EXISTS system_logs_action_type_check;

-- 3. Verificar se foi removida
SELECT 'Constraints removidas com sucesso!' as status;

-- 4. Teste de inserção simples
INSERT INTO public.system_logs (action_type, entity_schema, entity_table, user_display_name) 
VALUES ('INSERT', 'public', 'quick_fix_test', 'Sistema - Quick Fix');

-- 5. Verificar se funcionou
SELECT * FROM public.system_logs WHERE entity_table = 'quick_fix_test'; 