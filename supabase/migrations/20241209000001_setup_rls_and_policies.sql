-- ============================================================================
-- CONFIGURAÇÃO DE RLS (ROW LEVEL SECURITY) E POLÍTICAS
-- Data: 2024-12-09
-- Versão: 2.0.1
-- Descrição: Configuração de segurança e políticas de acesso
-- ============================================================================

-- ============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produced_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS PARA USUÁRIOS AUTENTICADOS (ACESSO TOTAL)
-- ============================================================================

-- Products
DROP POLICY IF EXISTS "products_policy" ON public.products;
CREATE POLICY "products_policy" ON public.products
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Materials
DROP POLICY IF EXISTS "materials_policy" ON public.materials;
CREATE POLICY "materials_policy" ON public.materials
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Suppliers
DROP POLICY IF EXISTS "suppliers_policy" ON public.suppliers;
CREATE POLICY "suppliers_policy" ON public.suppliers
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Material Batches
DROP POLICY IF EXISTS "material_batches_policy" ON public.material_batches;
CREATE POLICY "material_batches_policy" ON public.material_batches
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Production Batches
DROP POLICY IF EXISTS "production_batches_policy" ON public.production_batches;
CREATE POLICY "production_batches_policy" ON public.production_batches
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Produced Items
DROP POLICY IF EXISTS "produced_items_policy" ON public.produced_items;
CREATE POLICY "produced_items_policy" ON public.produced_items
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Used Materials
DROP POLICY IF EXISTS "used_materials_policy" ON public.used_materials;
CREATE POLICY "used_materials_policy" ON public.used_materials
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Orders
DROP POLICY IF EXISTS "orders_policy" ON public.orders;
CREATE POLICY "orders_policy" ON public.orders
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Order Items
DROP POLICY IF EXISTS "order_items_policy" ON public.order_items;
CREATE POLICY "order_items_policy" ON public.order_items
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Sales
DROP POLICY IF EXISTS "sales_policy" ON public.sales;
CREATE POLICY "sales_policy" ON public.sales
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Sale Items
DROP POLICY IF EXISTS "sale_items_policy" ON public.sale_items;
CREATE POLICY "sale_items_policy" ON public.sale_items
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Losses
DROP POLICY IF EXISTS "losses_policy" ON public.losses;
CREATE POLICY "losses_policy" ON public.losses
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Global Settings
DROP POLICY IF EXISTS "global_settings_policy" ON public.global_settings;
CREATE POLICY "global_settings_policy" ON public.global_settings
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- System Logs (apenas leitura para usuários autenticados)
DROP POLICY IF EXISTS "system_logs_read_policy" ON public.system_logs;
CREATE POLICY "system_logs_read_policy" ON public.system_logs
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "system_logs_insert_policy" ON public.system_logs;
CREATE POLICY "system_logs_insert_policy" ON public.system_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- POLÍTICAS PARA REALTIME (TEMPO REAL)
-- ============================================================================

-- Habilitar publicações de realtime para tabelas principais
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.material_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produced_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.used_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.losses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_settings;

-- ============================================================================
-- FUNÇÕES AUXILIARES PARA O SISTEMA
-- ============================================================================

-- Função para buscar configurações globais
CREATE OR REPLACE FUNCTION public.get_global_settings()
RETURNS TABLE (
    id UUID,
    fecula_conversion_factor DECIMAL(10,4),
    production_prediction_factor DECIMAL(10,4),
    conservant_conversion_factor DECIMAL(10,4),
    conservant_usage_factor DECIMAL(10,4)
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar estoque disponível
CREATE OR REPLACE FUNCTION public.check_material_stock(
    material_batch_id UUID,
    required_quantity DECIMAL(15,4)
) RETURNS BOOLEAN AS $$
DECLARE
    available_quantity DECIMAL(15,4);
BEGIN
    SELECT remaining_quantity INTO available_quantity
    FROM public.material_batches
    WHERE id = material_batch_id;
    
    RETURN COALESCE(available_quantity, 0) >= required_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular peso total de produtos
CREATE OR REPLACE FUNCTION public.calculate_total_weight(
    production_batch_id UUID
) RETURNS DECIMAL(15,4) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar histórico de estoque de um material
CREATE OR REPLACE FUNCTION public.get_material_stock_history(
    material_id UUID
) RETURNS TABLE (
    batch_number VARCHAR(255),
    quantity DECIMAL(15,4),
    remaining_quantity DECIMAL(15,4),
    created_at TIMESTAMPTZ
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNÇÕES DE TRANSAÇÃO (MELHORADAS)
-- ============================================================================

-- Função para iniciar transação
CREATE OR REPLACE FUNCTION public.begin_transaction()
RETURNS void AS $$
BEGIN
    -- Inicia uma transação se não estiver em uma
    IF NOT (SELECT pg_is_in_recovery()) THEN
        -- Não fazemos nada especial aqui, apenas garantimos que está em transação
        NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para finalizar transação
CREATE OR REPLACE FUNCTION public.end_transaction()
RETURNS void AS $$
BEGIN
    -- Commita a transação atual
    -- No contexto do Supabase, isso é gerenciado automaticamente
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Função para abortar transação
CREATE OR REPLACE FUNCTION public.abort_transaction()
RETURNS void AS $$
BEGIN
    -- Faz rollback da transação
    RAISE EXCEPTION 'Transaction aborted by user request';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS ÚTEIS PARA RELATÓRIOS
-- ============================================================================

-- View para estoque atual de materiais
CREATE OR REPLACE VIEW public.v_current_material_stock AS
SELECT 
    m.id as material_id,
    m.name as material_name,
    m.type as material_type,
    mb.id as batch_id,
    mb.batch_number,
    mb.quantity as original_quantity,
    mb.remaining_quantity,
    mb.unit_of_measure,
    mb.expiry_date,
    mb.has_report,
    mb.created_at,
    mb.updated_at
FROM public.materials m
JOIN public.material_batches mb ON m.id = mb.material_id
WHERE mb.remaining_quantity > 0
ORDER BY m.name, mb.created_at DESC;

-- View para estoque atual de produtos
CREATE OR REPLACE VIEW public.v_current_product_stock AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.type as product_type,
    pi.id as produced_item_id,
    pi.batch_number,
    pi.quantity as original_quantity,
    pi.remaining_quantity,
    pi.unit_of_measure,
    pb.production_date,
    pi.created_at,
    pi.updated_at
FROM public.products p
JOIN public.produced_items pi ON p.id = pi.product_id
JOIN public.production_batches pb ON pi.production_batch_id = pb.id
WHERE pi.remaining_quantity > 0
ORDER BY p.name, pb.production_date DESC;

-- View para resumo de produção
CREATE OR REPLACE VIEW public.v_production_summary AS
SELECT 
    pb.id as production_batch_id,
    pb.batch_number,
    pb.production_date,
    pb.mix_day,
    pb.mix_count,
    COUNT(DISTINCT pi.id) as products_count,
    COUNT(DISTINCT um.id) as materials_count,
    SUM(pi.quantity * COALESCE(p.weight_factor, 1.0)) as total_weight_kg,
    pb.created_at,
    pb.updated_at
FROM public.production_batches pb
LEFT JOIN public.produced_items pi ON pb.id = pi.production_batch_id
LEFT JOIN public.products p ON pi.product_id = p.id
LEFT JOIN public.used_materials um ON pb.id = um.production_batch_id
GROUP BY pb.id, pb.batch_number, pb.production_date, pb.mix_day, pb.mix_count, pb.created_at, pb.updated_at
ORDER BY pb.production_date DESC;

-- ============================================================================
-- GRANTS PARA USUÁRIOS AUTENTICADOS
-- ============================================================================

-- Conceder acesso às views para usuários autenticados
GRANT SELECT ON public.v_current_material_stock TO authenticated;
GRANT SELECT ON public.v_current_product_stock TO authenticated;
GRANT SELECT ON public.v_production_summary TO authenticated;

-- Conceder acesso às funções para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_global_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_material_stock(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_total_weight(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_material_stock_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_transaction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_transaction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.abort_transaction() TO authenticated;

-- ============================================================================
-- FIM DA CONFIGURAÇÃO DE SEGURANÇA
-- ============================================================================ 