-- Criar tabela baixas_estoque
CREATE TABLE baixas_estoque (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL,
    lote_material_id UUID NOT NULL REFERENCES material_batches(id) ON DELETE CASCADE,
    quantidade DECIMAL(10,3) NOT NULL CHECK (quantidade > 0),
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_baixas_estoque_data ON baixas_estoque(data);
CREATE INDEX idx_baixas_estoque_lote_material ON baixas_estoque(lote_material_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE baixas_estoque ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Usuarios podem visualizar baixas de estoque" ON baixas_estoque
    FOR SELECT USING (true);

CREATE POLICY "Usuarios podem inserir baixas de estoque" ON baixas_estoque
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios podem atualizar baixas de estoque" ON baixas_estoque
    FOR UPDATE USING (true);

CREATE POLICY "Usuarios podem excluir baixas de estoque" ON baixas_estoque
    FOR DELETE USING (true);

-- Criar função para atualizar data de modificação
CREATE OR REPLACE FUNCTION atualizar_data_modificacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar automaticamente a data de modificação
CREATE TRIGGER atualizar_baixas_estoque_data_modificacao 
BEFORE UPDATE ON baixas_estoque 
FOR EACH ROW EXECUTE FUNCTION atualizar_data_modificacao(); 