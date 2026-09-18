-- ============================================================
-- OdontoControl — Migration 008: odontograma duplo + periograma
-- Como aplicar: Supabase Dashboard → SQL Editor → New query →
-- cole este arquivo → Run. (Idempotente: pode rodar mais de 1x.)
-- 1) odontogram.statuses (text[]): até 2 condições por dente
--    (metade/metade no front). Mantém `status` como 1ª condição
--    para compatibilidade com dados antigos.
-- 2) Tabela perio: sondagem por dente (PS V/L, sangramento,
--    placa, mobilidade).
-- ============================================================

-- ---------- 1) Odontograma com 2 condições ----------
alter table public.odontogram
  add column if not exists statuses text[] not null default '{}';

-- Retrocompat: quem só tem `status` ganha `statuses = {status}`
update public.odontogram
set statuses = array[status]
where (statuses is null or statuses = '{}')
  and status is not null and status <> 'higido';

-- ---------- 2) Periograma: 1 linha por dente sondado ----------
create table if not exists public.perio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  dente text not null,
  ps_v_m smallint,
  ps_v_c smallint,
  ps_v_d smallint,
  ps_l_m smallint,
  ps_l_c smallint,
  ps_l_d smallint,
  sangramento boolean not null default false,
  placa boolean not null default false,
  mobilidade smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (patient_id, dente)
);

create index if not exists idx_perio_patient on public.perio (patient_id);

alter table public.perio enable row level security;

drop policy if exists "owner_all" on public.perio;
create policy "owner_all" on public.perio
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
