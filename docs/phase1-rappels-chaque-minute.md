# Phase 1 — Rappels déclenchés chaque minute (à faire dans Supabase)

Ces étapes se font **dans ton tableau de bord Supabase**, par toi. Aucune n'a été exécutée automatiquement.
Ordre conseillé : d'abord **déployer le code** (il fonctionne avec ou sans la migration), puis appliquer la migration.

## Les 4 maillons d'un rappel (à ne pas confondre)
| Maillon | Qui | Comment le vérifier |
|---|---|---|
| 1. Déclenchement | Supabase pg_cron, chaque minute (+ GitHub et Vercel en secours) | `cron.job_run_details` |
| 2. Traitement | Route Vercel `/api/cron/reminders` | Table `cron_runs` |
| 3. Envoi du push | Serveur → Apple / Google / navigateur | Table `notification_logs` (`delivery_status`) |
| 4. Réception | Le téléphone | Test manuel ci-dessous |

Le maillon 4 dépend du réseau, du système, du mode économie d'énergie et des autorisations : une réception à la seconde près n'est **jamais garantie**. Objectif réaliste : en général moins d'une minute après l'heure prévue.

## Étape 1 — Créer les 2 secrets dans Vault
Supabase → **SQL Editor** → nouvelle requête. Remplace `TON_CRON_SECRET` par la valeur de `CRON_SECRET` (identique à celle de Vercel, ligne `CRON_SECRET=` de `.env.local`) :

```sql
select vault.create_secret('TON_CRON_SECRET', 'remindme_cron_secret');
select vault.create_secret('https://remind-me-saas-ybkc.vercel.app', 'remindme_app_url');
```

Le secret est chiffré dans Vault ; il n'apparaît ni dans le code, ni dans les journaux.

## Étape 2 — Appliquer la migration
SQL Editor → coller tout le fichier `supabase/migrations/0025_reminders_every_minute.sql` → **Run**.

- Si un message « clé(s) de notification en double » apparaît : exécuter d'abord `docs/phase1-doublons-notifications.sql` (ne supprime rien), puis relancer la migration.
- Si `pg_net` ou `pg_cron` est refusé : Database → **Extensions** → activer `pg_cron` et `pg_net`, puis relancer.

## Étape 3 — Vérifier que ça tourne (après 2-3 minutes)
```sql
-- 1. Le déclencheur s'exécute chaque minute ?
select status, start_time, return_message
  from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'remindme-reminders-every-minute')
 order by start_time desc limit 5;

-- 2. La route a bien répondu ? (200 attendu)
select status_code, created, left(content::text, 200) as reponse
  from net._http_response order by created desc limit 5;

-- 3. Le traitement côté Remind Me (durée, utilisateurs, notifications, push)
select source, status, started_at, duration_ms, users_processed, users_total,
       notifications_created, pushes_sent, pushes_failed, pushes_retried, error
  from public.cron_runs order by started_at desc limit 10;

-- 4. Push échoués (relancés automatiquement 3 fois pendant 30 min)
select created_at, delivery_status, attempts, recipient, error_message
  from public.notification_logs where channel = 'push' order by created_at desc limit 20;
```

Ce qu'on attend : une ligne `success` par minute dans `cron_runs`, `duration_ms` bien en dessous de 45 000.
`skipped_locked` de temps en temps est normal (GitHub ou Vercel arrive pendant qu'une exécution tourne).
`partial` signifie qu'il y avait trop d'utilisateurs pour une minute : la suite est traitée la minute suivante.

## Étape 4 — Test réel « application fermée »
**Préparation (une fois par téléphone)**
- **Android (Chrome)** : ouvrir Remind Me → Paramètres → Notifications → activer le **Push**, accepter l'autorisation.
- **iPhone** : iOS 16.4 minimum. Dans Safari → Partager → **Sur l'écran d'accueil**, ouvrir Remind Me **depuis l'icône**, puis Paramètres → Notifications → activer le **Push**. (Sur iPhone, le push ne marche pas depuis un simple onglet Safari.)

**Test**
1. Créer une activité qui commence dans **15 minutes**, rappel vocal activé.
2. **Fermer complètement l'application** (la balayer hors du sélecteur d'apps), écran verrouillé.
3. Attendre : un push doit arriver **10 minutes avant** (second rappel par défaut ; le premier est 1 h avant, réglables dans les préférences de rappel), puis au début de l'activité.
4. Vérifier dans Supabase (requêtes 3 et 4 ci-dessus) la notification créée et `delivery_status = sent`.
5. Toucher le bouton **« Écouter »** de la notification : l'application s'ouvre et lit la voix standard.

Rappel des limites : avec l'application fermée, le téléphone affiche la notification et joue **son son système** ; il ne peut **pas** lire l'audio Remind Me tant que l'application n'est pas ouverte (limite des PWA, levée seulement par une future app native).

## Secours et retour arrière
- GitHub Actions et Vercel Cron continuent d'appeler la route : le verrou partagé (`cron_locks`) empêche tout chevauchement et la clé unique empêche tout doublon.
- Mettre en pause le déclencheur : `select cron.unschedule('remindme-reminders-every-minute');`
- Le reprendre : relancer la dernière instruction de la migration (`cron.schedule(...)`).
