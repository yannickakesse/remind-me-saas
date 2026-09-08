-- ============================================================================
-- PHASE 2 — ACTIVITÉS
-- Organisations, contacts, activités, horaires, rémunération.
-- user_id est dénormalisé sur chaque table enfant pour garder des politiques
-- RLS simples (auth.uid() = user_id) et performantes, comme décidé dans
-- l'architecture technique (§4).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Organisations & contacts
-- ----------------------------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references organizations (id) on delete set null,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organizations_user on organizations (user_id);
create index if not exists idx_contacts_user on contacts (user_id);
create index if not exists idx_contacts_organization on contacts (organization_id);

alter table organizations enable row level security;
alter table contacts enable row level security;

create policy "select_own_organizations" on organizations for select using (auth.uid() = user_id);
create policy "insert_own_organizations" on organizations for insert with check (auth.uid() = user_id);
create policy "update_own_organizations" on organizations for update using (auth.uid() = user_id);
create policy "delete_own_organizations" on organizations for delete using (auth.uid() = user_id);

create policy "select_own_contacts" on contacts for select using (auth.uid() = user_id);
create policy "insert_own_contacts" on contacts for insert with check (auth.uid() = user_id);
create policy "update_own_contacts" on contacts for update using (auth.uid() = user_id);
create policy "delete_own_contacts" on contacts for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Activités
-- ----------------------------------------------------------------------------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  name text not null,
  description text,
  category text,
  icon text,
  color text,

  type text not null check (type in (
    'salaried_job', 'freelance', 'contract', 'mission', 'own_business',
    'commerce', 'coaching', 'consulting', 'teaching', 'side_activity', 'other'
  )),

  status text not null default 'active' check (status in ('active', 'archived')),

  organization_id uuid references organizations (id) on delete set null,
  contact_id uuid references contacts (id) on delete set null,

  work_mode text check (work_mode in ('remote', 'onsite', 'hybrid')),
  location text,

  start_date date,
  end_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_activities_user on activities (user_id);
create index if not exists idx_activities_user_status on activities (user_id, status);

alter table activities enable row level security;

create policy "select_own_activities" on activities for select using (auth.uid() = user_id);
create policy "insert_own_activities" on activities for insert with check (auth.uid() = user_id);
create policy "update_own_activities" on activities for update using (auth.uid() = user_id);
-- Pas de policy delete : une activité est archivée (status = 'archived'),
-- jamais supprimée tant que des revenus/dépenses peuvent y être liés (§8 règle métier 6).

-- ----------------------------------------------------------------------------
-- Horaires (une activité peut avoir plusieurs créneaux)
-- ----------------------------------------------------------------------------
create table if not exists activity_schedules (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,

  weekday smallint not null check (weekday between 0 and 6), -- 0 = dimanche
  start_time time not null,
  end_time time not null,
  break_minutes int not null default 0,
  recurrence text not null default 'weekly' check (recurrence in ('weekly', 'biweekly', 'custom')),
  variable_hours boolean not null default false,

  created_at timestamptz not null default now(),

  constraint valid_time_range check (end_time > start_time)
);

create index if not exists idx_schedules_activity on activity_schedules (activity_id);
create index if not exists idx_schedules_user on activity_schedules (user_id);

alter table activity_schedules enable row level security;

create policy "select_own_schedules" on activity_schedules for select using (auth.uid() = user_id);
create policy "insert_own_schedules" on activity_schedules for insert with check (auth.uid() = user_id);
create policy "update_own_schedules" on activity_schedules for update using (auth.uid() = user_id);
create policy "delete_own_schedules" on activity_schedules for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Rémunération (1-1 avec l'activité)
-- ----------------------------------------------------------------------------
create table if not exists activity_compensation (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null unique references activities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,

  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null references currencies (code),
  frequency text not null check (frequency in (
    'hourly', 'daily', 'per_session', 'weekly', 'biweekly', 'monthly',
    'per_project', 'one_time'
  )),
  payment_day smallint check (payment_day between 1 and 31),
  payment_terms text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_compensation_user on activity_compensation (user_id);

alter table activity_compensation enable row level security;

create policy "select_own_compensation" on activity_compensation for select using (auth.uid() = user_id);
create policy "insert_own_compensation" on activity_compensation for insert with check (auth.uid() = user_id);
create policy "update_own_compensation" on activity_compensation for update using (auth.uid() = user_id);
create policy "delete_own_compensation" on activity_compensation for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- updated_at automatique
-- ----------------------------------------------------------------------------
create trigger set_organizations_updated_at
  before update on organizations
  for each row execute procedure public.set_updated_at();

create trigger set_contacts_updated_at
  before update on contacts
  for each row execute procedure public.set_updated_at();

create trigger set_activities_updated_at
  before update on activities
  for each row execute procedure public.set_updated_at();

create trigger set_activity_compensation_updated_at
  before update on activity_compensation
  for each row execute procedure public.set_updated_at();
