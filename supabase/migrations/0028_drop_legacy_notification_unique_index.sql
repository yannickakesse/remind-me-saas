-- ============================================================================
-- 0028 — Retrait de l'ancien index unique (user_id, kind, entity_id) des notifications
-- ============================================================================
-- Hérité de la migration 0006. Il empêche des rappels légitimes et répétés pour un même
-- élément : tâche en retard chaque jour, rappel quotidien d'un objectif, inactivité chaque
-- semaine, paiement attendu à J-7 puis J-3… (même type + même élément = refusé).
-- Les doublons sont désormais empêchés par la clé unique (user_id, idempotency_key) créée
-- en 0025, qui distingue chaque rappel (par jour, par palier…).
--
-- Aucune donnée n'est supprimée (seul un index est retiré). À exécuter APRÈS 0025 :
-- la migration refuse de s'exécuter si la nouvelle clé unique n'existe pas encore.
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and tablename = 'notifications' and indexname = 'uq_notifications_user_idempotency'
  ) then
    raise exception 'REMIND ME 0028 : appliquer d''abord la migration 0025 (clé anti-doublon unique).';
  end if;
end;
$$;

drop index if exists public.uq_notifications_kind_entity;
