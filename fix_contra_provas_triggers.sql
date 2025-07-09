-- Script para corrigir problema de triggers duplicados em contra-provas
-- Execute este script no SQL Editor do Supabase

-- 1. REMOVER TODOS OS TRIGGERS EXISTENTES
DROP TRIGGER IF EXISTS trigger_criar_analises_contra_prova ON public.contra_provas;
DROP TRIGGER IF EXISTS trigger_create_analises_contra_prova ON public.contra_provas;
DROP TRIGGER IF EXISTS trigger_analises_contra_prova ON public.contra_provas;

-- 2. REMOVER TODAS AS FUNÇÕES EXISTENTES
DROP FUNCTION IF EXISTS public.create_analises_contra_prova();
DROP FUNCTION IF EXISTS public.criar_analises_contra_prova();

-- 3. LIMPAR ANÁLISES ÓRFÃS E DUPLICADAS
-- Remover análises órfãs (sem contra-prova correspondente)
DELETE FROM public.analises_contra_provas 
WHERE contra_prova_id NOT IN (SELECT id FROM public.contra_provas);

-- Remover análises duplicadas (manter apenas a mais recente)
WITH duplicadas AS (
    SELECT id, 
           ROW_NUMBER() OVER (
               PARTITION BY contra_prova_id, dia_analise 
               ORDER BY created_at DESC
           ) as rn
    FROM public.analises_contra_provas
)
DELETE FROM public.analises_contra_provas 
WHERE id IN (
    SELECT id FROM duplicadas WHERE rn > 1
);

-- 4. CRIAR NOVA FUNÇÃO ÚNICA E CORRETA
CREATE OR REPLACE FUNCTION public.criar_analises_contra_prova_unica()
RETURNS TRIGGER AS $$
DECLARE
    dias_analise INTEGER[] := ARRAY[30, 60, 90, 120, 150, 180];
    dia INTEGER;
    data_analise_calculada DATE;
    analise_existente INTEGER;
BEGIN
    -- Para cada dia de análise programado (sem o dia 1)
    FOREACH dia IN ARRAY dias_analise
    LOOP
        -- Verificar se já existe análise para este dia
        SELECT COUNT(*) INTO analise_existente
        FROM public.analises_contra_provas
        WHERE contra_prova_id = NEW.id AND dia_analise = dia;
        
        -- Só inserir se não existir
        IF analise_existente = 0 THEN
            -- Calcular a data da análise baseada na data de fabricação
            data_analise_calculada := NEW.data_fabricacao + INTERVAL '1 day' * dia;

            -- Inserir a análise programada
            INSERT INTO public.analises_contra_provas (
                contra_prova_id,
                dia_analise,
                data_analise,
                status_analise
            ) VALUES (
                NEW.id,
                dia,
                data_analise_calculada,
                'pendente'
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. CRIAR TRIGGER ÚNICO
CREATE TRIGGER trigger_criar_analises_contra_prova_unica
    AFTER INSERT ON public.contra_provas
    FOR EACH ROW
    EXECUTE FUNCTION public.criar_analises_contra_prova_unica();

-- 6. CRIAR ANÁLISES PARA CONTRA-PROVAS EXISTENTES SEM ANÁLISES
DO $$
DECLARE
    contra_prova_record RECORD;
    dias_analise INTEGER[] := ARRAY[30, 60, 90, 120, 150, 180];
    dia INTEGER;
    data_analise_calculada DATE;
    analise_existente INTEGER;
BEGIN
    -- Para cada contra-prova que não tem análises
    FOR contra_prova_record IN
        SELECT cp.*
        FROM public.contra_provas cp
        LEFT JOIN public.analises_contra_provas acp ON cp.id = acp.contra_prova_id
        WHERE acp.id IS NULL
    LOOP
        -- Criar análises para cada dia programado
        FOREACH dia IN ARRAY dias_analise
        LOOP
            data_analise_calculada := contra_prova_record.data_fabricacao + INTERVAL '1 day' * dia;

            INSERT INTO public.analises_contra_provas (
                contra_prova_id,
                dia_analise,
                data_analise,
                status_analise
            ) VALUES (
                contra_prova_record.id,
                dia,
                data_analise_calculada,
                'pendente'
            );
        END LOOP;
        
        RAISE NOTICE 'Análises criadas para contra-prova: %', contra_prova_record.lote_produto;
    END LOOP;
END $$;

-- 7. VERIFICAÇÕES FINAIS
-- Verificar se não há mais análises duplicadas
SELECT 
    contra_prova_id, 
    dia_analise, 
    COUNT(*) as quantidade
FROM public.analises_contra_provas
GROUP BY contra_prova_id, dia_analise
HAVING COUNT(*) > 1;
-- Resultado esperado: nenhuma linha (sem duplicatas)

-- Verificar se todas as contra-provas têm análises
SELECT 
    cp.lote_produto,
    COUNT(acp.id) as total_analises
FROM public.contra_provas cp
LEFT JOIN public.analises_contra_provas acp ON cp.id = acp.contra_prova_id
GROUP BY cp.id, cp.lote_produto
ORDER BY cp.lote_produto;
-- Resultado esperado: todas com 6 análises (30, 60, 90, 120, 150, 180)

-- Verificar dias de análise disponíveis
SELECT dia_analise, COUNT(*) as quantidade
FROM public.analises_contra_provas
GROUP BY dia_analise
ORDER BY dia_analise;
-- Resultado esperado: apenas 30, 60, 90, 120, 150, 180 (sem dia 1)

-- 8. MOSTRAR ESTATÍSTICAS FINAIS
SELECT 
    'Contra-provas total' as tipo,
    COUNT(*) as quantidade
FROM public.contra_provas
UNION ALL
SELECT 
    'Análises total' as tipo,
    COUNT(*) as quantidade
FROM public.analises_contra_provas
UNION ALL
SELECT 
    'Triggers ativos' as tipo,
    COUNT(*) as quantidade
FROM information_schema.triggers 
WHERE trigger_name LIKE '%contra_prova%';
