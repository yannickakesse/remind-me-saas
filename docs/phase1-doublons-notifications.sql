-- Remind Me — Préparation de la migration 0025 (à exécuter SEULEMENT si 0025 signale des doublons)
-- Ne supprime rien : les notifications en double gardent leur contenu ; seule leur clé
-- anti-doublon reçoit le suffixe « :dup:<id> », ce qui permet de rendre la clé unique.

-- 1. Voir les doublons
select user_id, idempotency_key, count(*) as nb
  from public.notifications
 where idempotency_key is not null
 group by user_id, idempotency_key
having count(*) > 1
 order by nb desc;

-- 2. Marquer les doublons (on garde la plus ancienne avec sa clé d'origine)
update public.notifications n
   set idempotency_key = n.idempotency_key || ':dup:' || n.id
  from (
    select id,
           row_number() over (partition by user_id, idempotency_key order by created_at, id) as rn
      from public.notifications
     where idempotency_key is not null
  ) x
 where n.id = x.id
   and x.rn > 1;
