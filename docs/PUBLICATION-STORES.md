# Publier Remind Me sur le Play Store et l'App Store

Ce document explique comment l'application mobile est construite et ce qu'il reste à faire pour l'envoyer aux stores.

## Comment c'est construit

L'application mobile utilise **Capacitor**. C'est une vraie application Android et iPhone qui affiche le site https://tryremind-me.vercel.app à l'intérieur.

- **Une seule base de code.** Chaque `git push` sur `main` met à jour le site *et* les applications déjà installées : pas besoin de renvoyer une version aux stores pour une correction de texte ou d'écran.
- **Il faut renvoyer une version aux stores seulement** si on change l'icône, le nom, l'écran de démarrage, les permissions ou qu'on ajoute un module natif (par exemple les notifications natives).

| Élément | Où | Valeur |
|---|---|---|
| Identifiant de l'application | `capacitor.config.json` | `com.tryremindme.app` (définitif après le premier envoi) |
| Nom affiché | `capacitor.config.json` | Remind Me |
| Page d'ouverture | `server.url` | `/login` (renvoie au tableau de bord si déjà connecté) |
| Projet Android | dossier `android/` | à ouvrir avec Android Studio |
| Projet iPhone | dossier `ios/` | à ouvrir avec Xcode (Mac obligatoire) |
| Icône et écran de démarrage | dossier `resources/` | régénérer avec la commande plus bas |
| Page hors connexion | `mobile/www/offline.html` | affichée si pas d'Internet au lancement |

## Ce qui est déjà en place pour respecter les règles des stores

- **Pas de vente d'abonnement dans l'application.** Apple et Google interdisent de vendre un service numérique sans passer par leur propre paiement. Dans l'application (repérée par « RemindMeApp » dans l'identifiant du navigateur) :
  - la page vitrine avec les prix n'apparaît pas (`/` renvoie vers `/login`) ;
  - Réglages → Abonnement montre seulement le forfait en cours, sans prix, sans bouton, sans lien ;
  - la fenêtre d'offres ne s'ouvre pas.
  Les forfaits restent achetables sur le site, et un forfait payé sur le site est bien actif dans l'application.
- **Suppression du compte depuis l'application** : Réglages → Données → « Supprimer mon compte définitivement ».
- **Politique de confidentialité** : https://tryremind-me.vercel.app/confidentialite
- **Page de suppression de compte** (demandée par Google) : https://tryremind-me.vercel.app/suppression-compte
- **Pas de connexion Google/Facebook** : Apple n'exige donc pas « Se connecter avec Apple ».

## À faire avant l'envoi

1. **Adresse e-mail de contact.** Dans Vercel → projet → Settings → Environment Variables, ajouter `NEXT_PUBLIC_SUPPORT_EMAIL` avec une adresse que tu consultes, puis redéployer. Elle apparaîtra sur les deux pages légales. Les stores demandent aussi une adresse de contact sur la fiche.
2. **Compte de test pour les vérificateurs.** Apple et Google testent l'application : crée un compte de démonstration avec quelques activités, et donne l'e-mail et le mot de passe dans le formulaire d'envoi (rubrique « App Review Information » chez Apple, « Accès à l'application » chez Google).
3. **Le site doit être en ligne** : l'application affiche le site, donc si Vercel est en pause, l'application aussi.

## Google Play (Android)

1. **Compte développeur** : https://play.google.com/console, 25 $ une seule fois. Google demande une vérification d'identité.
   - Pour un compte *personnel* créé récemment, Google exige un **test fermé avec au moins 12 testeurs pendant 14 jours** avant de pouvoir publier pour tout le monde. Prévois une liste de 12 adresses Gmail de proches.
2. **Créer le fichier à envoyer (AAB)** dans Android Studio :
   - ouvrir le dossier `android/` ;
   - si Android Studio affiche « Unsupported class file major version 69 » : **File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK**, choisir **jbr-21** (déjà installé sur ce PC), puis *Sync* ;
   - menu **Build → Generate Signed App Bundle / APK → Android App Bundle** ;
   - créer une **clé de signature** (`.jks`) et **la sauvegarder précieusement** (clé USB + cloud) avec son mot de passe : sans elle, impossible de mettre l'application à jour ;
   - choisir **release** : le fichier sort dans `android/app/release/app-release.aab`.
3. **Fiche du store** : nom, description courte (80 caractères), description longue, icône 512×512 (`public/icons/icon-512x512.png`), bannière 1024×500, au moins 2 captures d'écran de téléphone.
4. **Formulaires** : politique de confidentialité (lien ci-dessus), « Sécurité des données » (voir le tableau plus bas), classification du contenu, public cible (plus de 13 ans), lien de suppression de compte.
5. **Envoyer** l'AAB dans *Test fermé*, puis *Production* après les 14 jours.

## App Store (iPhone)

1. **Compte Apple Developer** : https://developer.apple.com/programs/, 99 $ par an.
2. **Un Mac est obligatoire** (Xcode ne fonctionne que sur Mac). Solutions sans Mac : louer un Mac en ligne (MacinCloud…) ou utiliser un service de compilation (Ionic Appflow, Codemagic).
3. Sur le Mac :
   ```
   npm install
   npx cap sync ios
   npx cap open ios
   ```
   Dans Xcode : choisir ton équipe (Signing & Capabilities), puis **Product → Archive → Distribute App → App Store Connect**.
4. **App Store Connect** (https://appstoreconnect.apple.com) : créer l'application avec l'identifiant `com.tryremindme.app`, remplir la fiche, les captures (iPhone 6,9" et 6,5"), la politique de confidentialité, les « App Privacy » (tableau plus bas) et le compte de test.

**Attention, règle Apple 4.2** : Apple refuse parfois les applications qui « ne sont qu'un site web ». Ce qui joue en notre faveur : écran de démarrage, page hors connexion, pas de page vitrine, navigation d'application. Pour mettre toutes les chances de notre côté, l'étape suivante est d'ajouter les **notifications natives** (voir plus bas).

## Données déclarées aux stores (« Sécurité des données » / « App Privacy »)

| Donnée | Collectée | Usage | Partagée avec des tiers pour pub |
|---|---|---|---|
| E-mail, nom | Oui | Compte, fonctionnement | Non |
| Contenu saisi (activités, tâches, agenda) | Oui | Fonctionnement | Non |
| Données financières saisies (revenus, dépenses) | Oui | Fonctionnement | Non |
| Photo de profil | Oui (facultatif) | Fonctionnement | Non |
| Statistiques d'usage anonymes | Oui | Analyse | Non |
| Localisation, contacts du téléphone, caméra, micro | Non | — | — |

Les données sont chiffrées en transit (HTTPS) et l'utilisateur peut demander leur suppression.

## Commandes utiles (sur ce PC)

```
npm run mobile:sync           # recopie la config et les fichiers dans android/ et ios/
npm run mobile:assets         # régénère icônes et écrans de démarrage depuis resources/
npm run mobile:android        # ouvre le projet dans Android Studio
```

Pour changer l'icône : remplacer `resources/icon.png` (1024×1024, idéalement l'original en haute définition) et `resources/splash.png` (2732×2732), puis `npm run mobile:assets`.

Avant chaque nouvel envoi aux stores, augmenter le numéro de version :
- Android : `versionCode` (+1) et `versionName` dans `android/app/build.gradle` ;
- iPhone : *Version* et *Build* dans Xcode.

## Prochaine étape conseillée : notifications natives

Dans l'application, les notifications web actuelles (`web-push`) ne fonctionnent pas : ni Android ni iPhone ne les acceptent à l'intérieur d'une application. Pour que les rappels arrivent sur le téléphone, il faut :
1. créer un projet **Firebase** (gratuit) et y ajouter l'application Android → fichier `google-services.json` ;
2. sur Apple Developer, créer une **clé APNs** ;
3. ajouter le module `@capacitor/push-notifications`, enregistrer le jeton de l'appareil dans Supabase et envoyer les rappels via Firebase en plus de web-push.
