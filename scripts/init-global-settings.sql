-- Script para inicializar configurações globais padrão
-- Execute este script no Supabase SQL Editor se a tabela global_settings estiver vazia

-- Verificar se a tabela existe e está vazia
DO $$
BEGIN
    -- Verificar se a tabela global_settings existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'global_settings') THEN
        -- Verificar se está vazia e inserir dados padrão
        IF NOT EXISTS (SELECT 1 FROM global_settings LIMIT 1) THEN
            INSERT INTO global_settings (
                id,
                company_name,
                company_document,
                company_address,
                company_phone,
                company_email,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                'Nossa Goma',
                '00.000.000/0001-00',
                'Endereço da Empresa',
                '(00) 0000-0000',
                'contato@nossagoma.com',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Configurações globais padrão inseridas com sucesso!';
        ELSE
            RAISE NOTICE 'Configurações globais já existem.';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela global_settings não encontrada. Verifique se as migrações foram executadas.';
    END IF;
END $$;

-- Verificar o resultado
SELECT * FROM global_settings;
