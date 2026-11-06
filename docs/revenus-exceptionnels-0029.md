# Revenus exceptionnels : migration 0029

## Ce que fait la migration
`supabase/migrations/0029_exceptional_income_categories.sql` élargit uniquement la contrainte
`income_type` de la table `income` pour accepter 5 nouvelles valeurs :
`bonus`, `windfall`, `gift`, `refund`, `exceptional_other`.

- Aucune table, colonne, donnée ou politique RLS n'est modifiée ou supprimée.
- Les 7 valeurs existantes restent valides, donc tous les revenus actuels sont conservés.
- Elle peut être rejouée sans risque.

## Ordre d'application
1. Supabase → SQL Editor → coller le contenu de `0029_exceptional_income_categories.sql` → Run.
   Si ce n'est pas déjà fait, appliquer d'abord 0025 → 0026 → 0027 → 0028.
2. Vérification :
   ```sql
   select pg_get_constraintdef(oid) from pg_constraint
   where conrelid = 'public.income'::regclass and conname = 'income_income_type_check';
   ```
   Le résultat doit lister les 12 valeurs.
3. Ensuite seulement : push et déploiement Vercel (avec votre accord).

## Si l'application est déployée avant la migration
L'enregistrement d'un revenu exceptionnel est refusé avec un message explicite :
« La catégorie « … » n'est pas encore activée dans la base de données (mise à jour 0029 à appliquer).
Rien n'a été enregistré. »
Aucun repli vers une autre catégorie. Les revenus habituels continuent de fonctionner normalement.

## Règles de calcul
- Un revenu exceptionnel reçu est compté dans les encaissements du mois de sa **date de réception
  réelle** (`due_date = received_at` = la date choisie), même s'il est saisi plus tard. Une date
  future est refusée pour un revenu déjà reçu.
- Les remboursements sont comptés dans les encaissements, ce qui garde le solde net juste. Dans les
  rapports, ils sont affichés à part (« dont remboursements (pas des gains) ») avec la ligne
  « Revenus hors remboursements ».
