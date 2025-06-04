-- ============================================================================
-- SCRIPT PARA CORRIGIR DADOS INCONSISTENTES DE ESTOQUE
-- Execute no SQL Editor do Supabase para corrigir problemas históricos
-- ============================================================================

-- ATENÇÃO: Este script IRÁ ALTERAR OS DADOS. Faça backup antes de executar!

-- 1. DIAGNÓSTICO: Mostrar todos os problemas encontrados
SELECT 'DIAGNÓSTICO: Materiais com estoque inconsistente' as info;
SELECT 
    m.name as material_nome,
    mb.batch_number as lote_material,
    mb.remaining_quantity as estoque_atual,
    COALESCE(SUM(um.quantity), 0) as total_usado,
    (mb.quantity - COALESCE(SUM(um.quantity), 0)) as estoque_esperado,
    (mb.remaining_quantity - (mb.quantity - COALESCE(SUM(um.quantity), 0))) as diferenca,
    CASE 
        WHEN mb.remaining_quantity = (mb.quantity - COALESCE(SUM(um.quantity), 0)) THEN '✅ OK'
        ELSE '❌ INCONSISTENTE'
    END as status
FROM materials m
JOIN material_batches mb ON m.id = mb.material_id
LEFT JOIN used_materials um ON mb.id = um.material_batch_id
GROUP BY m.name, mb.batch_number, mb.remaining_quantity, mb.quantity, mb.id
HAVING mb.remaining_quantity != (mb.quantity - COALESCE(SUM(um.quantity), 0))
ORDER BY m.name, mb.batch_number;

-- 2. SCRIPT DE CORREÇÃO AUTOMÁTICA
-- Este script corrige automaticamente os estoques inconsistentes

DO $$
DECLARE
    batch_record RECORD;
    correct_remaining DECIMAL(15,4);
    total_used DECIMAL(15,4);
BEGIN
    RAISE NOTICE 'Iniciando correção automática de estoque...';
    
    -- Buscar todos os lotes com problemas
    FOR batch_record IN 
        SELECT 
            mb.id,
            mb.batch_number,
            m.name as material_name,
            mb.quantity as original_quantity,
            mb.remaining_quantity as current_remaining,
            COALESCE(SUM(um.quantity), 0) as total_used_calculated
        FROM materials m
        JOIN material_batches mb ON m.id = mb.material_id
        LEFT JOIN used_materials um ON mb.id = um.material_batch_id
        GROUP BY mb.id, mb.batch_number, m.name, mb.quantity, mb.remaining_quantity
        HAVING mb.remaining_quantity != (mb.quantity - COALESCE(SUM(um.quantity), 0))
    LOOP
        -- Calcular o estoque correto
        correct_remaining := batch_record.original_quantity - batch_record.total_used_calculated;
        
        RAISE NOTICE 'Corrigindo lote % (%) - De % para %', 
            batch_record.batch_number, 
            batch_record.material_name,
            batch_record.current_remaining, 
            correct_remaining;
            
        -- Atualizar o estoque
        UPDATE material_batches 
        SET remaining_quantity = correct_remaining
        WHERE id = batch_record.id;
        
    END LOOP;
    
    RAISE NOTICE 'Correção concluída!';
END $$;

-- 3. VERIFICAÇÃO PÓS-CORREÇÃO
SELECT 'VERIFICAÇÃO PÓS-CORREÇÃO' as info;
SELECT * FROM verificar_integridade_estoque();

-- 4. CRIAR FUNÇÃO PARA MONITORAMENTO CONTÍNUO
CREATE OR REPLACE FUNCTION detectar_inconsistencias_estoque()
RETURNS TABLE(
    material_id UUID,
    batch_id UUID,
    material_nome text,
    lote_material text,
    estoque_atual numeric,
    estoque_esperado numeric,
    diferenca numeric,
    data_deteccao timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as material_id,
        mb.id as batch_id,
        m.name::text as material_nome,
        mb.batch_number::text as lote_material,
        mb.remaining_quantity as estoque_atual,
        (mb.quantity - COALESCE(SUM(um.quantity), 0)) as estoque_esperado,
        (mb.remaining_quantity - (mb.quantity - COALESCE(SUM(um.quantity), 0))) as diferenca,
        NOW() as data_deteccao
    FROM materials m
    JOIN material_batches mb ON m.id = mb.material_id
    LEFT JOIN used_materials um ON mb.id = um.material_batch_id
    GROUP BY m.id, m.name, mb.id, mb.batch_number, mb.remaining_quantity, mb.quantity
    HAVING mb.remaining_quantity != (mb.quantity - COALESCE(SUM(um.quantity), 0));
END;
$$ LANGUAGE plpgsql;

-- 5. CRIAR TRIGGER PARA PREVENÇÃO AUTOMÁTICA (OPCIONAL)
-- Este trigger previne futuras inconsistências

CREATE OR REPLACE FUNCTION prevent_stock_inconsistency()
RETURNS TRIGGER AS $$
DECLARE
    expected_remaining DECIMAL(15,4);
    total_used DECIMAL(15,4);
    batch_info RECORD;
BEGIN
    -- Buscar informações do lote de material
    SELECT mb.quantity, mb.batch_number, m.name 
    INTO batch_info
    FROM material_batches mb
    JOIN materials m ON mb.material_id = m.id
    WHERE mb.id = NEW.material_batch_id;
    
    -- Calcular total usado para este lote
    SELECT COALESCE(SUM(quantity), 0) 
    INTO total_used
    FROM used_materials 
    WHERE material_batch_id = NEW.material_batch_id;
    
    -- Incluir a nova quantidade sendo inserida
    total_used := total_used + NEW.quantity;
    
    -- Calcular estoque esperado
    expected_remaining := batch_info.quantity - total_used;
    
    -- Atualizar automaticamente o remaining_quantity
    UPDATE material_batches 
    SET remaining_quantity = expected_remaining
    WHERE id = NEW.material_batch_id;
    
    RAISE NOTICE 'Estoque atualizado automaticamente para lote % (%): %', 
        batch_info.batch_number, batch_info.name, expected_remaining;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger (descomente se quiser ativação automática)
/*
DROP TRIGGER IF EXISTS trigger_update_stock_on_material_use ON used_materials;
CREATE TRIGGER trigger_update_stock_on_material_use
    AFTER INSERT ON used_materials
    FOR EACH ROW
    EXECUTE FUNCTION prevent_stock_inconsistency();
*/

-- 6. SCRIPT PARA AUDITORIA COMPLETA
CREATE OR REPLACE FUNCTION auditoria_completa_estoque()
RETURNS TABLE(
    relatorio text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'AUDITORIA COMPLETA DE ESTOQUE - ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS')::text;
    
    RETURN QUERY
    SELECT '================================='::text;
    
    RETURN QUERY
    SELECT ('Total de lotes: ' || COUNT(*)::text) as relatorio
    FROM material_batches;
    
    RETURN QUERY
    SELECT ('Lotes com problemas: ' || COUNT(*)::text) as relatorio
    FROM detectar_inconsistencias_estoque();
    
    RETURN QUERY
    SELECT ('Total de materiais usados: ' || COUNT(*)::text) as relatorio
    FROM used_materials;
    
    RETURN QUERY
    SELECT ('Total de produções: ' || COUNT(*)::text) as relatorio
    FROM production_batches;
    
    RETURN QUERY
    SELECT '================================='::text;
    
    -- Mostrar os 5 maiores problemas
    RETURN QUERY
    SELECT ('MAIOR INCONSISTÊNCIA: ' || material_nome || ' - Lote ' || lote_material || ' (Diferença: ' || diferenca::text || ')')::text as relatorio
    FROM detectar_inconsistencias_estoque()
    ORDER BY ABS(diferenca) DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- 7. EXECUTAR AUDITORIA
SELECT * FROM auditoria_completa_estoque();

-- ============================================================================
-- INSTRUÇÕES DE USO:
-- ============================================================================
/*
1. DIAGNÓSTICO: Execute as primeiras consultas para ver os problemas
2. BACKUP: Sempre faça backup antes de executar correções
3. CORREÇÃO: Execute o bloco DO $$ para corrigir automaticamente
4. VERIFICAÇÃO: Execute a verificação pós-correção
5. MONITORAMENTO: Use detectar_inconsistencias_estoque() regularmente

COMANDOS ÚTEIS PARA MONITORAMENTO:
- SELECT * FROM verificar_integridade_estoque();
- SELECT * FROM detectar_inconsistencias_estoque();
- SELECT * FROM auditoria_completa_estoque();

Se quiser ativar prevenção automática, descomente o trigger no final.
*/ 