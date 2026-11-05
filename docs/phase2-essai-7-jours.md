# Phase 2 — Essai gratuit de 7 jours (à faire dans Supabase)

À faire **par toi**, dans Supabase → SQL Editor. Rien n'a été exécuté automatiquement.
Le code fonctionne avant et après la migration : sans elle, personne n'a d'essai (comportement actuel).

## Comment fonctionne l'essai
- **Démarrage** : à la première vraie utilisation après l'onboarding (première activité, tâche, revenu, dépense, dépense programmée, budget, objectif d'épargne, contact ou organisation). Un compte créé mais jamais utilisé ne consomme pas son essai.
- **Pendant 7 jours** : droits Pro (quotas Pro, rentabilité horaire…). Aucune fonction Premium payante (voix ElevenLabs, IA) : zéro coût externe.
- **Dates** : uniquement celles du serveur (`now()`), changer l'heure du téléphone n'a aucun effet.
- **Fin** : retour automatique en Free, sans traitement planifié. Toutes les données sont conservées ; au-delà des quotas Free, l'utilisateur consulte tout mais ne peut plus créer de nouvel élément de ce type tant qu'il n'est pas repassé sous la limite.
- **S'abonner pendant l'essai** : le paiement Bictorys active le forfait payé, qui remplace l'essai immédiatement.
- **Un seul essai par compte.** Option anti-abus : empreinte chiffrée de l'email (HMAC, irréversible, aucun email stocké en clair), conservée après suppression du compte.

## Étape 1 (recommandée) — Secret de l'empreinte anti-abus
Remplace la valeur par une longue chaîne aléatoire (au moins 32 caractères) et **ne la change plus ensuite** :

```sql
select vault.create_secret('UNE_LONGUE_VALEUR_ALEATOIRE', 'remindme_trial_pepper');
```

Sans ce secret : un essai par compte, mais quelqu'un pourrait supprimer son compte et en recréer un avec la même adresse.

## Étape 2 — Appliquer la migration
SQL Editor → coller `supabase/migrations/0026_free_trial_7_days.sql` → **Run**.

**Comptes existants** : chaque utilisateur gratuit qui n'a jamais eu d'essai le recevra à sa prochaine création (activité, dépense…). Si tu préfères ne pas offrir l'essai aux comptes déjà actifs, exécute ceci **juste après** la migration :

```sql
-- Facultatif : pas d'essai pour les comptes créés avant aujourd'hui
update public.subscriptions s
   set trial_used = true
  from auth.users u
 where u.id = s.user_id
   and u.created_at < now() - interval '1 day'
   and s.trial_started_at is null;
```

## Étape 3 — Vérifier
```sql
-- Essais en cours et terminés
select user_id, plan, trial_started_at, trial_ends_at, trial_used,
       case when trial_ends_at > now() then 'en cours' when trial_ends_at is not null then 'terminé' else '—' end as essai
  from public.subscriptions
 order by trial_started_at desc nulls last
 limit 20;
```

## Étape 4 — Test réel
1. Créer un nouveau compte (adresse jamais utilisée), terminer l'onboarding.
2. Paramètres → Abonnement : **aucun bandeau d'essai** (pas encore utilisé).
3. Créer une première activité.
4. Paramètres → Abonnement : bandeau **« Essai Pro gratuit : encore 7 jours »** avec la date de fin.
5. Créer une 4ᵉ activité : acceptée (quota Pro pendant l'essai).
6. Simuler la fin de l'essai dans Supabase :
   ```sql
   update public.subscriptions set trial_ends_at = now() - interval '1 minute' where user_id = 'ID_DU_COMPTE_TEST';
   ```
7. Recharger : plus de bandeau, les 4 activités restent visibles, la création d'une 5ᵉ activité est refusée avec le message de limite Free.
8. Supprimer le compte test puis le recréer avec la même adresse : **pas de second essai** (si le secret de l'étape 1 est configuré).
