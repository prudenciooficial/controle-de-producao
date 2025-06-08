-- Migração: Remover coluna 'ativo' da tabela feriados
-- Data: 2024
-- Descrição: Remove o campo de status ativo/inativo dos feriados, 
-- já que foi decidido simplificar o sistema sem essa funcionalidade

-- Remover a coluna ativo da tabela feriados
ALTER TABLE feriados 
DROP COLUMN IF EXISTS ativo; 