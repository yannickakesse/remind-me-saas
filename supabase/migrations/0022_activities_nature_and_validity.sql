-- ============================================================================
-- MIGRATION 0022 — NOUVEAU MODÈLE D'ACTIVITÉS (VALIDITÉ, NATURE, RAPPELS)
-- ============================================================================
-- Remind Me SaaS — Phase 1 & 2
-- Ajout des 3 nouvelles dimensions métier sans altérer activities.status

alter table public.activities
  add column if not exists validity_type text not null default 'permanent'
    check (validity_type in ('permanent', 'temporary')),
  add column if not exists engagement_nature text not null default 'routine'
    check (engagement_nature in ('routine', 'temporary_engagement', 'important', 'one_time')),
  add column if not exists reminder_preference text not null default 'recommended'
    check (reminder_preference in ('enabled', 'disabled', 'recommended'));

-- Index composites pour les filtres rapides et l'évaluation du Moteur de Rappels
create index if not exists idx_activities_nature_validity
  on public.activities (user_id, validity_type, engagement_nature)
  where status = 'active';

create index if not exists idx_activities_reminder_pref
  on public.activities (user_id, reminder_preference)
  where status = 'active';

-- Rechargement immédiat du cache de schéma PostgREST
notify pgrst, 'reload schema';
