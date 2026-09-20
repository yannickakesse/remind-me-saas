-- ============================================================================
-- MIGRATION 0014 — STATUT SUSPENDU (EN PAUSE) POUR LES ACTIVITÉS
-- ============================================================================

-- Permet de suspendre temporairement une activité sans la supprimer ni l'archiver,
-- l'excluant automatiquement des revenus attendus et des calculs financiers.

alter table activities drop constraint if exists activities_status_check;
alter table activities add constraint activities_status_check 
  check (status in ('active', 'suspended', 'archived'));
