-- ============================================================================
-- MIGRATION 0020 — NOTIFICATIONS STATUS RESOLVED & PERSISTENCE FIX
-- ============================================================================

-- 1. Ajout de la colonne resolved_at si elle n'existe pas déjà
alter table notifications
  add column if not exists resolved_at timestamptz;

-- 2. Mise à jour de la contrainte check pour accepter le statut 'resolved'
alter table notifications drop constraint if exists notifications_status_check;

alter table notifications
  add constraint notifications_status_check
  check (status in ('unread', 'read', 'dismissed', 'actioned', 'snoozed', 'resolved'));

-- 3. Optimisation des index de recherche et de statut
create index if not exists idx_notifications_user_status_read 
  on notifications (user_id, status, read_at);

create index if not exists idx_notifications_user_resolved 
  on notifications (user_id, resolved_at) where resolved_at is not null;

-- 4. Rechargement du cache de schéma PostgREST
notify pgrst, 'reload schema';
