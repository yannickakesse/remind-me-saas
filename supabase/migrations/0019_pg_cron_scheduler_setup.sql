-- ============================================================================
-- MIGRATION 0019 — SUPABASE PG_CRON & PG_NET 5-MINUTE SCHEDULER SETUP
-- ============================================================================
-- Ce script configure et active le déclenchement automatique 24h/24
-- du Reminder Engine toutes les 5 minutes directement depuis Supabase.

-- 1. Activer les extensions requises (disponibles nativement sur Supabase)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Fonction SQL de déclenchement du webhook Reminder Engine
create or replace function trigger_remindme_cron()
returns void
language plpgsql
security definer
as $$
declare
  app_url text := coalesce(current_setting('app.settings.service_url', true), 'https://remindme.io');
  cron_key text := coalesce(current_setting('app.settings.cron_secret', true), '');
  request_id bigint;
begin
  -- Envoi d'une requête HTTP POST sécurisée vers le endpoint de rappels
  select net.http_post(
    url := app_url || '/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_key
    ),
    body := jsonb_build_object('source', 'pg_cron', 'timestamp', now())
  ) into request_id;
end;
$$;

-- 3. Planification du job cron toutes les 5 minutes (si pg_cron est activé)
-- Note : Décommenter ci-dessous dans Supabase Dashboard > SQL Editor si pg_cron est utilisé :
-- select cron.unschedule('remindme-eval-reminders-5m'); -- Nettoyage préventif
-- select cron.schedule(
--   'remindme-eval-reminders-5m',
--   '*/5 * * * *',
--   $$select trigger_remindme_cron();$$
-- );
