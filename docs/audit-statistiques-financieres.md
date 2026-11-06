# Audit : refonte du tableau de bord financier et des statistiques

État au 5 novembre 2026. Audit seulement : aucun fichier de l'application n'a été modifié.

## 1. Architecture actuelle

| Rôle | Fichier |
|---|---|
| Page Rapports (serveur) | `app/(app)/reports/page.tsx` |
| Calcul unique du rapport | `lib/reports/profitability.ts` → `calculateProfitabilityReport()` |
| Sélecteur de période (mois / année / dates) | `components/reports/period-filter.tsx` |
| Tableau de rentabilité par activité | `components/reports/profitability-table.tsx` |
| Répartition par catégorie (barres CSS) | `components/reports/category-breakdown.tsx` |
| Courbe mensuelle (SVG maison, 6 mois) | `components/reports/monthly-evolution.tsx` |
| Version imprimable (`window.print()`) | `app/(print)/reports/print/page.tsx` + `components/reports/printable-report.tsx` |
| Export CSV | `app/api/finances/export/route.ts` + `lib/finances/csv.ts` + `lib/finances/aggregate.ts` |
| Droits par offre | `lib/subscriptions/entitlements.ts` (`hourlyProfitability` = Pro et Premium) |
| Synthèse du mois sur l'accueil | `app/(app)/dashboard/page.tsx` (calcul séparé) |

Données : tables `income`, `expenses` et `scheduled_expenses`, plus les séances de `calendar_events` pour les heures. Toutes sont protégées par la RLS « chaque utilisateur ne voit que ses lignes ».

Aucune bibliothèque de graphiques ni de PDF n'est installée. Les graphiques sont en SVG et CSS maison, et le PDF passe par l'impression du navigateur.

## 2. Incohérences de calcul détectées

| # | Problème | Effet | Gravité |
|---|---|---|---|
| C1 | La courbe mensuelle additionne **toutes les devises** dans un même total (`monthCurr` = dernière devise rencontrée) | 100 € + 50 000 FCFA s'affiche « 50 100 FCFA » | Haute |
| C2 | La synthèse de l'accueil additionne aussi les devises sans filtre | Même mélange sur l'accueil | Haute |
| C3 | Les mois **avant la création du compte** sont masqués, même si l'utilisateur y a saisi une opération réelle | Contredit la règle « une opération historique compte dans son vrai mois » | Haute |
| C4 | Un mois suivi sans opération apparaît à 0, comme un mois à zéro | Pas de distinction entre absence de données et résultat nul | Haute |
| C5 | Les heures comptent **les séances planifiées non encore faites** (seuls annulé, manqué et reporté sont exclus) | Le taux horaire est faussé dès qu'il y a des séances futures dans le mois | Haute |
| C6 | Les bornes des séances sont en UTC (`T00:00:00Z`) et non dans le fuseau de l'utilisateur ; une séance qui déborde de la période est ignorée | Séances perdues ou mal rattachées en bord de période | Moyenne |
| C7 | Le taux horaire moyen = solde global (dépenses générales comprises) ÷ toutes les heures | Il mélange les dépenses générales avec le temps des activités | Moyenne |
| C8 | La répartition par catégorie passe **silencieusement** des dépenses payées aux dépenses prévues quand rien n'est payé ; même chose pour les revenus | Le sens du graphique change sans que l'utilisateur le sache | Moyenne |
| C9 | Les remboursements apparaissent dans la répartition des revenus, comme une source de revenu | Contredit la règle sur les remboursements (la carte principale, elle, les sépare déjà) | Moyenne |
| C10 | Les textes « Général / Libre », « Revenu Général / Libre » et « … attendus » sont écrits en dur | Non traduits dans les 11 autres langues | Faible |
| C11 | Le montant encaissé est affiché en ambre | Contredit le code couleur (ambre = attention) | Faible |
| C12 | Une dépense récurrente payée est copiée dans `expenses` **sans lien** vers son échéancier (seule la note le dit) | Impossible de distinguer proprement récurrent et ponctuel | Moyenne |
| C13 | Les dépenses récurrentes à venir (`scheduled_expenses`) ne figurent pas dans les « dépenses à venir » des rapports | Les dépenses à venir sont sous-estimées | Moyenne |

Toutes ces corrections tiennent dans `profitability.ts` et la page d'accueil, sans migration. Seule l'exception C12 demanderait une colonne pour un lien fiable (voir 6).

## 3. Données réellement disponibles

- **Revenus** : montant, devise, date (`due_date` = mois de rattachement), reçu ou attendu, date de réception, activité, type (dont les exceptionnels et remboursements depuis 0029), provenance.
- **Dépenses** : montant, devise, date, payée ou prévue, catégorie, activité, pro/perso/mixte (+ % pro), marchand.
- **Échéancier** : dépenses programmées avec fréquence et prochaine échéance.
- **Temps** : séances du calendrier avec statut (planifiée, en cours, **terminée**, annulée, manquée, reportée).
- **Historique** : illimité en base (on lit actuellement 6 mois).

## 4. Déjà opérationnel

- Revenus encaissés et attendus, dépenses payées et prévues, solde net encaissé, par devise principale.
- Rentabilité par activité : revenus, dépenses, résultat net, heures et taux horaire (Pro).
- Répartition des dépenses par catégorie, courbe mensuelle sur 6 mois, filtre mois / année / dates.
- Revenus exceptionnels et remboursements séparés dans la carte principale.
- Impression, export CSV, interface traduite en 12 langues.

## 5. À développer

1. Correction des points C1 à C11.
2. Statut de couverture de chaque période (section 7).
3. Comparaison automatique avec la période précédente : mois, trimestre, année et période personnalisée.
4. Nouveaux graphiques : anneau, barres revenus/dépenses, barres par activité.
5. Analyse des dépenses : récurrentes, ponctuelles et exceptionnelles, prévu contre payé, variation.
6. Nouveau rapport PDF A4.
7. Liens « voir les opérations » depuis chaque indicateur.

## 6. Migrations

Aucune n'est indispensable. Une seule est **optionnelle** pour C12 : ajouter à `expenses` une colonne `scheduled_expense_id` (sans perte de données), plus un rattrapage prudent des lignes dont la note indique « Issu d'une dépense programmée ».

Sans cette migration, la distinction récurrent/ponctuel s'appuie sur la note. C'est fiable pour les nouvelles lignes, approximatif pour les anciennes, et sera affiché comme tel.

Les « dépenses exceptionnelles » n'existent pas comme catégorie. Je propose de ne pas les inventer : on montre récurrentes et ponctuelles, et on ajoutera des dépenses exceptionnelles plus tard si tu le valides (même principe que les revenus, migration nécessaire).

## 7. Périodes sans données : la règle

Pour chaque période, on calcule un **statut de couverture** à partir des seules opérations réelles (revenus, dépenses, séances) datées dans la période :

| Statut | Condition | Affichage |
|---|---|---|
| **Aucune donnée** | 0 opération datée dans la période | Message « Pas encore de données disponibles pour cette période… ». Aucun chiffre, aucun graphique, aucune tendance |
| **Suivie, à zéro** | La période est entièrement après le début du suivi et l'utilisateur a des opérations avant et après, mais aucune dedans | Chiffres à 0 affichés comme de vrais zéros, avec la mention « aucune opération ce mois-ci » |
| **Partielle** | La période contient le début du suivi (première opération ou création du compte), ou c'est la période en cours | Chiffres affichés avec un badge « Période partielle (depuis le 5 nov.) » ou « en cours » ; comparaison montrée en indicatif seulement |
| **Comparable** | Période complète et suivie | Comparaison en montant et en % |

- **Début du suivi** = la plus ancienne date entre la création du compte et la plus ancienne opération saisie. Une opération d'octobre saisie en novembre fait donc entrer octobre dans les statistiques.
- **Comparaison** affichée seulement si les deux périodes sont « suivie, à zéro » ou « comparable ». Un % n'est jamais calculé sur une base nulle : on affiche « nouveau » à la place.
- La courbe ne trace que les mois couverts. Un mois sans données est un trou dans la courbe, jamais un 0.

## 8. Architecture visuelle proposée (ordre des sections)

1. **En-tête compact** : titre « Statistiques financières », période et dates de début et de fin, sélecteur (Ce mois · Mois dernier · Trimestre · Année · Personnalisé), boutons PDF et CSV. Une ligne sur ordinateur, deux sur mobile.
2. **Bandeau de synthèse** : un seul bloc au lieu de 4 cartes.
   - À gauche, en grand, le **solde net encaissé** avec l'écart par rapport à la période précédente (▲/▼, montant et %).
   - À droite, 4 indicateurs compacts : revenus encaissés · revenus attendus · dépenses payées · dépenses à venir. La rentabilité horaire s'ajoute s'il y a des heures terminées.
   - Chaque indicateur est cliquable et mène aux opérations filtrées.
   - La ligne « dont exceptionnels / dont remboursements » reste sous les revenus.
3. **Ce mois contre le mois précédent** : barres groupées revenus/dépenses sur les deux périodes, ou l'état « pas encore de données » pour le mois précédent.
4. **Évolution** : courbe sur 6 ou 12 mois (revenus encaissés, dépenses payées, solde en pointillé), avec infobulle au survol ou au toucher. Mois non couverts en trou, bascule 6 mois / 12 mois.
5. **Dépenses** : deux blocs côte à côte.
   - Un **anneau** par catégorie, avec le total au centre et une légende triée en montants et %.
   - Une liste « ce qui a changé » : top 3 des hausses et baisses par catégorie, part récurrente/ponctuelle, et une jauge prévu/payé.
6. **Activités** (Pro) : barres horizontales du résultat net par activité, puis un tableau détaillé (revenus, dépenses attribuées, net, heures, €/h, net/h) avec un badge « données incomplètes » quand des heures ou des montants manquent. Les **dépenses générales** sont sur une ligne à part, jamais réparties entre les activités.
7. **Revenus** : sources (activités, ponctuels, exceptionnels) avec les remboursements dans une ligne séparée, grisée, notée « pas un gain ».

Code couleur : vert = positif, rouge = négatif ou alerte, ambre = à surveiller (attendu, prévu, partiel), encre profonde pour les montants neutres. Plus d'icône décorative sans fonction.

Graphiques : SVG maison réutilisables (anneau, barres, courbe). Aucune nouvelle bibliothèque : c'est léger, vectoriel, imprimable et adapté au mode sombre. Les infobulles fonctionnent aussi au toucher.

## 9. Mobile (composition dédiée)

- Synthèse : solde net en tête sur toute la largeur, puis les 4 indicateurs en grille 2×2 de même hauteur, montants en `tabular-nums` qui se réduisent automatiquement pour ne jamais être coupés.
- Sélecteur de période en pastilles défilantes, et une feuille dédiée pour « Personnalisé ».
- Graphiques en pleine largeur et centrés. Légendes **sous** le graphique, sur plusieurs lignes, jamais à côté.
- Tableau des activités transformé en **cartes empilées** (nom, net, €/h, puis le détail en accordéon) : aucun tableau qui déborde.
- Vérification à 320, 375, 414 et 768 px, sans défilement horizontal.

## 10. Export PDF haute qualité

- Une route dédiée `/reports/print`, réécrite comme un **document A4** et non comme une copie de l'écran.
  - **En-tête** : logo, nom, période, date d'édition.
  - **Page 1** : synthèse et comparaison.
  - **Page 2** : évolution et dépenses.
  - **Page 3** : activités.
  - **Annexe** : détail mensuel.
- Graphiques **SVG vectoriels** (les mêmes composants en mode impression), donc nets à toute résolution.
- CSS d'impression : `@page { size: A4; margin: 14mm }`, `break-inside: avoid` sur chaque bloc, en-têtes de tableaux répétés, couleurs forcées (`print-color-adjust: exact`), toujours en thème clair.
- Bouton « Télécharger le PDF » qui ouvre la vue A4 et lance l'impression (« Enregistrer en PDF »). Aucune dépendance lourde ; on garde l'option d'un vrai générateur côté serveur pour plus tard si tu le souhaites.
- Export CSV conservé tel quel.

## 11. Répartition Free / Pro / Premium recommandée

| Fonction | Free | Pro | Premium |
|---|---|---|---|
| Synthèse (encaissé, attendu, payé, à venir, solde net) | ✅ | ✅ | ✅ |
| Historique, courbe mensuelle 6 mois | ✅ | ✅ (12 mois) | ✅ (12 mois) |
| Répartition par catégorie (anneau) | ✅ | ✅ | ✅ |
| Comparaison avec le mois précédent | ✅ (simple) | ✅ | ✅ |
| Export CSV, impression PDF | ✅ | ✅ | ✅ |
| Rentabilité horaire et analyse par activité | 🔒 | ✅ | ✅ |
| Analyse détaillée des dépenses (variations, récurrent/ponctuel) | 🔒 | ✅ | ✅ |
| Comparaisons trimestre, année et personnalisée | 🔒 | ✅ | ✅ |
| Prévision de trésorerie (attendus + échéancier) | — | — | « Bientôt » |
| Analyse IA, recommandations, anomalies | — | — | « Bientôt » |

Rien de ce qui est gratuit aujourd'hui n'est retiré : synthèse, catégories, courbe et CSV restent gratuits.

La prévision de trésorerie est faisable sans IA, à partir des revenus attendus et de l'échéancier. Je propose de la livrer dans un second temps ; d'ici là, elle reste marquée « Bientôt ».

## 12. Découpage proposé de l'implémentation

1. **Lot A (calculs)** : C1 à C13 sauf C12, statut de couverture, comparaison de périodes, tests automatiques.
2. **Lot B (interface)** : en-tête, synthèse, comparaison, courbe, dépenses et activités, version mobile.
3. **Lot C (PDF)** : rapport A4.
4. **Lot D retiré** : pas de migration. La distinction récurrent/ponctuel s'appuie sur la note « Issu d'une dépense programmée », avec la mention « estimation » pour les anciennes lignes. On la reconsidérera seulement si elle se révèle insuffisante.
