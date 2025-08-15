-- Marketing module tables for Supabase (cronograma de publicações)
-- Creates minimal tables and permissive RLS policies for authenticated users
-- Generated on 2025-08-15

-- Extensions (usually already enabled)
create extension if not exists pgcrypto; -- for gen_random_uuid

-- 1) Datas especiais (feriados/comemorativas)
create table if not exists public.datas_especiais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_evento date not null,
  tipo text not null check (tipo in ('catolica','comemorativa','nacional','internacional','empresa')),
  descricao text,
  sugestao_tema text,
  recorrente boolean default true,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) Cronograma de postagens
create table if not exists public.cronograma_postagens (
  id uuid primary key default gen_random_uuid(),
  data_postagem date not null,
  tema text not null,
  descricao text,
  rede_social text check (rede_social in ('instagram','facebook','whatsapp','linkedin','tiktok','youtube')),
  status text not null default 'planejada' check (status in ('planejada','aprovada','publicada','cancelada')),
  eh_sugestao_ia boolean default false,
  observacoes text,
  data_criacao timestamptz default now(),
  data_atualizacao timestamptz default now(),
  criado_por uuid default auth.uid()
);

-- 3) Simple trigger to maintain updated_at/data_atualizacao
create or replace function public.set_updated_timestamp()
returns trigger language plpgsql as $$
begin
  if TG_TABLE_NAME = 'datas_especiais' then
    new.updated_at = now();
  elsif TG_TABLE_NAME = 'cronograma_postagens' then
    new.data_atualizacao = now();
  end if;
  return new;
end $$;

drop trigger if exists t_datas_especiais_set_updated on public.datas_especiais;
create trigger t_datas_especiais_set_updated
before update on public.datas_especiais
for each row execute function public.set_updated_timestamp();

drop trigger if exists t_cronograma_postagens_set_updated on public.cronograma_postagens;
create trigger t_cronograma_postagens_set_updated
before update on public.cronograma_postagens
for each row execute function public.set_updated_timestamp();

-- 4) RLS
alter table public.datas_especiais enable row level security;
alter table public.cronograma_postagens enable row level security;

-- Policies: authenticated users can read/write (adjust later if needed)
create policy datas_especiais_select on public.datas_especiais
  for select using (auth.role() = 'authenticated');
create policy datas_especiais_insert on public.datas_especiais
  for insert with check (auth.role() = 'authenticated');
create policy datas_especiais_update on public.datas_especiais
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy datas_especiais_delete on public.datas_especiais
  for delete using (auth.role() = 'authenticated');

create policy cronograma_select on public.cronograma_postagens
  for select using (auth.role() = 'authenticated');
create policy cronograma_insert on public.cronograma_postagens
  for insert with check (auth.role() = 'authenticated');
create policy cronograma_update on public.cronograma_postagens
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy cronograma_delete on public.cronograma_postagens
  for delete using (auth.role() = 'authenticated');

