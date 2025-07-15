-- Adicionar campo link_publico na tabela laudos_liberacao
ALTER TABLE public.laudos_liberacao 
ADD COLUMN link_publico TEXT UNIQUE;

-- Criar índice para melhor performance na busca por link público
CREATE INDEX idx_laudos_liberacao_link_publico ON public.laudos_liberacao(link_publico);

-- Função para gerar link único
CREATE OR REPLACE FUNCTION generate_unique_link()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER := 0;
    link_exists BOOLEAN := TRUE;
BEGIN
    WHILE link_exists LOOP
        result := '';
        FOR i IN 1..32 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM public.laudos_liberacao WHERE link_publico = result) INTO link_exists;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar link automaticamente ao criar novo laudo
CREATE OR REPLACE FUNCTION set_link_publico()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.link_publico IS NULL THEN
        NEW.link_publico := generate_unique_link();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_link_publico
    BEFORE INSERT ON public.laudos_liberacao
    FOR EACH ROW
    EXECUTE FUNCTION set_link_publico();

-- Gerar links para laudos existentes que não possuem
UPDATE public.laudos_liberacao 
SET link_publico = generate_unique_link() 
WHERE link_publico IS NULL;
