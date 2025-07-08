-- Atualizar sistema de contra-provas para remover análise do dia 1
-- e manter apenas análises de 30, 60, 90, 120, 150, 180 dias

-- 1. Verificar quais dias de análise existem atualmente
-- SELECT DISTINCT dia_analise FROM public.analises_contra_provas ORDER BY dia_analise;

-- 2. Primeiro, remover análises existentes do dia 1 que ainda estão pendentes
DELETE FROM public.analises_contra_provas
WHERE dia_analise = 1 AND status_analise = 'pendente';

-- 3. Para análises do dia 1 já realizadas, vamos mantê-las mas ajustar a constraint
-- para permitir o dia 1 apenas para dados históricos
ALTER TABLE public.analises_contra_provas
DROP CONSTRAINT IF EXISTS analises_contra_provas_dia_analise_check;

-- 4. Nova constraint que permite dia 1 (para histórico) mas o trigger só criará 30, 60, 90, 120, 150, 180
ALTER TABLE public.analises_contra_provas
ADD CONSTRAINT analises_contra_provas_dia_analise_check
CHECK (dia_analise = ANY (ARRAY[1, 30, 60, 90, 120, 150, 180]));

-- 5. Criar ou atualizar a função que cria análises automaticamente
-- Esta função agora cria apenas análises para 30, 60, 90, 120, 150, 180 dias
CREATE OR REPLACE FUNCTION criar_analises_contra_prova()
RETURNS TRIGGER AS $$
DECLARE
    dias_analise INTEGER[] := ARRAY[30, 60, 90, 120, 150, 180];
    dia INTEGER;
    data_analise_calculada DATE;
BEGIN
    -- Para cada dia de análise programado (sem o dia 1)
    FOREACH dia IN ARRAY dias_analise
    LOOP
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
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar o trigger se não existir
DROP TRIGGER IF EXISTS trigger_criar_analises_contra_prova ON public.contra_provas;

CREATE TRIGGER trigger_criar_analises_contra_prova
    AFTER INSERT ON public.contra_provas
    FOR EACH ROW
    EXECUTE FUNCTION criar_analises_contra_prova();

-- 7. Para contra-provas existentes que não têm análises, criar as análises
-- (apenas se não existirem análises para a contra-prova)
-- Agora cria apenas para os novos dias: 30, 60, 90, 120, 150, 180
DO $$
DECLARE
    contra_prova_record RECORD;
    dias_analise INTEGER[] := ARRAY[30, 60, 90, 120, 150, 180];
    dia INTEGER;
    data_analise_calculada DATE;
BEGIN
    -- Para cada contra-prova que não tem análises
    FOR contra_prova_record IN
        SELECT cp.*
        FROM public.contra_provas cp
        LEFT JOIN public.analises_contra_provas acp ON cp.id = acp.contra_prova_id
        WHERE acp.id IS NULL
    LOOP
        -- Criar análises para cada dia programado (sem o dia 1)
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
    END LOOP;
END $$;

-- 8. Verificação final - mostrar estatísticas
DO $$
BEGIN
    RAISE NOTICE 'Migração concluída!';
    RAISE NOTICE 'Análises do dia 1 pendentes removidas: %',
        (SELECT COUNT(*) FROM public.analises_contra_provas WHERE dia_analise = 1 AND status_analise = 'pendente');
    RAISE NOTICE 'Total de análises por dia:';
    RAISE NOTICE 'Dia 1: % (apenas histórico)',
        (SELECT COUNT(*) FROM public.analises_contra_provas WHERE dia_analise = 1);
    RAISE NOTICE 'Dia 30: %',
        (SELECT COUNT(*) FROM public.analises_contra_provas WHERE dia_analise = 30);
    RAISE NOTICE 'Dia 60: %',
        (SELECT COUNT(*) FROM public.analises_contra_provas WHERE dia_analise = 60);
    RAISE NOTICE 'Dia 90: %',
        (SELECT COUNT(*) FROM public.analises_contra_provas WHERE dia_analise = 90);
    RAISE NOTICE 'Dia 120: %',
        (SELECT COUNT(*) FROM public.analises_contra_provas WHERE dia_analise = 120);
    RAISE NOTICE 'Dia 150: %',
        (SELECT COUNT(*) FROM public.analises_contra_provas WHERE dia_analise = 150);
    RAISE NOTICE 'Dia 180: %',
        (SELECT COUNT(*) FROM public.analises_contra_provas WHERE dia_analise = 180);
END $$;
