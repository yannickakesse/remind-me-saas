-- =====================================================================
-- Remind Me : migrations à appliquer en une fois (0025 → 0029)
-- Supabase → SQL Editor → New query → coller tout → Run.
-- Aucune donnée existante n'est supprimée. Peut être rejoué sans risque.
--
-- AVANT : créer les 2 secrets Vault (une seule fois, voir l'en-tête de 0025),
-- sinon les rappels ne se déclenchent pas (simple avertissement, pas d'erreur).
-- =====================================================================



-- ############################ 0025_reminders_every_minute ############################

-- ============================================================================
-- 0025 — Rappels fiables : déclenchement chaque minute (pg_cron + pg_net + Vault)
-- ============================================================================
-- Migration ADDITIVE : aucune table supprimée, aucune donnée effacée.
--
-- AVANT d'exécuter ce fichier (Supabase → SQL Editor), créer les 2 secrets dans Vault
-- (voir docs/phase1-rappels-chaque-minute.md) :
--   select vault.create_secret('<CRON_SECRET identique à Vercel>', 'remindme_cron_secret');
--   select vault.create_secret('https://remind-me-saas-ybkc.vercel.app', 'remindme_app_url');
--
-- Ce que fait la migration :
--   1. Active pg_cron et pg_net.
--   2. Crée un verrou partagé (cron_locks) : deux exécutions ne se chevauchent jamais,
--      même si pg_cron, GitHub Actions et Vercel Cron appellent la route en même temps.
--   3. Crée un journal des exécutions (cron_runs) consultable dans Supabase.
--   4. Rend unique la clé anti-doublon des notifications (si aucun doublon n'existe déjà).
--   5. Ajoute un compteur de tentatives aux envois (notification_logs.attempts).
--   6. Planifie l'appel sécurisé de /api/cron/reminders chaque minute.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ----------------------------------------------------------------------------
-- 1. Verrou partagé (bail à durée limitée : libéré automatiquement en cas de plantage)
-- ----------------------------------------------------------------------------
create table if not exists public.cron_locks (
  name text primary key,
  holder text,
  locked_until timestamptz not null default 'epoch',
  cursor_user_id uuid,              -- reprise du parcours des utilisateurs à la minute suivante
  updated_at timestamptz not null default now()
);
alter table public.cron_locks enable row level security;
-- Aucune policy : seul le service (service_role) y accède.

create or replace function public.try_acquire_cron_lock(p_name text, p_holder text, p_ttl_seconds integer)
returns table (acquired boolean, cursor_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  insert into public.cron_locks (name) values (p_name) on conflict (name) do nothing;
  return query
    update public.cron_locks l
       set holder = p_holder,
           locked_until = now() + make_interval(secs => p_ttl_seconds),
           updated_at = now()
     where l.name = p_name
       and l.locked_until < now()
    returning true, l.cursor_user_id;
  if not found then
    return query select false, null::uuid;
  end if;
end;
$$;

create or replace function public.release_cron_lock(p_name text, p_holder text, p_cursor_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.cron_locks
     set locked_until = 'epoch',
         cursor_user_id = p_cursor_user_id,
         updated_at = now()
   where name = p_name and holder = p_holder;
$$;

revoke all on function public.try_acquire_cron_lock(text, text, integer) from public, anon, authenticated;
revoke all on function public.release_cron_lock(text, text, uuid) from public, anon, authenticated;
grant execute on function public.try_acquire_cron_lock(text, text, integer) to service_role;
grant execute on function public.release_cron_lock(text, text, uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 2. Journal des exécutions
-- ----------------------------------------------------------------------------
create table if not exists public.cron_runs (
  id bigint generated always as identity primary key,
  job text not null default 'reminders',
  source text,                         -- pg_cron | github | vercel | manuel
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'error', 'skipped_locked')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  users_total integer,
  users_processed integer,
  notifications_created integer,
  pushes_sent integer,
  pushes_failed integer,
  pushes_retried integer,
  emails_sent integer,
  error text
);
create index if not exists idx_cron_runs_started on public.cron_runs (started_at desc);
alter table public.cron_runs enable row level security;
-- Aucune policy : lecture dans le tableau de bord Supabase (ou service_role).

-- ----------------------------------------------------------------------------
-- 3. Clé anti-doublon UNIQUE sur les notifications
--    (si des doublons existent déjà, rien n'est supprimé : la migration s'arrête avec un message)
-- ----------------------------------------------------------------------------
do $$
declare
  dup_count integer;
begin
  select count(*) into dup_count from (
    select user_id, idempotency_key
      from public.notifications
     where idempotency_key is not null
     group by user_id, idempotency_key
    having count(*) > 1
  ) d;

  if dup_count > 0 then
    raise exception 'REMIND ME 0025 : % clé(s) de notification en double. Exécuter d''abord docs/phase1-doublons-notifications.sql (marque les doublons sans rien supprimer), puis relancer cette migration.', dup_count;
  end if;
end;
$$;

create unique index if not exists uq_notifications_user_idempotency
  on public.notifications (user_id, idempotency_key);

-- ----------------------------------------------------------------------------
-- 4. Tentatives d'envoi (relance des push échoués sans doublon)
-- ----------------------------------------------------------------------------
alter table public.notification_logs add column if not exists attempts integer not null default 1;
alter table public.notification_logs add column if not exists updated_at timestamptz;

-- ----------------------------------------------------------------------------
-- 5. Appel sécurisé de la route Vercel (secret lu dans Vault, jamais écrit dans le code)
-- ----------------------------------------------------------------------------
create or replace function public.remindme_trigger_reminders()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_secret text;
  v_url text;
  v_request_id bigint;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'remindme_cron_secret' limit 1;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'remindme_app_url' limit 1;

  if v_secret is null or v_url is null then
    raise warning 'Remind Me : secrets Vault remindme_cron_secret / remindme_app_url manquants, rappel non déclenché.';
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_url, '/') || '/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret,
      'X-Cron-Source', 'pg_cron'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.remindme_trigger_reminders() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Planification chaque minute (remplace un éventuel ancien job de 0019)
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'remindme-eval-reminders-5m') then
    perform cron.unschedule('remindme-eval-reminders-5m');
  end if;
  if exists (select 1 from cron.job where jobname = 'remindme-reminders-every-minute') then
    perform cron.unschedule('remindme-reminders-every-minute');
  end if;
end;
$$;

select cron.schedule(
  'remindme-reminders-every-minute',
  '* * * * *',
  $$select public.remindme_trigger_reminders();$$
);


-- ############################ 0026_free_trial_7_days ############################

-- ============================================================================
-- 0026 — Essai gratuit de 7 jours (droits Pro, sans carte, sans prélèvement)
-- ============================================================================
-- Migration ADDITIVE : aucune table supprimée, aucune donnée effacée, aucun forfait modifié.
--
-- Principe :
--   - L'essai démarre à la PREMIÈRE VRAIE UTILISATION : première activité, tâche, revenu,
--     dépense, dépense programmée, budget, objectif d'épargne, contact ou organisation créé
--     après l'onboarding. Créer un compte sans l'utiliser ne consomme pas l'essai.
--   - Les dates viennent uniquement du serveur (now()) : changer l'horloge du téléphone ne sert à rien.
--   - Le forfait enregistré reste « free » : les droits Pro pendant l'essai sont calculés par
--     l'application (lib/subscriptions). À la fin, retour automatique en Free, sans traitement
--     planifié et sans perte de données.
--   - Un seul essai par compte (trial_used). Anti-abus facultatif : empreinte HMAC de l'email
--     (irréversible, aucun email en clair), conservée si le compte est supprimé, pour empêcher
--     de recréer un compte avec la même adresse pour relancer un essai.
--
-- Facultatif (recommandé) AVANT d'exécuter : secret de l'empreinte dans Vault
--   select vault.create_secret('<longue valeur aléatoire>', 'remindme_trial_pepper');
-- Sans ce secret, l'essai reste limité à un par compte, sans contrôle par adresse email.
-- ============================================================================

-- 1. Colonnes d'essai
alter table public.subscriptions add column if not exists trial_started_at timestamptz;
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.subscriptions add column if not exists trial_used boolean not null default false;

-- 2. Empreintes d'adresses ayant déjà bénéficié d'un essai (aucune donnée personnelle en clair)
create table if not exists public.trial_fingerprints (
  email_hmac text primary key,
  created_at timestamptz not null default now()
);
alter table public.trial_fingerprints enable row level security;
-- Aucune policy : inaccessible aux utilisateurs.

-- 3. Démarrage de l'essai (appelé par les déclencheurs ci-dessous)
create or replace function public.remindme_start_trial_if_eligible(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_sub record;
  v_onboarded boolean;
  v_email text;
  v_pepper text;
  v_hmac text;
begin
  if p_user_id is null then
    return;
  end if;

  select plan, status, trial_used into v_sub
    from public.subscriptions where user_id = p_user_id for update;
  -- Uniquement les comptes gratuits qui n'ont jamais eu d'essai
  if not found or v_sub.trial_used or v_sub.plan <> 'free' then
    return;
  end if;

  select onboarding_completed into v_onboarded from public.profiles where id = p_user_id;
  if not coalesce(v_onboarded, false) then
    return;
  end if;

  -- Anti-abus par adresse email (si le secret est configuré)
  select decrypted_secret into v_pepper from vault.decrypted_secrets where name = 'remindme_trial_pepper' limit 1;
  if v_pepper is not null then
    select lower(trim(email)) into v_email from auth.users where id = p_user_id;
    if v_email is not null then
      v_hmac := encode(hmac(v_email, v_pepper, 'sha256'), 'hex');
      if exists (select 1 from public.trial_fingerprints where email_hmac = v_hmac) then
        -- Adresse déjà utilisée pour un essai : pas de nouvel essai
        update public.subscriptions set trial_used = true where user_id = p_user_id;
        return;
      end if;
      insert into public.trial_fingerprints (email_hmac) values (v_hmac) on conflict do nothing;
    end if;
  end if;

  update public.subscriptions
     set trial_started_at = now(),
         trial_ends_at = now() + interval '7 days',
         trial_used = true
   where user_id = p_user_id;
end;
$$;

revoke all on function public.remindme_start_trial_if_eligible(uuid) from public, anon, authenticated;

create or replace function public.remindme_trial_on_first_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ne jamais bloquer la création de la donnée si l'essai échoue
  begin
    perform public.remindme_start_trial_if_eligible(new.user_id);
  exception when others then
    raise warning 'Remind Me essai : % ', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.remindme_trial_on_first_use() from public, anon, authenticated;

-- 4. Déclencheurs « première vraie utilisation »
do $$
declare
  t text;
begin
  foreach t in array array['activities', 'tasks', 'income', 'expenses', 'scheduled_expenses', 'budgets', 'savings_goals', 'contacts', 'organizations']
  loop
    execute format('drop trigger if exists trg_remindme_trial_first_use on public.%I', t);
    execute format(
      'create trigger trg_remindme_trial_first_use after insert on public.%I for each row execute function public.remindme_trial_on_first_use()',
      t
    );
  end loop;
end;
$$;


-- ############################ 0027_my_goals_module ############################

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


-- ############################ 0028_drop_legacy_notification_unique_index ############################

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


-- ############################ 0029_exceptional_income_categories ############################

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
