-- ============================================================================
-- 0030 — Délai de rappel propre à chaque activité
-- ============================================================================
-- Ajoute une seule colonne, facultative : activities.reminder_lead_minutes.
--   • vide (NULL) : l'activité suit le délai général réglé dans les paramètres (30 min par défaut) ;
--   • 5 à 240    : le 1er rappel de chaque séance part ce nombre de minutes avant.
--
-- Aucune donnée n'est modifiée ni supprimée. Les activités existantes restent sur le délai général.
-- L'application fonctionne avant et après cette migration. Elle peut être relancée sans risque.
-- ============================================================================

alter table public.activities
  add column if not exists reminder_lead_minutes integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activities_reminder_lead_minutes_check'
  ) then
    alter table public.activities
      add constraint activities_reminder_lead_minutes_check
      check (reminder_lead_minutes is null or reminder_lead_minutes between 5 and 240);
  end if;
end;
$$;

comment on column public.activities.reminder_lead_minutes is
  'Délai du 1er rappel avant chaque séance (minutes). NULL = délai général des paramètres.';

notify pgrst, 'reload schema';
