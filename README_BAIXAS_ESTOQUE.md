# Funcionalidade de Baixas de Estoque

## Resumo
Implementação completa da funcionalidade de baixas de estoque com nomes em português para facilitar a manutenção.

## Arquivos Modificados

### 1. **Migração SQL** (`supabase/migrations/create_stock_reductions_table.sql`)
- **Tabela**: `baixas_estoque` (em português)
- **Campos**:
  - `id` - UUID (chave primária)
  - `data` - Data da baixa
  - `lote_material_id` - Referência ao lote de material
  - `quantidade` - Quantidade retirada do estoque
  - `observacoes` - Observações opcionais
  - `criado_em` - Data de criação do registro
  - `atualizado_em` - Data de última modificação

### 2. **Serviço** (`src/services/stockReductionService.ts`)
- **Funções**:
  - `createStockReduction()` - Cria baixa e atualiza estoque
  - `getStockReductions()` - Lista todas as baixas
  - `deleteStockReduction()` - Remove baixa e reverte estoque
- **Recursos**:
  - Transações para integridade de dados
  - Validações de quantidade disponível
  - Logs de auditoria
  - Reversão automática de estoque ao excluir

### 3. **Página de Estoque** (`src/pages/Inventory.tsx`)
- Aba "Baixa de Estoque" adicionada
- Formulário para registrar baixas
- Validações e feedback visual
- Botão para acessar histórico

### 4. **Página de Histórico** (`src/pages/StockReductionHistory.tsx`)
- Visualização em cards e tabela
- Estatísticas de baixas
- Busca por material, lote ou tipo
- Detalhamento completo
- Exclusão com confirmação e reversão

## Recursos Implementados

### ✅ **Baixa de Estoque**
- Registra a baixa no banco
- Desconta automaticamente do estoque
- Validações de quantidade disponível
- Campos obrigatórios e opcionais

### ✅ **Histórico Completo**
- Listagem de todas as baixas
- Informações detalhadas dos materiais
- Datas formatadas em português
- Estatísticas resumidas

### ✅ **Integridade de Dados**
- Transações para operações críticas
- Reversão automática em caso de erro
- Validações antes de processar

### ✅ **Auditoria**
- Logs de todas as operações
- Rastreamento de alterações
- Informações do usuário responsável

### ✅ **Interface Amigável**
- Design responsivo
- Feedback visual claro
- Confirmações de ações importantes
- Busca e filtros

## Estrutura do Banco de Dados

```sql
-- Tabela principal
CREATE TABLE baixas_estoque (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL,
    lote_material_id UUID NOT NULL REFERENCES material_batches(id) ON DELETE CASCADE,
    quantidade DECIMAL(10,3) NOT NULL CHECK (quantidade > 0),
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_baixas_estoque_data ON baixas_estoque(data);
CREATE INDEX idx_baixas_estoque_lote_material ON baixas_estoque(lote_material_id);

-- Função e trigger para atualizar data de modificação
CREATE OR REPLACE FUNCTION atualizar_data_modificacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER atualizar_baixas_estoque_data_modificacao 
BEFORE UPDATE ON baixas_estoque 
FOR EACH ROW EXECUTE FUNCTION atualizar_data_modificacao();
```

## Como Usar

### 1. **Criar a Tabela**
Execute o SQL da migração no painel do Supabase.

### 2. **Registrar Baixa**
1. Acesse "Estoque" > aba "Baixa de Estoque"
2. Preencha data, material/lote, quantidade e observações
3. Clique em "Processar Baixa"

### 3. **Visualizar Histórico**
1. Clique em "Histórico de Baixas" na página de estoque
2. Use busca para filtrar por material, lote ou tipo
3. Alterne entre visualização em cards e tabela
4. Clique em "Ver Detalhes" para informações completas

### 4. **Excluir Baixa**
1. No histórico, clique no menu de ações
2. Selecione "Excluir"
3. Confirme a ação (quantidade será revertida ao estoque)

## Benefícios da Implementação

1. **Manutenção Facilitada**: Nomes em português para tabelas e campos
2. **Integridade**: Transações garantem consistência dos dados
3. **Auditoria**: Rastreamento completo de todas as operações
4. **Usabilidade**: Interface intuitiva e responsiva
5. **Performance**: Índices otimizados para consultas frequentes
6. **Flexibilidade**: Filtros e buscas para facilitar localização de dados

## Próximos Passos

1. Executar a migração SQL no Supabase
2. Testar a funcionalidade em ambiente de desenvolvimento
3. Validar permissões de usuário
4. Documentar procedimentos para equipe

---

**Status**: ✅ Implementação Completa  
**Testado**: ⏳ Aguardando criação da tabela no banco  
**Documentado**: ✅ Completo 