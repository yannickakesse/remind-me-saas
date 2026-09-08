-- ============================================================================
-- PHASE 5 — FINANCES
-- Revenus (income) et dépenses (expenses). Principe central hérité de
-- l'architecture initiale : on ne mélange jamais prévu et réel. Le statut
-- affiché à l'utilisateur (prévu / reçu / en retard / futur pour un revenu ;
-- prévu / payé / en retard / futur pour une dépense) n'est PAS une colonne
-- stockée : il dépend de la date du jour, qui change sans action de
-- l'utilisateur, et doit donc être recalculé à la lecture (voir
-- lib/validation/finances.ts), exactement comme "en retard" est déjà
-- recalculé à la volée pour les tâches dans tasks/page.tsx.
-- Seuls received_at / paid_at sont dérivés automatiquement en base par
-- trigger (même principe que tasks.completed_at en Phase 4).
-- ============================================================================

create table if not exists income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Un revenu peut être général (null) ou rattaché à une activité.
  activity_id uuid references activities (id) on delete set null,

  -- Renseigné uniquement quand l'entrée a été générée automatiquement depuis
  -- la rémunération d'une activité (fréquences weekly/biweekly/monthly
  -- uniquement — voir lib/finances/generate.ts). Null pour une saisie
  -- manuelle (revenu ponctuel, horaire, par séance...).
  compensation_id uuid references activity_compensation (id) on delete set null,

  label text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null references currencies (code),

  due_date date not null,
  received boolean not null default false,
  received_at date, -- dérivé automatiquement par trigger, jamais saisi à la main

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_income_user on income (user_id);
create index if not exists idx_income_user_due_date on income (user_id, due_date);
create index if not exists idx_income_activity on income (activity_id);

-- Empêche la génération paresseuse de créer deux fois la même échéance pour
-- une même rémunération récurrente. NULL n'est jamais égal à NULL dans une
-- contrainte unique Postgres : les revenus saisis manuellement
-- (compensation_id null) ne sont donc jamais bloqués entre eux par cet
-- index — même principe que uq_calendar_events_schedule_occurrence.
create unique index if not exists uq_income_compensation_due_date
  on income (compensation_id, due_date);

alter table income enable row level security;

create policy "select_own_income" on income for select using (auth.uid() = user_id);
create policy "insert_own_income" on income for insert with check (auth.uid() = user_id);
create policy "update_own_income" on income for update using (auth.uid() = user_id);
create policy "delete_own_income" on income for delete using (auth.uid() = user_id);

create trigger set_income_updated_at
  before update on income
  for each row execute procedure public.set_updated_at();

create or replace function public.income_set_received_at()
returns trigger
language plpgsql
as $$
begin
  if new.received = true and (tg_op = 'INSERT' or old.received is distinct from true) then
    new.received_at = coalesce(new.received_at, current_date);
  elsif new.received = false then
    new.received_at = null;
  end if;
  return new;
end;
$$;

create trigger set_income_received_at_on_update
  before update on income
  for each row execute procedure public.income_set_received_at();

create trigger set_income_received_at_on_insert
  before insert on income
  for each row execute procedure public.income_set_received_at();

-- ----------------------------------------------------------------------------
-- Dépenses. Contrairement aux revenus, aucune génération automatique en
-- Phase 5 (pas d'équivalent de activity_compensation côté dépenses) : saisie
-- manuelle uniquement, avec possibilité de suppression physique (aucune
-- donnée en dépend), comme pour les tâches.
-- ----------------------------------------------------------------------------

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  activity_id uuid references activities (id) on delete set null,

  label text not null,
  category text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null references currencies (code),

  due_date date not null,
  paid boolean not null default false,
  paid_at date, -- dérivé automatiquement par trigger, jamais saisi à la main

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_user on expenses (user_id);
create index if not exists idx_expenses_user_due_date on expenses (user_id, due_date);
create index if not exists idx_expenses_activity on expenses (activity_id);

alter table expenses enable row level security;

create policy "select_own_expenses" on expenses for select using (auth.uid() = user_id);
create policy "insert_own_expenses" on expenses for insert with check (auth.uid() = user_id);
create policy "update_own_expenses" on expenses for update using (auth.uid() = user_id);
create policy "delete_own_expenses" on expenses for delete using (auth.uid() = user_id);

create trigger set_expenses_updated_at
  before update on expenses
  for each row execute procedure public.set_updated_at();

create or replace function public.expenses_set_paid_at()
returns trigger
language plpgsql
as $$
begin
  if new.paid = true and (tg_op = 'INSERT' or old.paid is distinct from true) then
    new.paid_at = coalesce(new.paid_at, current_date);
  elsif new.paid = false then
    new.paid_at = null;
  end if;
  return new;
end;
$$;

create trigger set_expenses_paid_at_on_update
  before update on expenses
  for each row execute procedure public.expenses_set_paid_at();

create trigger set_expenses_paid_at_on_insert
  before insert on expenses
  for each row execute procedure public.expenses_set_paid_at();
