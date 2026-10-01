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
notify pgrst, 'reload schema';
