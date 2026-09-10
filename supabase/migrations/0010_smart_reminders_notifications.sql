-- ============================================================================
-- MIGRATION 0010 — SMART REMINDERS, NOTIFICATION CENTER & EMAIL ENGINE
-- ============================================================================

-- 1. Extension de la table notifications
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

-- Index pour accélérer les requêtes d'attention et de filtres
create index if not exists idx_notifications_user_status on notifications (user_id, status);
create index if not exists idx_notifications_user_category on notifications (user_id, category);
create index if not exists idx_notifications_user_priority on notifications (user_id, priority);
create index if not exists idx_notifications_idempotency on notifications (user_id, idempotency_key);

-- 2. Table des préférences de notification de l'utilisateur
create table if not exists notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  
  -- Canaux
  email_enabled boolean not null default true,
  
  -- Catégories & Règles
  activity_reminders boolean not null default true,
  activity_timings jsonb not null default '["1d", "30m"]'::jsonb,
  
  payment_reminders boolean not null default true,
  payment_timings jsonb not null default '["7d", "3d", "1d", "0d", "-1d", "-3d", "-7d"]'::jsonb,
  
  expense_reminders boolean not null default true,
  task_reminders boolean not null default true,
  
  daily_summary_enabled boolean not null default true,
  daily_summary_time text not null default '08:00',
  
  weekly_summary_enabled boolean not null default true,
  
  -- Heures calmes (Quiet Hours)
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '07:00',
  
  -- Langue
  locale text not null default 'en' check (locale in ('en', 'fr', 'es', 'de', 'pt')),
  
  updated_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

create policy "select_own_notif_prefs" on notification_preferences for select using (auth.uid() = user_id);
create policy "insert_own_notif_prefs" on notification_preferences for insert with check (auth.uid() = user_id);
create policy "update_own_notif_prefs" on notification_preferences for update using (auth.uid() = user_id);
create policy "delete_own_notif_prefs" on notification_preferences for delete using (auth.uid() = user_id);

-- 3. Table des logs d'envoi & auditabilité (E-mails & In-App)
create table if not exists notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_id uuid references notifications (id) on delete set null,
  
  channel text not null check (channel in ('in_app', 'email', 'push')),
  recipient text,
  template text not null,
  locale text not null default 'en',
  delivery_status text not null check (delivery_status in ('queued', 'sent', 'delivered', 'failed', 'simulated_dev')),
  
  idempotency_key text unique,
  error_message text,
  
  created_at timestamptz not null default now()
);

create index if not exists idx_notif_logs_user on notification_logs (user_id);
create index if not exists idx_notif_logs_idempotency on notification_logs (idempotency_key);

alter table notification_logs enable row level security;

create policy "select_own_notif_logs" on notification_logs for select using (auth.uid() = user_id);
create policy "insert_own_notif_logs" on notification_logs for insert with check (auth.uid() = user_id);
