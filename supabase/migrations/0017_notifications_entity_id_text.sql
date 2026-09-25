-- ============================================================================
-- MIGRATION 0017 — ASSOUPLISSEMENT ENTITY_ID & STATUTS NOTIFICATIONS
-- ============================================================================

-- Permet à entity_id d'accueillir aussi bien des UUIDs que des identifiants textuels (résumés, alertes système)
alter table notifications alter column entity_id type text;

-- Supprime les anciennes contraintes restrictives de la migration 0006 pour supporter toutes les nouvelles alertes
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications drop constraint if exists notifications_entity_type_check;

notify pgrst, 'reload schema';
