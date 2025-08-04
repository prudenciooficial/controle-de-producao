

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."abort_transaction"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'Transaction aborted';
END;
$$;


ALTER FUNCTION "public"."abort_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_coluna_atualizado_em"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_coluna_atualizado_em"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_data_modificacao"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_data_modificacao"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_timestamp_atualizacao"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_timestamp_atualizacao"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_timestamp_modificacao"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_timestamp_modificacao"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auditoria_completa_estoque"() RETURNS TABLE("relatorio" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."auditoria_completa_estoque"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."begin_transaction"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(42);
END;
$$;


ALTER FUNCTION "public"."begin_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_total_weight"("production_batch_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    total_weight DECIMAL(15,4) := 0;
BEGIN
    SELECT COALESCE(SUM(
        pi.quantity * COALESCE(p.weight_factor, 1.0)
    ), 0) INTO total_weight
    FROM public.produced_items pi
    LEFT JOIN public.products p ON pi.product_id = p.id
    WHERE pi.production_batch_id = production_batch_id;
    
    RETURN total_weight;
END;
$$;


ALTER FUNCTION "public"."calculate_total_weight"("production_batch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_material_stock"("material_batch_id" "uuid", "required_quantity" numeric) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    available_quantity DECIMAL(15,4);
BEGIN
    SELECT remaining_quantity INTO available_quantity
    FROM public.material_batches
    WHERE id = material_batch_id;
    
    RETURN COALESCE(available_quantity, 0) >= required_quantity;
END;
$$;


ALTER FUNCTION "public"."check_material_stock"("material_batch_id" "uuid", "required_quantity" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."criar_analises_contra_prova_unica"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."criar_analises_contra_prova_unica"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."definir_numero_contrato"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.numero_contrato IS NULL THEN
        NEW.numero_contrato := gerar_numero_contrato();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."definir_numero_contrato"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detectar_inconsistencias_estoque"() RETURNS TABLE("material_id" "uuid", "batch_id" "uuid", "material_nome" "text", "lote_material" "text", "estoque_atual" numeric, "estoque_esperado" numeric, "diferenca" numeric, "data_deteccao" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."detectar_inconsistencias_estoque"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_transaction"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- This is basically a no-op since the transaction will be committed automatically
  -- when the function call completes successfully
  NULL;
END;
$$;


ALTER FUNCTION "public"."end_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extrair_variaveis_modelo"("conteudo" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    variaveis TEXT[];
    variavel TEXT;
    resultado JSONB := '[]'::jsonb;
BEGIN
    -- Extrair todas as variáveis no formato [NOME_VARIAVEL]
    SELECT array_agg(DISTINCT matches[1])
    INTO variaveis
    FROM regexp_matches(conteudo, '\[([A-Z_]+)\]', 'g') AS matches;
    
    -- Converter para JSONB
    IF variaveis IS NOT NULL THEN
        FOREACH variavel IN ARRAY variaveis
        LOOP
            resultado := resultado || jsonb_build_array(jsonb_build_object(
                'nome', variavel,
                'label', replace(replace(variavel, '_', ' '), 'NOME', 'Nome'),
                'tipo', 'text',
                'obrigatorio', true
            ));
        END LOOP;
    END IF;
    
    RETURN resultado;
END;
$$;


ALTER FUNCTION "public"."extrair_variaveis_modelo"("conteudo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_unique_link"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER := 0;
    link_exists BOOLEAN := TRUE;
BEGIN
    WHILE link_exists LOOP
        result := '';
        FOR i IN 1..32 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM public.laudos_liberacao WHERE link_publico = result) INTO link_exists;
    END LOOP;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_unique_link"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gerar_numero_contrato"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    sufixo_ano VARCHAR(4);
    numero_sequencial INTEGER;
BEGIN
    sufixo_ano := EXTRACT(YEAR FROM NOW())::VARCHAR;
    
    -- Buscar o próximo número sequencial para o ano atual
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_contrato FROM '^([0-9]+)') AS INTEGER)), 0) + 1
    INTO numero_sequencial
    FROM contratos
    WHERE numero_contrato LIKE '%/' || sufixo_ano;
    
    NEW.numero_contrato := LPAD(numero_sequencial::VARCHAR, 4, '0') || '/' || sufixo_ano;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."gerar_numero_contrato"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_global_settings"() RETURNS TABLE("id" "uuid", "fecula_conversion_factor" numeric, "production_prediction_factor" numeric, "conservant_conversion_factor" numeric, "conservant_usage_factor" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gs.id,
        gs.fecula_conversion_factor,
        gs.production_prediction_factor,
        gs.conservant_conversion_factor,
        gs.conservant_usage_factor
    FROM public.global_settings gs
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_global_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_material_stock_history"("material_id" "uuid") RETURNS TABLE("batch_number" character varying, "quantity" numeric, "remaining_quantity" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mb.batch_number,
        mb.quantity,
        mb.remaining_quantity,
        mb.created_at
    FROM public.material_batches mb
    WHERE mb.material_id = material_id
    ORDER BY mb.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_material_stock_history"("material_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_order_item_changes_for_material_batch"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
      v_material_batch_id_to_delete UUID;
      v_is_used BOOLEAN;
      v_rows_affected INT; -- Para verificar o DELETE
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO public.material_batches (
          material_id, batch_number, quantity, supplied_quantity, remaining_quantity, 
          unit_of_measure, expiry_date, has_report, order_item_id
        ) VALUES (
          NEW.material_id, NEW.batch_number, NEW.quantity, NEW.quantity, NEW.quantity, 
          NEW.unit_of_measure, NEW.expiry_date, NEW.has_report, NEW.id
        );

      ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.material_batches mb
        SET 
          quantity = CASE WHEN NEW.quantity <> OLD.quantity THEN mb.quantity - OLD.quantity + NEW.quantity ELSE mb.quantity END,
          supplied_quantity = CASE WHEN NEW.quantity <> OLD.quantity THEN mb.supplied_quantity - OLD.quantity + NEW.quantity ELSE mb.supplied_quantity END,
          remaining_quantity = CASE WHEN NEW.quantity <> OLD.quantity THEN mb.remaining_quantity - OLD.quantity + NEW.quantity ELSE mb.remaining_quantity END,
          expiry_date = NEW.expiry_date,
          has_report = NEW.has_report,
          updated_at = now()
        WHERE mb.order_item_id = NEW.id;

      ELSIF TG_OP = 'DELETE' THEN
        -- Passo 1: Encontrar o material_batch_id
        SELECT id INTO v_material_batch_id_to_delete 
        FROM public.material_batches 
        WHERE order_item_id = OLD.id;

        -- Passo 2: Se encontrado, verificar se está em uso
        IF v_material_batch_id_to_delete IS NOT NULL THEN
          SELECT EXISTS (
            SELECT 1 FROM public.used_materials 
            WHERE material_batch_id = v_material_batch_id_to_delete
          ) INTO v_is_used;

          -- Passo 3: Se não estiver em uso, tentar deletar
          IF NOT v_is_used THEN
            -- RAISE NOTICE 'DEBUG: Tentando deletar material_batch ID: % (order_item_id: %)', v_material_batch_id_to_delete, OLD.id;
            
            DELETE FROM public.material_batches
            WHERE id = v_material_batch_id_to_delete;
            
            GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
            
            -- RAISE NOTICE 'DEBUG: Linhas afetadas pelo DELETE: %', v_rows_affected;

            IF v_rows_affected = 0 THEN
              -- Se chegamos aqui, o DELETE deveria ter funcionado mas não afetou linhas.
              RAISE EXCEPTION 'ERRO NO TRIGGER: Falha ao deletar material_batch ID %. Condições: order_item_id=%, v_is_used=false.', v_material_batch_id_to_delete, OLD.id;
            END IF;
            
          END IF;
        END IF;
        
      END IF;
      RETURN NULL; 
    END;
    $$;


ALTER FUNCTION "public"."handle_order_item_changes_for_material_batch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_stock_inconsistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."prevent_stock_inconsistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_link_publico"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.link_publico IS NULL THEN
        NEW.link_publico := generate_unique_link();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_link_publico"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_extrair_variaveis"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.variaveis := extrair_variaveis_modelo(NEW.conteudo);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_extrair_variaveis"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_material_batch_after_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  material_batch_id UUID;
BEGIN
  -- Cria um novo lote de material para cada item do pedido
  INSERT INTO public.material_batches (
    material_id,
    batch_number,
    quantity,
    supplied_quantity,
    remaining_quantity,
    unit_of_measure,
    expiry_date,
    has_report
  ) VALUES (
    NEW.material_id,
    NEW.batch_number,
    NEW.quantity,
    NEW.quantity,
    NEW.quantity,
    NEW.unit_of_measure,
    NEW.expiry_date,
    NEW.has_report
  ) RETURNING id INTO material_batch_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_material_batch_after_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_produced_item_after_sale"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Atualiza a quantidade restante do item produzido
  UPDATE public.produced_items
  SET remaining_quantity = remaining_quantity - NEW.quantity
  WHERE id = NEW.produced_item_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_produced_item_after_sale"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verificar_integridade_estoque"() RETURNS TABLE("material_nome" "text", "lote_material" "text", "estoque_atual" numeric, "total_usado" numeric, "estoque_esperado" numeric, "diferenca" numeric, "status" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."verificar_integridade_estoque"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analises_amostras" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coleta_id" "uuid" NOT NULL,
    "numero_amostra" integer NOT NULL,
    "umidade" numeric(5,2),
    "ph" numeric(3,2),
    "aspecto" character varying(100),
    "cor" character varying(100),
    "odor" character varying(100),
    "sabor" character varying(100),
    "embalagem" character varying(100),
    "umidade_conforme" boolean GENERATED ALWAYS AS ((("umidade" >= (40)::numeric) AND ("umidade" <= (45)::numeric))) STORED,
    "ph_conforme" boolean GENERATED ALWAYS AS ((("ph" >= 3.6) AND ("ph" <= 5.6))) STORED,
    "observacoes" "text",
    "data_analise" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analises_amostras" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analises_contra_provas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contra_prova_id" "uuid" NOT NULL,
    "dia_analise" integer NOT NULL,
    "data_analise" "date" NOT NULL,
    "status_analise" character varying DEFAULT 'pendente'::character varying NOT NULL,
    "observacoes_analise" "text",
    "problemas_encontrados" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "analises_contra_provas_dia_analise_check" CHECK (("dia_analise" = ANY (ARRAY[1, 30, 60, 90, 120, 150, 180]))),
    CONSTRAINT "analises_contra_provas_status_analise_check" CHECK ((("status_analise")::"text" = ANY ((ARRAY['pendente'::character varying, 'realizada'::character varying])::"text"[])))
);


ALTER TABLE "public"."analises_contra_provas" OWNER TO "postgres";


COMMENT ON TABLE "public"."analises_contra_provas" IS 'Análises programadas das contra-provas em dias específicos';



COMMENT ON COLUMN "public"."analises_contra_provas"."contra_prova_id" IS 'Referência à contra-prova';



COMMENT ON COLUMN "public"."analises_contra_provas"."dia_analise" IS 'Dia da análise (1, 30, 60, 90, 120, 150, 180)';



COMMENT ON COLUMN "public"."analises_contra_provas"."data_analise" IS 'Data programada para a análise';



COMMENT ON COLUMN "public"."analises_contra_provas"."status_analise" IS 'Status da análise (pendente/realizada)';



COMMENT ON COLUMN "public"."analises_contra_provas"."observacoes_analise" IS 'Observações da análise visual';



COMMENT ON COLUMN "public"."analises_contra_provas"."problemas_encontrados" IS 'Problemas encontrados na análise';



CREATE TABLE IF NOT EXISTS "public"."baixas_estoque" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data" "date" NOT NULL,
    "lote_material_id" "uuid" NOT NULL,
    "quantidade" numeric(10,3) NOT NULL,
    "observacoes" "text",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "baixas_estoque_quantidade_check" CHECK (("quantidade" > (0)::numeric))
);


ALTER TABLE "public"."baixas_estoque" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coletas_amostras" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lote_producao" character varying(255) NOT NULL,
    "data_coleta" "date" NOT NULL,
    "quantidade_total_produzida" numeric NOT NULL,
    "quantidade_amostras" integer DEFAULT 13 NOT NULL,
    "responsavel_coleta" character varying(255) NOT NULL,
    "observacoes" "text",
    "status" character varying(50) DEFAULT 'em_andamento'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coletas_amostras_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['em_andamento'::character varying, 'finalizada'::character varying, 'aprovada'::character varying, 'reprovada'::character varying])::"text"[])))
);


ALTER TABLE "public"."coletas_amostras" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuracoes_empresa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome_empresa" character varying(255) NOT NULL,
    "cnpj" character varying(18) NOT NULL,
    "endereco" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "telefone" character varying(20),
    "email" character varying(255),
    "logo_url" "text",
    "ativa" boolean DEFAULT true
);


ALTER TABLE "public"."configuracoes_empresa" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contra_provas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lote_produto" character varying NOT NULL,
    "product_id" "uuid" NOT NULL,
    "data_fabricacao" "date" NOT NULL,
    "data_validade" "date" NOT NULL,
    "data_descarte" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quantidade_amostras" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."contra_provas" OWNER TO "postgres";


COMMENT ON TABLE "public"."contra_provas" IS 'Controle de contra-provas da qualidade';



COMMENT ON COLUMN "public"."contra_provas"."lote_produto" IS 'Número do lote do produto';



COMMENT ON COLUMN "public"."contra_provas"."product_id" IS 'Referência ao produto';



COMMENT ON COLUMN "public"."contra_provas"."data_fabricacao" IS 'Data de fabricação do lote';



COMMENT ON COLUMN "public"."contra_provas"."data_validade" IS 'Data de validade do produto';



COMMENT ON COLUMN "public"."contra_provas"."data_descarte" IS 'Data em que a contra-prova foi descartada';



COMMENT ON COLUMN "public"."contra_provas"."observacoes" IS 'Observações sobre problemas ou anormalidades';



COMMENT ON COLUMN "public"."contra_provas"."quantidade_amostras" IS 'Quantidade de amostras da contra-prova';



CREATE TABLE IF NOT EXISTS "public"."contratos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero_contrato" character varying(50) NOT NULL,
    "modelo_id" "uuid",
    "titulo" character varying(255) NOT NULL,
    "conteudo" "text" NOT NULL,
    "dados_variaveis" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" character varying(50) DEFAULT 'rascunho'::character varying NOT NULL,
    "url_pdf" "text",
    "hash_documento" character varying(64),
    "assinante_interno_id" "uuid",
    "assinante_interno_nome" character varying(255),
    "assinante_interno_email" character varying(255),
    "assinado_internamente_em" timestamp with time zone,
    "dados_assinatura_interna" "jsonb",
    "assinante_externo_nome" character varying(255),
    "assinante_externo_email" character varying(255) NOT NULL,
    "assinante_externo_documento" character varying(20),
    "assinado_externamente_em" timestamp with time zone,
    "token_assinatura_externa" character varying(10),
    "token_expira_em" timestamp with time zone,
    "dados_assinatura_externa" "jsonb",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "criado_por" "uuid"
);


ALTER TABLE "public"."contratos" OWNER TO "postgres";


COMMENT ON TABLE "public"."contratos" IS 'Contratos criados a partir dos modelos, com fluxo de assinaturas digitais';



COMMENT ON COLUMN "public"."contratos"."hash_documento" IS 'Hash SHA-256 do documento final para garantir integridade';



COMMENT ON COLUMN "public"."contratos"."dados_assinatura_interna" IS 'Dados do certificado digital ICP-Brasil para assinatura qualificada';



COMMENT ON COLUMN "public"."contratos"."dados_assinatura_externa" IS 'Evidências da assinatura eletrônica simples (IP, User-Agent, timestamp, etc.)';



CREATE TABLE IF NOT EXISTS "public"."feriados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(255) NOT NULL,
    "data" "date" NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "ano" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "descricao" "text",
    CONSTRAINT "feriados_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['nacional'::character varying, 'estadual'::character varying, 'municipal'::character varying])::"text"[])))
);


ALTER TABLE "public"."feriados" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funcionarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome_completo" character varying(255) NOT NULL,
    "cpf" character varying(14) NOT NULL,
    "cargo" character varying(255) NOT NULL,
    "data_admissao" "date" NOT NULL,
    "jornada_id" "uuid",
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "setor" character varying(50) DEFAULT 'Produção'::character varying NOT NULL,
    "empresa_id" "uuid",
    CONSTRAINT "chk_funcionarios_setor" CHECK ((("setor")::"text" = ANY ((ARRAY['Produção'::character varying, 'Administrativo'::character varying])::"text"[]))),
    CONSTRAINT "funcionarios_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying])::"text"[])))
);


ALTER TABLE "public"."funcionarios" OWNER TO "postgres";


COMMENT ON COLUMN "public"."funcionarios"."setor" IS 'Setor do funcionário: Produção ou Administrativo';



CREATE TABLE IF NOT EXISTS "public"."global_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fecula_conversion_factor" numeric DEFAULT 25,
    "production_prediction_factor" numeric DEFAULT 1.5,
    "conservant_conversion_factor" numeric DEFAULT 1,
    "conservant_usage_factor" numeric DEFAULT 0.1,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."global_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jornadas_trabalho" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao_impressao" "text" NOT NULL,
    "horarios_estruturados" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."jornadas_trabalho" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."laudos_liberacao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coleta_id" "uuid" NOT NULL,
    "numero_laudo" integer NOT NULL,
    "marca_produto" character varying(255) NOT NULL,
    "gramatura" character varying(50) NOT NULL,
    "data_fabricacao" "date" NOT NULL,
    "data_validade" "date" NOT NULL,
    "resultado_geral" character varying(50) DEFAULT 'aprovado'::character varying,
    "responsavel_liberacao" character varying(255) NOT NULL,
    "observacoes" "text",
    "data_emissao" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "revisao" "text" DEFAULT '7'::"text",
    "link_publico" "text",
    CONSTRAINT "laudos_liberacao_resultado_geral_check" CHECK ((("resultado_geral")::"text" = ANY ((ARRAY['aprovado'::character varying, 'reprovado'::character varying])::"text"[])))
);


ALTER TABLE "public"."laudos_liberacao" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."laudos_liberacao_numero_laudo_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."laudos_liberacao_numero_laudo_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."laudos_liberacao_numero_laudo_seq" OWNED BY "public"."laudos_liberacao"."numero_laudo";



CREATE TABLE IF NOT EXISTS "public"."losses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" timestamp with time zone NOT NULL,
    "production_batch_id" "uuid" NOT NULL,
    "machine" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit_of_measure" "text" NOT NULL,
    "product_type" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "batch_number" "text"
);


ALTER TABLE "public"."losses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_id" "uuid" NOT NULL,
    "batch_number" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "supplied_quantity" numeric NOT NULL,
    "remaining_quantity" numeric NOT NULL,
    "unit_of_measure" "text" NOT NULL,
    "expiry_date" timestamp with time zone,
    "has_report" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_item_id" "uuid"
);


ALTER TABLE "public"."material_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "type" "text" NOT NULL,
    "unit_of_measure" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mix_batches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "batch_number" character varying(255) NOT NULL,
    "mix_date" "date" NOT NULL,
    "mix_day" character varying(100) NOT NULL,
    "mix_count" integer DEFAULT 1 NOT NULL,
    "notes" "text",
    "status" character varying(50) DEFAULT 'available'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_mix_count" CHECK (("mix_count" > 0)),
    CONSTRAINT "mix_batches_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['available'::character varying, 'used'::character varying, 'expired'::character varying])::"text"[])))
);


ALTER TABLE "public"."mix_batches" OWNER TO "postgres";


COMMENT ON TABLE "public"."mix_batches" IS 'Tabela de mexidas separadas da produção';



CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit_of_measure" "text" NOT NULL,
    "batch_number" "text" NOT NULL,
    "expiry_date" timestamp with time zone,
    "has_report" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" timestamp with time zone NOT NULL,
    "invoice_number" "text" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produced_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "production_batch_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit_of_measure" "text" NOT NULL,
    "batch_number" "text" NOT NULL,
    "remaining_quantity" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."produced_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_number" "text" NOT NULL,
    "production_date" timestamp with time zone NOT NULL,
    "mix_day" "text" NOT NULL,
    "mix_count" integer NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'complete'::"text" NOT NULL,
    "mix_batch_id" "uuid",
    CONSTRAINT "production_batches_status_check" CHECK (("status" = ANY (ARRAY['complete'::"text", 'rework'::"text"])))
);


ALTER TABLE "public"."production_batches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."production_batches"."mix_batch_id" IS 'Referência à mexida utilizada na produção';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "unit_of_measure" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "weight_factor" numeric DEFAULT 1,
    "fecula_conversion_factor" numeric DEFAULT 25,
    "production_prediction_factor" numeric DEFAULT 1.5,
    "conservant_conversion_factor" numeric DEFAULT 1,
    "conservant_usage_factor" numeric DEFAULT 0.1,
    "type" "text",
    "notes" "text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."weight_factor" IS 'The weight in kg that one unit of this product represents (e.g., 1 = 1kg, 0.5 = 500g, 10 = 10kg)';



CREATE TABLE IF NOT EXISTS "public"."reclamacoes" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "protocolo" "text",
    "nome_cliente" "text",
    "supermercado" "text",
    "cidade_estado" "text",
    "url_foto_lote" "text",
    "url_foto_problema" "text",
    "descricao_reclamacao" "text",
    "contato_wa" "text",
    "link_contato_wa" "text",
    "status" "text" DEFAULT 'Nova'::"text" NOT NULL,
    "tipo_resolucao" "text",
    "valor_ressarcimento" numeric(10,2),
    "data_resolucao" timestamp with time zone,
    "lote" character varying,
    "tipos_reclamacao" "text"[]
);


ALTER TABLE "public"."reclamacoes" OWNER TO "postgres";


COMMENT ON TABLE "public"."reclamacoes" IS 'Tabela para armazenar reclamações registradas via chatbot Manychat.';



COMMENT ON COLUMN "public"."reclamacoes"."protocolo" IS 'ID do usuário no Manychat (user_id), usado como protocolo.';



COMMENT ON COLUMN "public"."reclamacoes"."status" IS 'Status do andamento da reclamação (Ex: Nova, Em Análise, Resolvida).';



COMMENT ON COLUMN "public"."reclamacoes"."tipo_resolucao" IS 'Tipo de resolução: Ressarcimento via pix, Envio de produto, Outros';



COMMENT ON COLUMN "public"."reclamacoes"."valor_ressarcimento" IS 'Valor do ressarcimento em caso de pagamento via pix';



COMMENT ON COLUMN "public"."reclamacoes"."data_resolucao" IS 'Data e hora quando a reclamação foi resolvida';



ALTER TABLE "public"."reclamacoes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."reclamacoes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."responsaveis_tecnicos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "funcao" "text" NOT NULL,
    "carteira_tecnica" "text" NOT NULL,
    "assinatura_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."responsaveis_tecnicos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "produced_item_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit_of_measure" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" timestamp with time zone NOT NULL,
    "invoice_number" "text" NOT NULL,
    "customer_name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessoes_chat" (
    "id" bigint NOT NULL,
    "chat_id" "text" NOT NULL,
    "dados_coletados" "jsonb",
    "historico_conversa" "jsonb",
    "status" character varying(50) DEFAULT 'aberto'::character varying,
    "ultima_interacao" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sessoes_chat" OWNER TO "postgres";


ALTER TABLE "public"."sessoes_chat" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."sessoes_chat_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "contacts" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "action_type" "text" NOT NULL,
    "entity_schema" "text" DEFAULT 'public'::"text" NOT NULL,
    "entity_table" "text" NOT NULL,
    "entity_id" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "user_display_name" "text"
);


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_logs" IS 'Tabela para registrar auditorias de alterações no sistema.';



COMMENT ON COLUMN "public"."system_logs"."user_id" IS 'ID do usuário que realizou a ação (de auth.users). Nulo se a ação for do sistema.';



COMMENT ON COLUMN "public"."system_logs"."action_type" IS 'Tipo de operação: INSERT, UPDATE, DELETE.';



COMMENT ON COLUMN "public"."system_logs"."entity_schema" IS 'Schema da tabela afetada.';



COMMENT ON COLUMN "public"."system_logs"."entity_table" IS 'Nome da tabela afetada.';



COMMENT ON COLUMN "public"."system_logs"."entity_id" IS 'ID do registro afetado na tabela entity_table.';



COMMENT ON COLUMN "public"."system_logs"."old_data" IS 'Dados do registro antes da alteração (para UPDATE, DELETE).';



COMMENT ON COLUMN "public"."system_logs"."new_data" IS 'Dados do registro após a alteração (para INSERT, UPDATE).';



CREATE TABLE IF NOT EXISTS "public"."used_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "production_batch_id" "uuid" NOT NULL,
    "material_batch_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit_of_measure" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "mix_count_used" integer
);


ALTER TABLE "public"."used_materials" OWNER TO "postgres";


COMMENT ON COLUMN "public"."used_materials"."mix_count_used" IS 'Número de mexidas que utilizaram este lote específico de material';



CREATE TABLE IF NOT EXISTS "public"."used_materials_mix" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "mix_batch_id" "uuid" NOT NULL,
    "material_batch_id" "uuid" NOT NULL,
    "quantity" numeric(15,4) DEFAULT 0 NOT NULL,
    "unit_of_measure" character varying(50) DEFAULT 'kg'::character varying NOT NULL,
    "mix_count_used" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_used_mix_quantity" CHECK (("quantity" >= (0)::numeric))
);


ALTER TABLE "public"."used_materials_mix" OWNER TO "postgres";


COMMENT ON TABLE "public"."used_materials_mix" IS 'Materiais utilizados nas mexidas';



CREATE OR REPLACE VIEW "public"."v_current_material_stock" AS
 SELECT "m"."id" AS "material_id",
    "m"."name" AS "material_name",
    "m"."type" AS "material_type",
    "mb"."id" AS "batch_id",
    "mb"."batch_number",
    "mb"."quantity" AS "original_quantity",
    "mb"."remaining_quantity",
    "mb"."unit_of_measure",
    "mb"."expiry_date",
    "mb"."has_report",
    "mb"."created_at",
    "mb"."updated_at"
   FROM ("public"."materials" "m"
     JOIN "public"."material_batches" "mb" ON (("m"."id" = "mb"."material_id")))
  WHERE ("mb"."remaining_quantity" > (0)::numeric)
  ORDER BY "m"."name", "mb"."created_at" DESC;


ALTER TABLE "public"."v_current_material_stock" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_current_product_stock" AS
 SELECT "p"."id" AS "product_id",
    "p"."name" AS "product_name",
    "p"."type" AS "product_type",
    "pi"."id" AS "produced_item_id",
    "pi"."batch_number",
    "pi"."quantity" AS "original_quantity",
    "pi"."remaining_quantity",
    "pi"."unit_of_measure",
    "pb"."production_date",
    "pi"."created_at",
    "pi"."updated_at"
   FROM (("public"."products" "p"
     JOIN "public"."produced_items" "pi" ON (("p"."id" = "pi"."product_id")))
     JOIN "public"."production_batches" "pb" ON (("pi"."production_batch_id" = "pb"."id")))
  WHERE ("pi"."remaining_quantity" > (0)::numeric)
  ORDER BY "p"."name", "pb"."production_date" DESC;


ALTER TABLE "public"."v_current_product_stock" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_production_summary" AS
 SELECT "pb"."id" AS "production_batch_id",
    "pb"."batch_number",
    "pb"."production_date",
    "pb"."mix_day",
    "pb"."mix_count",
    "count"(DISTINCT "pi"."id") AS "products_count",
    "count"(DISTINCT "um"."id") AS "materials_count",
    "sum"(("pi"."quantity" * COALESCE("p"."weight_factor", 1.0))) AS "total_weight_kg",
    "pb"."created_at",
    "pb"."updated_at"
   FROM ((("public"."production_batches" "pb"
     LEFT JOIN "public"."produced_items" "pi" ON (("pb"."id" = "pi"."production_batch_id")))
     LEFT JOIN "public"."products" "p" ON (("pi"."product_id" = "p"."id")))
     LEFT JOIN "public"."used_materials" "um" ON (("pb"."id" = "um"."production_batch_id")))
  GROUP BY "pb"."id", "pb"."batch_number", "pb"."production_date", "pb"."mix_day", "pb"."mix_count", "pb"."created_at", "pb"."updated_at"
  ORDER BY "pb"."production_date" DESC;


ALTER TABLE "public"."v_production_summary" OWNER TO "postgres";


ALTER TABLE ONLY "public"."laudos_liberacao" ALTER COLUMN "numero_laudo" SET DEFAULT "nextval"('"public"."laudos_liberacao_numero_laudo_seq"'::"regclass");



ALTER TABLE ONLY "public"."analises_amostras"
    ADD CONSTRAINT "analises_amostras_coleta_id_numero_amostra_key" UNIQUE ("coleta_id", "numero_amostra");



ALTER TABLE ONLY "public"."analises_amostras"
    ADD CONSTRAINT "analises_amostras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analises_contra_provas"
    ADD CONSTRAINT "analises_contra_provas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."baixas_estoque"
    ADD CONSTRAINT "baixas_estoque_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coletas_amostras"
    ADD CONSTRAINT "coletas_amostras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuracoes_empresa"
    ADD CONSTRAINT "configuracoes_empresa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contra_provas"
    ADD CONSTRAINT "contra_provas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_numero_contrato_key" UNIQUE ("numero_contrato");



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feriados"
    ADD CONSTRAINT "feriados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funcionarios"
    ADD CONSTRAINT "funcionarios_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "public"."funcionarios"
    ADD CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_settings"
    ADD CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jornadas_trabalho"
    ADD CONSTRAINT "jornadas_trabalho_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."laudos_liberacao"
    ADD CONSTRAINT "laudos_liberacao_link_publico_key" UNIQUE ("link_publico");



ALTER TABLE ONLY "public"."laudos_liberacao"
    ADD CONSTRAINT "laudos_liberacao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."losses"
    ADD CONSTRAINT "losses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_batches"
    ADD CONSTRAINT "material_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mix_batches"
    ADD CONSTRAINT "mix_batches_batch_number_key" UNIQUE ("batch_number");



ALTER TABLE ONLY "public"."mix_batches"
    ADD CONSTRAINT "mix_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produced_items"
    ADD CONSTRAINT "produced_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_batch_number_key" UNIQUE ("batch_number");



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reclamacoes"
    ADD CONSTRAINT "reclamacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responsaveis_tecnicos"
    ADD CONSTRAINT "responsaveis_tecnicos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessoes_chat"
    ADD CONSTRAINT "sessoes_chat_chat_id_key" UNIQUE ("chat_id");



ALTER TABLE ONLY "public"."sessoes_chat"
    ADD CONSTRAINT "sessoes_chat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analises_contra_provas"
    ADD CONSTRAINT "unique_analise_dia" UNIQUE ("contra_prova_id", "dia_analise");



ALTER TABLE ONLY "public"."used_materials_mix"
    ADD CONSTRAINT "used_materials_mix_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."used_materials"
    ADD CONSTRAINT "used_materials_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_analises_amostras_coleta" ON "public"."analises_amostras" USING "btree" ("coleta_id");



CREATE INDEX "idx_analises_contra_provas_contra_prova_id" ON "public"."analises_contra_provas" USING "btree" ("contra_prova_id");



CREATE INDEX "idx_analises_contra_provas_data_analise" ON "public"."analises_contra_provas" USING "btree" ("data_analise");



CREATE INDEX "idx_analises_contra_provas_status" ON "public"."analises_contra_provas" USING "btree" ("status_analise");



CREATE INDEX "idx_baixas_estoque_data" ON "public"."baixas_estoque" USING "btree" ("data");



CREATE INDEX "idx_baixas_estoque_lote_material" ON "public"."baixas_estoque" USING "btree" ("lote_material_id");



CREATE INDEX "idx_coletas_amostras_data" ON "public"."coletas_amostras" USING "btree" ("data_coleta");



CREATE INDEX "idx_coletas_amostras_lote" ON "public"."coletas_amostras" USING "btree" ("lote_producao");



CREATE INDEX "idx_contra_provas_data_validade" ON "public"."contra_provas" USING "btree" ("data_validade");



CREATE INDEX "idx_contra_provas_lote_produto" ON "public"."contra_provas" USING "btree" ("lote_produto");



CREATE INDEX "idx_contra_provas_product_id" ON "public"."contra_provas" USING "btree" ("product_id");



CREATE INDEX "idx_contratos_assinante_interno" ON "public"."contratos" USING "btree" ("assinante_interno_id");



CREATE INDEX "idx_contratos_criado_por" ON "public"."contratos" USING "btree" ("criado_por");



CREATE INDEX "idx_contratos_email_externo" ON "public"."contratos" USING "btree" ("assinante_externo_email");



CREATE INDEX "idx_feriados_ano" ON "public"."feriados" USING "btree" ("ano");



CREATE INDEX "idx_feriados_data" ON "public"."feriados" USING "btree" ("data");



CREATE INDEX "idx_feriados_tipo" ON "public"."feriados" USING "btree" ("tipo");



CREATE INDEX "idx_funcionarios_jornada" ON "public"."funcionarios" USING "btree" ("jornada_id");



CREATE INDEX "idx_funcionarios_setor" ON "public"."funcionarios" USING "btree" ("setor");



CREATE INDEX "idx_funcionarios_status" ON "public"."funcionarios" USING "btree" ("status");



CREATE INDEX "idx_laudos_liberacao_coleta" ON "public"."laudos_liberacao" USING "btree" ("coleta_id");



CREATE INDEX "idx_laudos_liberacao_link_publico" ON "public"."laudos_liberacao" USING "btree" ("link_publico");



CREATE INDEX "idx_losses_date" ON "public"."losses" USING "btree" ("date");



CREATE INDEX "idx_losses_production_batch" ON "public"."losses" USING "btree" ("production_batch_id");



CREATE INDEX "idx_material_batches_batch_number" ON "public"."material_batches" USING "btree" ("batch_number");



CREATE INDEX "idx_material_batches_material_id" ON "public"."material_batches" USING "btree" ("material_id");



CREATE INDEX "idx_material_batches_order_item_id" ON "public"."material_batches" USING "btree" ("order_item_id");



CREATE INDEX "idx_material_batches_remaining_qty" ON "public"."material_batches" USING "btree" ("remaining_quantity") WHERE ("remaining_quantity" > (0)::numeric);



CREATE INDEX "idx_mix_batches_date" ON "public"."mix_batches" USING "btree" ("mix_date");



CREATE INDEX "idx_mix_batches_status" ON "public"."mix_batches" USING "btree" ("status");



CREATE INDEX "idx_order_items_material_id" ON "public"."order_items" USING "btree" ("material_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_orders_date" ON "public"."orders" USING "btree" ("date");



CREATE INDEX "idx_orders_supplier_id" ON "public"."orders" USING "btree" ("supplier_id");



CREATE INDEX "idx_produced_items_product_id" ON "public"."produced_items" USING "btree" ("product_id");



CREATE INDEX "idx_produced_items_production_batch" ON "public"."produced_items" USING "btree" ("production_batch_id");



CREATE INDEX "idx_produced_items_remaining_qty" ON "public"."produced_items" USING "btree" ("remaining_quantity") WHERE ("remaining_quantity" > (0)::numeric);



CREATE INDEX "idx_production_batches_batch_number" ON "public"."production_batches" USING "btree" ("batch_number");



CREATE INDEX "idx_production_batches_date" ON "public"."production_batches" USING "btree" ("production_date");



CREATE INDEX "idx_production_batches_mix_batch" ON "public"."production_batches" USING "btree" ("mix_batch_id");



CREATE INDEX "idx_sale_items_produced_item_id" ON "public"."sale_items" USING "btree" ("produced_item_id");



CREATE INDEX "idx_sale_items_product_id" ON "public"."sale_items" USING "btree" ("product_id");



CREATE INDEX "idx_sale_items_sale_id" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sales_customer" ON "public"."sales" USING "btree" ("customer_name");



CREATE INDEX "idx_sales_date" ON "public"."sales" USING "btree" ("date");



CREATE INDEX "idx_system_logs_action_type" ON "public"."system_logs" USING "btree" ("action_type");



CREATE INDEX "idx_system_logs_created_at" ON "public"."system_logs" USING "btree" ("created_at");



CREATE INDEX "idx_system_logs_entity" ON "public"."system_logs" USING "btree" ("entity_table", "entity_id");



CREATE INDEX "idx_system_logs_entity_table" ON "public"."system_logs" USING "btree" ("entity_table");



CREATE INDEX "idx_system_logs_user_id" ON "public"."system_logs" USING "btree" ("user_id");



CREATE INDEX "idx_used_materials_material_batch" ON "public"."used_materials" USING "btree" ("material_batch_id");



CREATE INDEX "idx_used_materials_mix_batch" ON "public"."used_materials_mix" USING "btree" ("mix_batch_id");



CREATE INDEX "idx_used_materials_mix_material" ON "public"."used_materials_mix" USING "btree" ("material_batch_id");



CREATE INDEX "idx_used_materials_production_batch" ON "public"."used_materials" USING "btree" ("production_batch_id");



CREATE OR REPLACE TRIGGER "atualizar_baixas_estoque_data_modificacao" BEFORE UPDATE ON "public"."baixas_estoque" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_data_modificacao"();



CREATE OR REPLACE TRIGGER "set_timestamp_losses" BEFORE UPDATE ON "public"."losses" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_material_batches" BEFORE UPDATE ON "public"."material_batches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_materials" BEFORE UPDATE ON "public"."materials" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_order_items" BEFORE UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_orders" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_produced_items" BEFORE UPDATE ON "public"."produced_items" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_production_batches" BEFORE UPDATE ON "public"."production_batches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_products" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_sale_items" BEFORE UPDATE ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_sales" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_suppliers" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_used_materials" BEFORE UPDATE ON "public"."used_materials" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "sync_material_batch_with_order_item_after_insert" AFTER INSERT ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_order_item_changes_for_material_batch"();



CREATE OR REPLACE TRIGGER "sync_material_batch_with_order_item_after_update" AFTER UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_order_item_changes_for_material_batch"();



CREATE OR REPLACE TRIGGER "sync_material_batch_with_order_item_before_delete" BEFORE DELETE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_order_item_changes_for_material_batch"();



CREATE OR REPLACE TRIGGER "trg_gerar_numero_contrato" BEFORE INSERT ON "public"."contratos" FOR EACH ROW EXECUTE FUNCTION "public"."gerar_numero_contrato"();



CREATE OR REPLACE TRIGGER "trigger_atualizar_contratos_atualizado_em" BEFORE UPDATE ON "public"."contratos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_coluna_atualizado_em"();



CREATE OR REPLACE TRIGGER "trigger_configuracoes_empresa_updated_at" BEFORE UPDATE ON "public"."configuracoes_empresa" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_criar_analises_contra_prova_unica" AFTER INSERT ON "public"."contra_provas" FOR EACH ROW EXECUTE FUNCTION "public"."criar_analises_contra_prova_unica"();



CREATE OR REPLACE TRIGGER "trigger_definir_numero_contrato" BEFORE INSERT ON "public"."contratos" FOR EACH ROW EXECUTE FUNCTION "public"."definir_numero_contrato"();



CREATE OR REPLACE TRIGGER "trigger_feriados_updated_at" BEFORE UPDATE ON "public"."feriados" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_funcionarios_updated_at" BEFORE UPDATE ON "public"."funcionarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_jornadas_trabalho_updated_at" BEFORE UPDATE ON "public"."jornadas_trabalho" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_set_link_publico" BEFORE INSERT ON "public"."laudos_liberacao" FOR EACH ROW EXECUTE FUNCTION "public"."set_link_publico"();



CREATE OR REPLACE TRIGGER "trigger_update_global_settings_updated_at" BEFORE UPDATE ON "public"."global_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "update_analises_amostras_updated_at" BEFORE UPDATE ON "public"."analises_amostras" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_coletas_amostras_updated_at" BEFORE UPDATE ON "public"."coletas_amostras" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_global_settings_updated_at" BEFORE UPDATE ON "public"."global_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_laudos_liberacao_updated_at" BEFORE UPDATE ON "public"."laudos_liberacao" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_losses_updated_at" BEFORE UPDATE ON "public"."losses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_material_batches_updated_at" BEFORE UPDATE ON "public"."material_batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_materials_updated_at" BEFORE UPDATE ON "public"."materials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mix_batches_updated_at" BEFORE UPDATE ON "public"."mix_batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_order_items_updated_at" BEFORE UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_produced_items_updated_at" BEFORE UPDATE ON "public"."produced_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_production_batches_updated_at" BEFORE UPDATE ON "public"."production_batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sale_items_updated_at" BEFORE UPDATE ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sales_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_used_materials_mix_updated_at" BEFORE UPDATE ON "public"."used_materials_mix" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_used_materials_updated_at" BEFORE UPDATE ON "public"."used_materials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."analises_amostras"
    ADD CONSTRAINT "analises_amostras_coleta_id_fkey" FOREIGN KEY ("coleta_id") REFERENCES "public"."coletas_amostras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analises_contra_provas"
    ADD CONSTRAINT "analises_contra_provas_contra_prova_id_fkey" FOREIGN KEY ("contra_prova_id") REFERENCES "public"."contra_provas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."baixas_estoque"
    ADD CONSTRAINT "baixas_estoque_lote_material_id_fkey" FOREIGN KEY ("lote_material_id") REFERENCES "public"."material_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contra_provas"
    ADD CONSTRAINT "contra_provas_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_assinante_interno_id_fkey" FOREIGN KEY ("assinante_interno_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."material_batches"
    ADD CONSTRAINT "fk_material_batches_order_item" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."funcionarios"
    ADD CONSTRAINT "funcionarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."configuracoes_empresa"("id");



ALTER TABLE ONLY "public"."funcionarios"
    ADD CONSTRAINT "funcionarios_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "public"."jornadas_trabalho"("id");



ALTER TABLE ONLY "public"."laudos_liberacao"
    ADD CONSTRAINT "laudos_liberacao_coleta_id_fkey" FOREIGN KEY ("coleta_id") REFERENCES "public"."coletas_amostras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."losses"
    ADD CONSTRAINT "losses_production_batch_id_fkey" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id");



ALTER TABLE ONLY "public"."material_batches"
    ADD CONSTRAINT "material_batches_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."produced_items"
    ADD CONSTRAINT "produced_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."produced_items"
    ADD CONSTRAINT "produced_items_production_batch_id_fkey" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_batches"
    ADD CONSTRAINT "production_batches_mix_batch_id_fkey" FOREIGN KEY ("mix_batch_id") REFERENCES "public"."mix_batches"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_produced_item_id_fkey" FOREIGN KEY ("produced_item_id") REFERENCES "public"."produced_items"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."used_materials"
    ADD CONSTRAINT "used_materials_material_batch_id_fkey" FOREIGN KEY ("material_batch_id") REFERENCES "public"."material_batches"("id");



ALTER TABLE ONLY "public"."used_materials_mix"
    ADD CONSTRAINT "used_materials_mix_material_batch_id_fkey" FOREIGN KEY ("material_batch_id") REFERENCES "public"."material_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."used_materials_mix"
    ADD CONSTRAINT "used_materials_mix_mix_batch_id_fkey" FOREIGN KEY ("mix_batch_id") REFERENCES "public"."mix_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."used_materials"
    ADD CONSTRAINT "used_materials_production_batch_id_fkey" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all operations for authenticated users" ON "public"."analises_amostras" TO "authenticated" USING (true);



CREATE POLICY "Allow all operations for authenticated users" ON "public"."coletas_amostras" TO "authenticated" USING (true);



CREATE POLICY "Allow all operations for authenticated users" ON "public"."laudos_liberacao" TO "authenticated" USING (true);



CREATE POLICY "Controle Total de Vendas para AdminEditor" ON "public"."sales" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir a leitura de logs para usuários autenticados" ON "public"."system_logs" FOR SELECT USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."losses" USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."material_batches" USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."materials" USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."order_items" USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."orders" USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."produced_items" USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."production_batches" USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."products" USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."sale_items" USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."suppliers" USING (true);



CREATE POLICY "Permitir acesso anônimo" ON "public"."used_materials" USING (true);



CREATE POLICY "Permitir acesso público aos laudos via link_publico" ON "public"."laudos_liberacao" FOR SELECT USING (("link_publico" IS NOT NULL));



CREATE POLICY "Permitir acesso público às coletas de laudos públicos" ON "public"."coletas_amostras" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."laudos_liberacao"
  WHERE (("laudos_liberacao"."coleta_id" = "coletas_amostras"."id") AND ("laudos_liberacao"."link_publico" IS NOT NULL)))));



CREATE POLICY "Permitir inserção de logs para usuários autenticados" ON "public"."system_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Permitir leitura/edicao/update de dados por usuários autentica" ON "public"."global_settings" TO "authenticated" USING (true);



CREATE POLICY "Usuarios podem atualizar baixas de estoque" ON "public"."baixas_estoque" FOR UPDATE USING (true);



CREATE POLICY "Usuarios podem excluir baixas de estoque" ON "public"."baixas_estoque" FOR DELETE USING (true);



CREATE POLICY "Usuarios podem inserir baixas de estoque" ON "public"."baixas_estoque" FOR INSERT WITH CHECK (true);



CREATE POLICY "Usuarios podem visualizar baixas de estoque" ON "public"."baixas_estoque" FOR SELECT USING (true);



CREATE POLICY "Usuários podem atualizar contratos que criaram ou são signat" ON "public"."contratos" FOR UPDATE USING ((("auth"."uid"() = "criado_por") OR ("auth"."uid"() = "assinante_interno_id")));



CREATE POLICY "Usuários podem criar contratos" ON "public"."contratos" FOR INSERT WITH CHECK (("auth"."uid"() = "criado_por"));



CREATE POLICY "Usuários podem ver contratos que criaram ou estão envolvidos" ON "public"."contratos" FOR SELECT USING ((("auth"."uid"() = "criado_por") OR ("auth"."uid"() = "assinante_interno_id") OR ("auth"."email"() = ("assinante_externo_email")::"text")));



ALTER TABLE "public"."analises_amostras" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."baixas_estoque" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coletas_amostras" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configuracoes_empresa" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "configuracoes_empresa_policy" ON "public"."configuracoes_empresa" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."contratos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feriados" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feriados_policy" ON "public"."feriados" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."funcionarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "funcionarios_policy" ON "public"."funcionarios" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."global_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jornadas_trabalho" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jornadas_trabalho_policy" ON "public"."jornadas_trabalho" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."laudos_liberacao" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."losses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produced_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."production_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."used_materials" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."configuracoes_empresa";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."feriados";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."funcionarios";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."jornadas_trabalho";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."losses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."material_batches";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."materials";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."order_items";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."abort_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."abort_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."abort_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_coluna_atualizado_em"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_coluna_atualizado_em"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_coluna_atualizado_em"() TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_data_modificacao"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_data_modificacao"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_data_modificacao"() TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_timestamp_atualizacao"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_timestamp_atualizacao"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_timestamp_atualizacao"() TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_timestamp_modificacao"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_timestamp_modificacao"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_timestamp_modificacao"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auditoria_completa_estoque"() TO "anon";
GRANT ALL ON FUNCTION "public"."auditoria_completa_estoque"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auditoria_completa_estoque"() TO "service_role";



GRANT ALL ON FUNCTION "public"."begin_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."begin_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."begin_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_total_weight"("production_batch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_total_weight"("production_batch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_total_weight"("production_batch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_material_stock"("material_batch_id" "uuid", "required_quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."check_material_stock"("material_batch_id" "uuid", "required_quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_material_stock"("material_batch_id" "uuid", "required_quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."criar_analises_contra_prova_unica"() TO "anon";
GRANT ALL ON FUNCTION "public"."criar_analises_contra_prova_unica"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."criar_analises_contra_prova_unica"() TO "service_role";



GRANT ALL ON FUNCTION "public"."definir_numero_contrato"() TO "anon";
GRANT ALL ON FUNCTION "public"."definir_numero_contrato"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."definir_numero_contrato"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detectar_inconsistencias_estoque"() TO "anon";
GRANT ALL ON FUNCTION "public"."detectar_inconsistencias_estoque"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detectar_inconsistencias_estoque"() TO "service_role";



GRANT ALL ON FUNCTION "public"."end_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."end_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."extrair_variaveis_modelo"("conteudo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."extrair_variaveis_modelo"("conteudo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extrair_variaveis_modelo"("conteudo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_link"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_link"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_link"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gerar_numero_contrato"() TO "anon";
GRANT ALL ON FUNCTION "public"."gerar_numero_contrato"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."gerar_numero_contrato"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_global_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_global_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_global_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_material_stock_history"("material_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_material_stock_history"("material_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_material_stock_history"("material_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_order_item_changes_for_material_batch"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_order_item_changes_for_material_batch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_order_item_changes_for_material_batch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_stock_inconsistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_stock_inconsistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_stock_inconsistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_link_publico"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_link_publico"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_link_publico"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_extrair_variaveis"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_extrair_variaveis"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_extrair_variaveis"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_material_batch_after_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_material_batch_after_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_material_batch_after_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_produced_item_after_sale"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_produced_item_after_sale"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_produced_item_after_sale"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verificar_integridade_estoque"() TO "anon";
GRANT ALL ON FUNCTION "public"."verificar_integridade_estoque"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verificar_integridade_estoque"() TO "service_role";


















GRANT ALL ON TABLE "public"."analises_amostras" TO "anon";
GRANT ALL ON TABLE "public"."analises_amostras" TO "authenticated";
GRANT ALL ON TABLE "public"."analises_amostras" TO "service_role";



GRANT ALL ON TABLE "public"."analises_contra_provas" TO "anon";
GRANT ALL ON TABLE "public"."analises_contra_provas" TO "authenticated";
GRANT ALL ON TABLE "public"."analises_contra_provas" TO "service_role";



GRANT ALL ON TABLE "public"."baixas_estoque" TO "anon";
GRANT ALL ON TABLE "public"."baixas_estoque" TO "authenticated";
GRANT ALL ON TABLE "public"."baixas_estoque" TO "service_role";



GRANT ALL ON TABLE "public"."coletas_amostras" TO "anon";
GRANT ALL ON TABLE "public"."coletas_amostras" TO "authenticated";
GRANT ALL ON TABLE "public"."coletas_amostras" TO "service_role";



GRANT ALL ON TABLE "public"."configuracoes_empresa" TO "anon";
GRANT ALL ON TABLE "public"."configuracoes_empresa" TO "authenticated";
GRANT ALL ON TABLE "public"."configuracoes_empresa" TO "service_role";



GRANT ALL ON TABLE "public"."contra_provas" TO "anon";
GRANT ALL ON TABLE "public"."contra_provas" TO "authenticated";
GRANT ALL ON TABLE "public"."contra_provas" TO "service_role";



GRANT ALL ON TABLE "public"."contratos" TO "anon";
GRANT ALL ON TABLE "public"."contratos" TO "authenticated";
GRANT ALL ON TABLE "public"."contratos" TO "service_role";



GRANT ALL ON TABLE "public"."feriados" TO "anon";
GRANT ALL ON TABLE "public"."feriados" TO "authenticated";
GRANT ALL ON TABLE "public"."feriados" TO "service_role";



GRANT ALL ON TABLE "public"."funcionarios" TO "anon";
GRANT ALL ON TABLE "public"."funcionarios" TO "authenticated";
GRANT ALL ON TABLE "public"."funcionarios" TO "service_role";



GRANT ALL ON TABLE "public"."global_settings" TO "anon";
GRANT ALL ON TABLE "public"."global_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."global_settings" TO "service_role";



GRANT ALL ON TABLE "public"."jornadas_trabalho" TO "anon";
GRANT ALL ON TABLE "public"."jornadas_trabalho" TO "authenticated";
GRANT ALL ON TABLE "public"."jornadas_trabalho" TO "service_role";



GRANT ALL ON TABLE "public"."laudos_liberacao" TO "anon";
GRANT ALL ON TABLE "public"."laudos_liberacao" TO "authenticated";
GRANT ALL ON TABLE "public"."laudos_liberacao" TO "service_role";



GRANT ALL ON SEQUENCE "public"."laudos_liberacao_numero_laudo_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."laudos_liberacao_numero_laudo_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."laudos_liberacao_numero_laudo_seq" TO "service_role";



GRANT ALL ON TABLE "public"."losses" TO "anon";
GRANT ALL ON TABLE "public"."losses" TO "authenticated";
GRANT ALL ON TABLE "public"."losses" TO "service_role";



GRANT ALL ON TABLE "public"."material_batches" TO "anon";
GRANT ALL ON TABLE "public"."material_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."material_batches" TO "service_role";



GRANT ALL ON TABLE "public"."materials" TO "anon";
GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON TABLE "public"."mix_batches" TO "anon";
GRANT ALL ON TABLE "public"."mix_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."mix_batches" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."produced_items" TO "anon";
GRANT ALL ON TABLE "public"."produced_items" TO "authenticated";
GRANT ALL ON TABLE "public"."produced_items" TO "service_role";



GRANT ALL ON TABLE "public"."production_batches" TO "anon";
GRANT ALL ON TABLE "public"."production_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."production_batches" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."reclamacoes" TO "anon";
GRANT ALL ON TABLE "public"."reclamacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."reclamacoes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reclamacoes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reclamacoes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reclamacoes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."responsaveis_tecnicos" TO "anon";
GRANT ALL ON TABLE "public"."responsaveis_tecnicos" TO "authenticated";
GRANT ALL ON TABLE "public"."responsaveis_tecnicos" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."sessoes_chat" TO "anon";
GRANT ALL ON TABLE "public"."sessoes_chat" TO "authenticated";
GRANT ALL ON TABLE "public"."sessoes_chat" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sessoes_chat_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sessoes_chat_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sessoes_chat_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."system_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";



GRANT ALL ON TABLE "public"."used_materials" TO "anon";
GRANT ALL ON TABLE "public"."used_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."used_materials" TO "service_role";



GRANT ALL ON TABLE "public"."used_materials_mix" TO "anon";
GRANT ALL ON TABLE "public"."used_materials_mix" TO "authenticated";
GRANT ALL ON TABLE "public"."used_materials_mix" TO "service_role";



GRANT ALL ON TABLE "public"."v_current_material_stock" TO "anon";
GRANT ALL ON TABLE "public"."v_current_material_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."v_current_material_stock" TO "service_role";



GRANT ALL ON TABLE "public"."v_current_product_stock" TO "anon";
GRANT ALL ON TABLE "public"."v_current_product_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."v_current_product_stock" TO "service_role";



GRANT ALL ON TABLE "public"."v_production_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_production_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_production_summary" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
