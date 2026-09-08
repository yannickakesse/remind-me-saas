# Audit du projet existant face au MASTER PROMPT (Phases 4 à 14)

Analyse demandée avant tout code, conformément à la section « FINAL DELIVERABLE » du prompt maître. Aucun code n'a été modifié pour produire ce document — c'est une lecture du dépôt tel qu'il est actuellement (Phases 1 à 6 déjà livrées et déployées sur Vercel).

## 1. Architecture actuelle

Next.js 14.2.35 (App Router), TypeScript strict, Supabase (`@supabase/ssr` + `@supabase/supabase-js` épinglé en 2.45.4 pour éviter le bug de types déjà rencontré), Zod pour la validation, Luxon pour les dates/fuseaux horaires, Tailwind CSS pour le style. `@tanstack/react-query` est installé mais n'est utilisé nulle part pour l'instant : toutes les pages sont des Server Components qui interrogent Supabase directement côté serveur, sans state client centralisé. Aucune librairie de graphiques (recharts, chart.js, visx...) n'est installée — nécessaire pour les sections 54-56 et 135-136 du prompt (rapports, visualisation financière).

Le pattern général du projet est cohérent et cité comme un vrai atout : statuts toujours dérivés à la lecture (jamais stockés) pour les tâches, revenus, dépenses et notifications ; génération paresseuse et idempotente pour le calendrier, les revenus récurrents et les notifications, avec des index uniques en base qui empêchent toute duplication. C'est exactement la discipline que les sections 39, 46, 110 du prompt maître demandent — déjà en place, à réutiliser telle quelle pour les futurs modules (budgets, épargne, objectifs).

## 2. Routes existantes

```
(auth)        /login  /register  /forgot-password
(onboarding)  /onboarding
(app)         /dashboard
              /activities  /activities/new  /activities/[id]/edit
              /calendar  /calendar/[id]
              /tasks  /tasks/new  /tasks/[id]/edit
              /finances  /finances/income/[id]/edit  /finances/expenses/[id]/edit
              /clients  /clients/organizations/... /clients/contacts/...
              /reports
              /notifications
              /settings
api           /api/finances/export
```

Manquent par rapport au prompt maître : `/reset-password` et `/verify-email` en pages dédiées (section 19), toute la structure de sous-pages Settings (section 69 : Profile / Account / Appearance / Language & Region / Currency / Notifications / Security / Sessions / Subscription / Privacy / Data — aujourd'hui `/settings` est une unique page en lecture seule), une page Sessions/Devices (section 22), une page Pricing/Billing (section 74), une Command Palette et une recherche globale (sections 57-58).

## 3. Composants existants

`components/ui/field.tsx` (Field, TextInput, PrimaryButton — le seul embryon de design system de composants), plus des formulaires métier dédiés (`activity-form`, `contact-form`, `organization-form`, `expense-form`, `income-form`, `task-form`, `onboarding-wizard`) et les composants du calendrier (`month-view`, `week-view`, `day-view`, `agenda-view`, `event-pill`, `calendar-toolbar`, `event-actions`).

Il n'existe **aucun** des composants génériques réutilisables listés en section 100 du prompt maître : pas de `Modal`/`Drawer`/`Sheet`, pas de `Toast` (les erreurs sont affichées en `<p role="alert">` inline, page par page), pas de `Skeleton`/`EmptyState`/`ErrorState` partagés (chaque page réécrit son propre bloc "bordure en pointillés"), pas de `Select`/`DatePicker`/`TimePicker` génériques (chaque formulaire a probablement ses propres `<input>` natifs), pas de `Dropdown`/`Tooltip`/`Badge`/`Tabs`/`Table`/`Pagination`/`Avatar`/`ConfirmDialog`/`Search`/`CommandPalette`/`Chart`/`Progress`. C'est le chantier le plus structurant à ouvrir avant d'aller plus loin, sous peine de dupliquer ces patterns dans chaque nouvelle page (ce que la section 101 interdit explicitement).

## 4. Tables Supabase existantes

`countries`, `currencies` (référence, lecture publique) ; `profiles`, `user_settings`, `subscriptions` (Phase 1) ; `organizations`, `contacts`, `activities`, `activity_schedules`, `activity_compensation` (Phase 2) ; `calendar_events` (Phase 3) ; `tasks` (Phase 4) ; `income`, `expenses` (Phase 5) ; `notifications` (Phase 6).

Manquent pour les phases à venir : `savings_goals`/`savings_pockets` et leurs contributions (section 49-50), `budgets` (section 51), une structure d'`entitlements` centralisée liée aux plans (section 73 — aujourd'hui `subscriptions.plan` existe mais rien ne consomme cette valeur pour limiter quoi que ce soit), une table d'audit (section 99), des buckets Supabase Storage pour avatar/reçus (section 132 — aucun n'existe).

## 5. Migrations existantes

`0001_foundations.sql` → `0006_notifications.sql`, appliquées et vérifiées en production (confirmé par toi dans Supabase). Toutes suivent le même schéma : RLS activée table par table, policies `auth.uid() = user_id`, contraintes `check`/`unique`/`foreign key`, triggers pour les champs dérivés (`updated_at`, `completed_at`, `received_at`/`paid_at`). C'est exactement la discipline demandée en section 77-78 — à prolonger avec les mêmes conventions pour les futures tables.

## 6. RLS existantes

Pattern uniforme et correct sur toutes les tables actuelles : lecture/écriture strictement filtrées par `user_id`, tables de référence (`countries`, `currencies`) en lecture publique seule, `subscriptions` en lecture seule côté client (écriture réservée à un futur module facturation). Aucune faille identifiée dans ce qui existe. Les indexes nécessaires aux policies (`user_id` sur chaque table) sont en place.

## 7. Design actuel

Design tokens définis directement dans `tailwind.config.ts` (`ink`, `canvas`, `signal`, `positive`/`warning`/`danger`), en couleurs hexadécimales figées — pas de variables CSS (`--primary-500` etc.), pas de `dark:` variant, pas de mécanisme `light/dark/system`. Ça correspond à l'esprit sobre demandé par le prompt maître (section 3 : clarté avant sophistication), mais **pas du tout à l'architecture technique attendue pour le Dark Mode (section 8)** : pour préparer un thème sombre plus tard sans tout réécrire, il faut migrer vers des tokens en variables CSS consommées par Tailwind, dès la Phase 4/5 — le refaire après coup sur 50+ composants coûterait bien plus cher.

Palette actuelle (bleu profond `#1E3A5F` comme accent) : différente de la palette bleue `#2563EB` proposée dans le prompt maître (section 5). Les deux sont cohérentes et professionnelles — à trancher : je recommande de garder la palette actuelle (déjà utilisée dans toute l'app existante, cohérente avec l'esprit "sobre, pas cliché SaaS" déjà en place) plutôt que de tout reteinter pour coller au bleu du prompt, sauf préférence contraire de ta part.

Aucune animation, aucune micro-interaction (sections 13-14, 90) : les boutons/cartes n'ont pas de transitions définies au-delà des classes Tailwind par défaut. Pas de `prefers-reduced-motion` géré (section 117).

## 8. Fonctionnalités déjà présentes

Auth complète (login/register/mot de passe oublié) + protection de routes par middleware ; onboarding en plusieurs étapes ; profil utilisateur (lecture seule) ; activités avec horaires/rémunération/organisations/contacts, CRUD + archive/restore ; calendrier 4 vues avec génération idempotente, récurrence weekly/biweekly, détection de conflits, statuts d'exécution ; tâches avec priorité/échéance/rappel ; finances (revenus/dépenses) avec statut dérivé, génération automatique des échéances récurrentes, export CSV ; clients (organisations/contacts) en écrans dédiés ; rapports par activité sur période choisie ; notifications in-app générées paresseusement (rappels de tâche, tâche en retard, échéance financière en retard) avec badge non-lu.

## 9. Fonctionnalités manquantes (face au prompt maître, Phases 4-14)

**Phase 4 (Account/Auth/Profile/Settings)** : édition du profil (aujourd'hui lecture seule), upload photo/avatar, pages Sessions/Devices, structure Settings complète (sécurité, notifications, apparence, langue, abonnement...), 2FA/social login (mentionnés comme "option future"), suppression de compte, export de données personnelles.

**Phase 5 (Dashboard premium + UX)** : le dashboard actuel est fonctionnel mais basique — pas de cards visuelles distinctes (Today's Schedule / Income / Expenses / Net / Tasks / Goals comme décrit section 28), pas de graphique, pas d'actions rapides en header (Add activity/task/income/expense), pas de checklist d'onboarding pour un compte vide (section 143).

**Phase 6 du prompt maître = Tasks** : déjà largement fait (notre Phase 4 précédente), à revoir seulement pour le polish visuel.

**Phase 7 (Finance core)** : le noyau existe déjà (revenus/dépenses/statuts/récurrence/export) — ce qui manque est plutôt l'habillage (Overview avec cards, multi-devise affichée proprement avec taux de change, transferts/remboursements/ajustements comme types de transaction distincts — section 139).

**Phase 8 (Épargne/Budgets/Objectifs)** : entièrement absent — aucune table, aucun écran.

**Phase 9 (Rapports/Analytics)** : la base existe (`/reports` par activité), mais sans graphiques, sans rentabilité par heure travaillée (section 55 — fonctionnalité stratégique du produit selon le prompt), sans export PDF/Excel, sans comparaison mensuelle.

**Phase 10 (Notifications)** : le in-app existe déjà et est solide ; manquent les types "budget dépassé"/"objectif atteint" (dépendent de la Phase 8), les préférences de notification par type.

**Phase 11 (Abonnement/Entitlements)** : la table `subscriptions` existe mais rien ne l'exploite ; aucun entitlement centralisé, aucune page pricing.

**Phase 12 (Performance/Sécurité/Accessibilité)** : `next.config.mjs` ne définit aucun header de sécurité (CSP, X-Frame-Options...) ; pas de rate limiting visible au-delà de ce que Supabase Auth fait par défaut ; pas d'audit d'accessibilité clavier/contraste fait à ce stade ; les listes (activités, calendrier, finances) ne sont pas paginées — actuellement gérable au volume actuel, à corriger avant une vraie mise à l'échelle (section 79-81, 127-128).

**Phase 13 (Polish/animations/responsive)** : pas de navigation mobile en bottom-nav (section 18 — la sidebar actuelle est fixe, `w-56`, pas de version mobile) ; pas de dark mode ; pas de command palette/recherche globale.

**Phase 14 (Testing/production readiness)** : pas de suite de tests automatisés identifiée dans le dépôt.

## 10. Risques de régression identifiés

Le risque principal est sur le **calendrier et les finances**, explicitement désignés comme zones critiques par le prompt maître (sections 157-158) : toute refonte de composants génériques (formulaires, listes) doit être faite sans toucher à `lib/calendar/sync.ts`, `lib/calendar/generate.ts`, `lib/finances/generate.ts`, `lib/finances/sync.ts` ni aux index uniques qui garantissent l'idempotence. Deuxième risque : migrer les couleurs vers des variables CSS pour le dark mode touche potentiellement tous les fichiers `.tsx` existants (usage direct de classes `text-ink-950`, `bg-signal` etc.) — à faire une fois, tôt, plutôt que composant par composant. Troisième risque, plus léger : introduire des composants génériques (`Modal`, `Toast`...) en parallèle de l'existant sans migrer immédiatement les pages actuelles créerait deux systèmes en parallèle — préférable de migrer au fil de l'eau, page par page, à chaque phase touchée.

## 11. Plan d'implémentation recommandé

1. **Fondations transverses d'abord** (avant toute nouvelle feature) : design tokens en variables CSS (support dark mode dès le départ), composants génériques de base (Button, Input, Select, Modal, Toast, EmptyState, Skeleton, ConfirmDialog, Badge) — réutilisés ensuite par chaque phase suivante au lieu d'être recréés.
2. **Phase 4** : Settings complet (profil éditable, avatar via Supabase Storage, sécurité/sessions, apparence avec le nouveau système de thème), pages reset-password/verify-email dédiées.
3. **Phase 5** : Dashboard premium (cards, actions rapides, checklist onboarding vide) en réutilisant les composants génériques.
4. **Phase 7** : habillage Finance (Overview, multi-devise propre, types de transaction étendus).
5. **Phase 8** : Épargne/Budgets/Objectifs — nouvelles tables + migrations, écrans dédiés.
6. **Phase 9** : Rapports/Analytics avec graphiques (choix d'une librairie légère type Recharts), rentabilité par heure.
7. **Phase 10** : extension des notifications (budget/objectif) une fois la Phase 8 en place.
8. **Phase 11** : entitlements centralisés + page pricing (même sans paiement réel fonctionnel dans un premier temps).
9. **Phase 12-13** : audit sécurité/performance/accessibilité, pagination, navigation mobile bottom-nav, command palette, animations/micro-interactions.
10. **Phase 14** : tests sur les flux critiques (auth, récurrence calendrier, idempotence finances, isolation RLS entre deux comptes).

## 12. Ordre recommandé pour la suite immédiate

Étant donné l'état actuel (déploiement Vercel fonctionnel, Phases 1-6 stables), je recommande de commencer par les **fondations transverses** (tokens + composants génériques) avant la Phase 4, pour éviter de reconstruire deux fois la même chose. C'est un chantier plus technique que visible immédiatement, mais il conditionne la qualité et la vitesse de toutes les phases suivantes — exactement l'esprit de la section 101 du prompt ("si deux pages utilisent le même composant, créer un composant partagé").

---

*Rapport produit sans modification de code, conformément à la consigne "NE CODE PAS immédiatement" du prompt maître. Prêt à démarrer l'implémentation par phase dès validation de ce plan.*
