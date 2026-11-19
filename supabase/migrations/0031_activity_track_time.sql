-- ============================================================================
-- 0031 — Suivi des heures facultatif, choisi à la création de l'activité
-- ============================================================================
-- Ajoute une seule colonne : activities.track_time.
--   • true  : Remind Me rappelle les séances ET demande de confirmer chaque séance terminée
--             (heures travaillées, rentabilité horaire) — comportement actuel ;
--   • false : rappels seulement (élève, rendez-vous, mariage, baptême…) : jamais de
--             « Séance terminée ? Confirmez », pas de séance « en attente de vérification ».
--
-- Aucune donnée n'est modifiée ni supprimée : les activités existantes gardent le suivi des heures (true).
-- L'application fonctionne avant et après cette migration. Elle peut être relancée sans risque.
-- ============================================================================

alter table public.activities
  add column if not exists track_time boolean not null default true;

comment on column public.activities.track_time is
  'Suivi des heures : true = confirmer chaque séance terminée (heures, rentabilité) ; false = rappels seulement.';

notify pgrst, 'reload schema';
