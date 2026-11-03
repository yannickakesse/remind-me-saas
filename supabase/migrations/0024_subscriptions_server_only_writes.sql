-- ============================================================================
-- MIGRATION 0024 — ABONNEMENTS : ÉCRITURE RÉSERVÉE AU SERVEUR
-- ============================================================================
-- Avant : chaque utilisateur pouvait créer / modifier sa propre ligne dans
-- public.subscriptions (politiques insert_own / update_own), donc s'attribuer
-- un forfait payant sans payer depuis le navigateur.
-- Après : lecture seule pour l'utilisateur ; seules les routes serveur
-- (webhook Bictorys, résiliation) écrivent via la clé service_role, qui
-- contourne la RLS.
-- Sans effet sur les données existantes. Peut être relancée sans risque.

drop policy if exists "insert_own_subscription" on public.subscriptions;
drop policy if exists "update_own_subscription" on public.subscriptions;
drop policy if exists "delete_own_subscription" on public.subscriptions;

-- La lecture de sa propre ligne reste autorisée
drop policy if exists "select_own_subscription" on public.subscriptions;
create policy "select_own_subscription" on public.subscriptions
  for select
  using (auth.uid() = user_id);
