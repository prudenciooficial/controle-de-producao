-- Adicionar a nova coluna para o nome de exibição do usuário
ALTER TABLE public.system_logs
ADD COLUMN user_display_name TEXT;

-- Recriar a função de gatilho de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_user_display_name text; -- Nome da variável alterado para clareza
    v_entity_id text;
    v_old_data jsonb;
    v_new_data jsonb;
BEGIN
    -- Tenta obter o user_id da sessão atual
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- Tenta obter a descrição do usuário (full_name ou email) da tabela auth.users
    IF v_user_id IS NOT NULL THEN
        BEGIN
            -- Primeiro tenta pegar o full_name de raw_user_meta_data
            SELECT u.raw_user_meta_data->>'full_name' INTO v_user_display_name FROM auth.users u WHERE u.id = v_user_id;
            
            -- Se full_name não for encontrado ou for nulo, tenta pegar o email
            IF v_user_display_name IS NULL OR v_user_display_name = '' THEN
                SELECT u.email INTO v_user_display_name FROM auth.users u WHERE u.id = v_user_id;
                -- Se o email também não for encontrado ou for nulo, usa um identificador padrão
                IF v_user_display_name IS NULL OR v_user_display_name = '' THEN
                    v_user_display_name := 'Usuário ID: ' || v_user_id::text;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Fallback em caso de erro ao acessar auth.users ou raw_user_meta_data
            v_user_display_name := 'Usuário ID: ' || v_user_id::text || ' (erro ao buscar dados)';
        END;
    ELSE
        v_user_display_name := 'Sistema'; -- Ou outra descrição para operações não autenticadas/diretas
    END IF;

    -- Prepara os dados antigos/novos e o ID da entidade
    IF TG_OP = 'INSERT' THEN
        v_entity_id := NEW.id::text;
        v_new_data := to_jsonb(NEW);
        v_old_data := '{}'::jsonb;
    ELSIF TG_OP = 'UPDATE' THEN
        v_entity_id := NEW.id::text;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        -- Otimização para UPDATEs: registrar apenas as diferenças
        -- (Esta parte pode ser complexa e depende do quão detalhado você quer que seja)
        -- Para simplificar por agora, vamos registrar o objeto completo.
        -- Se a otimização anterior de diff de JSON for desejada, ela pode ser reintroduzida aqui.
        -- Por exemplo, a lógica anterior:
        -- SELECT jsonb_object_agg(key, value) INTO v_new_data
        -- FROM jsonb_each(v_new_data) WHERE NOT (v_old_data->key = value);
        -- SELECT jsonb_object_agg(key, value) INTO v_old_data
        -- FROM jsonb_each(v_old_data) WHERE NOT (v_new_data->key = value OR NOT v_new_data ? key);
        -- Esta lógica de diff pode ser mantida se preferir.
        -- Por ora, a função acima usa to_jsonb(OLD) e to_jsonb(NEW) completos para UPDATE.

    ELSIF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id::text;
        v_old_data := to_jsonb(OLD);
        v_new_data := '{}'::jsonb;
    END IF;

    -- Insere o log na tabela system_logs
    INSERT INTO public.system_logs (
        user_id,
        user_display_name, -- Nova coluna
        action_type,
        entity_schema,     -- Coluna existente
        entity_table,      -- Coluna existente
        entity_id,
        old_data,          -- Coluna existente
        new_data           -- Coluna existente
    )
    VALUES (
        v_user_id,
        v_user_display_name,
        TG_OP,
        TG_TABLE_SCHEMA, -- Usar o schema da tabela do gatilho
        TG_TABLE_NAME,
        v_entity_id,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE v_old_data END, -- Não há dados antigos para INSERT
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_new_data END  -- Não há dados novos para DELETE
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante que a função pertence ao postgres
ALTER FUNCTION public.audit_trigger_func() OWNER TO postgres;

COMMENT ON FUNCTION public.audit_trigger_func() IS 'Gatilho de auditoria que registra alterações em tabelas. Agora inclui user_display_name e usa colunas separadas old_data/new_data.';