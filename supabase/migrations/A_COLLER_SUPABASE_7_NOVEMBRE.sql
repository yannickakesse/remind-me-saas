-- ============================================================================
-- REMIND ME — SQL À COLLER DANS SUPABASE (SQL Editor → New query → Run)
-- Préparé le 7 novembre 2026, d'après l'état réel de la production (vérifié en lecture seule).
--
-- CE FICHIER :
--   • ne supprime AUCUNE donnée (aucun DELETE, DROP TABLE ni TRUNCATE) ;
--   • peut être relancé sans risque (chaque instruction vérifie ce qui existe déjà) ;
--   • s'exécute en un seul bloc : si une instruction échoue, RIEN n'est appliqué.
--
-- PARTIE 1 — MANQUANT EN PRODUCTION (vérifié) :
--   0018  Rappels vocaux : colonnes voix des préférences et des activités
--   0021  Inbox (messages internes), heures des rappels, bilans quotidiens
--
-- PARTIE 2 — À RÉ-APPLIQUER PAR SÉCURITÉ (invérifiables de l'extérieur, sans effet si déjà en place) :
--   0011  Sécurité : chacun ne peut modifier que ses propres données
--   0013  Suppression de ses propres activités
--   0016  Statuts d'activité (active, suspendue, archivée, expirée) — remplace 0014
--   0024  Abonnements : modifiables uniquement par le serveur (paiement)
--   0028  Retrait d'un ancien index qui bloquait des rappels répétés légitimes
--   0029  Revenus exceptionnels (bonus, gain imprévu, cadeau, remboursement, autre)
--
-- DÉJÀ EN PLACE, NE PAS RELANCER : 0001 à 0010, 0012, 0015, 0017, 0020, 0022, 0023, 0025, 0026, 0027.
-- NE JAMAIS EXÉCUTER : 0014 (remplacée par 0016), 0019 (remplacée par 0025),
--                      reset_activities_targeted.sql (supprime des données).
-- ============================================================================

begin;

-- ############################################################################
-- PARTIE 1 — 0018 et 0021 (manquantes)
-- ############################################################################
-- Remind Me : 2 anciennes migrations absentes de la base (vérifié le 2026-11-05).
-- Uniquement des ajouts (colonnes / tables / règles RLS). Aucune donnée supprimée. Peut être rejoué sans risque.
-- Supabase → SQL Editor → New query → coller tout → Run.


-- ############################ 0018_voice_reminders_system ############################

-- ============================================================================
-- MIGRATION 0018 — SYSTÈME DE RAPPELS VOCAUX INTELLIGENTS (TEXT-TO-SPEECH)
-- ============================================================================

-- 1. Ajout des préférences vocales dans notification_preferences
alter table notification_preferences
add column if not exists voice_reminders boolean default true,
add column if not exists voice_type text default 'system',
add column if not exists voice_language text default 'fr',
add column if not exists repeat_voice integer default 0;

-- 2. Ajout de l'option de rappel vocal par activité
alter table activities
add column if not exists voice_reminder_enabled boolean default true;

-- 3. Rechargement du schéma PostgREST


-- ############################ 0021_internal_messages_and_settings ############################

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

-- ############################################################################
-- PARTIE 2 — 0011_security_rls_hardening.sql
-- ############################################################################
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
set file_size_limit = 2097152, -- 2 Mo (colonne Supabase : file_size_limit)
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'avatars';

-- ############################################################################
-- PARTIE 2 — 0013_allow_delete_activities.sql
-- ############################################################################
-- ============================================================================
-- MIGRATION 0013 — AUTORISATION DE SUPPRESSION DES ACTIVITÉS (RLS)
-- ============================================================================

-- Permet aux utilisateurs de supprimer définitivement leurs propres activités.
drop policy if exists "delete_own_activities" on activities;
create policy "delete_own_activities" on activities
  for delete
  using (auth.uid() = user_id);

-- ############################################################################
-- PARTIE 2 — 0016_activities_lifecycle_and_reminders.sql
-- ############################################################################
-- ============================================================================
-- MIGRATION 0016 — DURÉE DE VIE DES ACTIVITÉS, EXPIRATION & ENGIN DE RAPPELS
-- ============================================================================

-- 1. Ajout du statut 'expired' aux statuts valides pour les activités
alter table public.activities drop constraint if exists activities_status_check;
alter table public.activities add constraint activities_status_check 
  check (status in ('active', 'suspended', 'archived', 'expired'));

-- 2. Index d'optimisation pour la détection rapide des activités expirées
create index if not exists idx_activities_user_dates 
  on public.activities (user_id, status, end_date);

-- 3. Sécurité RLS inchangée et préservée pour toutes les tables

-- ############################################################################
-- PARTIE 2 — 0024_subscriptions_server_only_writes.sql
-- ############################################################################
-- ============================================================================
-- MIGRATION 0024 — ABONNEMENTS : ÉCRITURE RÉSERVÉE AU SERVEUR
-- ============================================================================
-- Avant : chaque utilisateur pouvait créer / modifier sa propre ligne dans
-- public.subscriptions (politiques insert_own / update_own), donc s'attribuer
-- un forfait payant sans payer depuis le navigateur.
-- Après : lecture seule pour l'utilisateur ; seules les routes serveur
-- (webhook Bictorys, résiliation) écrivent via la clé service_role, qui
-- contourne la RLS.
-- Sans effet sur les données existantes. Peut être relancée sans risque.

drop policy if exists "insert_own_subscription" on public.subscriptions;
drop policy if exists "update_own_subscription" on public.subscriptions;
drop policy if exists "delete_own_subscription" on public.subscriptions;

-- La lecture de sa propre ligne reste autorisée
drop policy if exists "select_own_subscription" on public.subscriptions;
create policy "select_own_subscription" on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- ############################################################################
-- PARTIE 2 — 0028_drop_legacy_notification_unique_index.sql
-- ############################################################################
-- ============================================================================
-- 0028 — Retrait de l'ancien index unique (user_id, kind, entity_id) des notifications
-- ============================================================================
-- Hérité de la migration 0006. Il empêche des rappels légitimes et répétés pour un même
-- élément : tâche en retard chaque jour, rappel quotidien d'un objectif, inactivité chaque
-- semaine, paiement attendu à J-7 puis J-3… (même type + même élément = refusé).
-- Les doublons sont désormais empêchés par la clé unique (user_id, idempotency_key) créée
-- en 0025, qui distingue chaque rappel (par jour, par palier…).
--
-- Aucune donnée n'est supprimée (seul un index est retiré). À exécuter APRÈS 0025 :
-- la migration refuse de s'exécuter si la nouvelle clé unique n'existe pas encore.
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and tablename = 'notifications' and indexname = 'uq_notifications_user_idempotency'
  ) then
    raise exception 'REMIND ME 0028 : appliquer d''abord la migration 0025 (clé anti-doublon unique).';
  end if;
end;
$$;

drop index if exists public.uq_notifications_kind_entity;

-- ############################################################################
-- PARTIE 2 — 0029_exceptional_income_categories.sql
-- ############################################################################
-- ============================================================================
-- 0029 — Revenus exceptionnels : 5 nouvelles catégories de revenu
-- ============================================================================
-- Seule modification : la liste des valeurs autorisées de income.income_type.
--   bonus             : prime, récompense, gratification
--   windfall          : gain imprévu (argent retrouvé, entrée inattendue)
--   gift              : cadeau reçu (somme offerte)
--   refund            : remboursement reçu (argent récupéré — distingué des gains dans les rapports)
--   exceptional_other : autre revenu exceptionnel
--
-- Aucune table, aucune colonne, aucune donnée, aucune règle d'accès (RLS) n'est modifiée.
-- Les revenus existants gardent leur type actuel. La migration peut être rejouée sans risque.
-- ============================================================================

do $$
declare
  c record;
begin
  -- Retire l'ancienne contrainte de liste (nom généré automatiquement en 0008)
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'income'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%income_type%'
  loop
    execute format('alter table public.income drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.income
  add constraint income_income_type_check
  check (income_type in (
    'salary', 'contract', 'freelance', 'sales', 'coaching', 'dividend', 'other',
    'bonus', 'windfall', 'gift', 'refund', 'exceptional_other'
  ));

commit;

-- Rechargement du schéma de l'API (pour que l'application voie tout de suite les nouveautés)
notify pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION (facultatif) : chaque colonne doit afficher « true »
-- ============================================================================
select
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notification_preferences' and column_name = 'voice_reminders') as "0018 voix",
  exists (select 1 from information_schema.tables  where table_schema = 'public' and table_name = 'internal_messages') as "0021 inbox",
  exists (select 1 from information_schema.tables  where table_schema = 'public' and table_name = 'daily_summary_validations') as "0021 bilans",
  not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'uq_notifications_kind_entity') as "0028 index",
  exists (select 1 from pg_constraint where conname = 'income_income_type_check' and pg_get_constraintdef(oid) ilike '%exceptional_other%') as "0029 revenus";
