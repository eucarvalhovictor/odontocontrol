-- ============================================================
-- OdontoControl — MIGRATION 002 (para bancos que já rodaram schema.sql)
-- Adiciona: foto do paciente + anamnese + plano de tratamento +
-- exames de imagem. Idempotente: pode rodar mais de uma vez.
-- Como aplicar: SQL Editor → New query → cole → Run.
-- (Instalação nova? schema.sql já contém tudo: não precisa desta.)
-- ============================================================

alter table public.patients add column if not exists foto text;

create table if not exists public.anamneses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null unique references public.patients (id) on delete cascade,
  queixa_principal text,
  historico text,
  hipertensao boolean not null default false,
  diabete boolean not null default false,
  cardiopatia boolean not null default false,
  alergias text,
  medicamentos text,
  cirurgias text,
  fumante boolean not null default false,
  gestante boolean not null default false,
  observacoes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.treatment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  procedimento text not null,
  dente text,
  valor numeric not null default 0,
  status text not null default 'planejado',
  created_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  titulo text not null,
  tipo text,
  data text,
  imagem text,
  obs text,
  created_at timestamptz not null default now()
);

create index if not exists idx_anamneses_patient on public.anamneses (patient_id);
create index if not exists idx_plans_patient on public.treatment_plans (patient_id);
create index if not exists idx_exams_patient on public.exams (patient_id);

alter table public.anamneses enable row level security;
alter table public.treatment_plans enable row level security;
alter table public.exams enable row level security;

drop policy if exists "owner_all" on public.anamneses;
create policy "owner_all" on public.anamneses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.treatment_plans;
create policy "owner_all" on public.treatment_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.exams;
create policy "owner_all" on public.exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
