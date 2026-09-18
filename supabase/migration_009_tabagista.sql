-- ============================================================
-- OdontoControl — Migration 009: fumante -> tabagista
-- Como aplicar: Supabase Dashboard → SQL Editor → New query →
-- cole este arquivo → Run. (Idempotente: pode rodar mais de 1x.)
-- Renomeia a coluna preservando os valores já salvos.
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'anamneses'
      and column_name = 'fumante'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'anamneses'
      and column_name = 'tabagista'
  ) then
    alter table public.anamneses rename column fumante to tabagista;
  end if;
end
$$;
