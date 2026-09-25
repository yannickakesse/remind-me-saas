-- ============================================================================
-- MASTER MIGRATION CONSOLIDÉE (0008 À 0016)
-- À exécuter dans : Supabase Dashboard > SQL Editor > New Query > RUN
-- ============================================================================

-- 1. EXTENSIONS FINANCES (Expenses & Income)
alter table expenses
  add column if not exists expense_type text not null default 'personal'
    check (expense_type in ('personal', 'business', 'mixed')),
  add column if not exists business_percentage int not null default 100
    check (business_percentage >= 0 and business_percentage <= 100),
  add column if not exists merchant text,
  add column if not exists payment_method text;

alter table income
  add column if not exists income_type text not null default 'contract'
    check (income_type in ('salary', 'contract', 'freelance', 'sales', 'coaching', 'dividend', 'other')),
  add column if not exists payment_method text,
  add column if not exists reference text;

-- 2. TABLE DES BUDGETS MENSUELS
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  monthly_limit numeric(12, 2) not null check (monthly_limit > 0),
  currency text not null references currencies (code) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_budget_category unique (user_id, category, currency)
);

create index if not exists idx_budgets_user on budgets (user_id);
alter table budgets enable row level security;

drop policy if exists "select_own_budgets" on budgets;
create policy "select_own_budgets" on budgets for select using (auth.uid() = user_id);

drop policy if exists "insert_own_budgets" on budgets;
create policy "insert_own_budgets" on budgets for insert with check (auth.uid() = user_id);

drop policy if exists "update_own_budgets" on budgets;
create policy "update_own_budgets" on budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_budgets" on budgets;
create policy "delete_own_budgets" on budgets for delete using (auth.uid() = user_id);

drop trigger if exists set_budgets_updated_at on budgets;
create trigger set_budgets_updated_at
  before update on budgets
  for each row execute procedure public.set_updated_at();

-- 3. TABLE DES OBJECTIFS D'ÉPARGNE & POCHES
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'other' check (category in (
    'emergency_fund', 'vacation', 'car', 'business', 'real_estate', 'education', 'equipment', 'other'
  )),
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  currency text not null references currencies (code) on delete restrict,
  deadline date,
  monthly_contribution numeric(12, 2) check (monthly_contribution is null or monthly_contribution >= 0),
  color text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_savings_goals_user on savings_goals (user_id);
alter table savings_goals enable row level security;

drop policy if exists "select_own_savings_goals" on savings_goals;
create policy "select_own_savings_goals" on savings_goals for select using (auth.uid() = user_id);

drop policy if exists "insert_own_savings_goals" on savings_goals;
create policy "insert_own_savings_goals" on savings_goals for insert with check (auth.uid() = user_id);

drop policy if exists "update_own_savings_goals" on savings_goals;
create policy "update_own_savings_goals" on savings_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_savings_goals" on savings_goals;
create policy "delete_own_savings_goals" on savings_goals for delete using (auth.uid() = user_id);

drop trigger if exists set_savings_goals_updated_at on savings_goals;
create trigger set_savings_goals_updated_at
  before update on savings_goals
  for each row execute procedure public.set_updated_at();

-- 4. TABLE DES DÉPENSES PROGRAMMÉES (Scheduled Expenses)
create table if not exists scheduled_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id uuid references activities (id) on delete set null,
  name text not null,
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null references currencies (code) on delete restrict,
  frequency text not null default 'monthly' check (
    frequency in ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')
  ),
  start_date date not null,
  end_date date,
  next_due_date date not null,
  status text not null default 'planned' check (
    status in ('planned', 'due', 'paid', 'cancelled')
  ),
  merchant text,
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scheduled_expenses_user on scheduled_expenses (user_id);
create index if not exists idx_scheduled_expenses_due on scheduled_expenses (user_id, next_due_date);
create index if not exists idx_scheduled_expenses_status on scheduled_expenses (user_id, status);
alter table scheduled_expenses enable row level security;

drop policy if exists "select_own_scheduled_expenses" on scheduled_expenses;
create policy "select_own_scheduled_expenses" on scheduled_expenses for select using (auth.uid() = user_id);

drop policy if exists "insert_own_scheduled_expenses" on scheduled_expenses;
create policy "insert_own_scheduled_expenses" on scheduled_expenses for insert with check (auth.uid() = user_id);

drop policy if exists "update_own_scheduled_expenses" on scheduled_expenses;
create policy "update_own_scheduled_expenses" on scheduled_expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_scheduled_expenses" on scheduled_expenses;
create policy "delete_own_scheduled_expenses" on scheduled_expenses for delete using (auth.uid() = user_id);

drop trigger if exists set_scheduled_expenses_updated_at on scheduled_expenses;
create trigger set_scheduled_expenses_updated_at
  before update on scheduled_expenses
  for each row execute procedure public.set_updated_at();

-- 5. NOTIFICATIONS EXTENDUES, PRÉFÉRENCES & LOGS
alter table notifications alter column entity_id type text;
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications drop constraint if exists notifications_entity_type_check;

alter table notifications
  add column if not exists category text not null default 'general',
  add column if not exists priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  add column if not exists status text not null default 'unread' check (status in ('unread', 'read', 'dismissed', 'actioned', 'snoozed')),
  add column if not exists title_key text,
  add column if not exists body_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists scheduled_at timestamptz default now(),
  add column if not exists actioned_at timestamptz,
  add column if not exists snoozed_until timestamptz,
  add column if not exists idempotency_key text;

create index if not exists idx_notifications_user_status on notifications (user_id, status);
create index if not exists idx_notifications_user_category on notifications (user_id, category);
create index if not exists idx_notifications_user_priority on notifications (user_id, priority);
create index if not exists idx_notifications_idempotency on notifications (user_id, idempotency_key);

create table if not exists notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_enabled boolean not null default true,
  activity_reminders boolean not null default true,
  activity_timings jsonb not null default '["1d", "30m"]'::jsonb,
  payment_reminders boolean not null default true,
  payment_timings jsonb not null default '["7d", "3d", "1d", "0d", "-1d", "-3d", "-7d"]'::jsonb,
  expense_reminders boolean not null default true,
  task_reminders boolean not null default true,
  daily_summary_enabled boolean not null default true,
  daily_summary_time text not null default '08:00',
  weekly_summary_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '07:00',
  locale text not null default 'fr' check (locale in ('en', 'fr', 'es', 'de', 'pt')),
  updated_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

drop policy if exists "select_own_notif_prefs" on notification_preferences;
create policy "select_own_notif_prefs" on notification_preferences for select using (auth.uid() = user_id);

drop policy if exists "insert_own_notif_prefs" on notification_preferences;
create policy "insert_own_notif_prefs" on notification_preferences for insert with check (auth.uid() = user_id);

drop policy if exists "update_own_notif_prefs" on notification_preferences;
create policy "update_own_notif_prefs" on notification_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_notif_prefs" on notification_preferences;
create policy "delete_own_notif_prefs" on notification_preferences for delete using (auth.uid() = user_id);

create table if not exists notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_id uuid references notifications (id) on delete set null,
  channel text not null check (channel in ('in_app', 'email', 'push')),
  recipient text,
  template text not null,
  locale text not null default 'fr',
  delivery_status text not null check (delivery_status in ('queued', 'sent', 'delivered', 'failed', 'simulated_dev')),
  idempotency_key text unique,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notif_logs_user on notification_logs (user_id);
create index if not exists idx_notif_logs_idempotency on notification_logs (idempotency_key);
alter table notification_logs enable row level security;

drop policy if exists "select_own_notif_logs" on notification_logs;
create policy "select_own_notif_logs" on notification_logs for select using (auth.uid() = user_id);

drop policy if exists "insert_own_notif_logs" on notification_logs;
create policy "insert_own_notif_logs" on notification_logs for insert with check (auth.uid() = user_id);

-- 6. TABLE PUSH SUBSCRIPTIONS & INDEXES
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_push_endpoint unique (user_id, endpoint)
);

create index if not exists idx_push_subs_user on push_subscriptions (user_id);
alter table push_subscriptions enable row level security;

drop policy if exists "select_own_push_subs" on push_subscriptions;
create policy "select_own_push_subs" on push_subscriptions for select using (auth.uid() = user_id);

drop policy if exists "insert_own_push_subs" on push_subscriptions;
create policy "insert_own_push_subs" on push_subscriptions for insert with check (auth.uid() = user_id);

drop policy if exists "update_own_push_subs" on push_subscriptions;
create policy "update_own_push_subs" on push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_push_subs" on push_subscriptions;
create policy "delete_own_push_subs" on push_subscriptions for delete using (auth.uid() = user_id);

-- 7. STATUTS ACTIVITÉS (active, suspended, archived, expired) & POLITIQUES
alter table public.activities drop constraint if exists activities_status_check;
alter table public.activities add constraint activities_status_check 
  check (status in ('active', 'suspended', 'archived', 'expired'));

create index if not exists idx_activities_user_dates 
  on public.activities (user_id, status, end_date);

drop policy if exists "delete_own_activities" on activities;
create policy "delete_own_activities" on activities
  for delete using (auth.uid() = user_id);

-- 8. EXTENSION TABLE SUBSCRIPTIONS
alter table public.subscriptions 
  add column if not exists updated_at timestamptz default now(),
  add column if not exists current_period_start timestamptz default now(),
  add column if not exists provider text default 'manual',
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists cancel_at_period_end boolean default false;

drop policy if exists "select_own_subscription" on public.subscriptions;
create policy "select_own_subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "insert_own_subscription" on public.subscriptions;
create policy "insert_own_subscription" on public.subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "update_own_subscription" on public.subscriptions;
create policy "update_own_subscription" on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 9. NOTIFIER SUPABASE DE RECHARGER LE CACHE DU SCHÉMA
notify pgrst, 'reload schema';
