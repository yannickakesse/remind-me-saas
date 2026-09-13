-- ============================================================================
-- MIGRATION 0011 — DURCISSEMENT DE SÉCURITÉ (RLS WITH CHECK & STORAGE RULES)
-- ============================================================================

-- 1. Durcissement des politiques UPDATE pour empêcher le vol ou transfert de propriété
-- En PostgreSQL RLS, USING filtre les lignes existantes, tandis que WITH CHECK valide
-- l'intégrité de la nouvelle ligne modifiée.

-- Profiles
drop policy if exists "update_own_profile" on profiles;
create policy "update_own_profile" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- User Settings
drop policy if exists "update_own_settings" on user_settings;
create policy "update_own_settings" on user_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Organizations
drop policy if exists "update_own_organizations" on organizations;
create policy "update_own_organizations" on organizations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Contacts
drop policy if exists "update_own_contacts" on contacts;
create policy "update_own_contacts" on contacts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Activities
drop policy if exists "update_own_activities" on activities;
create policy "update_own_activities" on activities
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Activity Schedules
drop policy if exists "update_own_schedules" on activity_schedules;
create policy "update_own_schedules" on activity_schedules
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Activity Compensation
drop policy if exists "update_own_compensation" on activity_compensation;
create policy "update_own_compensation" on activity_compensation
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Calendar Events
drop policy if exists "update_own_calendar_events" on calendar_events;
create policy "update_own_calendar_events" on calendar_events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tasks
drop policy if exists "update_own_tasks" on tasks;
create policy "update_own_tasks" on tasks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Income
drop policy if exists "update_own_income" on income;
create policy "update_own_income" on income
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Expenses
drop policy if exists "update_own_expenses" on expenses;
create policy "update_own_expenses" on expenses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications
drop policy if exists "update_own_notifications" on notifications;
create policy "update_own_notifications" on notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Budgets
drop policy if exists "update_own_budgets" on budgets;
create policy "update_own_budgets" on budgets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Savings Goals
drop policy if exists "update_own_savings_goals" on savings_goals;
create policy "update_own_savings_goals" on savings_goals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Scheduled Expenses
drop policy if exists "update_own_scheduled_expenses" on scheduled_expenses;
create policy "update_own_scheduled_expenses" on scheduled_expenses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notification Preferences
drop policy if exists "update_own_notif_prefs" on notification_preferences;
create policy "update_own_notif_prefs" on notification_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Sécurisation du Bucket Supabase Storage "avatars"
-- Restreint les fichiers à 2 Mo max et uniquement aux types d'images autorisés (évite l'upload de HTML/SVG/exécutables).
update storage.buckets
set max_file_size = 2097152, -- 2 Mo
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'avatars';
