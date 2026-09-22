-- ============================================================================
-- MIGRATION 0015 — ABONNEMENTS, ENTITLEMENTS & RLS POLICY
-- ============================================================================

-- 1. Ajout des colonnes de suivi d'abonnement si absentes
alter table public.subscriptions 
  add column if not exists updated_at timestamptz default now(),
  add column if not exists current_period_start timestamptz default now(),
  add column if not exists provider text default 'manual',
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists cancel_at_period_end boolean default false;

-- 2. Politiques RLS pour la table subscriptions
drop policy if exists "select_own_subscription" on public.subscriptions;
create policy "select_own_subscription" on public.subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "insert_own_subscription" on public.subscriptions;
create policy "insert_own_subscription" on public.subscriptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "update_own_subscription" on public.subscriptions;
create policy "update_own_subscription" on public.subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
