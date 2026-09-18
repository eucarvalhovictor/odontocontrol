-- ============================================================
-- OdontoControl — Migration 003: evolução por consulta + odontograma
-- Como aplicar: Supabase Dashboard → SQL Editor → New query →
-- cole este arquivo → Run. (Idempotente: pode rodar mais de 1x.)
-- Pré-requisito: schema.sql (base) já aplicado.
-- O agendamento avulso não precisa de migration: appointments.paciente
-- já é texto livre (nome digitado na hora, sem cadastro obrigatório).
-- ============================================================

-- ---------- Evolução clínica por consulta ----------
create table if not exists public.evolutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete cascade,
  patient_id uuid references public.patients (id) on delete cascade,
  paciente text not null default '',
  data text,
  nota text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Odontograma: 1 linha por dente alterado ----------
create table if not exists public.odontogram (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  dente text not null,
  status text not null default 'higido',
  updated_at timestamptz not null default now(),
  unique (patient_id, dente)
);

-- ---------- Índices ----------
create index if not exists idx_evolutions_user on public.evolutions (user_id);
create index if not exists idx_evolutions_appt on public.evolutions (appointment_id);
create index if not exists idx_evolutions_patient on public.evolutions (patient_id);
create index if not exists idx_odontogram_patient on public.odontogram (patient_id);

-- ---------- RLS: cada dentista só vê o que é dele ----------
alter table public.evolutions enable row level security;
alter table public.odontogram enable row level security;

drop policy if exists "owner_all" on public.evolutions;
create policy "owner_all" on public.evolutions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.odontogram;
create policy "owner_all" on public.odontogram
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
