-- ============================================================================
-- PHASE 3 — CALENDRIER
-- Événements de calendrier, générés automatiquement depuis activity_schedules
-- (récurrence weekly/biweekly) et matérialisés dans cette table plutôt que
-- calculés à la volée à chaque affichage : ça permet de stocker un statut
-- d'exécution par occurrence (prévu/en cours/terminé/annulé/manqué/reporté)
-- et de gérer les exceptions (une occurrence déplacée reste liée à son
-- horaire d'origine), sans jamais réécrire activity_schedules lui-même.
-- ============================================================================

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id uuid not null references activities (id) on delete cascade,

  -- null pour un événement créé manuellement (rendez-vous ponctuel non lié
  -- à un horaire récurrent) ; renseigné pour un événement généré depuis
  -- activity_schedules.
  schedule_id uuid references activity_schedules (id) on delete set null,

  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,

  status text not null default 'planned' check (status in (
    'planned', 'in_progress', 'completed', 'cancelled', 'missed', 'postponed'
  )),

  -- Une occurrence déplacée (reportée) garde son schedule_id mais change de
  -- starts_at/ends_at ; original_starts_at retient l'horaire calculé
  -- d'origine pour que la génération ne recrée pas un doublon au même
  -- créneau la prochaine fois qu'on matérialise la période.
  is_exception boolean not null default false,
  original_starts_at timestamptz,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_event_range check (ends_at > starts_at)
);

-- NULL n'est jamais égal à NULL dans une contrainte unique Postgres : les
-- événements manuels (schedule_id null) ne sont donc jamais bloqués entre
-- eux par cet index, qui ne sert qu'à empêcher la génération automatique de
-- dupliquer une occurrence déjà matérialisée pour un même horaire.
create unique index if not exists uq_calendar_events_schedule_occurrence
  on calendar_events (schedule_id, starts_at);

create index if not exists idx_calendar_events_user_range
  on calendar_events (user_id, starts_at, ends_at);
create index if not exists idx_calendar_events_activity
  on calendar_events (activity_id);
create index if not exists idx_calendar_events_schedule
  on calendar_events (schedule_id);

alter table calendar_events enable row level security;

create policy "select_own_calendar_events" on calendar_events
  for select using (auth.uid() = user_id);
create policy "insert_own_calendar_events" on calendar_events
  for insert with check (auth.uid() = user_id);
create policy "update_own_calendar_events" on calendar_events
  for update using (auth.uid() = user_id);
create policy "delete_own_calendar_events" on calendar_events
  for delete using (auth.uid() = user_id);

create trigger set_calendar_events_updated_at
  before update on calendar_events
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Nettoyage en cascade : si un horaire (activity_schedules) est supprimé,
-- on ne veut pas perdre l'historique d'exécution des occurrences déjà
-- passées, donc schedule_id passe à null (défini via "on delete set null"
-- ci-dessus) plutôt que de supprimer les calendar_events correspondants.
-- Si c'est l'activité entière qui est supprimée (cas rare, cf. §8 règle
-- métier 6 : archivage préféré à la suppression), on supprime bien les
-- événements ("on delete cascade" sur activity_id).
-- ----------------------------------------------------------------------------
