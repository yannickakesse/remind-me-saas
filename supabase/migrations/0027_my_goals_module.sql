-- ============================================================================
-- 0027 — Module « Mes Objectifs » (objectifs de vie, distincts de l'épargne)
-- ============================================================================
-- Migration ADDITIVE : 3 nouvelles tables, aucune table existante modifiée.
--   goals                  : l'objectif principal (quantitatif ou qualitatif)
--   goal_steps             : sous-objectifs / étapes (quotidiens, hebdo, mensuels, personnalisés, jalons)
--   goal_progress_entries  : historique de la progression (évolution, inactivité, accomplissements)
-- Chaque utilisateur ne voit et ne modifie que ses propres lignes (RLS).
-- ============================================================================

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  title text not null check (char_length(title) between 1 and 160),
  description text,
  domain text not null default 'personal' check (domain in (
    'personal', 'professional', 'studies', 'finance', 'health_sport', 'learning', 'project', 'other'
  )),
  motivation text,

  start_date date not null default current_date,
  due_date date,
  check (due_date is null or due_date >= start_date),

  -- Quantitatif (ex. 1 400 pompes, 500 000 FCFA, 20 livres) ou qualitatif (ex. parler anglais couramment)
  kind text not null default 'qualitative' check (kind in ('quantitative', 'qualitative')),
  expected_result text,
  unit text,
  start_value numeric(14, 2) not null default 0,
  target_value numeric(14, 2),
  current_value numeric(14, 2) not null default 0,
  check (kind = 'qualitative' or target_value is not null),

  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'abandoned', 'archived')),
  completed_at timestamptz,

  -- Rappel facultatif de l'objectif principal
  reminder_frequency text check (reminder_frequency in ('daily', 'weekly', 'monthly')),
  reminder_time time,
  reminder_weekday smallint check (reminder_weekday between 0 and 6),

  -- Lien facultatif vers un objectif d'épargne (affichage uniquement, les deux restent distincts)
  savings_goal_id uuid references public.savings_goals (id) on delete set null,

  color text,
  position integer not null default 0,
  last_progress_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_goals_user_status on public.goals (user_id, status);

create table if not exists public.goal_steps (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,

  title text not null check (char_length(title) between 1 and 160),
  description text,
  period text not null default 'custom' check (period in ('daily', 'weekly', 'monthly', 'custom', 'milestone')),
  start_date date,
  due_date date,
  target_value numeric(14, 2),
  weight numeric(6, 2) not null default 1 check (weight > 0),
  position integer not null default 0,

  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'skipped')),
  completed_at timestamptz,

  reminder_frequency text check (reminder_frequency in ('daily', 'weekly', 'monthly', 'once')),
  reminder_time time,

  -- Tâche créée sur demande de l'utilisateur (« Ajouter au calendrier ») : évite les doublons
  linked_task_id uuid references public.tasks (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_goal_steps_goal on public.goal_steps (goal_id, position);
create index if not exists idx_goal_steps_user_due on public.goal_steps (user_id, due_date) where status in ('todo', 'in_progress');

create table if not exists public.goal_progress_entries (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  step_id uuid references public.goal_steps (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,

  kind text not null check (kind in ('value', 'step_done', 'step_reopened', 'status', 'note')),
  value_delta numeric(14, 2),
  value_after numeric(14, 2),
  note text,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_goal_progress_goal on public.goal_progress_entries (goal_id, recorded_at desc);

-- RLS : chacun ses données
alter table public.goals enable row level security;
alter table public.goal_steps enable row level security;
alter table public.goal_progress_entries enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['goals', 'goal_steps', 'goal_progress_entries']
  loop
    execute format('drop policy if exists "own_select" on public.%I', t);
    execute format('drop policy if exists "own_insert" on public.%I', t);
    execute format('drop policy if exists "own_update" on public.%I', t);
    execute format('drop policy if exists "own_delete" on public.%I', t);
    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end;
$$;

-- Une étape appartient forcément à un objectif du même utilisateur
create or replace function public.goal_steps_check_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.goals g where g.id = new.goal_id and g.user_id = new.user_id) then
    raise exception 'Objectif introuvable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_goal_steps_owner on public.goal_steps;
create trigger trg_goal_steps_owner before insert or update on public.goal_steps
  for each row execute function public.goal_steps_check_owner();

drop trigger if exists trg_goal_progress_owner on public.goal_progress_entries;
create trigger trg_goal_progress_owner before insert or update on public.goal_progress_entries
  for each row execute function public.goal_steps_check_owner();

-- Créer un objectif compte comme « première vraie utilisation » pour l'essai de 7 jours (migration 0026)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'remindme_trial_on_first_use') then
    drop trigger if exists trg_remindme_trial_first_use on public.goals;
    create trigger trg_remindme_trial_first_use after insert on public.goals
      for each row execute function public.remindme_trial_on_first_use();
  end if;
end;
$$;
