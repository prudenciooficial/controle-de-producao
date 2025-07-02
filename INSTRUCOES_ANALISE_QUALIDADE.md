# Sistema de Análises de Qualidade

## 📋 Descrição

Sistema completo para registro e controle de análises de pH e umidade de amostras coletadas durante a produção, com geração automática de laudos de liberação de produto acabado.

## 🗄️ Estrutura de Banco de Dados

### Tabelas Criadas

1. **`coletas_amostras`** - Registra cada coleta de amostras por lote
2. **`analises_amostras`** - Armazena análises individuais de cada amostra
3. **`laudos_liberacao`** - Gera laudos de liberação do produto acabado

## ⚙️ Configuração Inicial

### 1. Executar Migração SQL

Execute o arquivo `supabase/migrations/create_analises_qualidade_tables.sql` no seu banco de dados Supabase:

```sql
-- Copie e execute todo o conteúdo do arquivo no SQL Editor do Supabase Dashboard
```

### 2. Verificar Permissões

No sistema, vá em **Administrador > Usuários** e certifique-se de que os usuários têm permissão para:
- Módulo: **Qualidade**
- Página: **Análises de Qualidade**

## 📝 Como Usar

### 1. Criar Nova Coleta

1. Acesse **Qualidade > Análises de Qualidade**
2. Clique em **Nova Coleta**
3. Preencha:
   - **Lote de Produção**: Ex: 2025001
   - **Data da Coleta**: Data quando as amostras foram coletadas
   - **Quantidade Produzida**: Total produzido em kg (ex: 20000)
   - **Quantidade de Amostras**: Padrão 13 amostras
   - **Responsável pela Coleta**: Nome do funcionário
   - **Observações**: Informações adicionais (opcional)

### 2. Registrar Análises

1. Na lista de coletas, clique no ícone 👁️ (Ver Análises)
2. Navegue entre as amostras usando os botões numerados
3. Para cada amostra, preencha:

   **Parâmetros Físico-Químicos:**
   - **Umidade (%)**: Valor entre 40-45% é conforme ✅
   - **pH**: Valor entre 3,6-5,6 é conforme ✅

   **Parâmetros Organolépticos:**
   - **Aspecto**: Fino, Grosso, Irregular, Conforme
   - **Cor**: Branco, Amarelado, Acinzentado, Conforme
   - **Odor**: Característico, Azedo, Rançoso, Estranho, Conforme
   - **Sabor**: Característico, Amargo, Azedo, Estranho, Conforme
   - **Embalagem**: Íntegra, Danificada, Furada, Conforme

4. Clique **Salvar Análise** para cada amostra
5. Quando todas as análises estiverem preenchidas, clique **Finalizar Coleta**

### 3. Gerar Laudo de Liberação

1. Para coletas com status **Finalizada**, clique no ícone 📄 (Gerar Laudo)
2. Revise o resumo das análises:
   - **Umidade Média**: Calculada automaticamente
   - **pH Médio**: Calculado automaticamente
   - **Resultado**: Aprovado/Reprovado baseado nas conformidades

3. Preencha dados do laudo:
   - **Marca do Produto**: Ex: "MASSA PRONTA PARA TAPIOCA NOSSA GOMA"
   - **Gramatura**: 1Kg, 500g, 250g
   - **Data de Validade**: Calculada automaticamente (6 meses)
   - **Responsável pela Liberação**: Nome do responsável técnico
   - **Observações**: Informações regulamentares

4. Clique **Prévia do Laudo** para visualizar
5. Confirme com **Confirmar e Gerar Laudo**

## 📊 Status das Coletas

- **🟡 Em Andamento**: Coleta criada, análises em preenchimento
- **🔵 Finalizada**: Todas análises preenchidas, aguardando laudo
- **🟢 Aprovada**: Laudo gerado com resultado aprovado
- **🔴 Reprovada**: Laudo gerado com resultado reprovado

## 📋 Regras de Conformidade

### Automáticas
- **Umidade**: 40% a 45% = ✅ Conforme
- **pH**: 3,6 a 5,6 = ✅ Conforme

### Resultado Final
- **Aprovado**: Todas as análises de umidade e pH conformes
- **Reprovado**: Pelo menos uma análise fora dos parâmetros

## 📄 Laudo Gerado

O laudo segue o padrão da empresa com:
- ✅ Cabeçalho oficial da Indústria Ser Bem Ltda
- ✅ Identificação completa do produto e lote
- ✅ Parâmetros organolépticos e físico-químicos
- ✅ Especificações e resultados
- ✅ Parecer final (Aprovado/Reprovado)
- ✅ Assinatura do responsável técnico
- ✅ Observações regulamentares
- ✅ Códigos e revisões de documentos

## 🔧 Funcionalidades Técnicas

- ✅ **Validação automática** de conformidade
- ✅ **Navegação intuitiva** entre amostras
- ✅ **Cálculo automático** de médias
- ✅ **Salvamento individual** por amostra
- ✅ **Preenchimento progressivo** com indicadores visuais
- ✅ **Geração de PDF** para impressão
- ✅ **Integração completa** com sistema de permissões

## 🚀 Próximos Passos

1. Execute a migração SQL no banco
2. Configure as permissões dos usuários
3. Treine a equipe de qualidade no novo sistema
4. Comece registrando uma coleta de teste

## 📞 Suporte

Em caso de dúvidas ou problemas:
- Verifique se as tabelas foram criadas corretamente
- Confirme as permissões de usuário
- Consulte os logs de erro no navegador (F12) 