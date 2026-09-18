-- ============================================================
-- OdontoControl — Schema multi-tenant (um dentista por conta)
-- Como aplicar:
--   1. Abra o Dashboard do Supabase → SQL Editor → New query
--   2. Cole este arquivo inteiro → Run
-- Cada tabela tem user_id + Row Level Security: mesmo com a anon key,
-- um dentista só lê/escreve as linhas cujo user_id = auth.uid().
-- ============================================================

-- ---------- Tabelas ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  cro text,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  cpf text,
  tel text,
  email text,
  nasc text,
  convenio text,
  alergias text,
  obs text,
  foto text,
  status text not null default 'ativo',
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paciente text not null,
  data text not null,
  hora text not null,
  proc text,
  dentista text,
  status text not null default 'agendado',
  created_at timestamptz not null default now()
);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  paciente text not null,
  med text not null,
  dose text,
  freq text,
  orient text,
  data text,
  dentista text,
  created_at timestamptz not null default now()
);

create table if not exists public.supplies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  cat text,
  qtd integer not null default 0,
  min integer not null default 0,
  un text,
  val text,
  forn text,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  dentista text,
  cro text,
  telefone text,
  email text,
  endereco text,
  logo text,
  updated_at timestamptz not null default now()
);

-- ---------- Índices ----------
create index if not exists idx_patients_user on public.patients (user_id);
create index if not exists idx_appointments_user on public.appointments (user_id);
create index if not exists idx_prescriptions_user on public.prescriptions (user_id);
create index if not exists idx_supplies_user on public.supplies (user_id);
create index if not exists idx_anamneses_patient on public.anamneses (patient_id);
create index if not exists idx_plans_patient on public.treatment_plans (patient_id);
create index if not exists idx_exams_patient on public.exams (patient_id);
create index if not exists idx_evolutions_user on public.evolutions (user_id);
create index if not exists idx_evolutions_appt on public.evolutions (appointment_id);
create index if not exists idx_evolutions_patient on public.evolutions (patient_id);
create index if not exists idx_odontogram_patient on public.odontogram (patient_id);
create index if not exists idx_dentists_user on public.dentists (user_id);

-- ---------- RLS: cada dentista só vê o que é dele ----------
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.prescriptions enable row level security;
alter table public.supplies enable row level security;
alter table public.settings enable row level security;
alter table public.anamneses enable row level security;
alter table public.treatment_plans enable row level security;
alter table public.exams enable row level security;
alter table public.evolutions enable row level security;
alter table public.odontogram enable row level security;
alter table public.dentists enable row level security;

drop policy if exists "own_profile" on public.profiles;
create policy "own_profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "owner_all" on public.patients;
create policy "owner_all" on public.patients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.appointments;
create policy "owner_all" on public.appointments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.prescriptions;
create policy "owner_all" on public.prescriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.supplies;
create policy "owner_all" on public.supplies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.settings;
create policy "owner_all" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.anamneses;
create policy "owner_all" on public.anamneses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.treatment_plans;
create policy "owner_all" on public.treatment_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.exams;
create policy "owner_all" on public.exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.evolutions;
create policy "owner_all" on public.evolutions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.odontogram;
create policy "owner_all" on public.odontogram
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on public.dentists;
create policy "owner_all" on public.dentists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Prontuário: anamnese, plano de tratamento, exames ----------
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

-- ---------- Evolução clínica por consulta ----------
-- appointments.paciente já é texto livre: o agendamento avulso
-- (primeira vez, sem cadastro) funciona sem coluna extra.
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

-- ---------- Dentistas da equipe (seleção na agenda e na prescrição) ----------
create table if not exists public.dentists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  cro text,
  created_at timestamptz not null default now()
);

-- ---------- Trigger: cria o perfil ao cadastrar o usuário ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
