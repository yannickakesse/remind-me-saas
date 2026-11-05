# Phase 3 — Module « Mes Objectifs » (à faire dans Supabase)

À faire **par toi**, dans Supabase → SQL Editor. Avant la migration, la page « Mes Objectifs » s'affiche avec le message « disponible très bientôt » (aucune erreur).

## Ce que contient le module
- **Objectifs libres** dans tous les domaines (personnel, professionnel, études, finances, santé & sport, apprentissage, projet, autre), avec motivation, dates, et mesure **chiffrée** (1 400 pompes, 500 000 FCFA, 20 livres…) ou **par étapes** (parler anglais, obtenir un diplôme…).
- **Étapes / sous-objectifs** : quotidiens, hebdomadaires, mensuels, personnalisés ou jalons ; création, modification, ordre (monter / descendre), suppression, « ignorer » ; bouton **« Découper par mois »** à la création.
- **Progression** calculée automatiquement : pourcentage, étapes faites / restantes, temps restant, retard, comparaison **réalisé / attendu à ce jour** (jamais de conclusion sans données suffisantes).
- **Historique** : chaque progression, étape terminée ou changement de statut.
- **Statuts** : en cours, en pause, terminé, abandonné, archivé ; les objectifs terminés restent consultables.
- **Rappels** : étape du jour, étape en retard, échéance à J-7 et J-1, inactivité depuis 7 jours (avec rappel de la motivation, au plus une fois par semaine), rappel planifié choisi par l'utilisateur, félicitations aux paliers 25 / 50 / 75 / 100 %.
- **Lien avec les Tâches**, uniquement sur demande (« Ajouter à mes tâches ») et sans doublon. Aucune conversion automatique.
- **Distinct de l'épargne** : les objectifs d'épargne du module Finances ne sont pas touchés.
- **Quotas** (objectifs en cours ou en pause) : Gratuit 3, Pro 25, Premium illimité. Étapes illimitées (60 max par objectif). Rien n'est supprimé au-delà : seule la création est bloquée.

## Étape 1 — Appliquer la migration du module
SQL Editor → coller `supabase/migrations/0027_my_goals_module.sql` → **Run**.

## Étape 2 — Retirer l'ancien index des notifications (après 0025)
SQL Editor → coller `supabase/migrations/0028_drop_legacy_notification_unique_index.sql` → **Run**.

Pourquoi : un ancien index (migration 0006) refuse tout second rappel du même type pour un même élément. Résultat aujourd'hui : une tâche en retard n'est rappelée qu'**une seule fois** au lieu de chaque jour, un paiement attendu reçoit le rappel J-7 mais **pas** J-3 ni J-1, et le rappel quotidien d'un objectif ne passerait qu'une fois. La clé anti-doublon de 0025 le remplace. La migration refuse de s'exécuter si 0025 n'est pas en place.

## Étape 3 — Vérifier
```sql
select count(*) as objectifs from public.goals;
select indexname from pg_indexes where tablename = 'notifications' order by indexname;
-- uq_notifications_kind_entity ne doit plus apparaître ; uq_notifications_user_idempotency doit être présent
```

## Étape 4 — Test réel
1. Menu → **Mes Objectifs** → **Nouvel objectif** : « Parler anglais couramment », domaine Apprentissage, date limite dans 6 mois, « Par étapes », **Découper par mois**, Créer.
2. Cocher la première étape : la progression passe à environ 17 %, l'historique l'indique.
3. Créer « 1 400 pompes » (Avec un chiffre, cible 1400, unité pompes) → **Ajouter 350** : 25 %, une notification « 25 % de votre objectif » apparaît.
4. Sur une étape avec une date : **Ajouter à mes tâches** → la tâche apparaît dans Tâches ; recliquer ne crée pas de doublon.
5. Compte gratuit : créer un 4ᵉ objectif en cours → message de limite ; archiver un objectif → la création redevient possible.

## Voix des rappels d'objectifs
Les 8 phrases sont prêtes à coller dans ElevenLabs : `docs/voix-objectifs-a-coller.txt` (modèle **Multilingual v2**, comme d'habitude). En attendant leur enregistrement, la phrase générale « Vous avez un nouveau rappel dans Remind Me » est jouée.
