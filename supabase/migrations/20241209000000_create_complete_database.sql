-- ============================================================================
-- MIGRAÇÃO COMPLETA DO SISTEMA NOSSA GOMA
-- Data: 2024-12-09
-- Versão: 2.0.0
-- Descrição: Estrutura completa atualizada do banco de dados
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABELA: products (Produtos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100),
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'kg',
    weight_factor DECIMAL(10,4) DEFAULT 1.0000,
    fecula_conversion_factor DECIMAL(10,4) DEFAULT 25.0000,
    production_prediction_factor DECIMAL(10,4) DEFAULT 1.0000,
    conservant_conversion_factor DECIMAL(10,4) DEFAULT 0.1000,
    conservant_usage_factor DECIMAL(10,4) DEFAULT 0.1000,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. TABELA: materials (Materiais/Insumos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    type VARCHAR(100) NOT NULL, -- 'Fécula', 'Conservante', 'Aditivo', etc.
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'kg',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TABELA: suppliers (Fornecedores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    contacts TEXT, -- JSON com informações de contato
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TABELA: material_batches (Lotes de Materiais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.material_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    batch_number VARCHAR(255) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    supplied_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    remaining_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'kg',
    expiry_date DATE,
    has_report BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_quantities CHECK (
        quantity >= 0 AND 
        supplied_quantity >= 0 AND 
        remaining_quantity >= 0 AND
        remaining_quantity <= quantity
    )
);

-- ============================================================================
-- 5. TABELA: production_batches (Lotes de Produção)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(255) NOT NULL UNIQUE,
    production_date DATE NOT NULL,
    mix_day VARCHAR(100) NOT NULL,
    mix_count INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_mix_count CHECK (mix_count > 0)
);

-- ============================================================================
-- 6. TABELA: produced_items (Itens Produzidos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.produced_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_batch_id UUID NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_number VARCHAR(255) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    remaining_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'kg',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_produced_quantities CHECK (
        quantity >= 0 AND 
        remaining_quantity >= 0 AND
        remaining_quantity <= quantity
    )
);

-- ============================================================================
-- 7. TABELA: used_materials (Materiais Utilizados na Produção)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.used_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_batch_id UUID NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
    material_batch_id UUID NOT NULL REFERENCES public.material_batches(id) ON DELETE CASCADE,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'kg',
    mix_count_used INTEGER, -- Para conservantes: quantas mexidas foram usadas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_used_quantity CHECK (quantity >= 0)
);

-- ============================================================================
-- 8. TABELA: orders (Pedidos de Compra)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    invoice_number VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. TABELA: order_items (Itens do Pedido)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    batch_number VARCHAR(255) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'kg',
    expiry_date DATE,
    has_report BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_order_quantity CHECK (quantity >= 0)
);

-- ============================================================================
-- 10. TABELA: sales (Vendas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    invoice_number VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL DEFAULT 'Venda',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. TABELA: sale_items (Itens da Venda)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    produced_item_id UUID NOT NULL REFERENCES public.produced_items(id) ON DELETE CASCADE,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'kg',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_sale_quantity CHECK (quantity >= 0)
);

-- ============================================================================
-- 12. TABELA: losses (Perdas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.losses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_batch_id UUID NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    batch_number VARCHAR(255),
    machine VARCHAR(255) NOT NULL,
    product_type VARCHAR(100) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'kg',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_loss_quantity CHECK (quantity >= 0)
);

-- ============================================================================
-- 13. TABELA: global_settings (Configurações Globais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecula_conversion_factor DECIMAL(10,4) DEFAULT 25.0000,
    production_prediction_factor DECIMAL(10,4) DEFAULT 1.0000,
    conservant_conversion_factor DECIMAL(10,4) DEFAULT 0.1000,
    conservant_usage_factor DECIMAL(10,4) DEFAULT 0.1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. TABELA: system_logs (Logs do Sistema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Referência ao auth.users
    user_display_name VARCHAR(255),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    entity_schema VARCHAR(100) NOT NULL DEFAULT 'public',
    entity_table VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para todas as tabelas com updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_materials_updated_at ON public.materials;
CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON public.materials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_material_batches_updated_at ON public.material_batches;
CREATE TRIGGER update_material_batches_updated_at
    BEFORE UPDATE ON public.material_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_production_batches_updated_at ON public.production_batches;
CREATE TRIGGER update_production_batches_updated_at
    BEFORE UPDATE ON public.production_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_produced_items_updated_at ON public.produced_items;
CREATE TRIGGER update_produced_items_updated_at
    BEFORE UPDATE ON public.produced_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_used_materials_updated_at ON public.used_materials;
CREATE TRIGGER update_used_materials_updated_at
    BEFORE UPDATE ON public.used_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_items_updated_at ON public.order_items;
CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sale_items_updated_at ON public.sale_items;
CREATE TRIGGER update_sale_items_updated_at
    BEFORE UPDATE ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_losses_updated_at ON public.losses;
CREATE TRIGGER update_losses_updated_at
    BEFORE UPDATE ON public.losses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_settings_updated_at ON public.global_settings;
CREATE TRIGGER update_global_settings_updated_at
    BEFORE UPDATE ON public.global_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
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
-- INSERIR CONFIGURAÇÕES GLOBAIS PADRÃO (SE NÃO EXISTIR)
-- ============================================================================
INSERT INTO public.global_settings (
    fecula_conversion_factor,
    production_prediction_factor,
    conservant_conversion_factor,
    conservant_usage_factor
)
SELECT 25.0000, 1.0000, 0.1000, 0.1000
WHERE NOT EXISTS (SELECT 1 FROM public.global_settings);

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================
COMMENT ON TABLE public.products IS 'Tabela de produtos acabados do sistema';
COMMENT ON TABLE public.materials IS 'Tabela de materiais/insumos (fécula, conservantes, etc.)';
COMMENT ON TABLE public.suppliers IS 'Tabela de fornecedores';
COMMENT ON TABLE public.material_batches IS 'Lotes de materiais recebidos';
COMMENT ON TABLE public.production_batches IS 'Lotes de produção';
COMMENT ON TABLE public.produced_items IS 'Itens produzidos em cada lote';
COMMENT ON TABLE public.used_materials IS 'Materiais utilizados em cada produção';
COMMENT ON TABLE public.orders IS 'Pedidos de compra para fornecedores';
COMMENT ON TABLE public.order_items IS 'Itens dos pedidos de compra';
COMMENT ON TABLE public.sales IS 'Vendas realizadas';
COMMENT ON TABLE public.sale_items IS 'Itens das vendas';
COMMENT ON TABLE public.losses IS 'Perdas registradas na produção';
COMMENT ON TABLE public.global_settings IS 'Configurações globais do sistema';
COMMENT ON TABLE public.system_logs IS 'Logs de auditoria do sistema';

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================ 