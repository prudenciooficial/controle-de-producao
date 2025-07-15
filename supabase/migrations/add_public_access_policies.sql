-- Adicionar políticas RLS para acesso público aos laudos
-- Esta migração permite que usuários não autenticados acessem laudos através de links públicos

-- Política para permitir acesso público aos laudos através do link_publico
CREATE POLICY "Permitir acesso público aos laudos via link_publico" ON public.laudos_liberacao
    FOR SELECT USING (link_publico IS NOT NULL);

-- Política para permitir acesso público às coletas relacionadas aos laudos públicos
CREATE POLICY "Permitir acesso público às coletas de laudos públicos" ON public.coletas_amostras
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.laudos_liberacao 
            WHERE laudos_liberacao.coleta_id = coletas_amostras.id 
            AND laudos_liberacao.link_publico IS NOT NULL
        )
    );

-- Política para permitir acesso público às análises relacionadas aos laudos públicos
CREATE POLICY "Permitir acesso público às análises de laudos públicos" ON public.analises_amostras
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.laudos_liberacao 
            WHERE laudos_liberacao.coleta_id = analises_amostras.coleta_id 
            AND laudos_liberacao.link_publico IS NOT NULL
        )
    );

-- Política para permitir acesso público aos responsáveis técnicos (se a tabela existir)
-- Esta política é opcional e só será aplicada se a tabela responsaveis_tecnicos existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'responsaveis_tecnicos') THEN
        EXECUTE 'CREATE POLICY "Permitir acesso público aos responsáveis técnicos" ON public.responsaveis_tecnicos
            FOR SELECT USING (true)';
    END IF;
END $$;
