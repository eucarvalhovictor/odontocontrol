-- ============================================================
-- OdontoControl — ZERA todos os dados de TODOS os dentistas
-- (pacientes, consultas, prescrições, insumos e configurações).
-- As contas (auth.users) e os perfis são mantidos: no próximo login
-- cada usuário encontra painéis zerados.
-- Como aplicar: Supabase Dashboard → SQL Editor → New query →
-- cole este arquivo → Run. Rode UMA vez (o script é idempotente).
-- ============================================================

delete from public.evolutions;
delete from public.odontogram;
delete from public.dentists;
delete from public.exams;
delete from public.treatment_plans;
delete from public.anamneses;
delete from public.supplies;
delete from public.prescriptions;
delete from public.appointments;
delete from public.patients;
delete from public.settings;
