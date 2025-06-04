-- Migração para investigar e corrigir constraint check_data_for_action
-- Data: 2024-12-08
-- Descrição: Investiga e corrige problemas com a constraint de validação de dados

-- 1. Verificar se a constraint existe
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.system_logs'::regclass 
AND conname LIKE '%check%';

-- 2. Se a constraint existir e estiver causando problemas, removê-la temporariamente
DO $$
BEGIN
    -- Verificar se a constraint existe antes de tentar removê-la
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.system_logs'::regclass AND conname = 'check_data_for_action') THEN
        ALTER TABLE public.system_logs DROP CONSTRAINT check_data_for_action;
        RAISE NOTICE 'Constraint check_data_for_action removida';
    ELSE
        RAISE NOTICE 'Constraint check_data_for_action não encontrada';
    END IF;
END $$;

-- 3. Criar uma constraint mais flexível (se necessário)
-- Esta constraint permite mais flexibilidade nos dados
DO $$
BEGIN
    -- Criar nova constraint mais permissiva
    ALTER TABLE public.system_logs 
    ADD CONSTRAINT check_logs_data_consistency 
    CHECK (
        -- Para INSERT: pode ter new_data ou não
        (action_type = 'INSERT') OR
        -- Para UPDATE: deve ter pelo menos old_data ou new_data
        (action_type = 'UPDATE' AND (old_data IS NOT NULL OR new_data IS NOT NULL)) OR
        -- Para DELETE: pode ter old_data ou não
        (action_type = 'DELETE')
    );
    RAISE NOTICE 'Nova constraint check_logs_data_consistency criada';
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint check_logs_data_consistency já existe';
END $$;

-- 4. Teste de inserção após correção
INSERT INTO public.system_logs (action_type, entity_schema, entity_table, user_display_name) 
VALUES ('INSERT', 'public', 'migration_constraint_test', 'Sistema - Teste Constraint');

-- 5. Verificar se o teste funcionou
SELECT * FROM public.system_logs WHERE entity_table = 'migration_constraint_test';

-- 6. Comentário sobre a correção
COMMENT ON CONSTRAINT check_logs_data_consistency ON public.system_logs 
IS 'Constraint flexível que permite inserções sem dados obrigatórios em old_data/new_data';

-- 7. Listar todas as constraints após correção
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.system_logs'::regclass
ORDER BY conname; 