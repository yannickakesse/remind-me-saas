-- ============================================================================
-- MIGRATION 0021 — MESSAGERIE INTERNE, PARAMÈTRES DE RAPPELS ET BILAN DU SOIR
-- ============================================================================

-- 1. Table de messagerie interne privée (Boîte de réception Remind Me)
create table if not exists public.internal_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sender text not null default 'Remind Me',
  subject text not null,
  body text not null,
  category text not null default 'general' check (category in ('activity', 'financial', 'summary', 'system', 'general')),
  is_read boolean not null default false,
  read_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour requêtes performantes de la boîte de réception
create index if not exists idx_internal_messages_user_read 
  on public.internal_messages (user_id, is_read);

create index if not exists idx_internal_messages_user_created 
  on public.internal_messages (user_id, created_at desc);

-- Sécurité RLS stricte : isolation hermétique des messages par utilisateur
alter table public.internal_messages enable row level security;

drop policy if exists "select_own_internal_messages" on public.internal_messages;
create policy "select_own_internal_messages" 
  on public.internal_messages for select 
  using (auth.uid() = user_id);

drop policy if exists "insert_own_internal_messages" on public.internal_messages;
create policy "insert_own_internal_messages" 
  on public.internal_messages for insert 
  with check (auth.uid() = user_id);

drop policy if exists "update_own_internal_messages" on public.internal_messages;
create policy "update_own_internal_messages" 
  on public.internal_messages for update 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

drop policy if exists "delete_own_internal_messages" on public.internal_messages;
create policy "delete_own_internal_messages" 
  on public.internal_messages for delete 
  using (auth.uid() = user_id);

-- 2. Ajout des colonnes de délais personnalisés et heure de bilan dans notification_preferences
alter table public.notification_preferences
  add column if not exists first_reminder_minutes integer default 60,
  add column if not exists second_reminder_minutes integer default 10,
  add column if not exists daily_summary_time text default '20:00';

-- 3. Table de suivi des bilans quotidiens validés (clôture globale de la journée)
create table if not exists public.daily_summary_validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  summary_date date not null,
  validated_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_user_daily_summary unique (user_id, summary_date)
);

alter table public.daily_summary_validations enable row level security;

drop policy if exists "select_own_daily_validations" on public.daily_summary_validations;
create policy "select_own_daily_validations" 
  on public.daily_summary_validations for select 
  using (auth.uid() = user_id);

drop policy if exists "insert_own_daily_validations" on public.daily_summary_validations;
create policy "insert_own_daily_validations" 
  on public.daily_summary_validations for insert 
  with check (auth.uid() = user_id);

-- 4. Rechargement du schéma PostgREST
notify pgrst, 'reload schema';
