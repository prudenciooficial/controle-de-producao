-- ============================================================================
-- SCRIPT PARA VERIFICAR A ESTRUTURA ATUAL DO BANCO SUPABASE
-- Execute este script no SQL Editor do Supabase para ver o que já existe
-- ============================================================================

-- 1. VERIFICAR TABELAS EXISTENTES
SELECT 
    schemaname as schema,
    tablename as table_name,
    tableowner as owner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. VERIFICAR COLUNAS DE CADA TABELA
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. VERIFICAR CHAVES PRIMÁRIAS
SELECT 
    tc.table_name,
    kcu.column_name as primary_key_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 4. VERIFICAR CHAVES ESTRANGEIRAS
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 5. VERIFICAR ÍNDICES
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. VERIFICAR TRIGGERS
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 7. VERIFICAR FUNÇÕES PERSONALIZADAS
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 8. VERIFICAR VIEWS
SELECT 
    table_name as view_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 9. VERIFICAR POLÍTICAS RLS
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 10. VERIFICAR EXTENSÕES HABILITADAS
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension
ORDER BY extname;

-- 11. VERIFICAR REALTIME PUBLICATIONS
SELECT 
    pubname as publication_name,
    puballtables as all_tables
FROM pg_publication;

-- 12. CONTAR REGISTROS EM CADA TABELA
DO $$
DECLARE
    r RECORD;
    count_query TEXT;
    table_count INTEGER;
BEGIN
    RAISE NOTICE 'CONTAGEM DE REGISTROS POR TABELA:';
    RAISE NOTICE '=====================================';
    
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    LOOP
        count_query := 'SELECT COUNT(*) FROM public.' || quote_ident(r.tablename);
        EXECUTE count_query INTO table_count;
        RAISE NOTICE 'Tabela %: % registros', r.tablename, table_count;
    END LOOP;
END $$;

-- ============================================================================
-- INSTRUÇÕES:
-- 1. Copie e cole este script no SQL Editor do Supabase
-- 2. Execute todo o script
-- 3. Os resultados mostrarão a estrutura completa atual do seu banco
-- 4. Compare com as migrações para ver o que precisa ser aplicado
-- ============================================================================ 