# Multi-Activity Life & Work Manager (SaaS)

Plateforme SaaS tout-en-un pour indépendants, pluri-actifs, consultants et créateurs gérant plusieurs activités, emplois, clients et flux de revenus.

---

## 🚀 Fonctionnalités Opérationnelles

### 1. Fondations & Authentification (Phase 1)
- **Authentification complète** (Supabase Auth) : Inscription par email, Connexion, Mot de passe oublié, Réinitialisation.
- **Création automatique de compte** : Trigger Postgres créant immédiatement le profil, les paramètres régionaux et l'abonnement Free.
- **Onboarding guidé** : Assistant de configuration pas-à-pas.
- **Sécurité RLS** : Isolation stricte par `user_id` sur toutes les tables.

### 2. Activités & Organisation (Phase 2)
- **Gestion des activités** : Statuts (actif, en pause, archivé), codes couleur, mode de travail (présentiel, distanciel, hybride).
- **Horaires multiples & récurrence** : Hebdomadaire, bimensuel, personnalisé.
- **Rémunérations associées** : Taux horaire, journalier, forfait, récurrent avec date de versement.
- **Clients & Contacts** : Répertoire centralisé des organisations et contacts clés associés aux activités.

### 3. Calendrier Idempotent (Phase 3)
- **Génération intelligente des occurrences** : Calcul paresseux sans doublons.
- **Vues multiples** : Mois, Semaine, Jour, Agenda.
- **Détection des conflits** : Alertes visuelles automatiques en cas de chevauchement d'horaires.
- **Intégration financière** : Pastilles distinctives pour les échéances de dépenses programmées.

### 4. Tâches & Priorités (Phase 4)
- **Gestion agile des tâches** : Statuts (à faire, en cours, terminé, archivé), priorités (urgente, haute, moyenne, basse).
- **Liaison aux activités** et alertes d'échéance.

### 5. Finances & Trésorerie Multi-Devises (Phases 5, 7, 8)
- **Revenus & Encaissements** : Suivi des paiements reçus et attendus avec dérivation automatique de statut (reçu, en attente, en retard).
- **Dépenses réelles** : Typologie pro, perso ou mixte avec déductibilité.
- **Budgets mensuels** : Plafonds par catégorie avec jauge de consommation en temps réel.
- **Objectifs d'Épargne & Poches** : Suivi de progression vers un montant cible et projections.
- **Export comptable CSV** : Export instantané des écritures financières.

### 6. Dépenses Programmées & Charges Récurrentes (Nouveau)
- **Programmation des échéances futures** : Loyers, abonnements, factures récurrentes (mensuel, trimestriel, annuel, etc.).
- **Cycle de vie précis** : `PLANIFIÉE` → `DUE` → `PAYÉE` → `ANNULÉE`.
- **Action rapide "Marquer comme payée"** : Avancement automatique de la prochaine échéance et génération de la dépense effective.
- **Visibilité croisée** : Widget dédié sur le Dashboard et pastilles d'échéance sur le Calendrier.

### 7. Performance & Expérience Mobile First (Nouveau)
- **Menu Hamburger ultra-rapide** : Accès tactile complet à toutes les sections et sous-sections.
- **Skeletons de chargement instantanés (`loading.tsx`)** : Élimination complète des temps de latence lors de la navigation.
- **Feedback tactile immédiat (< 100ms)** : Optimisation `touch-action: manipulation` et micro-interactions fluides.

---

## 🛠️ Stack Technique

- **Framework** : Next.js 14 (App Router, Server Components & Server Actions)
- **Styling** : Tailwind CSS, Design Tokens RGB, Thèmes Clair/Sombre natifs
- **Base de données & Auth** : Supabase (PostgreSQL, Row Level Security, Triggers)
- **Dates & Temps** : Luxon (gestion multi-fuseaux horaires)
- **Validation** : Zod
- **Typage** : TypeScript Strict
