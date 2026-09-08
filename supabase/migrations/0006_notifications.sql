-- ============================================================================
-- PHASE 6 — NOTIFICATIONS (in-app uniquement, décision produit : pas de
-- service d'email/push pour le MVP)
--
-- Comme calendar_events et income, les notifications sont générées
-- paresseusement (lib/notifications/sync.ts) à chaque consultation plutôt
-- que par un job de fond : on ne stocke jamais un état qui deviendrait faux
-- tout seul (une tâche redevient "à jour" si son échéance est repoussée),
-- on se contente de matérialiser les notifications dues au moment de la
-- consultation. L'index unique (user_id, kind, entity_id) est le garde-fou
-- qui empêche de regénérer deux fois la même notification pour la même
-- tâche/le même revenu à chaque resynchronisation — même principe que
-- uq_calendar_events_schedule_occurrence et uq_income_compensation_due_date.
-- ============================================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  kind text not null check (kind in ('task_reminder', 'task_overdue', 'finance_overdue')),
  entity_type text not null check (entity_type in ('task', 'income', 'expense')),
  entity_id uuid not null,

  title text not null,
  body text not null default '',
  link text not null,

  read_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications (user_id);
create index if not exists idx_notifications_user_unread on notifications (user_id, read_at);

-- Une seule notification d'un type donné par entité : si l'utilisateur la
-- supprime/lit puis que la tâche redevient en retard plus tard, on ne
-- regénère pas de doublon tant que l'ancienne ligne existe (même logique
-- que les revenus générés automatiquement : idempotence par contrainte
-- d'unicité plutôt que par vérification applicative fragile).
create unique index if not exists uq_notifications_kind_entity
  on notifications (user_id, kind, entity_id);

alter table notifications enable row level security;

create policy "select_own_notifications" on notifications for select using (auth.uid() = user_id);
create policy "insert_own_notifications" on notifications for insert with check (auth.uid() = user_id);
create policy "update_own_notifications" on notifications for update using (auth.uid() = user_id);
create policy "delete_own_notifications" on notifications for delete using (auth.uid() = user_id);
