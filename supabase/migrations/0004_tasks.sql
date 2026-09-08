-- ============================================================================
-- PHASE 4 — TÂCHES
-- Tâches libres ou rattachées à une activité (préparer une facture, relancer
-- un client, envoyer un livrable...). Contrairement aux activités (§8 règle
-- métier 6 : archivage obligatoire à cause des revenus/dépenses liés), une
-- tâche ne porte aucune donnée financière dont on doive garder la trace :
-- la suppression physique reste autorisée en plus de l'annulation.
-- ============================================================================

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Une tâche peut être générale (null) ou rattachée à une activité
  -- spécifique ; si l'activité est supprimée, la tâche redevient générale
  -- plutôt que de disparaître.
  activity_id uuid references activities (id) on delete set null,

  title text not null,
  description text,

  status text not null default 'todo' check (status in (
    'todo', 'in_progress', 'done', 'cancelled'
  )),
  priority text not null default 'medium' check (priority in (
    'low', 'medium', 'high', 'urgent'
  )),

  due_date date,
  due_time time, -- optionnel : heure précise dans la journée d'échéance
  reminder_minutes_before int check (reminder_minutes_before >= 0),

  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_user on tasks (user_id);
create index if not exists idx_tasks_user_status on tasks (user_id, status);
create index if not exists idx_tasks_user_due_date on tasks (user_id, due_date);
create index if not exists idx_tasks_activity on tasks (activity_id);

alter table tasks enable row level security;

create policy "select_own_tasks" on tasks for select using (auth.uid() = user_id);
create policy "insert_own_tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "update_own_tasks" on tasks for update using (auth.uid() = user_id);
create policy "delete_own_tasks" on tasks for delete using (auth.uid() = user_id);

create trigger set_tasks_updated_at
  before update on tasks
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- completed_at automatique : renseigné au passage à 'done', effacé si le
-- statut repart en arrière — jamais saisi à la main côté client, pour rester
-- cohérent avec le principe déjà appliqué aux revenus (statut dérivé, jamais
-- déclaratif). Couvre aussi l'insertion directe d'une tâche déjà 'done'.
-- ----------------------------------------------------------------------------
create or replace function public.tasks_set_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at = now();
  elsif new.status is distinct from 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger set_tasks_completed_at_on_update
  before update on tasks
  for each row execute procedure public.tasks_set_completed_at();

create trigger set_tasks_completed_at_on_insert
  before insert on tasks
  for each row execute procedure public.tasks_set_completed_at();
