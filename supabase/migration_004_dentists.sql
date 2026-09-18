-- ============================================================
-- OdontoControl — Migration 004: cadastro de dentistas da equipe
-- Como aplicar: Supabase Dashboard → SQL Editor → New query →
-- cole este arquivo → Run. (Idempotente: pode rodar mais de 1x.)
-- Pré-requisito: schema.sql (base) já aplicado.
-- Os dentistas cadastrados aqui aparecem para seleção no
-- agendamento (/agenda) e na prescrição (/prescricoes).
-- ============================================================

create table if not exists public.dentists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  cro text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dentists_user on public.dentists (user_id);

alter table public.dentists enable row level security;

drop policy if exists "owner_all" on public.dentists;
create policy "owner_all" on public.dentists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
