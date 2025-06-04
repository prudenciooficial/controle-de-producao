-- ============================================================================
-- SCRIPT DE TESTE PARA VERIFICAR CORREÇÕES DE ESTOQUE
-- Execute no SQL Editor do Supabase para verificar se as correções funcionam
-- ============================================================================

-- 1. VERIFICAR ESTADO ATUAL DO ESTOQUE
SELECT 'ESTADO ATUAL DOS MATERIAIS (ANTES DO TESTE)' as info;
SELECT 
    m.name as material_nome,
    mb.batch_number as lote,
    mb.remaining_quantity as estoque_atual,
    mb.unit_of_measure as unidade
FROM materials m
JOIN material_batches mb ON m.id = mb.material_id
WHERE m.name ILIKE '%fécula%' 
ORDER BY m.name, mb.created_at DESC;

-- 2. VERIFICAR PRODUÇÕES EXISTENTES QUE USAM FÉCULA
SELECT 'PRODUÇÕES QUE USAM FÉCULA' as info;
SELECT 
    pb.batch_number as lote_producao,
    pb.production_date as data_producao,
    m.name as material_usado,
    um.quantity as quantidade_usada,
    um.unit_of_measure as unidade
FROM production_batches pb
JOIN used_materials um ON pb.id = um.production_batch_id
JOIN material_batches mb ON um.material_batch_id = mb.id
JOIN materials m ON mb.material_id = m.id
WHERE m.name ILIKE '%fécula%'
ORDER BY pb.production_date DESC;

-- 3. SIMULAR TESTE DE EDIÇÃO (EXECUTE ESTAS CONSULTAS UMA POR VEZ)
-- Primeiro, vamos identificar uma produção para testar:
SELECT 'PRODUÇÃO PARA TESTE DE EDIÇÃO' as info;
SELECT 
    pb.id as production_batch_id,
    pb.batch_number,
    pb.production_date,
    m.name as material_nome,
    um.quantity as quantidade_original,
    mb.remaining_quantity as estoque_antes_edicao
FROM production_batches pb
JOIN used_materials um ON pb.id = um.production_batch_id
JOIN material_batches mb ON um.material_batch_id = mb.id
JOIN materials m ON mb.material_id = m.id
WHERE m.name ILIKE '%fécula%'
ORDER BY pb.created_at DESC
LIMIT 1;

-- 4. PARA TESTE MANUAL (SUBSTITUA OS IDs PELOS VALORES REAIS):
-- Este seria o processo que o sistema deveria fazer automaticamente:

/*
EXEMPLO DE TESTE MANUAL - SUBSTITUA OS VALUES PELOS IDs REAIS:

-- Passo 1: Verificar estoque atual
SELECT remaining_quantity FROM material_batches WHERE id = 'SEU_MATERIAL_BATCH_ID';

-- Passo 2: Simular reversão (somar a quantidade original)
-- UPDATE material_batches 
-- SET remaining_quantity = remaining_quantity + QUANTIDADE_ORIGINAL 
-- WHERE id = 'SEU_MATERIAL_BATCH_ID';

-- Passo 3: Simular nova aplicação (subtrair nova quantidade)
-- UPDATE material_batches 
-- SET remaining_quantity = remaining_quantity - NOVA_QUANTIDADE 
-- WHERE id = 'SEU_MATERIAL_BATCH_ID';

-- Passo 4: Verificar resultado final
-- SELECT remaining_quantity FROM material_batches WHERE id = 'SEU_MATERIAL_BATCH_ID';
*/

-- 5. VERIFICAR LOGS DO SISTEMA RELACIONADOS AO ESTOQUE
SELECT 'LOGS RECENTES DE ESTOQUE' as info;
SELECT 
    created_at,
    user_display_name,
    action_type,
    entity_table,
    old_data,
    new_data
FROM system_logs 
WHERE entity_table IN ('production_batches', 'material_batches', 'used_materials')
ORDER BY created_at DESC
LIMIT 10;

-- 6. SCRIPT PARA VERIFICAÇÃO CONTÍNUA (EXECUTE ANTES E DEPOIS DE CADA OPERAÇÃO)
CREATE OR REPLACE FUNCTION verificar_integridade_estoque()
RETURNS TABLE(
    material_nome text,
    lote_material text,
    estoque_atual numeric,
    total_usado numeric,
    estoque_esperado numeric,
    diferenca numeric,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.name::text as material_nome,
        mb.batch_number::text as lote_material,
        mb.remaining_quantity as estoque_atual,
        COALESCE(SUM(um.quantity), 0) as total_usado,
        (mb.quantity - COALESCE(SUM(um.quantity), 0)) as estoque_esperado,
        (mb.remaining_quantity - (mb.quantity - COALESCE(SUM(um.quantity), 0))) as diferenca,
        CASE 
            WHEN mb.remaining_quantity = (mb.quantity - COALESCE(SUM(um.quantity), 0)) THEN '✅ OK'
            ELSE '❌ INCONSISTENTE'
        END::text as status
    FROM materials m
    JOIN material_batches mb ON m.id = mb.material_id
    LEFT JOIN used_materials um ON mb.id = um.material_batch_id
    GROUP BY m.name, mb.batch_number, mb.remaining_quantity, mb.quantity
    ORDER BY m.name, mb.batch_number;
END;
$$ LANGUAGE plpgsql;

-- 7. EXECUTAR VERIFICAÇÃO DE INTEGRIDADE
SELECT 'VERIFICAÇÃO DE INTEGRIDADE DO ESTOQUE' as info;
SELECT * FROM verificar_integridade_estoque();

-- ============================================================================
-- INSTRUÇÕES PARA TESTE PRÁTICO:
-- ============================================================================
/*
1. Execute este script completo para ver o estado atual
2. Use a interface do sistema para:
   a) Criar uma nova produção com X kg de fécula
   b) Editar essa produção mudando para Y kg de fécula  
   c) Excluir a produção
3. Execute novamente a função verificar_integridade_estoque() após cada operação
4. Verifique se o status é sempre "✅ OK"

CENÁRIO DE TESTE ESPECÍFICO DO USUÁRIO:
- Estado inicial: 500kg fécula
- Criar produção: usar 20kg → deve ficar 480kg
- Editar produção: mudar para 40kg → deve ficar 460kg (não 440kg!)
- Excluir produção: deve voltar para 500kg

Se algum passo resultar em "❌ INCONSISTENTE", o bug ainda existe.
*/ 