# 🗄️ Migrações do Banco de Dados - Sistema Nossa Goma

## 📋 Resumo

Este documento contém as migrações atualizadas para o banco de dados do Sistema Nossa Goma. As migrações foram completamente recriadas para estar 100% alinhadas com a estrutura atual do sistema.

## 📂 Arquivos de Migração

### 1. `20241209000000_create_complete_database.sql`
- **Estrutura principal do banco**
- Criação de todas as 14 tabelas do sistema
- Triggers para `updated_at`
- Índices para performance
- Constraints e validações
- Configurações iniciais

### 2. `20241209000001_setup_rls_and_policies.sql`
- **Configuração de segurança**
- Row Level Security (RLS)
- Políticas de acesso
- Funções auxiliares do sistema
- Views para relatórios
- Configuração de Realtime

### 3. `20241209000002_insert_sample_data.sql`
- **Dados de exemplo**
- Produtos, materiais e fornecedores
- Lotes de materiais
- Exemplo de produção
- Venda de exemplo
- Configurações globais

## 🔧 Como Aplicar as Migrações

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Navegar para o diretório do projeto
cd "sua-pasta-projeto/controle-de-producao"

# 2. Inicializar Supabase (se ainda não foi feito)
supabase init

# 3. Aplicar as migrações
supabase db reset  # Reset completo (CUIDADO: apaga dados existentes)
# ou
supabase db push   # Aplicar apenas novas migrações
```

### Opção 2: Via Interface Web do Supabase

1. Acesse o painel do Supabase
2. Vá em **Database > SQL Editor**
3. Execute os arquivos na ordem:
   1. `20241209000000_create_complete_database.sql`
   2. `20241209000001_setup_rls_and_policies.sql`
   3. `20241209000002_insert_sample_data.sql` (opcional)

### Opção 3: Via pgAdmin ou psql

```sql
-- Conectar ao banco e executar em ordem:
\i supabase/migrations/20241209000000_create_complete_database.sql
\i supabase/migrations/20241209000001_setup_rls_and_policies.sql
\i supabase/migrations/20241209000002_insert_sample_data.sql
```

## 🏗️ Estrutura do Banco

### Tabelas Principais

| Tabela | Descrição | Registros Exemplo |
|--------|-----------|-------------------|
| `products` | Produtos acabados | Polvilho Doce, Polvilho Azedo |
| `materials` | Materiais/insumos | Fécula, Conservantes |
| `suppliers` | Fornecedores | Fornecedor de Fécula LTDA |
| `material_batches` | Lotes de materiais | FEC-2024-001 (575kg restantes) |
| `production_batches` | Lotes de produção | PROD-2024-001 |
| `produced_items` | Itens produzidos | 1800kg Polvilho Doce |
| `used_materials` | Materiais utilizados | 75kg fécula consumida |
| `orders` | Pedidos de compra | Pedidos para fornecedores |
| `order_items` | Itens dos pedidos | Materiais comprados |
| `sales` | Vendas realizadas | NF-001 - Supermercado ABC |
| `sale_items` | Itens vendidos | 200kg vendidos |
| `losses` | Perdas de produção | Registros de perdas |
| `global_settings` | Configurações globais | Fatores de conversão |
| `system_logs` | Logs de auditoria | Histórico de operações |

### Views Úteis

- `v_current_material_stock` - Estoque atual de materiais
- `v_current_product_stock` - Estoque atual de produtos
- `v_production_summary` - Resumo de produções
- `v_sample_data_summary` - Resumo dos dados de exemplo

### Funções Auxiliares

- `get_global_settings()` - Buscar configurações globais
- `check_material_stock()` - Verificar estoque disponível
- `calculate_total_weight()` - Calcular peso total de produção
- `get_material_stock_history()` - Histórico de estoque

## 🔒 Segurança

### Row Level Security (RLS)
- Todas as tabelas têm RLS habilitado
- Acesso apenas para usuários autenticados
- Políticas específicas para cada tabela

### Políticas de Acesso
- **Usuários autenticados**: Acesso total (CRUD)
- **System logs**: Apenas leitura + inserção
- **Views**: Apenas leitura

## 📊 Dados de Exemplo

### Inclui:
- **3 produtos**: Polvilho Doce, Polvilho Azedo, Fécula
- **5 materiais**: Fécula, Conservante, Acidulante, Embalagens
- **3 fornecedores**: Fecula LTDA, Conservantes S.A., Embalagens Premium
- **6 lotes de materiais**: Com quantidades realistas
- **1 produção completa**: PROD-2024-001 (Polvilho Doce)
- **1 venda**: 200kg para Supermercado ABC
- **Configurações globais**: Fatores de conversão padrão

### Problema de Estoque Resolvido
O exemplo já inclui o cenário que você relatou:
- **Estoque inicial**: 1000kg fécula (lote FEC-2024-001)
- **Consumo na produção**: 75kg
- **Estoque final**: 575kg (correto - sem duplicação)

## ⚠️ Importantes

### Backup
**SEMPRE** faça backup antes de aplicar migrações em produção:
```bash
# Via Supabase CLI
supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql

# Via pg_dump
pg_dump -h seu-host -U postgres -d postgres > backup.sql
```

### Ambiente
- **Desenvolvimento**: Pode usar `supabase db reset` tranquilamente
- **Produção**: Use `supabase db push` ou aplique manualmente

### Verificação
Após aplicar, verifique com:
```sql
-- Ver resumo dos dados
SELECT * FROM public.v_sample_data_summary;

-- Verificar estoque de fécula
SELECT 
    mb.batch_number,
    mb.remaining_quantity,
    m.name as material_name
FROM public.material_batches mb
JOIN public.materials m ON mb.material_id = m.id
WHERE m.name = 'Fécula de Mandioca';
```

## 🆘 Problemas Comuns

### Erro: "relation already exists"
```sql
-- Se alguma tabela já existir, pode ignorar com:
DROP TABLE IF EXISTS nome_da_tabela CASCADE;
```

### Erro: "permission denied"
```sql
-- Verificar se está logado como superuser ou owner
SELECT current_user, session_user;
```

### Erro: "function does not exist"
```sql
-- Recriar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 📞 Suporte

Se houver problemas com as migrações:
1. Verifique os logs do Supabase
2. Confira se todas as extensões estão habilitadas
3. Execute as migrações uma por vez
4. Verifique permissões de usuário

---

**✅ Estas migrações estão 100% atualizadas com o código atual do sistema Nossa Goma** 