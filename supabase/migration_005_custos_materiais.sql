-- Migration 005: custos de insumos + materiais do plano de tratamento
-- Rode este script no SQL Editor do Supabase (Dashboard → SQL).
-- Sem estas colunas, os campos novos funcionam apenas no modo local.

alter table public.supplies
  add column if not exists custo numeric not null default 0;

alter table public.treatment_plans
  add column if not exists materiais jsonb not null default '[]';
