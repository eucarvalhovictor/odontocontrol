-- ============================================================
-- OdontoControl — MIGRATION 010 (para bancos que já existem)
-- Adiciona: recebimentos manuais do consultório (Financeiro).
-- Idempotente: pode rodar mais de uma vez.
-- Como aplicar: SQL Editor → New query → cole → Run.
-- Sem esta tabela, os recebimentos manuais funcionam só no modo local.
-- ============================================================

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  descricao text not null,
  categoria text not null default 'Outros',
  valor numeric not null default 0,
  data text,
  created_at timestamptz not null default now()
);

create index if not exists idx_receipts_user on public.receipts (user_id);

alter table public.receipts enable row level security;

drop policy if exists "owner_all" on public.receipts;
create policy "owner_all" on public.receipts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
