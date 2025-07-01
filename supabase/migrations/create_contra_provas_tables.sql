-- Criar tabela contra_provas
CREATE TABLE IF NOT EXISTS contra_provas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lote_produto VARCHAR(255) NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    data_fabricacao DATE NOT NULL,
    data_validade DATE NOT NULL,
    data_descarte DATE NULL,
    observacoes TEXT NULL,
    quantidade_amostras INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_contra_provas_product_id ON contra_provas(product_id);
CREATE INDEX IF NOT EXISTS idx_contra_provas_lote_produto ON contra_provas(lote_produto);
CREATE INDEX IF NOT EXISTS idx_contra_provas_data_validade ON contra_provas(data_validade);
CREATE INDEX IF NOT EXISTS idx_contra_provas_created_at ON contra_provas(created_at);

-- Criar tabela analises_contra_provas
CREATE TABLE IF NOT EXISTS analises_contra_provas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contra_prova_id UUID NOT NULL REFERENCES contra_provas(id) ON DELETE CASCADE,
    dia_analise INTEGER NOT NULL,
    data_analise DATE NOT NULL,
    status_analise VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status_analise IN ('pendente', 'realizada')),
    observacoes_analise TEXT NULL,
    problemas_encontrados TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para análises
CREATE INDEX IF NOT EXISTS idx_analises_contra_prova_id ON analises_contra_provas(contra_prova_id);
CREATE INDEX IF NOT EXISTS idx_analises_status_analise ON analises_contra_provas(status_analise);
CREATE INDEX IF NOT EXISTS idx_analises_data_analise ON analises_contra_provas(data_analise);

-- Trigger para criar análises automáticas quando uma contra-prova é inserida
CREATE OR REPLACE FUNCTION create_analises_automaticas()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar análises para 3º, 6º, 9º, 12º, 15º e 18º dias
    INSERT INTO analises_contra_provas (contra_prova_id, dia_analise, data_analise)
    VALUES 
        (NEW.id, 3, NEW.data_fabricacao + INTERVAL '3 days'),
        (NEW.id, 6, NEW.data_fabricacao + INTERVAL '6 days'),
        (NEW.id, 9, NEW.data_fabricacao + INTERVAL '9 days'),
        (NEW.id, 12, NEW.data_fabricacao + INTERVAL '12 days'),
        (NEW.id, 15, NEW.data_fabricacao + INTERVAL '15 days'),
        (NEW.id, 18, NEW.data_fabricacao + INTERVAL '18 days');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_create_analises_automaticas ON contra_provas;
CREATE TRIGGER trigger_create_analises_automaticas
    AFTER INSERT ON contra_provas
    FOR EACH ROW
    EXECUTE FUNCTION create_analises_automaticas();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at nas tabelas
DROP TRIGGER IF EXISTS update_contra_provas_updated_at ON contra_provas;
CREATE TRIGGER update_contra_provas_updated_at
    BEFORE UPDATE ON contra_provas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_analises_contra_provas_updated_at ON analises_contra_provas;
CREATE TRIGGER update_analises_contra_provas_updated_at
    BEFORE UPDATE ON analises_contra_provas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionar políticas RLS (Row Level Security)
ALTER TABLE contra_provas ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises_contra_provas ENABLE ROW LEVEL SECURITY;

-- Política para contra_provas - permitir todas as operações para usuários autenticados
CREATE POLICY "Enable all operations for authenticated users on contra_provas" ON contra_provas
    FOR ALL USING (auth.role() = 'authenticated');

-- Política para analises_contra_provas - permitir todas as operações para usuários autenticados
CREATE POLICY "Enable all operations for authenticated users on analises_contra_provas" ON analises_contra_provas
    FOR ALL USING (auth.role() = 'authenticated');

-- Comentários para documentação
COMMENT ON TABLE contra_provas IS 'Tabela para controle de contra-provas de produtos';
COMMENT ON TABLE analises_contra_provas IS 'Tabela para registrar análises programadas das contra-provas';
COMMENT ON COLUMN contra_provas.lote_produto IS 'Número do lote do produto para controle';
COMMENT ON COLUMN contra_provas.data_fabricacao IS 'Data de fabricação do lote';
COMMENT ON COLUMN contra_provas.data_validade IS 'Data de validade da contra-prova (6 meses)';
COMMENT ON COLUMN contra_provas.data_descarte IS 'Data de descarte da contra-prova (opcional)';
COMMENT ON COLUMN analises_contra_provas.dia_analise IS 'Dia da análise (3º, 6º, 9º, etc.)';
COMMENT ON COLUMN analises_contra_provas.status_analise IS 'Status da análise: pendente ou realizada'; 