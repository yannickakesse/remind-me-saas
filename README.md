# Multi-Activity SaaS — Phases 1 à 6 + Fondations + Phase 4 (Compte/Profil/Paramètres)

## Phase 4 — Compte / Profil / Paramètres

Rapport §154 du prompt maître.

**CREATED**
- `supabase/migrations/0007_settings.sql` : colonne `profiles.avatar_url`,
  bucket Storage `avatars` (public en lecture, écriture restreinte au
  dossier `{user_id}/` du propriétaire), fonction `delete_own_account()`
  (`security definer`, borne à `auth.uid()`, cascade déjà en place sur
  toutes les tables) pour la suppression de compte en libre-service (§97)
  sans jamais exposer de clé service_role côté client (§75).
- `lib/validation/settings.ts` : schémas Zod (profil, changement de mot de
  passe, préférences de notification).
- `app/(app)/settings/actions.ts` : `updateProfile`, `updateAvatarUrl`,
  `updateNotificationPrefs`, `changePassword`, `signOutEverywhere`,
  `deleteAccount`.
- `app/api/settings/export/route.ts` : export JSON complet des données de
  l'utilisateur (§98), entièrement filtré par RLS.
- `app/(auth)/reset-password/page.tsx` : page manquante jusqu'ici — le lien
  "mot de passe oublié" pointait déjà vers `/reset-password`
  (`forgot-password/page.tsx`) mais la page n'existait pas encore (lien
  mort). Attend l'événement `PASSWORD_RECOVERY` du SDK avant d'afficher le
  formulaire.
- `components/ui/tabs.tsx` : onglets génériques (navigation clavier flèches).
- `components/settings/*.tsx` : `ProfileSection` (formulaire + upload
  avatar direct vers Supabase Storage depuis le navigateur),
  `AppearanceSection` (sélecteur de thème, branché sur `useTheme()` des
  fondations), `SecuritySection` (changement de mot de passe),
  `NotificationsSection` (préférences par type), `SessionsSection`
  (session courante + déconnexion globale), `SubscriptionSection` (lecture
  seule), `DataSection` (export + suppression de compte).

**MODIFIED**
- `app/(app)/settings/page.tsx` : entièrement réécrite — passe d'une page
  en lecture seule à la structure complète du §69 (Profil / Apparence /
  Notifications / Sécurité / Sessions / Abonnement / Données) via `Tabs`.
- `middleware.ts` : `/reset-password` sort de la logique standard
  authentifié/public — Supabase y établit une session de récupération
  temporaire ; sans ce cas particulier, la règle "authentifié sur une page
  d'auth → dashboard" aurait renvoyé l'utilisateur avant qu'il ait pu
  choisir son nouveau mot de passe.
- `lib/notifications/sync.ts` : lit désormais `user_settings.notif_prefs`
  et respecte les préférences par type — une clé absente reste activée par
  défaut (aucun changement de comportement pour les comptes existants tant
  qu'ils n'ont rien décoché).
- `types/database.ts` : `profiles.avatar_url`, typage de la fonction RPC
  `delete_own_account`.

**PRESERVED** : aucun fichier des Phases 1-6 touché en dehors de
`lib/notifications/sync.ts` (changement additif, testé pour non-régression :
sans préférence enregistrée, comportement strictement identique).

**DATABASE** : migration `0007_settings.sql` (idempotente, `if not exists`/
`on conflict do nothing` partout où c'est pertinent).

**SECURITY** : suppression de compte protégée par `security definer` +
vérification stricte `auth.uid()` (jamais de service_role côté client) ;
policies Storage limitées au dossier de l'utilisateur pour l'écriture.

**UX/UI** : Paramètres passe d'une page statique à une interface complète,
construite entièrement avec les composants génériques des fondations
(`Button`, `Select`, `Modal`/`ConfirmDialog`, `Toast`, `Badge`, `Tabs`) —
premier cas d'usage réel de ces composants, qui valide leur API.

**TESTED** : `npm run typecheck` et `npm run build` (25 pages générées,
dont les 2 nouvelles : `/reset-password`, `/api/settings/export`) — 0 erreur.

**NOT TESTED** : upload d'avatar en conditions réelles (bucket Storage
créé par la migration mais jamais exercé ici — aucun accès réseau à ton
projet Supabase depuis cet environnement) ; flux `/reset-password` de bout
en bout (dépend d'un vrai email Supabase) ; suppression de compte réelle.

**RISKS** : la migration `0007` doit être appliquée dans Supabase (comme
les précédentes) avant que Paramètres ne fonctionne — sans elle,
`avatar_url` et `delete_own_account` échoueront proprement (message
d'erreur, pas de crash).

**NEXT** : Phase 5 (Dashboard premium) en réutilisant les mêmes composants.

---

## Fondations transverses (avant Phase 4 du prompt maître)

Chantier réalisé avant la Phase 4 (Account/Auth/Profile/Settings), conformément
au plan recommandé dans `AUDIT_PHASE4-14.md` : poser une base de composants
et de tokens réutilisables une seule fois, plutôt que de la reconstruire à
chaque phase. Rapport au format §154 du prompt maître :

**CREATED**
- `app/globals.css` : tokens de couleur migrés en variables CSS (canaux RGB),
  avec un jeu de valeurs "dark" activé soit automatiquement via
  `prefers-color-scheme`, soit explicitement via `[data-theme="dark"]`.
  Nouveau token `info` ajouté (non utilisé auparavant, sans risque de
  régression).
- `lib/theme/theme-script.ts` + `components/theme/theme-provider.tsx` :
  script anti-FOUC (injecté en `beforeInteractive`) + contexte React
  `useTheme()` (`light`/`dark`/`system`, persistance `localStorage`). Pas
  encore de sélecteur visible dans l'UI — arrivera avec Paramètres >
  Apparence en Phase 4.
- `components/ui/` : composants génériques réutilisables — `Button`
  (variants primary/secondary/ghost/danger/success/link, état `loading`
  intégré), `Select`/`Textarea`, `Badge` (tons neutral/positive/warning/
  danger/info/signal), `Skeleton`/`SkeletonLines`, `EmptyState`, `Modal`
  (portail, Escape, gestion du focus), `ToastProvider`/`useToast` (branché
  une fois dans `app/layout.tsx`), `ConfirmDialog` (bâti sur `Modal`, état
  loading anti double-soumission), `Spinner`.

**MODIFIED**
- `tailwind.config.ts` : les couleurs `ink`/`canvas`/`signal`/`positive`/
  `warning`/`danger` (+ nouveau `info`) pointent maintenant vers les
  variables CSS via `rgb(var(--x) / <alpha-value>)`, ce qui préserve tous
  les modificateurs d'opacité déjà utilisés dans le code (`bg-signal/90`,
  `border-danger/30`...). Ajout de `darkMode: ["class", '[data-theme="dark"]']`.
- `app/layout.tsx` : intègre `<Script strategy="beforeInteractive">` (script
  de thème), `ThemeProvider` et `ToastProvider` autour de `children`.

**PRESERVED**
- Aucune classe Tailwind existante n'a changé de nom : toutes les pages des
  Phases 1-6 (`text-ink-950`, `bg-canvas-raised`, `border-signal/30`, etc.)
  continuent de fonctionner à l'identique en mode clair, sans aucune
  modification de fichier. `components/ui/field.tsx` (Field/TextInput/
  PrimaryButton), utilisé par tous les formulaires existants, n'a pas été
  touché — les nouveaux composants (`Button`, `Select`...) viennent en
  complément, pas en remplacement, pour zéro risque de régression sur les
  Phases 1-6.

**DATABASE** : aucune migration — chantier 100% frontend.

**SECURITY** : aucun changement.

**UX/UI** : aucun changement visuel en mode clair (vérifié — mêmes couleurs
exactes). Le mode sombre est maintenant *possible* architecturalement mais
pas encore activable depuis l'interface (pas de bouton — prévu en Phase 4).

**TESTED** : `npm run typecheck` (0 erreur) et `npm run build` (build complet
réussi, 23 pages générées) exécutés réellement dans cet environnement, avec
des variables d'environnement Supabase factices (le vrai `.env.local` n'est
pas présent ici) — donc uniquement pour vérifier l'absence d'erreur de
compilation/typage, pas le comportement runtime réel.

**NOT TESTED** : rendu visuel réel (aucun navigateur dans cet environnement),
mode sombre en conditions réelles (`prefers-color-scheme: dark` du système),
navigation clavier dans `Modal`/`ConfirmDialog`, comportement de `Toast` en
conditions réelles.

**RISKS** : aucun identifié sur les modules critiques (calendrier, finances)
— ce chantier ne touche à aucun fichier de `lib/calendar/` ni `lib/finances/`.

**NEXT** : Phase 4 (Settings éditable, avatar, sessions, sélecteur de thème
dans Apparence) en réutilisant `Button`/`Select`/`Modal`/`Toast`/
`ConfirmDialog` plutôt que de recréer ces patterns.

---



> **Cette livraison a été vérifiée avec `npm install`, `npm run typecheck`
> et `npm run build` réellement exécutés** (environnement avec accès
> réseau, contrairement aux livraisons précédentes qui n'avaient pas pu le
> faire). Voir "Correctif critique" ci-dessous : ça a permis de trouver un
> bug qui n'avait jamais pu être détecté avant.

Scaffold Next.js + Supabase correspondant aux Phases 1 à 5 du plan de
développement :
- Phase 1 : projet initialisé, TypeScript, design system de base,
  authentification, base de données + RLS, profils, paramètres.
- Phase 2 : module Activités complet (organisations, contacts, horaires,
  rémunération), CRUD, onboarding relié à la création de la première
  activité.
- Phase 3 : module Calendrier — génération automatique des événements
  depuis les horaires, vues jour/semaine/mois/agenda, détection de
  conflits, statuts d'exécution ("Avez-vous terminé cette activité ?").
- Phase 4 : module Tâches — libres ou liées à une activité, priorité,
  échéance, rappel, vue "en retard / à faire / terminées".
- Phase 5 : module Finances — revenus et dépenses, statut prévu/reçu (ou
  payé)/en retard/futur recalculé à la lecture (jamais stocké), génération
  automatique des échéances de revenu récurrentes depuis la rémunération des
  activités, export CSV.
- Phase 6 : Clients (écrans de gestion dédiés organisations/contacts),
  Rapports (statistiques par activité, historique sur période choisie),
  Notifications in-app (rappels de tâches, échéances financières en retard).

Les modules Clients, Rapports et Notifications arrivent dans les phases
suivantes (voir `architecture-technique.md` fourni séparément).

## Correctif critique (aujourd'hui) — incompatibilité de versions Supabase

`npm install` sans lockfile committé résolvait `@supabase/supabase-js` en
`^2.45.4`, qui a fini par pointer vers la version `2.116.0` : cette version
a changé la signature générique du type `SupabaseClient` (elle attend
désormais 4 paramètres de type au lieu de 3). `@supabase/ssr@0.5.x`, lui,
retourne toujours un client typé avec l'ancienne signature à 3 paramètres.
Résultat : le client Supabase typé devenait incompatible avec lui-même, et
**toutes les requêtes `.from(...)` de l'application résolvaient leurs
lignes en type `never`** — activités, tâches, finances, onboarding,
paramètres compris. Ce n'était pas visible dans les livraisons précédentes
car l'environnement de développement n'avait pas d'accès réseau pour lancer
`npm install`/`tsc` et vérifier réellement le typecheck.

Corrigé en épinglant une version exacte compatible :
```json
"@supabase/supabase-js": "2.45.4"
```
(plus de `^`) dans `package.json`, **et en committant `package-lock.json`**
(inclus dans ce zip) pour qu'un futur `npm install` ne re-tire pas
silencieusement une version incompatible. `npm run typecheck` passe
maintenant à zéro erreur sur l'ensemble du projet, et `npm run build`
(celui que Netlify exécute) a été vérifié de bout en bout.

Trois vrais bugs, plus petits mais réels, ont aussi été corrigés au passage
(repérés par le typecheck une fois le problème ci-dessus levé) :
`lib/calendar/conflicts.ts` (accès de tableau potentiellement `undefined`),
`components/shared/activity-form.tsx` (couleur par défaut potentiellement
`undefined`), et le calcul des totaux de `/finances` (devise potentiellement
`undefined` en découpant une clé `"statut|devise"` sans le typer).

**Si vous avez déjà un dossier de travail local avec les phases
précédentes** : remplacez `package.json` et copiez `package-lock.json`
depuis ce zip, puis relancez `npm install` avant de continuer.

Au passage, `next` a aussi été mis à jour de `14.2.13` vers `14.2.35`
(dernier correctif de la branche 14.2, sans changement cassant) : la
version précédente avait une faille de sécurité connue, gênante pour une
app qui va manipuler des données financières.

## Déploiement sur Netlify — ⚠️ pas de glisser-déposer du zip

**Ce zip ne peut pas être déposé tel quel sur la zone de glisser-déposer de
Netlify.** Cette app n'est pas un site statique : elle utilise des Server
Actions Next.js, un middleware d'authentification côté serveur et des
appels Supabase à chaque requête. Le glisser-déposer Netlify se contente de
publier des fichiers déjà construits — il ne lance jamais `npm install` ni
`npm run build`. Déposer le code source brut donne donc un déploiement qui
échoue (ou pire, qui "réussit" en publiant des `.tsx` bruts sans aucun
rendu serveur).

Ce qui a changé avec cette livraison : **`npm run build` a été vérifié
dans un environnement avec accès réseau et compile sans erreur** (le bug
de fond dans "Correctif critique" ci-dessus en était la cause probable de
l'échec précédent, en plus du problème de méthode de dépôt). Donc une fois
déployé par une des deux méthodes ci-dessous, le build devrait passer.

**Méthode recommandée — dépôt Git connecté :**
1. Poussez ce dossier sur un repo GitHub/GitLab.
2. Sur Netlify : "Add new site" → "Import an existing project" → connectez
   le repo. Netlify détecte Next.js et installe automatiquement le plugin
   `@netlify/plugin-nextjs` grâce au `netlify.toml` inclus dans ce zip.
3. Dans Site settings → Environment variables, ajoutez
   `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (mêmes
   valeurs que votre `.env.local`).
4. Déployez.

**Alternative — Netlify CLI (sans repo Git) :**
```bash
npm install -g netlify-cli
netlify login
netlify init          # ou: netlify link, si le site existe déjà
netlify deploy --prod
```
Le CLI, contrairement au glisser-déposer, exécute réellement `npm install`
et `npm run build` avant de publier — c'est ce qui fait la différence.
N'oubliez pas les variables d'environnement (`netlify env:set ...` ou via
le dashboard) avant le premier déploiement.

## Correctif important (avant la Phase 5)

`types/database.ts` est un fichier de types écrit à la main depuis la
Phase 1. Il lui manquait la propriété `Relationships` sur chaque table :
c'est cette métadonnée qui permet au client Supabase typé de résoudre le
type des jointures imbriquées (`.select("*, organizations(name)")`). Sans
elle, TypeScript résolvait ces champs en `never` — la cause du bug de build
Netlify rencontré en Phase 4. C'est corrigé pour toutes les tables
existantes. **Dès que la CLI Supabase est liée à votre projet**, préférez
régénérer ce fichier avec :
```bash
supabase gen types typescript --linked > types/database.ts
```
plutôt que de le maintenir à la main à chaque nouvelle migration.

## Démarrage

1. **Créer un projet Supabase** sur https://supabase.com.

2. **Copier les variables d'environnement** :
   ```bash
   cp .env.example .env.local
   ```
   Renseignez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   depuis Project Settings > API.

3. **Appliquer les migrations** dans Supabase (SQL Editor ou CLI), **dans
   l'ordre** :
   ```bash
   supabase link --project-ref <votre-ref>
   supabase db push
   ```
   ou copiez-collez successivement le contenu de
   `supabase/migrations/0001_foundations.sql`,
   `0002_activities.sql`, `0003_calendar.sql`, `0004_tasks.sql`,
   `0005_finances.sql`, `0006_notifications.sql` puis `0007_settings.sql`
   dans l'éditeur SQL du dashboard Supabase — **dans cet ordre**, chaque
   migration dépend des tables créées par les précédentes.

4. **Installer les dépendances et lancer le projet** :
   ```bash
   npm install
   npm run dev
   ```
   L'app est disponible sur http://localhost:3000.

5. **Activer la confirmation email** (Supabase > Authentication > Providers >
   Email) si vous voulez tester le flux d'inscription complet, ou désactivez
   temporairement la confirmation pour aller plus vite en développement.

## Ce que contient la Phase 1

- Inscription / connexion / déconnexion / mot de passe oublié (Supabase Auth)
- Protection des routes via middleware (redirections auth ↔ app)
- Onboarding : nom, pays, devise, fuseau horaire
- Création automatique du profil, des paramètres et de l'abonnement (plan
  FREE) à l'inscription via trigger PostgreSQL
- RLS activé sur toutes les tables (`profiles`, `user_settings`,
  `subscriptions`), isolation stricte par utilisateur

## Ce que contient la Phase 2

- Migration `0002_activities.sql` : `organizations`, `contacts`,
  `activities`, `activity_schedules`, `activity_compensation`, toutes en RLS
- Onboarding étendu : étape 5 (nombre d'activités, indicatif) puis étape 6 —
  redirection directe vers la création de la première activité
- CRUD activités complet :
  - création (`/activities/new`) et modification (`/activities/[id]/edit`)
    avec un même formulaire partagé (infos → organisation → horaires →
    rémunération)
  - liste des activités actives/archivées (`/activities`), archivage et
    restauration (jamais de suppression physique — §8 règle métier 6)
  - création automatique (find-or-create) de l'organisation et du contact
    à partir du nom saisi, sans écran de gestion dédié pour l'instant
- Dashboard : widget "Vos activités" réel, remplace l'état vide statique de
  la Phase 1
- Horaires multiples par activité (ajout/suppression de créneaux jour par
  jour), rémunération avec fréquence et devise

## Ce que contient la Phase 3

- Migration `0003_calendar.sql` : `calendar_events`, avec index unique
  `(schedule_id, starts_at)` pour ne jamais dupliquer une occurrence générée
- Génération **paresseuse** des occurrences (`lib/calendar/sync.ts`) : à
  chaque affichage du calendrier, on matérialise uniquement les occurrences
  manquantes pour la période consultée, à partir des `activity_schedules`
  actifs (récurrence weekly/biweekly ; `custom` reste manuel)
- 4 vues (`/calendar?view=month|week|day|agenda`) avec navigation
  précédent/suivant/aujourd'hui
- Détection de conflits d'horaires (chevauchements signalés visuellement)
- Statuts d'exécution par occurrence (prévu / en cours / terminé / annulé /
  manqué / reporté), avec la question "Avez-vous terminé cette activité ?"
  proposée automatiquement sur les occurrences passées encore "prévu"
  (`/calendar/[id]`)
- Report d'une occurrence : conserve la durée d'origine, marque
  l'événement comme exception pour ne jamais le régénérer en double
- Widget "Aujourd'hui" sur le dashboard

## Ce que contient la Phase 4

- Migration `0004_tasks.sql` : `tasks`, `completed_at` dérivé
  automatiquement du statut (trigger), jamais saisi à la main — même
  principe que pour les revenus (statut dérivé, pas déclaratif)
- Tâches libres ou liées à une activité (`activity_id` nullable),
  priorité (basse/moyenne/haute/urgente), échéance (date + heure
  optionnelle), rappel en minutes avant échéance
- CRUD complet (`/tasks/new`, `/tasks/[id]/edit`) avec formulaire partagé
- Liste (`/tasks`) groupée en trois sections : en retard, à faire,
  terminées/annulées ; bascule rapide du statut terminé/à faire en un clic
- Contrairement aux activités, une tâche peut être supprimée physiquement
  (pas de donnée financière liée) en plus d'être annulée
- Widget "Tâches en retard ou dues aujourd'hui" sur le dashboard

## Ce que contient la Phase 5

- Migration `0005_finances.sql` : `income` et `expenses`, RLS complet,
  `received_at`/`paid_at` dérivés automatiquement par trigger au passage à
  reçu/payé (même principe que `tasks.completed_at`)
- **Le statut affiché (prévu / reçu / en retard / futur) n'est pas une
  colonne** : il dépend du jour courant, qui avance sans action de
  l'utilisateur, et serait donc faux s'il était stocké. Il est recalculé à
  chaque lecture par `lib/validation/finances.ts::deriveFinanceStatus`,
  exactement comme `/tasks` calcule déjà "en retard" à la volée plutôt que
  de le stocker.
  - "reçu" / "payé" : flag `received`/`paid` à `true`
  - "en retard" : non reçu/payé et échéance dans le passé
  - "prévu" : non reçu/payé, échéance dans le mois civil en cours
  - "futur" : non reçu/payé, échéance au-delà du mois en cours
- Génération automatique des échéances de revenu (`lib/finances/generate.ts`
  + `lib/finances/sync.ts`, matérialisation paresseuse comme le calendrier)
  depuis `activity_compensation`, **uniquement pour les fréquences
  weekly/biweekly/monthly**. Les fréquences horaire/journalière/par
  séance/par projet/ponctuelle dépendent du travail réellement effectué :
  les générer à l'avance inventerait un montant "prévu" non fondé, ce qui
  contredirait le principe même de ne pas mélanger prévu et réel — ces
  revenus-là restent en saisie manuelle.
- Un revenu généré automatiquement (`compensation_id` non nul) peut être
  modifié (ex. ajuster le montant réellement dû) mais pas supprimé — il
  serait régénéré au prochain chargement. Même principe que les événements
  de calendrier générés depuis un horaire. Les revenus saisis manuellement
  et toutes les dépenses restent librement supprimables.
- Page `/finances` : revenus et dépenses sur une fenêtre mois précédent →
  +2 mois, totaux par devise et par statut, bascule rapide reçu/payé
- Widget "Revenus en retard" sur le dashboard
- **Export CSV** (`/api/finances/export?from=YYYY-MM-DD&to=YYYY-MM-DD`,
  paramètres optionnels — par défaut la même fenêtre que la page) : revenus
  et dépenses fusionnés et triés par échéance, séparateur `;` et BOM UTF-8
  (Excel en configuration française ouvre correctement les accents et les
  colonnes sans réglage manuel). `lib/finances/aggregate.ts` centralise la
  requête + le calcul de statut pour que la page et l'export ne divergent
  jamais ; `lib/finances/csv.ts` gère uniquement la mise en forme. Lien
  "Exporter en CSV" en haut de `/finances`.

## Ce que contient la Phase 6

- Migration `0006_notifications.sql` : table `notifications`, RLS complet,
  index unique `(user_id, kind, entity_id)` pour ne jamais générer deux fois
  la même notification pour la même tâche/le même revenu.
- **Clients** (`/clients`) : écrans de gestion dédiés pour `organizations`
  et `contacts`, qui existaient depuis la Phase 2 mais n'étaient
  accessibles que via le find-or-create automatique en créant une activité.
  CRUD complet (`/clients/organizations/new`, `/clients/contacts/new`,
  etc.) ; suppression physique autorisée (comme les tâches) puisque
  `activities.organization_id`/`contact_id` et `contacts.organization_id`
  sont tous en `on delete set null` — supprimer un client ne fait jamais
  disparaître une activité ou un revenu qui en dépend.
- **Rapports** (`/reports`) : statistiques par activité (revenus, dépenses,
  net, par devise) sur une période choisie (année civile en cours par
  défaut, ajustable via un formulaire de dates), plus le lien d'export CSV
  déjà construit en Phase 5. `lib/finances/aggregate.ts::summarizeByActivity`
  regroupe les lignes déjà chargées par `getFinancesForRange` — aucune
  nouvelle requête dédiée, pour rester cohérent avec le reste de l'app.
  Au passage, les dépenses affichent maintenant leur activité liée (comme
  les revenus déjà), et l'export CSV la renseigne aussi pour les dépenses
  (colonne "Activité" auparavant toujours vide côté dépenses).
- **Notifications** (`/notifications`, cloche 🔔 dans la barre latérale
  avec badge du nombre de non lues) — **in-app uniquement, aucun envoi
  d'email ou de push** (décision produit prise pour rester simple pour le
  MVP ; à reconsidérer plus tard si le besoin se confirme). Générées
  paresseusement à chaque navigation dans l'app
  (`lib/notifications/sync.ts::ensureNotifications`, appelé depuis
  `app/(app)/layout.tsx`), sur le même principe que le calendrier ou les
  revenus : jamais de job de fond, jamais d'état stocké qui pourrait
  devenir faux tout seul.
  - Rappel de tâche : dès que `due_date`/`due_time` moins
    `reminder_minutes_before` est atteint, tant que la tâche n'est pas
    encore en retard.
  - Tâche en retard : dès que l'échéance est dépassée (remplace le rappel
    s'il n'avait pas encore été généré).
  - Échéance financière en retard : un revenu non reçu ou une dépense non
    payée dont la date d'échéance est passée.
  - Limite connue : si une notification a été lue ou supprimée puis que sa
    cause se reproduit (ex. échéance repoussée puis re-dépassée), elle
    n'est pas régénérée — l'index unique bloquerait un doublon. Comportement
    volontairement simple pour le MVP.

## Vérification avant de passer à la suite

- [ ] Inscription crée bien un profil + settings + abonnement (vérifier
      dans Supabase Table Editor)
- [ ] Un utilisateur ne peut pas lire le profil, les activités, les
      événements ou les tâches d'un autre (tester avec deux comptes)
- [ ] Onboarding termine bien sur `/activities/new?onboarding=1`, et une
      fois l'activité créée, elle apparaît dans `/activities` et sur le
      dashboard
- [ ] Modifier une activité met à jour correctement ses horaires et sa
      rémunération ; archiver/restaurer fonctionne
- [ ] Créer deux activités avec la même entreprise ne duplique pas
      l'organisation
- [ ] Le calendrier affiche les bonnes occurrences pour une activité avec
      horaire hebdomadaire, et pour une avec horaire bihebdomadaire
      (vérifier une semaine sur deux)
- [ ] Reporter un événement change sa date sans faire réapparaître
      l'ancien créneau au prochain chargement du calendrier
- [ ] Deux activités avec un horaire qui se chevauche affichent bien un
      indicateur de conflit
- [ ] Créer une tâche liée à une activité, la marquer terminée, vérifier
      que `completed_at` est renseigné automatiquement en base
- [ ] Une tâche en retard apparaît bien dans la section "En retard" de
      `/tasks` et dans le widget du dashboard
- [ ] `npm run build` passe sans erreur TypeScript (vérifier en particulier
      les jointures Supabase — voir "Correctif important" plus haut)
- [ ] La rémunération d'une activité en fréquence mensuelle génère bien une
      échéance de revenu par mois sur `/finances`, au bon `payment_day`
- [ ] La rémunération d'une activité en fréquence horaire/par séance ne
      génère aucune échéance automatique (normal — saisie manuelle attendue)
- [ ] Marquer un revenu "reçu" bascule son statut et renseigne
      `received_at` en base ; le décocher l'efface bien
- [ ] Un revenu généré automatiquement ne peut pas être supprimé depuis
      `/finances` (bouton absent), contrairement à un revenu manuel
- [ ] Une dépense en retard, prévue et future apparaît dans le bon groupe
      de statut sur `/finances`
- [ ] `npm run typecheck` passe à zéro erreur (déjà vérifié dans cette
      livraison ; à revérifier si vous ajoutez du code avant la Phase 6)
- [ ] Le lien "Exporter en CSV" sur `/finances` télécharge un fichier
      `finances_<début>_<fin>.csv` qui s'ouvre correctement dans Excel
      (accents lisibles, colonnes bien séparées) avec les mêmes lignes et
      statuts que ce qui est affiché à l'écran
- [ ] Créer une organisation et un contact depuis `/clients`, les modifier,
      vérifier qu'un contact peut être rattaché/détaché d'une organisation
- [ ] Supprimer une organisation liée à une activité existante ne supprime
      pas l'activité (elle perd juste son organisation)
- [ ] `/reports` affiche les bons totaux par activité pour l'année en
      cours, et le changement de dates (Du/Au) recalcule bien
- [ ] Créer une tâche avec échéance dans quelques minutes et un rappel de
      1 minute avant : une notification "Rappel de tâche" apparaît dans la
      cloche sans recharger manuellement (à la prochaine navigation)
- [ ] Laisser passer l'échéance d'une tâche sans la terminer : elle bascule
      en notification "Tâche en retard"
- [ ] Marquer une notification comme lue, "Tout marquer comme lu" fonctionne
      aussi
- [ ] `npm run build` passe sans erreur (déjà vérifié dans cette livraison)

