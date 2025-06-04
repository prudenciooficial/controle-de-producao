-- ============================================================================
-- DADOS DE EXEMPLO PARA O SISTEMA NOSSA GOMA
-- Data: 2024-12-09
-- Versão: 2.0.2
-- Descrição: Dados iniciais para testes e demonstração
-- ============================================================================

-- IMPORTANTE: Esta migração só insere dados se as tabelas estiverem vazias
-- Para evitar conflitos em banco já em uso

-- ============================================================================
-- 1. INSERIR PRODUTOS DE EXEMPLO
-- ============================================================================
INSERT INTO public.products (
    name, 
    description, 
    type, 
    unit_of_measure, 
    weight_factor, 
    fecula_conversion_factor, 
    production_prediction_factor,
    conservant_conversion_factor,
    conservant_usage_factor,
    notes
)
SELECT 
    'Polvilho Doce',
    'Polvilho doce tradicional para tapioca',
    'Polvilho',
    'kg',
    1.0000,
    25.0000,
    1.0000,
    0.1000,
    0.1000,
    'Produto principal da empresa'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Polvilho Doce');

INSERT INTO public.products (
    name, 
    description, 
    type, 
    unit_of_measure, 
    weight_factor, 
    fecula_conversion_factor, 
    production_prediction_factor,
    conservant_conversion_factor,
    conservant_usage_factor,
    notes
)
SELECT 
    'Polvilho Azedo',
    'Polvilho azedo para pão de açúcar',
    'Polvilho',
    'kg',
    1.0000,
    25.0000,
    1.0000,
    0.1000,
    0.1000,
    'Polvilho fermentado naturalmente'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Polvilho Azedo');

INSERT INTO public.products (
    name, 
    description, 
    type, 
    unit_of_measure, 
    weight_factor, 
    fecula_conversion_factor, 
    production_prediction_factor,
    conservant_conversion_factor,
    conservant_usage_factor,
    notes
)
SELECT 
    'Fécula de Mandioca',
    'Fécula pura de mandioca',
    'Fécula',
    'kg',
    1.0000,
    1.0000,
    1.0000,
    0.0000,
    0.0000,
    'Matéria-prima processada'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Fécula de Mandioca');

-- ============================================================================
-- 2. INSERIR MATERIAIS DE EXEMPLO
-- ============================================================================
INSERT INTO public.materials (name, code, description, type, unit_of_measure)
SELECT 'Fécula de Mandioca', 'FEC001', 'Fécula crua para processamento', 'Fécula', 'kg'
WHERE NOT EXISTS (SELECT 1 FROM public.materials WHERE name = 'Fécula de Mandioca');

INSERT INTO public.materials (name, code, description, type, unit_of_measure)
SELECT 'Conservante Alimentar', 'CON001', 'Conservante para polvilho', 'Conservante', 'kg'
WHERE NOT EXISTS (SELECT 1 FROM public.materials WHERE name = 'Conservante Alimentar');

INSERT INTO public.materials (name, code, description, type, unit_of_measure)
SELECT 'Acidulante Cítrico', 'ACI001', 'Ácido cítrico para fermentação', 'Aditivo', 'kg'
WHERE NOT EXISTS (SELECT 1 FROM public.materials WHERE name = 'Acidulante Cítrico');

INSERT INTO public.materials (name, code, description, type, unit_of_measure)
SELECT 'Embalagem 1kg', 'EMB001', 'Saco plástico para 1kg de produto', 'Embalagem', 'unidade'
WHERE NOT EXISTS (SELECT 1 FROM public.materials WHERE name = 'Embalagem 1kg');

INSERT INTO public.materials (name, code, description, type, unit_of_measure)
SELECT 'Embalagem 25kg', 'EMB025', 'Saco plástico para 25kg de produto', 'Embalagem', 'unidade'
WHERE NOT EXISTS (SELECT 1 FROM public.materials WHERE name = 'Embalagem 25kg');

-- ============================================================================
-- 3. INSERIR FORNECEDORES DE EXEMPLO
-- ============================================================================
INSERT INTO public.suppliers (name, code, contacts, notes)
SELECT 
    'Fornecedor de Fécula LTDA',
    'FORN001',
    '{"telefone": "(11) 9999-8888", "email": "vendas@fecula.com.br", "contato": "João Silva"}',
    'Fornecedor principal de fécula'
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Fornecedor de Fécula LTDA');

INSERT INTO public.suppliers (name, code, contacts, notes)
SELECT 
    'Conservantes Industriais S.A.',
    'FORN002',
    '{"telefone": "(11) 7777-6666", "email": "comercial@conservantes.com.br", "contato": "Maria Santos"}',
    'Fornecedor de conservantes e aditivos'
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Conservantes Industriais S.A.');

INSERT INTO public.suppliers (name, code, contacts, notes)
SELECT 
    'Embalagens Premium',
    'FORN003',
    '{"telefone": "(11) 5555-4444", "email": "atendimento@embpremium.com.br", "contato": "Carlos Oliveira"}',
    'Fornecedor de embalagens'
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Embalagens Premium');

-- ============================================================================
-- 4. INSERIR LOTES DE MATERIAIS DE EXEMPLO
-- ============================================================================

-- Buscar IDs dos materiais e fornecedores
DO $$
DECLARE
    fecula_id UUID;
    conservante_id UUID;
    acidulante_id UUID;
    emb1kg_id UUID;
    emb25kg_id UUID;
    forn_fecula_id UUID;
    forn_conserv_id UUID;
    forn_emb_id UUID;
BEGIN
    -- Buscar IDs dos materiais
    SELECT id INTO fecula_id FROM public.materials WHERE name = 'Fécula de Mandioca';
    SELECT id INTO conservante_id FROM public.materials WHERE name = 'Conservante Alimentar';
    SELECT id INTO acidulante_id FROM public.materials WHERE name = 'Acidulante Cítrico';
    SELECT id INTO emb1kg_id FROM public.materials WHERE name = 'Embalagem 1kg';
    SELECT id INTO emb25kg_id FROM public.materials WHERE name = 'Embalagem 25kg';
    
    -- Buscar IDs dos fornecedores
    SELECT id INTO forn_fecula_id FROM public.suppliers WHERE name = 'Fornecedor de Fécula LTDA';
    SELECT id INTO forn_conserv_id FROM public.suppliers WHERE name = 'Conservantes Industriais S.A.';
    SELECT id INTO forn_emb_id FROM public.suppliers WHERE name = 'Embalagens Premium';
    
    -- Inserir lotes de fécula
    INSERT INTO public.material_batches (
        material_id, batch_number, quantity, supplied_quantity, remaining_quantity, 
        unit_of_measure, expiry_date, has_report
    )
    SELECT 
        fecula_id, 'FEC-2024-001', 1000.0000, 1000.0000, 575.0000, 
        'kg', '2025-12-31'::DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM public.material_batches WHERE batch_number = 'FEC-2024-001');
    
    INSERT INTO public.material_batches (
        material_id, batch_number, quantity, supplied_quantity, remaining_quantity, 
        unit_of_measure, expiry_date, has_report
    )
    SELECT 
        fecula_id, 'FEC-2024-002', 800.0000, 800.0000, 800.0000, 
        'kg', '2025-11-30'::DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM public.material_batches WHERE batch_number = 'FEC-2024-002');
    
    -- Inserir lotes de conservante
    INSERT INTO public.material_batches (
        material_id, batch_number, quantity, supplied_quantity, remaining_quantity, 
        unit_of_measure, expiry_date, has_report
    )
    SELECT 
        conservante_id, 'CON-2024-001', 50.0000, 50.0000, 45.0000, 
        'kg', '2026-06-30'::DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM public.material_batches WHERE batch_number = 'CON-2024-001');
    
    -- Inserir lotes de acidulante
    INSERT INTO public.material_batches (
        material_id, batch_number, quantity, supplied_quantity, remaining_quantity, 
        unit_of_measure, expiry_date, has_report
    )
    SELECT 
        acidulante_id, 'ACI-2024-001', 25.0000, 25.0000, 20.0000, 
        'kg', '2027-03-31'::DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM public.material_batches WHERE batch_number = 'ACI-2024-001');
    
    -- Inserir lotes de embalagens
    INSERT INTO public.material_batches (
        material_id, batch_number, quantity, supplied_quantity, remaining_quantity, 
        unit_of_measure, expiry_date, has_report
    )
    SELECT 
        emb1kg_id, 'EMB1-2024-001', 10000.0000, 10000.0000, 8500.0000, 
        'unidade', NULL, false
    WHERE NOT EXISTS (SELECT 1 FROM public.material_batches WHERE batch_number = 'EMB1-2024-001');
    
    INSERT INTO public.material_batches (
        material_id, batch_number, quantity, supplied_quantity, remaining_quantity, 
        unit_of_measure, expiry_date, has_report
    )
    SELECT 
        emb25kg_id, 'EMB25-2024-001', 1000.0000, 1000.0000, 750.0000, 
        'unidade', NULL, false
    WHERE NOT EXISTS (SELECT 1 FROM public.material_batches WHERE batch_number = 'EMB25-2024-001');
END $$;

-- ============================================================================
-- 5. DADOS DE CONFIGURAÇÃO GLOBAL (SE NÃO EXISTIR)
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
-- 6. EXEMPLO DE LOTE DE PRODUÇÃO
-- ============================================================================
DO $$
DECLARE
    polvilho_doce_id UUID;
    fecula_batch_id UUID;
    conservante_batch_id UUID;
    production_batch_id UUID;
BEGIN
    -- Buscar IDs necessários
    SELECT id INTO polvilho_doce_id FROM public.products WHERE name = 'Polvilho Doce';
    SELECT id INTO fecula_batch_id FROM public.material_batches WHERE batch_number = 'FEC-2024-001';
    SELECT id INTO conservante_batch_id FROM public.material_batches WHERE batch_number = 'CON-2024-001';
    
    -- Inserir lote de produção de exemplo
    INSERT INTO public.production_batches (
        batch_number, production_date, mix_day, mix_count, notes
    )
    SELECT 
        'PROD-2024-001', 
        '2024-12-08'::DATE, 
        '2024-12-08', 
        3, 
        'Produção de exemplo - teste do sistema'
    WHERE NOT EXISTS (SELECT 1 FROM public.production_batches WHERE batch_number = 'PROD-2024-001');
    
    -- Buscar o ID do lote criado
    SELECT id INTO production_batch_id FROM public.production_batches WHERE batch_number = 'PROD-2024-001';
    
    -- Inserir item produzido
    INSERT INTO public.produced_items (
        production_batch_id, product_id, batch_number, quantity, remaining_quantity, unit_of_measure
    )
    SELECT 
        production_batch_id, polvilho_doce_id, 'PROD-2024-001-PDOCE', 1800.0000, 1800.0000, 'kg'
    WHERE NOT EXISTS (SELECT 1 FROM public.produced_items WHERE batch_number = 'PROD-2024-001-PDOCE');
    
    -- Inserir materiais utilizados
    INSERT INTO public.used_materials (
        production_batch_id, material_batch_id, quantity, unit_of_measure, mix_count_used
    )
    SELECT 
        production_batch_id, fecula_batch_id, 75.0000, 'kg', NULL
    WHERE NOT EXISTS (
        SELECT 1 FROM public.used_materials 
        WHERE production_batch_id = production_batch_id AND material_batch_id = fecula_batch_id
    );
    
    INSERT INTO public.used_materials (
        production_batch_id, material_batch_id, quantity, unit_of_measure, mix_count_used
    )
    SELECT 
        production_batch_id, conservante_batch_id, 0.3000, 'kg', 3
    WHERE NOT EXISTS (
        SELECT 1 FROM public.used_materials 
        WHERE production_batch_id = production_batch_id AND material_batch_id = conservante_batch_id
    );
    
END $$;

-- ============================================================================
-- 7. EXEMPLO DE VENDA
-- ============================================================================
DO $$
DECLARE
    sale_id UUID;
    produced_item_id UUID;
    polvilho_doce_id UUID;
BEGIN
    -- Buscar IDs necessários
    SELECT id INTO polvilho_doce_id FROM public.products WHERE name = 'Polvilho Doce';
    SELECT id INTO produced_item_id FROM public.produced_items WHERE batch_number = 'PROD-2024-001-PDOCE';
    
    -- Inserir venda de exemplo
    INSERT INTO public.sales (
        date, invoice_number, customer_name, type, notes
    )
    SELECT 
        '2024-12-09'::DATE, 
        'NF-001', 
        'Supermercado ABC Ltda', 
        'Venda', 
        'Primeira venda de teste'
    WHERE NOT EXISTS (SELECT 1 FROM public.sales WHERE invoice_number = 'NF-001');
    
    -- Buscar ID da venda
    SELECT id INTO sale_id FROM public.sales WHERE invoice_number = 'NF-001';
    
    -- Inserir item da venda
    INSERT INTO public.sale_items (
        sale_id, product_id, produced_item_id, quantity, unit_of_measure
    )
    SELECT 
        sale_id, polvilho_doce_id, produced_item_id, 200.0000, 'kg'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sale_items 
        WHERE sale_id = sale_id AND produced_item_id = produced_item_id
    );
    
    -- Atualizar estoque do produto vendido
    UPDATE public.produced_items 
    SET remaining_quantity = remaining_quantity - 200.0000
    WHERE id = produced_item_id;
    
END $$;

-- ============================================================================
-- 8. INSERIR LOG DE EXEMPLO
-- ============================================================================
INSERT INTO public.system_logs (
    user_display_name, action_type, entity_schema, entity_table, entity_id, new_data
)
SELECT 
    'Sistema - Dados de Exemplo',
    'INSERT',
    'public',
    'sample_data',
    uuid_generate_v4(),
    '{"message": "Dados de exemplo inseridos com sucesso", "timestamp": "2024-12-09T10:00:00Z"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.system_logs WHERE user_display_name = 'Sistema - Dados de Exemplo');

-- ============================================================================
-- 9. VERIFICAÇÃO FINAL
-- ============================================================================

-- Criar uma view temporária para verificar os dados inseridos
CREATE OR REPLACE VIEW public.v_sample_data_summary AS
SELECT 
    'products' as table_name,
    COUNT(*) as record_count
FROM public.products
UNION ALL
SELECT 
    'materials' as table_name,
    COUNT(*) as record_count
FROM public.materials
UNION ALL
SELECT 
    'suppliers' as table_name,
    COUNT(*) as record_count
FROM public.suppliers
UNION ALL
SELECT 
    'material_batches' as table_name,
    COUNT(*) as record_count
FROM public.material_batches
UNION ALL
SELECT 
    'production_batches' as table_name,
    COUNT(*) as record_count
FROM public.production_batches
UNION ALL
SELECT 
    'produced_items' as table_name,
    COUNT(*) as record_count
FROM public.produced_items
UNION ALL
SELECT 
    'used_materials' as table_name,
    COUNT(*) as record_count
FROM public.used_materials
UNION ALL
SELECT 
    'sales' as table_name,
    COUNT(*) as record_count
FROM public.sales
UNION ALL
SELECT 
    'sale_items' as table_name,
    COUNT(*) as record_count
FROM public.sale_items
UNION ALL
SELECT 
    'global_settings' as table_name,
    COUNT(*) as record_count
FROM public.global_settings;

-- Conceder acesso à view
GRANT SELECT ON public.v_sample_data_summary TO authenticated;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================
COMMENT ON VIEW public.v_sample_data_summary IS 'Resumo dos dados de exemplo inseridos no sistema';

-- ============================================================================
-- FIM DA INSERÇÃO DE DADOS DE EXEMPLO
-- ============================================================================ 