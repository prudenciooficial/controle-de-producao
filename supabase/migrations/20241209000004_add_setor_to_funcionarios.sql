-- ============================================================================
-- ADICIONAR COLUNA SETOR NA TABELA FUNCIONÁRIOS
-- Data: 2024-12-09
-- Versão: 1.0.0
-- Descrição: Adiciona coluna setor para categorizar funcionários como Produção ou Administrativo
-- ============================================================================

-- Adicionar coluna setor na tabela funcionários
DO $$ 
BEGIN
    -- Verificar e adicionar coluna setor na tabela funcionários
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='funcionarios' AND column_name='setor') THEN
        ALTER TABLE funcionarios ADD COLUMN setor VARCHAR(50) NOT NULL DEFAULT 'Produção';
        
        -- Adicionar comentário explicativo
        COMMENT ON COLUMN funcionarios.setor IS 'Setor do funcionário: Produção ou Administrativo';
        
        -- Adicionar constraint para validar valores
        ALTER TABLE funcionarios ADD CONSTRAINT chk_funcionarios_setor 
        CHECK (setor IN ('Produção', 'Administrativo'));
        
        -- Criar índice para performance
        CREATE INDEX IF NOT EXISTS idx_funcionarios_setor ON funcionarios(setor);
        
    END IF;
END $$;

-- ============================================================================
-- ATUALIZAR SETORES BASEADO NO CARGO ATUAL (OPCIONAL)
-- ============================================================================

-- Atualizar funcionários existentes baseado nos cargos atuais
UPDATE funcionarios 
SET setor = CASE 
    WHEN LOWER(cargo) LIKE '%gerente%' 
      OR LOWER(cargo) LIKE '%supervisor%' 
      OR LOWER(cargo) LIKE '%coordenador%' 
      OR LOWER(cargo) LIKE '%assistente administrativo%'
      OR LOWER(cargo) LIKE '%analista%' 
      OR LOWER(cargo) LIKE '%contador%' 
      OR LOWER(cargo) LIKE '%auxiliar administrativo%' 
      OR LOWER(cargo) LIKE '%secretaria%'
      OR LOWER(cargo) LIKE '%recursos humanos%' 
      OR LOWER(cargo) LIKE '%financeiro%' 
      OR LOWER(cargo) LIKE '%vendas%' 
      OR LOWER(cargo) LIKE '%marketing%'
      OR LOWER(cargo) LIKE '%administra%'
      OR LOWER(cargo) LIKE '%escritório%'
      OR LOWER(cargo) LIKE '%office%'
    THEN 'Administrativo'
    ELSE 'Produção'
END
WHERE setor = 'Produção'; -- Só atualiza os que ainda estão com valor padrão

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE funcionarios IS 'Tabela de funcionários do sistema com informações básicas e setor de trabalho';

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================ 