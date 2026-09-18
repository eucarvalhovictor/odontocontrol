-- ============================================================
-- OdontoControl — MIGRATION 006 (para bancos que já existem)
-- Adiciona: despesas manuais do consultório (Financeiro).
-- Idempotente: pode rodar mais de uma vez.
-- Como aplicar: SQL Editor → New query → cole → Run.
-- (Instalação nova: rode o schema.sql + migrations 002–006.)
-- Sem esta tabela, os gastos manuais funcionam só no modo local.
-- ============================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  descricao text not null,
  categoria text not null default 'Outros',
  valor numeric not null default 0,
  data text,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_user on public.expenses (user_id);

alter table public.expenses enable row level security;

drop policy if exists "owner_all" on public.expenses;
create policy "owner_all" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
