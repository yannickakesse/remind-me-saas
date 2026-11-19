-- ============================================================================
-- 0032 — Statut de l'utilisateur (inscription) et types d'activité non rémunérée
-- ============================================================================
-- 1. profiles.status : « Vous êtes… » (élève, étudiant, salarié, entrepreneur…), choisi à l'inscription.
--    Sert à adapter l'application et aux statistiques du tableau de bord fondateur.
-- 2. activities.type : nouveaux types pour les activités qui ne rapportent pas d'argent
--    (études, cours suivi, stage, formation, bénévolat, rendez-vous, événement personnel, sport, vie spirituelle).
--
-- Aucune donnée n'est modifiée ni supprimée. L'application fonctionne avant et après cette migration.
-- Elle peut être relancée sans risque.
-- ============================================================================

-- 1. Statut de l'utilisateur
alter table public.profiles
  add column if not exists status text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles
      add constraint profiles_status_check check (status is null or status in (
        'pupil', 'student', 'employee', 'civil_servant', 'entrepreneur', 'trader',
        'freelancer', 'trainer', 'artisan', 'job_seeker', 'retired', 'other'
      ));
  end if;
end;
$$;

comment on column public.profiles.status is
  'Statut déclaré à l''inscription (élève, étudiant, salarié, fonctionnaire, entrepreneur…). NULL = pas encore renseigné.';

-- 2. Types d'activité : on remplace la liste autorisée par une liste élargie (les anciens types restent valides)
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.activities'::regclass
      and con.contype = 'c'
      and att.attname = 'type'
  loop
    execute format('alter table public.activities drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.activities
  add constraint activities_type_check check (type in (
    'salaried_job', 'freelance', 'contract', 'mission', 'own_business',
    'commerce', 'coaching', 'consulting', 'teaching', 'side_activity', 'other',
    'studies', 'course', 'internship', 'training', 'volunteering',
    'appointment', 'personal_event', 'sport', 'spiritual'
  ));

notify pgrst, 'reload schema';
