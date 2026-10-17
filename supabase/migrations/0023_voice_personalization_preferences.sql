-- ============================================================================
-- MIGRATION 0023 — PERSONNALISATION & CONFIDENTIALITÉ DES NOTIFICATIONS VOCALES
-- ============================================================================

-- 1. Ajout des colonnes de catégories, confidentialité et personnalisation vocale
alter table public.notification_preferences
add column if not exists voice_category_activities boolean default true,
add column if not exists voice_category_tasks boolean default true,
add column if not exists voice_category_finances boolean default true,
add column if not exists voice_category_briefings boolean default true,
add column if not exists voice_hide_financial_amounts boolean default false,
add column if not exists voice_include_user_name boolean default true,
add column if not exists custom_voice_reminder_text text default '',
add column if not exists voice_playback_rate numeric default 1.0;

-- 2. Commentaires de documentation
comment on column public.notification_preferences.voice_category_activities is 'Autorise ou bloque la prononciation vocale des séances et activités';
comment on column public.notification_preferences.voice_category_tasks is 'Autorise ou bloque la prononciation vocale des tâches et échéances';
comment on column public.notification_preferences.voice_category_finances is 'Autorise ou bloque la prononciation vocale des événements financiers et paiements';
comment on column public.notification_preferences.voice_category_briefings is 'Autorise ou bloque la prononciation vocale des résumés et briefings quotidiens';
comment on column public.notification_preferences.voice_hide_financial_amounts is 'Masque les montants financiers dans la voix de synthèse pour préserver la confidentialité en public';
comment on column public.notification_preferences.voice_include_user_name is 'Inclut ou omet le prénom de l''utilisateur dans les salutations vocales';
comment on column public.notification_preferences.custom_voice_reminder_text is 'Texte ou note vocale personnalisée écrite par l''utilisateur';
comment on column public.notification_preferences.voice_playback_rate is 'Vitesse de diction vocale (0.7 à 1.5)';

-- 3. Rechargement du schéma PostgREST
notify pgrst, 'reload schema';
