-- ============================================================================
-- VERIFICAÇÃO RÁPIDA DA ESTRUTURA DO BANCO SUPABASE
-- ============================================================================

-- Listar todas as tabelas existentes no schema public
SELECT 'TABELAS EXISTENTES:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Verificar se as tabelas principais do sistema existem
SELECT 'VERIFICAÇÃO DAS TABELAS PRINCIPAIS:' as info;
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') 
         THEN '✓ products' ELSE '✗ products (não existe)' END as status
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'materials') 
         THEN '✓ materials' ELSE '✗ materials (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers') 
         THEN '✓ suppliers' ELSE '✗ suppliers (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'material_batches') 
         THEN '✓ material_batches' ELSE '✗ material_batches (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'production_batches') 
         THEN '✓ production_batches' ELSE '✗ production_batches (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'produced_items') 
         THEN '✓ produced_items' ELSE '✗ produced_items (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'used_materials') 
         THEN '✓ used_materials' ELSE '✗ used_materials (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') 
         THEN '✓ orders' ELSE '✗ orders (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') 
         THEN '✓ order_items' ELSE '✗ order_items (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') 
         THEN '✓ sales' ELSE '✗ sales (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sale_items') 
         THEN '✓ sale_items' ELSE '✗ sale_items (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'losses') 
         THEN '✓ losses' ELSE '✗ losses (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'global_settings') 
         THEN '✓ global_settings' ELSE '✗ global_settings (não existe)' END
UNION ALL
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_logs') 
         THEN '✓ system_logs' ELSE '✗ system_logs (não existe)' END;

-- Contar registros nas tabelas (se existirem)
DO $$
DECLARE
    tables TEXT[] := ARRAY['products', 'materials', 'suppliers', 'material_batches', 'production_batches', 'produced_items', 'used_materials', 'orders', 'order_items', 'sales', 'sale_items', 'losses', 'global_settings', 'system_logs'];
    tbl TEXT;
    count_result INTEGER;
    sql_query TEXT;
BEGIN
    RAISE NOTICE 'CONTAGEM DE REGISTROS:';
    RAISE NOTICE '=====================';
    
    FOREACH tbl IN ARRAY tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            sql_query := 'SELECT COUNT(*) FROM public.' || quote_ident(tbl);
            EXECUTE sql_query INTO count_result;
            RAISE NOTICE '%: % registros', tbl, count_result;
        ELSE
            RAISE NOTICE '%: tabela não existe', tbl;
        END IF;
    END LOOP;
END $$; 