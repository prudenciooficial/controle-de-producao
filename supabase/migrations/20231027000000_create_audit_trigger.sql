CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    user_id_value uuid;
    user_description_value text;
    entity_id_value text;
    old_data_jsonb jsonb;
    new_data_jsonb jsonb;
BEGIN
    -- Tenta obter o user_id da sessão atual
    BEGIN
        user_id_value := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        user_id_value := NULL;
    END;

    -- Tenta obter a descrição do usuário (full_name ou email) da tabela auth.users
    IF user_id_value IS NOT NULL THEN
        BEGIN
            -- Primeiro tenta pegar o full_name de raw_user_meta_data
            SELECT u.raw_user_meta_data->>'full_name' INTO user_description_value FROM auth.users u WHERE id = user_id_value;
            
            -- Se full_name não for encontrado ou for nulo, tenta pegar o email
            IF user_description_value IS NULL OR user_description_value = '' THEN
                SELECT u.email INTO user_description_value FROM auth.users u WHERE id = user_id_value;
                -- Se o email também não for encontrado, usa um identificador padrão
                IF user_description_value IS NULL OR user_description_value = '' THEN
                    user_description_value := 'Usuário ID: ' || user_id_value::text || ' (nome/email não disponível)';
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Fallback em caso de erro ao acessar auth.users ou raw_user_meta_data
            user_description_value := 'Usuário ID: ' || user_id_value::text || ' (erro ao buscar dados do usuário)';
        END;
    ELSE
        user_description_value := 'Sistema (Operação Direta no DB ou Usuário não autenticado)';
    END IF;

    -- Obtém o ID da entidade (assumindo que a PK se chama 'id')
    -- e prepara os dados antigos/novos
    IF TG_OP = 'INSERT' THEN
        entity_id_value := NEW.id::text;
        new_data_jsonb := row_to_json(NEW)::jsonb;
        old_data_jsonb := '{}'::jsonb;
    ELSIF TG_OP = 'UPDATE' THEN
        entity_id_value := NEW.id::text;
        old_data_jsonb := row_to_json(OLD)::jsonb;
        new_data_jsonb := row_to_json(NEW)::jsonb;
        -- Remover chaves idênticas para reduzir o tamanho do log em updates
        SELECT jsonb_object_agg(key, value)
        INTO new_data_jsonb
        FROM jsonb_each(new_data_jsonb)
        WHERE NOT (old_data_jsonb->key = value);

        SELECT jsonb_object_agg(key, value)
        INTO old_data_jsonb
        FROM jsonb_each(old_data_jsonb)
        WHERE NOT (new_data_jsonb->key = value OR NOT new_data_jsonb ? key);


    ELSIF TG_OP = 'DELETE' THEN
        entity_id_value := OLD.id::text;
        old_data_jsonb := row_to_json(OLD)::jsonb;
        new_data_jsonb := '{}'::jsonb;
    END IF;

    -- Insere o log na tabela system_logs
    INSERT INTO public.system_logs (user_id, user_description, action_type, entity_type, entity_id, details)
    VALUES (
        user_id_value,
        user_description_value,
        TG_OP,                          -- INSERT, UPDATE, DELETE
        TG_TABLE_NAME,                  -- Nome da tabela onde o trigger disparou
        entity_id_value,
        jsonb_build_object(
            'old_data', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE old_data_jsonb END,
            'new_data', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE new_data_jsonb END
        )
    );

    RETURN COALESCE(NEW, OLD); -- Retorna a linha nova para INSERT/UPDATE, ou a antiga para DELETE
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante que a função pertence ao postgres para evitar problemas de permissão com SECURITY DEFINER
-- É importante que o usuário postgres (ou o superusuário que você usa) seja o dono da função.
-- Se você estiver rodando isso como 'postgres', este comando pode não ser estritamente necessário,
-- mas é uma boa prática para garantir a propriedade correta.
ALTER FUNCTION public.audit_trigger_func() OWNER TO postgres;

-- COMENTÁRIOS:
-- Lembre-se de ajustar o nome da chave primária (PK) se não for 'id' nas suas tabelas.
-- A função agora tenta otimizar o JSONB 'details' para UPDATEs, armazenando apenas os campos que realmente mudaram.

-- Exemplo de como criar um trigger para uma tabela específica.
-- Você precisará criar um trigger para CADA tabela que deseja auditar.
-- Certifique-se de que a tabela tem uma coluna PK chamada 'id' ou ajuste a função audit_trigger_func.

/*
-- === Triggers para as tabelas do sistema ===

-- Tabela: global_settings
CREATE TRIGGER audit_trigger_global_settings
AFTER INSERT OR UPDATE OR DELETE ON public.global_settings
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: losses
CREATE TRIGGER audit_trigger_losses
AFTER INSERT OR UPDATE OR DELETE ON public.losses
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: material_batches
CREATE TRIGGER audit_trigger_material_batches
AFTER INSERT OR UPDATE OR DELETE ON public.material_batches
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: materials
CREATE TRIGGER audit_trigger_materials
AFTER INSERT OR UPDATE OR DELETE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: order_items
CREATE TRIGGER audit_trigger_order_items
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: orders
CREATE TRIGGER audit_trigger_orders
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: produced_items
CREATE TRIGGER audit_trigger_produced_items
AFTER INSERT OR UPDATE OR DELETE ON public.produced_items
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: production_batches
CREATE TRIGGER audit_trigger_production_batches
AFTER INSERT OR UPDATE OR DELETE ON public.production_batches
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: products
CREATE TRIGGER audit_trigger_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: sale_items
CREATE TRIGGER audit_trigger_sale_items
AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: sales
CREATE TRIGGER audit_trigger_sales
AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: suppliers
CREATE TRIGGER audit_trigger_suppliers
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Tabela: used_materials
CREATE TRIGGER audit_trigger_used_materials
AFTER INSERT OR UPDATE OR DELETE ON public.used_materials
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Adicionar aqui triggers para outras tabelas que necessitem de auditoria.
-- Exemplo:
-- CREATE TRIGGER audit_trigger_outra_tabela
-- AFTER INSERT OR UPDATE OR DELETE ON public.outra_tabela
-- FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

*/ 