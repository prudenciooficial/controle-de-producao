-- Seed de datas especiais para o módulo de Marketing
-- Execute via CLI (supabase db push) ou cole no SQL editor

insert into public.datas_especiais (nome, data_evento, tipo, descricao, sugestao_tema, recorrente, ativo)
values
  ('Confraternização Universal', '2025-01-01', 'nacional', 'Início de ano', 'Boas-vindas ao novo ano e metas da empresa', true, true),
  ('Carnaval', '2025-03-03', 'nacional', 'Feriado de Carnaval', 'Promoções coloridas e temas festivos', true, true),
  ('Páscoa', '2025-04-20', 'catolica', 'Domingo de Páscoa', 'Mensagens de renovação e família', true, true),
  ('Dia das Mães', '2025-05-11', 'comemorativa', 'Homenagem às mães', 'Campanha especial com depoimentos', true, true),
  ('Dia dos Namorados', '2025-06-12', 'comemorativa', 'Comemoração dos casais', 'Ofertas para presentear', true, true),
  ('Festas Juninas', '2025-06-24', 'comemorativa', 'Tradições juninas', 'Conteúdo típico e receitas', true, true),
  ('Dia dos Pais', '2025-08-10', 'comemorativa', 'Homenagem aos pais', 'Campanha com histórias da família', true, true),
  ('Independência do Brasil', '2025-09-07', 'nacional', 'Feriado nacional', 'Conteúdo patriótico e institucional', true, true),
  ('Nossa Senhora Aparecida', '2025-10-12', 'catolica', 'Padroeira do Brasil', 'Mensagem de fé e tradição', true, true),
  ('Finados', '2025-11-02', 'catolica', 'Dia de Finados', 'Conteúdo respeitoso e reflexivo', true, true),
  ('Proclamação da República', '2025-11-15', 'nacional', 'Feriado nacional', 'Conteúdo institucional', true, true),
  ('Black Friday', '2025-11-28', 'comemorativa', 'Campanha de ofertas', 'Teasers e ofertas progressivas', true, true),
  ('Natal', '2025-12-25', 'comemorativa', 'Natal', 'Mensagem de Natal e retrospectiva do ano', true, true),
  ('Ano Novo', '2025-12-31', 'comemorativa', 'Véspera de Ano Novo', 'Encerramento e expectativas para o novo ano', true, true)
ON CONFLICT DO NOTHING;

