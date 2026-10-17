-- ============================================================================
-- REMISE À ZÉRO CIBLÉE — ACTIVITÉS UNIQUEMENT (SANS TRUNCATE CASCADE)
-- ============================================================================
-- Ce script préserve strictement :
--  1. Les comptes et utilisateurs (auth.users)
--  2. Les profils utilisateurs (public.profiles)
--  3. Les tâches (public.tasks) — activity_id passe à NULL
--  4. Les finances (public.income, public.expenses, public.scheduled_expenses) — activity_id passe à NULL
--  5. Les budgets et objectifs d'épargne (public.finance_budgets, public.savings_goals)
-- ============================================================================

-- 1. Suppression des notifications liées aux activités
DELETE FROM public.notifications WHERE entity_type = 'activity';

-- 2. Détachement sécurisé des tâches (conservation intégrale des données de tâches)
UPDATE public.tasks SET activity_id = NULL WHERE activity_id IS NOT NULL;

-- 3. Détachement sécurisé des finances (conservation intégrale des revenus et dépenses)
UPDATE public.income SET activity_id = NULL WHERE activity_id IS NOT NULL;
UPDATE public.expenses SET activity_id = NULL WHERE activity_id IS NOT NULL;
UPDATE public.scheduled_expenses SET activity_id = NULL WHERE activity_id IS NOT NULL;

-- 4. Nettoyage des événements d'agenda rattachés aux activités
DELETE FROM public.calendar_events WHERE activity_id IS NOT NULL;

-- 5. Suppression des tables satellites d'activités
DELETE FROM public.activity_compensation;
DELETE FROM public.activity_schedules;

-- 6. Suppression ciblée des activités
DELETE FROM public.activities;
