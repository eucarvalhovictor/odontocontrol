-- ============================================================
-- OdontoControl — MIGRATION 007 (para bancos que já existem)
-- Adiciona: assinaturas do plano (checkout só com cartão de crédito).
-- Idempotente: pode rodar mais de uma vez.
-- Como aplicar: SQL Editor → New query → cole → Run.
-- Sem esta tabela, a assinatura funciona só no modo local.
--
-- Status: trialing (7 dias grátis após verificação do cartão) |
-- active (pagante) | past_due (fatura em aberto) | canceled.
-- Só trialing (no prazo) e active liberam o acesso ao painel.
-- ============================================================

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'trialing',
  plan text not null default 'unico',
  gateway text not null default 'demo',
  gateway_customer_id text,
  gateway_subscription_id text,
  card_last4 text,
  card_brand text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "owner_all" on public.subscriptions;
create policy "owner_all" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
