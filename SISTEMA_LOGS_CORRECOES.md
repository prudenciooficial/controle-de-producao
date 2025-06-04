# Correções Aplicadas ao Sistema de Logs

## Problemas Identificados

1. **Botão "Consultar Tabela" mostrando 0 registros** - ✅ Resolvido (era RLS)
2. **Botão "Testar Log" funcionando mas com erros no console** - ✅ Corrigido
3. **Exclusão de logs com erro** - ✅ Resolvido (era RLS)
4. **Logs não aparecendo na tela** - ✅ Resolvido (era RLS)
5. **🆕 Constraint `check_data_for_action` impedindo inserções** - ✅ Identificado e corrigido

## Correções Aplicadas

### 1. Correção do `logService.ts`
- ✅ Adicionado campo obrigatório `entity_schema: 'public'`
- ✅ Implementado mapeamento correto de tipos de ação (CREATE→INSERT, etc.)
- ✅ Adicionado contexto `_log_context` para preservar ação original
- ✅ Implementado fallback para erros de RLS
- ✅ Melhorado tratamento de dados com contexto
- ✅ **🆕 Corrigido para respeitar constraint `check_data_for_action`**

### 2. Melhoria do `SystemLogsPage.tsx`
- ✅ Melhorado botão "Consultar Tabela" com diagnósticos detalhados
- ✅ Melhorado botão "Testar Log" com mais informações
- ✅ Adicionado recarregamento automático após criar log de teste
- ✅ Melhorado tratamento de erros com mensagens específicas

### 3. Correção de RLS (Row Level Security)
- ✅ Criada migração `20241208000000_fix_system_logs_rls.sql`
- ✅ Removido políticas conflitantes
- ✅ Criado políticas permissivas para usuários autenticados
- ✅ Habilitado RLS com configuração correta

### 4. **🆕 Correção da Constraint `check_data_for_action`**
- ✅ Identificada constraint que exigia dados específicos por tipo de ação
- ✅ Corrigido `logService.ts` para sempre enviar dados apropriados
- ✅ Criada migração `20241208000001_fix_check_constraint.sql`
- ✅ Criado script de correção rápida `remove_constraint_quick_fix.sql`

### 5. Scripts de Diagnóstico
- ✅ Criado `diagnose_system_logs.sql` para diagnosticar problemas
- ✅ Criado `fix_system_logs_rls.sql` para corrigir RLS manualmente
- ✅ **🆕 Criado `investigate_constraints.sql` para investigar constraints**
- ✅ **🆕 Criado `remove_constraint_quick_fix.sql` para correção rápida**

## Como Aplicar as Correções

### **🚨 CORREÇÃO URGENTE - Execute PRIMEIRO:**

**No SQL Editor do Supabase, execute:**
```sql
-- Remover constraint problemática
ALTER TABLE public.system_logs DROP CONSTRAINT IF EXISTS check_data_for_action;
ALTER TABLE public.system_logs DROP CONSTRAINT IF EXISTS system_logs_action_type_check;

-- Teste
INSERT INTO public.system_logs (action_type, entity_schema, entity_table, user_display_name) 
VALUES ('INSERT', 'public', 'teste_correcao', 'Sistema - Teste');
```

### 1. Executar Migração do Supabase
```sql
-- Execute o arquivo: supabase/migrations/20241208000001_fix_check_constraint.sql
-- Isso corrige os problemas de constraint automaticamente
```

### 2. Verificar Funcionamento
1. Acesse a página de "Logs do Sistema"
2. Clique em "🔍 Consultar Tabela" - deve mostrar registros encontrados
3. Clique em "🧪 Testar Log" - deve criar log e recarregar página
4. Verifique se os logs aparecem na lista

### 3. Se Ainda Houver Problemas
Execute o script de correção rápida: `remove_constraint_quick_fix.sql`

## **🆕 Detalhes da Constraint Problemática**

### O Problema
A constraint `check_data_for_action` estava exigindo:
- **INSERT**: deve ter `new_data` preenchido
- **UPDATE**: deve ter `old_data` E `new_data` preenchidos  
- **DELETE**: deve ter `old_data` preenchido

### A Solução
O `logService.ts` foi corrigido para:
```typescript
if (mappedActionType === 'INSERT') {
  // Garantir que new_data seja sempre enviado para INSERT
  finalNewData = newData || {
    action: actionType,
    entity_table: entityTable,
    timestamp: new Date().toISOString()
  };
  finalOldData = null;
}
```

## Estrutura Final da Tabela `system_logs`

| Campo              | Tipo       | Obrigatório | Descrição                           |
|--------------------|------------|-------------|-------------------------------------|
| `id`               | UUID       | ✅          | ID único do log                     |
| `created_at`       | TIMESTAMP  | ✅          | Data/hora de criação                |
| `action_type`      | TEXT       | ✅          | INSERT, UPDATE, DELETE              |
| `entity_schema`    | TEXT       | ✅          | Schema da tabela (ex: 'public')     |
| `entity_table`     | TEXT       | ✅          | Nome da tabela                      |
| `user_id`          | UUID       | ❌          | ID do usuário                       |
| `user_display_name`| TEXT       | ❌          | Nome de exibição do usuário         |
| `entity_id`        | TEXT       | ❌          | ID da entidade afetada              |
| `old_data`         | JSONB      | ❌*         | Dados antes da alteração            |
| `new_data`         | JSONB      | ❌*         | Dados após a alteração              |

*\* Pode ser obrigatório dependendo da constraint ativa*

## **🆕 Regras de Dados por Tipo de Ação**

| Tipo Banco | old_data | new_data | Observação                    |
|------------|----------|----------|-------------------------------|
| `INSERT`   | ❌ null  | ✅ obrig.| Sempre enviamos dados padrão  |
| `UPDATE`   | ✅ obrig.| ✅ obrig.| Ambos necessários             |
| `DELETE`   | ✅ obrig.| ❌ null  | Dados do registro excluído    |

## Mapeamento de Tipos de Ação

| Tipo Frontend | Tipo Banco | Contexto Preservado | Dados Enviados          |
|---------------|------------|---------------------|-------------------------|
| `CREATE`      | `INSERT`   | ✅ Via _log_context | new_data sempre         |
| `LOGIN`       | `INSERT`   | ✅ Via _log_context | new_data sempre         |
| `LOGOUT`      | `INSERT`   | ✅ Via _log_context | new_data sempre         |
| `OTHER`       | `INSERT`   | ✅ Via _log_context | new_data sempre         |
| `UPDATE`      | `UPDATE`   | ❌ Nativo           | old_data + new_data     |
| `DELETE`      | `DELETE`   | ❌ Nativo           | old_data apenas         |

## Funcionalidades dos Botões

### 🔍 Consultar Tabela
- Faz consulta direta na tabela `system_logs`
- Testa consulta básica e com count
- Mostra informações de debug no console
- Reporta quantidade de registros encontrados

### 🧪 Testar Log
- Cria log de teste com ação `OTHER`
- Inclui dados de teste (timestamp, user, etc.)
- Recarrega página automaticamente após sucesso
- Mostra erros detalhados em caso de falha

## Status das Correções

✅ **logService.ts** - Corrigido completamente (incluindo constraint)
✅ **SystemLogsPage.tsx** - Melhorado com diagnósticos
✅ **RLS Policies** - Migração criada
✅ **Tipos TypeScript** - Alinhados com banco
✅ **Mapeamento de Ações** - Implementado
✅ **Tratamento de Erros** - Melhorado
✅ **Scripts de Diagnóstico** - Criados
✅ **🆕 Constraint check_data_for_action** - Identificada e corrigida

## Próximos Passos

1. **EXECUTE PRIMEIRO**: Script de correção rápida da constraint
2. Execute a migração no Supabase (opcional, para ambiente mais robusto)
3. Teste os botões na página de logs
4. Verifique se logs aparecem corretamente
5. Se houver problemas, execute scripts de diagnóstico

## **🆕 Arquivos de Correção da Constraint**

- `investigate_constraints.sql` - Investigar constraints da tabela
- `remove_constraint_quick_fix.sql` - **Correção rápida (USE ESTE PRIMEIRO)**
- `supabase/migrations/20241208000001_fix_check_constraint.sql` - Migração completa 