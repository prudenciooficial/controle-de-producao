-- Adicionar a nova coluna para o nome de exibição do usuário
ALTER TABLE public.system_logs
ADD COLUMN user_display_name TEXT;

-- Recriar a função de gatilho de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_user_display_name text;
    v_entity_id text;
    v_old_data jsonb;
    v_new_data jsonb;
BEGIN
    -- Usa o valor enviado pelo backend, se existir
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_user_display_name := COALESCE(NEW.user_display_name, NULL);
    ELSE
        v_user_display_name := NULL;
    END IF;

    -- Se não foi enviado, tenta buscar pelo user_id
    IF v_user_display_name IS NULL THEN
        BEGIN
            v_user_id := COALESCE(NEW.user_id, OLD.user_id);
            IF v_user_id IS NOT NULL THEN
                SELECT u.raw_user_meta_data->>'full_name'
                  INTO v_user_display_name
                  FROM auth.users u
                 WHERE u.id = v_user_id;
                IF v_user_display_name IS NULL OR v_user_display_name = '' THEN
                    SELECT u.email INTO v_user_display_name FROM auth.users u WHERE u.id = v_user_id;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_user_display_name := NULL;
        END;
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
    ELSIF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id::text;
        v_old_data := to_jsonb(OLD);
        v_new_data := '{}'::jsonb;
    END IF;

    INSERT INTO public.system_logs (
        user_id,
        user_display_name,
        action_type,
        entity_schema,
        entity_table,
        entity_id,
        old_data,
        new_data,
        created_at
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        v_user_display_name,
        TG_OP,
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        v_entity_id,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE v_old_data END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_new_data END,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante que a função pertence ao postgres
ALTER FUNCTION public.audit_trigger_func() OWNER TO postgres;

COMMENT ON FUNCTION public.audit_trigger_func() IS 'Gatilho de auditoria que registra alterações em tabelas. Agora inclui user_display_name e usa colunas separadas old_data/new_data.';