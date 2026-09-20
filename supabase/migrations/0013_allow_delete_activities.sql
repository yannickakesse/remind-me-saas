-- ============================================================================
-- MIGRATION 0013 — AUTORISATION DE SUPPRESSION DES ACTIVITÉS (RLS)
-- ============================================================================

-- Permet aux utilisateurs de supprimer définitivement leurs propres activités.
drop policy if exists "delete_own_activities" on activities;
create policy "delete_own_activities" on activities
  for delete
  using (auth.uid() = user_id);
