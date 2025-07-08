# Atualização do Sistema de Contra-Provas

## 📋 Alterações Implementadas

### 🔧 **Mudanças nas Análises**

1. **Removido**: Análise do 1º dia
2. **Mantido**: Análises apenas nos dias 30, 60, 90, 120, 150, 180
3. **Notificações**: Ajustadas para alertar 3 dias antes de cada análise

### 📁 **Arquivos Criados**

- `supabase/migrations/update_contra_provas_analises.sql` - Migração SQL
- `INSTRUCOES_CONTRA_PROVAS_ANALISES.md` - Este arquivo de instruções

## ⚙️ **Como Aplicar as Alterações**

### 1. **Executar Migração SQL**

1. Acesse o **Supabase Dashboard**
2. Vá para **SQL Editor**
3. Copie e execute o conteúdo do arquivo `supabase/migrations/update_contra_provas_analises.sql`

### 2. **O que a Migração Faz**

#### ✅ **Limpeza de Dados Existentes**
- Remove análises do dia 1 que ainda estão pendentes
- Mantém análises do dia 1 que já foram realizadas (histórico)

#### ✅ **Atualização da Estrutura**
- Atualiza constraint para aceitar dias: 1 (histórico), 30, 60, 90, 120, 150, 180
- Cria função automática para gerar análises apenas nos novos dias (30, 60, 90, 120, 150, 180)
- Configura trigger para executar automaticamente

#### ✅ **Criação Automática**
- Para contra-provas existentes sem análises, cria automaticamente
- Para novas contra-provas, cria análises automaticamente via trigger

### 3. **Verificação Pós-Migração**

A migração inclui verificações automáticas que mostrarão estatísticas no final da execução.

Execute estas consultas adicionais para verificar se tudo funcionou:

```sql
-- Verificar se não há mais análises do dia 1 pendentes
SELECT COUNT(*) as analises_dia_1_pendentes
FROM analises_contra_provas
WHERE dia_analise = 1 AND status_analise = 'pendente';
-- Resultado esperado: 0

-- Verificar dias de análise disponíveis
SELECT dia_analise, COUNT(*) as quantidade
FROM analises_contra_provas
GROUP BY dia_analise
ORDER BY dia_analise;
-- Resultado esperado: 1 (apenas histórico), 30, 60, 90, 120, 150, 180

-- Verificar se trigger está funcionando (criar uma contra-prova teste)
-- As análises devem ser criadas automaticamente apenas para os novos dias
```

## 🔔 **Sistema de Notificações**

### **Comportamento Atual**
- ✅ Notificações aparecem quando faltam **3 dias ou menos** para a análise
- ✅ Classificação por urgência:
  - 🔴 **Atrasada**: Data já passou
  - 🟡 **Hoje**: Análise programada para hoje
  - 🟠 **Amanhã**: Análise programada para amanhã
  - 🔵 **Próximos dias**: Análise em 2-3 dias

### **Cronograma de Notificações**
Para uma contra-prova criada hoje (07/07/2025):

| Análise | Data Programada | Notificação Aparece |
|---------|----------------|-------------------|
| 30º dia | 06/08/2025 | 03/08/2025 |
| 60º dia | 05/09/2025 | 02/09/2025 |
| 90º dia | 05/10/2025 | 02/10/2025 |
| 120º dia | 04/11/2025 | 01/11/2025 |
| 150º dia | 04/12/2025 | 01/12/2025 |
| 180º dia | 03/01/2026 | 31/12/2025 |

## 🚀 **Próximos Passos**

1. **Execute a migração SQL** no Supabase Dashboard
2. **Teste criando uma nova contra-prova** para verificar se as análises são criadas corretamente
3. **Verifique as notificações** na página de contra-provas
4. **Confirme que não há mais análises do dia 1** sendo criadas

## ⚠️ **Importante**

- **Dados históricos preservados**: Análises do dia 1 já realizadas são mantidas
- **Apenas pendentes removidas**: Somente análises do dia 1 pendentes são excluídas
- **Funcionamento automático**: Novas contra-provas criarão análises automaticamente
- **Notificações ajustadas**: Sistema já configurado para 3 dias de antecedência

A partir da aplicação desta migração, o sistema funcionará conforme solicitado:
- ❌ Sem análise do 1º dia
- ✅ Análises apenas em 30, 60, 90, 120, 150, 180 dias
- 🔔 Notificações 3 dias antes de cada análise
