-- ============================================================================
-- MELHORIAS PONTUAIS PARA O SISTEMA NOSSA GOMA
-- APLICAR APENAS ESTAS MELHORIAS - NÃO APLICAR MIGRAÇÕES COMPLETAS!
-- ============================================================================

-- IMPORTANTE: Execute este script APENAS se quiser adicionar funcionalidades extras
-- Seu sistema JÁ FUNCIONA perfeitamente sem estas melhorias

-- ============================================================================
-- 1. ADICIONAR VIEWS ÚTEIS PARA RELATÓRIOS
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
-- 2. CRIAR FUNÇÕES AUXILIARES AVANÇADAS
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
-- 3. CRIAR ÍNDICES DE PERFORMANCE (SE NÃO EXISTIREM)
-- ============================================================================

-- Índices para material_batches
CREATE INDEX IF NOT EXISTS idx_material_batches_material_id ON public.material_batches(material_id);
CREATE INDEX IF NOT EXISTS idx_material_batches_batch_number ON public.material_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_material_batches_remaining_qty ON public.material_batches(remaining_quantity) WHERE remaining_quantity > 0;

-- Índices para production_batches
CREATE INDEX IF NOT EXISTS idx_production_batches_date ON public.production_batches(production_date);
CREATE INDEX IF NOT EXISTS idx_production_batches_batch_number ON public.production_batches(batch_number);

-- Índices para produced_items
CREATE INDEX IF NOT EXISTS idx_produced_items_production_batch ON public.produced_items(production_batch_id);
CREATE INDEX IF NOT EXISTS idx_produced_items_product_id ON public.produced_items(product_id);
CREATE INDEX IF NOT EXISTS idx_produced_items_remaining_qty ON public.produced_items(remaining_quantity) WHERE remaining_quantity > 0;

-- Índices para used_materials
CREATE INDEX IF NOT EXISTS idx_used_materials_production_batch ON public.used_materials(production_batch_id);
CREATE INDEX IF NOT EXISTS idx_used_materials_material_batch ON public.used_materials(material_batch_id);

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON public.orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(date);

-- Índices para order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_material_id ON public.order_items(material_id);

-- Índices para sales
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_name);

-- Índices para sale_items
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_produced_item_id ON public.sale_items(produced_item_id);

-- Índices para losses
CREATE INDEX IF NOT EXISTS idx_losses_production_batch ON public.losses(production_batch_id);
CREATE INDEX IF NOT EXISTS idx_losses_date ON public.losses(date);

-- Índices para system_logs
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_entity_table ON public.system_logs(entity_table);
CREATE INDEX IF NOT EXISTS idx_system_logs_action_type ON public.system_logs(action_type);

-- ============================================================================
-- 4. VERIFICAR/CRIAR TRIGGERS DE UPDATED_AT (SE NÃO EXISTIREM)
-- ============================================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para todas as tabelas com updated_at (apenas se não existirem)
DO $$
BEGIN
    -- Products
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
        CREATE TRIGGER update_products_updated_at
            BEFORE UPDATE ON public.products
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Materials
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_materials_updated_at') THEN
        CREATE TRIGGER update_materials_updated_at
            BEFORE UPDATE ON public.materials
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Suppliers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_suppliers_updated_at') THEN
        CREATE TRIGGER update_suppliers_updated_at
            BEFORE UPDATE ON public.suppliers
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Material Batches
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_material_batches_updated_at') THEN
        CREATE TRIGGER update_material_batches_updated_at
            BEFORE UPDATE ON public.material_batches
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Production Batches
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_production_batches_updated_at') THEN
        CREATE TRIGGER update_production_batches_updated_at
            BEFORE UPDATE ON public.production_batches
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Produced Items
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_produced_items_updated_at') THEN
        CREATE TRIGGER update_produced_items_updated_at
            BEFORE UPDATE ON public.produced_items
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Used Materials
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_used_materials_updated_at') THEN
        CREATE TRIGGER update_used_materials_updated_at
            BEFORE UPDATE ON public.used_materials
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Orders
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
        CREATE TRIGGER update_orders_updated_at
            BEFORE UPDATE ON public.orders
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Order Items
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_order_items_updated_at') THEN
        CREATE TRIGGER update_order_items_updated_at
            BEFORE UPDATE ON public.order_items
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Sales
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_updated_at') THEN
        CREATE TRIGGER update_sales_updated_at
            BEFORE UPDATE ON public.sales
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Sale Items
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sale_items_updated_at') THEN
        CREATE TRIGGER update_sale_items_updated_at
            BEFORE UPDATE ON public.sale_items
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Losses
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_losses_updated_at') THEN
        CREATE TRIGGER update_losses_updated_at
            BEFORE UPDATE ON public.losses
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Global Settings
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_global_settings_updated_at') THEN
        CREATE TRIGGER update_global_settings_updated_at
            BEFORE UPDATE ON public.global_settings
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- 5. CONCEDER PERMISSÕES PARA AS VIEWS E FUNÇÕES
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

-- ============================================================================
-- 6. VERIFICAR SE RLS ESTÁ HABILITADO (OPCIONAL)
-- ============================================================================

-- Verificar status do RLS em todas as tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

-- Este script adiciona APENAS melhorias de performance e funcionalidades extras
-- Não altera dados existentes nem estruturas já funcionais
-- Execute apenas se desejar estas funcionalidades extras

-- Benefícios das melhorias:
-- ✅ Views para relatórios mais rápidos
-- ✅ Funções auxiliares para o código TypeScript
-- ✅ Índices para consultas mais rápidas
-- ✅ Triggers para controle de updated_at
-- ✅ Zero risco aos dados existentes

SELECT 'MELHORIAS APLICADAS COM SUCESSO!' as resultado; 