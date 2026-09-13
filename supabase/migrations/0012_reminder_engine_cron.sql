-- ============================================================================
-- MIGRATION 0012 — AUTOMATIC REMINDER ENGINE, CRON SCHEDULER & WEB PUSH
-- ============================================================================

-- 1. Table des souscriptions Web Push pour les notifications sur navigateur & mobile
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

create policy "select_own_push_subs" on push_subscriptions for select using (auth.uid() = user_id);
create policy "insert_own_push_subs" on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "update_own_push_subs" on push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_push_subs" on push_subscriptions for delete using (auth.uid() = user_id);

-- 2. Index composites pour l'optimisation maximale du Reminder Engine
create index if not exists idx_income_pending_reminders on income (user_id, received, due_date) where received = false;
create index if not exists idx_expenses_pending_reminders on expenses (user_id, paid, due_date) where paid = false;
create index if not exists idx_tasks_pending_reminders on tasks (user_id, status, due_date) where status in ('todo', 'in_progress');
create index if not exists idx_cal_events_upcoming on calendar_events (user_id, status, starts_at) where status != 'cancelled';
create index if not exists idx_sched_exp_due on scheduled_expenses (user_id, status, next_due_date) where status in ('planned', 'due');

-- 3. Configuration pg_cron & pg_net pour le Scheduler Supabase (optionnel en local / automatique sur Supabase Cloud)
-- Note: pg_cron est activable directement dans l'interface Supabase Dashboard > Database > Extensions
-- Exemple de planification cron (toutes les minutes) :
-- select cron.schedule(
--   'evaluate-reminders-every-minute',
--   '* * * * *',
--   $$
--   select net.http_post(
--     url := coalesce(current_setting('app.settings.service_url', true), 'http://localhost:3000') || '/api/cron/reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
