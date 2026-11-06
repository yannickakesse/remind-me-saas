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
