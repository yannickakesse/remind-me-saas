-- ============================================================================
-- MIGRATION 0016 — DURÉE DE VIE DES ACTIVITÉS, EXPIRATION & ENGIN DE RAPPELS
-- ============================================================================

-- 1. Ajout du statut 'expired' aux statuts valides pour les activités
alter table public.activities drop constraint if exists activities_status_check;
alter table public.activities add constraint activities_status_check 
  check (status in ('active', 'suspended', 'archived', 'expired'));

-- 2. Index d'optimisation pour la détection rapide des activités expirées
create index if not exists idx_activities_user_dates 
  on public.activities (user_id, status, end_date);

-- 3. Sécurité RLS inchangée et préservée pour toutes les tables
