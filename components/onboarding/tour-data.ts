import { msg } from "@/lib/i18n/catalog";
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Calendar,
  Wallet,
  Bell,
  Inbox,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  Sparkles,
  Clock,
  TrendingUp,
  TrendingDown,
  Repeat,
  Download,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  CalendarClock,
  Filter,
} from "lucide-react";

export interface TourStep {
  id: string;
  route?: string; // Route cible pour navigation automatique lors du tour général
  targetSelector: string; // Sélecteur principal (stable via data-tour)
  fallbackSelector?: string; // Sélecteur de secours (ex: mobile vs desktop)
  title: string;
  subtitle: string;
  description: string;
  purpose?: string; // À quoi sert cet espace / Quand l'utiliser
  keyActions?: string[]; // Comment réaliser les principales opérations
  interpretation?: string; // Comment interpréter les informations
  commonMistakes?: string; // Erreurs ou confusions courantes à éviter
  points?: string[]; // Synthèse rapide
  icon: any;
  placement?: "bottom" | "top" | "left" | "right" | "auto";
  isModal?: boolean; // Étape modale centrée (introduction, conclusion ou fallback)
}

/**
 * --------------------------------------------------------------------------------
 * GUIDE GÉNÉRAL DE PREMIÈRE UTILISATION (NIVEAU 1)
 * Présentation globale structurée et progressive du SaaS Remind Me
 * --------------------------------------------------------------------------------
 */
export const MAIN_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    targetSelector: "",
    title: msg("Bienvenue sur Remind Me 👋"),
    subtitle: msg("Votre copilote multi-activités & trésorerie réelle"),
    description:
      msg("Remind Me est spécialement conçu pour les professionnels indépendants, multi-actifs et consultants qui jonglent entre plusieurs activités, contrats et flux financiers. En un seul endroit, coordonnez votre temps, vos engagements et votre argent en toute sérénité."),
    purpose:
      msg("Ce guide introductif rapide vous présente l'architecture de votre application et les principes clés pour piloter vos journées sans stress."),
    points: [
      msg("Multi-activités : gérez salariat, freelance, coaching et projets au même endroit"),
      msg("Rigueur financière : séparation stricte entre sommes prévues et trésorerie réelle encaissée"),
      msg("Coordination sans faille : calendrier anti-conflits, tâches minutées et rappels sonores"),
    ],
    icon: Sparkles,
    isModal: true,
  },
  {
    id: "nav-general",
    route: "/dashboard",
    targetSelector: '[data-tour="nav-dashboard"]',
    fallbackSelector: '[data-tour="mobile-nav-bar"]',
    title: msg("Navigation Générale & Espaces de Travail"),
    subtitle: msg("Accès instantané à vos outils"),
    description:
      msg("Le menu latéral (ou la barre de navigation sur mobile) vous donne un accès permanent à tous vos espaces de travail dédiés : vos Activités, votre Calendrier, vos Tâches, vos Finances, votre Inbox, vos Notifications, vos Rapports et vos Paramètres."),
    keyActions: [
      msg("Sur ordinateur : barre latérale fixe avec accès rapide au centre d'aide '?' et aux notifications"),
      msg("Sur mobile : barre inférieure compacte et menu tiroir avec raccourcis complets"),
    ],
    points: [
      msg("Navigation fluide sans rechargement de page"),
      msg("Pastilles visuelles de notifications et messages non lus"),
    ],
    icon: LayoutDashboard,
    placement: "right",
  },
  {
    id: "dashboard",
    route: "/dashboard",
    targetSelector: '[data-tour="dashboard-header"]',
    fallbackSelector: '[data-tour="dashboard-kpi"]',
    title: msg("Tableau de Bord Central"),
    subtitle: msg("Votre centre de contrôle quotidien"),
    description:
      msg("Le tableau de bord synthétise l'état de votre journée en temps réel. Il vous informe immédiatement des urgences à traiter, affiche votre solde net réel et regroupe vos séances du jour."),
    purpose:
      msg("À consulter chaque matin pour prioriser vos actions et vérifier votre trésorerie sans naviguer dans chaque sous-menu."),
    keyActions: [
      msg("Consulter le bloc 'Nécessite votre attention' pour traiter factures échues et tâches en retard"),
      msg("Utiliser les actions rapides pour créer instantanément une activité, tâche ou dépense"),
    ],
    points: [
      msg("KPIs en temps réel : Revenus reçus, Dépenses payées et Solde net"),
      msg("Bloc 'Aujourd'hui' synchronisé avec votre agenda"),
    ],
    icon: LayoutDashboard,
    placement: "bottom",
  },
  {
    id: "activities-and-calendar",
    route: "/activities",
    targetSelector: '[data-tour="activity-create"]',
    fallbackSelector: '[data-tour="nav-activities"]',
    title: msg("Activités & Calendrier Intelligent"),
    subtitle: msg("Multi-casquettes et zéro conflit d'horaires"),
    description:
      msg("Chaque métier ou contrat possède ses règles. Vous configurez vos activités (nom, couleur, type de rémunération, statut) et Remind Me planifie vos séances dans le calendrier en prévenant les chevauchements."),
    purpose:
      msg("Gérer des activités ponctuelles, temporaires ou des routines pérennes avec calcul automatique de la rentabilité."),
    keyActions: [
      msg("Créer une activité avec sa propre couleur : elle colorera tous vos créneaux d'agenda"),
      msg("Définir la rémunération : elle génère automatiquement vos prévisions de revenus"),
    ],
    commonMistakes:
      msg("Ne pas confondre une activité temporaire (qui a une date de fin) avec une routine (qui se répète indéfiniment)."),
    icon: Briefcase,
    placement: "bottom",
  },
  {
    id: "tasks-and-commitments",
    route: "/tasks",
    targetSelector: '[data-tour="task-tabs"]',
    fallbackSelector: '[data-tour="task-create"]',
    title: msg("Tâches & Engagements Prioritaires"),
    subtitle: msg("Cycle de vie clair et rappels sonores"),
    description:
      msg("Ne laissez filer aucune échéance. Suivez vos tâches quotidiennes, associez-les à une activité précise et activez des rappels audios déclenchés à la minute exacte dans votre navigateur."),
    keyActions: [
      msg("Filtrez instantanément : En retard, Aujourd'hui, À venir ou Terminées"),
      msg("Utilisez le bouton '+7j' pour reporter une tâche sans stress"),
      msg("Recevez une notification sonore Web Audio au moment configuré"),
    ],
    points: [
      msg("Cycle clair : À faire → En cours → Terminée"),
      msg("Niveaux de priorité pour distinguer l'urgent de l'accessoire"),
    ],
    icon: CheckSquare,
    placement: "bottom",
  },
  {
    id: "finances-real-cashflow",
    route: "/finances",
    targetSelector: '[data-tour="finances-tabs"]',
    fallbackSelector: '[data-tour="nav-finances"]',
    title: msg("Gestion Financière & Trésorerie Réelle"),
    subtitle: msg("La règle d'or : ce qui est prévu vs ce qui est encaissé"),
    description:
      msg("Remind Me applique une rigueur absolue : un revenu promis n'est pas encore sur votre compte bancaire. Votre solde net ne prend en compte QUE les paiements réellement encaissés et les dépenses effectivement réglées."),
    purpose:
      msg("Suivre simultanément vos Revenus, vos Dépenses ponctuelles, vos Dépenses programmées récurrentes, vos Budgets par catégorie et vos Cagnottes d'épargne."),
    commonMistakes:
      msg("Penser qu'un revenu attendu gonfle votre solde net : il faut cliquer sur 'Encaisser' pour valider son encaissement réel."),
    icon: Wallet,
    placement: "bottom",
  },
  {
    id: "inbox-and-notifications",
    route: "/messages",
    targetSelector: '[data-tour="inbox-tabs"]',
    fallbackSelector: '[data-tour="nav-inbox"]',
    title: msg("L'Inbox & Le Centre de Notifications"),
    subtitle: msg("Deux rôles complémentaires et coordonnés"),
    description:
      msg("Remind Me sépare clairement l'information générale du traitement opérationnel : le Centre de notifications vous alerte sur toute l'application, tandis que l'Inbox est votre boîte de traitement financier prioritaire."),
    purpose:
      msg("Dans l'Inbox, retrouvez en 3 onglets (À traiter, En attente, Historique) tous les paiements échus, dépenses à régler et bilans officiels. Une action dans l'Inbox met à jour la base réelle et résout la notification liée."),
    points: [
      msg("Inbox : encaissement direct, règlement de dépenses et reports rapides"),
      msg("Notifications : historique global, alertes de séances et filtres multi-critères"),
      msg("Zéro doublon : l'action dans l'un synchronise immédiatement l'autre"),
    ],
    icon: Inbox,
    placement: "bottom",
  },
  {
    id: "settings-and-customization",
    route: "/settings",
    targetSelector: '[data-tour="settings-tabs"]',
    fallbackSelector: '[data-tour="nav-settings"]',
    title: msg("Paramètres & Personnalisation"),
    subtitle: msg("Votre compte, vos devises et votre sécurité"),
    description:
      msg("Personnalisez Remind Me selon vos habitudes de travail : devise par défaut (FCFA, EUR, USD...), fuseau horaire local, thème (Clair/Sombre), préférences de notifications push et audio."),
    points: [
      msg("Isolation stricte PostgreSQL RLS pour garantir l'étanchéité de vos données"),
      msg("Test du carillon audio et configuration des alertes push"),
      msg("Possibilité de relancer le guide interactif à tout moment"),
    ],
    icon: Settings,
    placement: "bottom",
  },
  {
    id: "tour-completed",
    route: "/dashboard",
    targetSelector: '[data-tour="help-center-btn"]',
    title: msg("Vous êtes prêt à démarrer ! 🚀"),
    subtitle: msg("Des guides spécialisés toujours à portée de main"),
    description:
      msg("Félicitations, vous connaissez désormais les fondations de Remind Me. Dans chaque section de l'application, vous trouverez un bouton 'Guide interactif' pour approfondir les mécanismes propres à cette section."),
    points: [
      msg("Cliquez sur le bouton '?' en haut à droite pour ouvrir le Centre d'aide"),
      msg("Relancez le guide complet ou un guide de section quand vous le souhaitez"),
      msg("Commencez par créer votre première activité professionnelle !"),
    ],
    icon: HelpCircle,
    isModal: true,
  },
];

/**
 * --------------------------------------------------------------------------------
 * GUIDES CONTEXTUELS SPÉCIALISÉS PAR SECTION (NIVEAU 2)
 * Déclenchés à la demande depuis chaque section ou depuis le Centre d'aide
 * --------------------------------------------------------------------------------
 */
export const CONTEXTUAL_TOURS: Record<string, TourStep[]> = {
  // 1. TABLEAU DE BORD
  dashboard: [
    {
      id: "dash-header",
      targetSelector: '[data-tour="dashboard-header"]',
      title: msg("Vue d'ensemble du Tableau de Bord"),
      subtitle: msg("Centre de pilotage quotidien"),
      description:
        msg("Votre point d'ancrage chaque jour. Cet en-tête vous salue, affiche votre fuseau horaire de travail et propose des raccourcis rapides pour créer vos éléments sans quitter la page."),
      purpose: msg("Donner une vision immédiate de vos priorités dès votre connexion."),
      keyActions: [
        msg("Utilisez les boutons 'Nouvelle activité', 'Nouvelle tâche' ou 'Nouvelle dépense'"),
        msg("Consultez la bannière d'accueil vocale et visuelle personnalisée"),
      ],
      icon: LayoutDashboard,
      placement: "bottom",
    },
    {
      id: "dash-kpis",
      targetSelector: '[data-tour="dashboard-kpi"]',
      title: msg("Les KPIs Financiers Réels"),
      subtitle: msg("Trésorerie encaissée vs prévisions"),
      description:
        msg("Ces quatre compteurs vous montrent la réalité comptable du mois en cours : les Revenus attendus, les Revenus encaissés, les Dépenses payées et votre Solde net réel."),
      interpretation:
        "Solde net = Total reçu − Dépenses payées. Si vos revenus attendus sont élevés mais que votre solde net est faible, consultez l'Inbox pour relancer ou enregistrer vos encaissements.",
      commonMistakes:
        msg("Ne dépensez jamais sur la base des 'Revenus attendus' : seule la colonne 'Revenus encaissés' correspond à de la trésorerie disponible."),
      icon: TrendingUp,
      placement: "bottom",
    },
    {
      id: "dash-attention",
      targetSelector: '[data-tour="dashboard-attention"]',
      fallbackSelector: '[data-tour="dashboard-today"]',
      title: msg("Panneau 'Nécessite votre attention'"),
      subtitle: msg("Traitement prioritaire des blocages"),
      description:
        msg("Ce bloc dynamique n'apparaît que lorsque des éléments requièrent votre décision : paiements clients en retard, dépenses échues à régler d'urgence ou tâches prioritaires arrivées à échéance."),
      keyActions: [
        msg("Cliquez sur l'action rapide d'une carte pour la traiter directement"),
        msg("Cliquez sur 'Gérer tous les rappels' pour ouvrir le centre de notifications"),
      ],
      points: [
        msg("Dès qu'un élément est réglé ou encaissé, il disparaît immédiatement de ce panneau"),
        msg("Aucune alerte obsolète n'est conservée"),
      ],
      icon: AlertCircle,
      placement: "bottom",
    },
    {
      id: "dash-today",
      targetSelector: '[data-tour="dashboard-today"]',
      title: msg("Votre Journée en un Coup d'Œil"),
      subtitle: msg("Planning & Tâches du jour"),
      description:
        msg("Visualisez vos rendez-vous, séances d'activités et tâches programmées pour aujourd'hui, triés par heure croissante."),
      keyActions: [
        msg("Cochez une tâche pour la marquer comme terminée"),
        msg("Cliquez sur une séance pour consulter ses détails dans le calendrier"),
      ],
      icon: Calendar,
      placement: "top",
    },
  ],

  // 2. ACTIVITÉS PROFESSIONNELLES
  activities: [
    {
      id: "act-header",
      targetSelector: '[data-tour="activities-header"]',
      fallbackSelector: '[data-tour="activity-create"]',
      title: msg("Gestion des Activités & Missions"),
      subtitle: msg("Vos différents métiers et casquettes"),
      description:
        msg("Une activité dans Remind Me représente un contrat de travail, une mission de freelance, un cabinet de conseil ou une entreprise. Chaque activité a son identité, sa couleur et sa rémunération."),
      purpose:
        msg("Permettre aux indépendants et multi-actifs de cloisonner leurs temps et leurs revenus tout en gardant une vision unifiée."),
      icon: Briefcase,
      placement: "bottom",
    },
    {
      id: "act-create",
      targetSelector: '[data-tour="activity-create"]',
      title: msg("Créer une Nouvelle Activité"),
      subtitle: "Configuration initiale",
      description:
        msg("Définissez le libellé, la couleur distinctive, le type de rémunération (mensuelle, forfaitaire, par séance, horaire) et la nature de l'activité."),
      keyActions: [
        msg("Attribuez une couleur unique : elle teintera tous vos créneaux dans le calendrier"),
        msg("Précisez la rémunération : elle calculera automatiquement vos revenus prévisionnels"),
        msg("Rattachez l'activité à un client ou contact pour centraliser les échanges"),
      ],
      icon: Briefcase,
      placement: "bottom",
    },
    {
      id: "act-nature",
      targetSelector: '[data-tour="activities-list"]',
      title: msg("Nature de l'Activité & Évolution"),
      subtitle: "Ponctuelle, Temporaire ou Routine",
      description:
        msg("Remind Me distingue 3 natures d'activité : les activités ponctuelles (mission unique), temporaires (durée déterminée avec date d'expiration) et les routines (habitudes pérennes)."),
      interpretation:
        msg("Lorsqu'une activité temporaire est effectuée de manière régulière pendant plusieurs semaines, Remind Me vous suggère automatiquement de la faire évoluer en routine pour simplifier votre agenda."),
      keyActions: [
        msg("Renouveler une activité expirée depuis la notification dédiée"),
        msg("Mettre en pause ou archiver une activité en cas de suspension de contrat"),
      ],
      commonMistakes:
        msg("Modifier le montant d'une activité met à jour les futures échéances, mais ne modifie jamais l'historique financier déjà encaissé."),
      icon: Repeat,
      placement: "top",
    },
  ],

  // 3. CALENDRIER & PLANNING
  calendar: [
    {
      id: "cal-views",
      targetSelector: '[data-tour="calendar-views"]',
      title: msg("Sélecteur de Vues du Calendrier"),
      subtitle: msg("4 granularités pour maîtriser votre temps"),
      description:
        msg("Basculez en un clic entre la vue Mois (vision macroscopique), Semaine (détail horaire), Jour (vue opérationnelle) et Agenda (liste chronologique)."),
      purpose: msg("Adapter la visibilité selon que vous planifiez votre mois ou exécutez votre journée."),
      icon: Calendar,
      placement: "bottom",
    },
    {
      id: "cal-grid",
      targetSelector: '[data-tour="calendar-grid"]',
      title: msg("Grille de Planning & Détection des Conflits"),
      subtitle: msg("Couleurs dédiées et alertes de chevauchement"),
      description:
        msg("Chaque séance apparaît avec la couleur propre à son activité. Si deux créneaux se chevauchent, une alerte visuelle rouge 'Conflit d'horaires' vous avertit immédiatement pour éviter les doubles engagements."),
      interpretation:
        msg("Les pastilles financières ambrées représentent les échéances de vos dépenses programmées à la date où elles doivent être réglées."),
      keyActions: [
        msg("Cliquez sur un créneau pour modifier ses horaires ou signaler une séance terminée"),
        msg("Glissez-déposez ou ajustez vos créneaux pour résoudre les chevauchements"),
      ],
      icon: Calendar,
      placement: "top",
    },
  ],

  // 4. TÂCHES & ENGAGEMENTS
  tasks: [
    {
      id: "task-create",
      targetSelector: '[data-tour="task-create"]',
      title: msg("Création d'une Tâche & Priorisation"),
      subtitle: msg("Distinguer l'urgent de l'important"),
      description:
        msg("Ajoutez une tâche en renseignant son titre, son niveau de priorité (Basse, Moyenne, Haute, Urgente), son échéance et son rappel sonore dédié."),
      keyActions: [
        msg("Liez la tâche à une activité pour faciliter le filtrage par casquette professionnelle"),
        msg("Programmez un rappel audio (15 min, 30 min, 1h avant) : le carillon retentira à la minute exacte"),
      ],
      icon: CheckSquare,
      placement: "bottom",
    },
    {
      id: "task-tabs",
      targetSelector: '[data-tour="task-tabs"]',
      title: msg("Filtres Temporels & Cycle de Vie"),
      subtitle: msg("À faire, En retard, Terminées"),
      description:
        msg("Suivez le cycle naturel de vos tâches : isolez immédiatement les tâches en retard, celles du jour, celles à venir ou consultez l'historique complet."),
      keyActions: [
        msg("Cliquez sur '+7j' pour reporter rapidement une tâche non urgente"),
        msg("Cochez une tâche pour la marquer comme terminée et stopper ses rappels"),
      ],
      commonMistakes:
        msg("Laisser des tâches en retard sans les traiter : utilisez le report '+7j' pour garder une to-do propre et motivante."),
      icon: CheckSquare,
      placement: "bottom",
    },
  ],

  // 5. FINANCES & TRÉSORERIE RÉELLE
  finances: [
    {
      id: "fin-header",
      targetSelector: '[data-tour="finance-header"]',
      title: msg("Vue d'ensemble de la Trésorerie"),
      subtitle: msg("Clarté financière sans compromis"),
      description:
        msg("Remind Me applique une comptabilité de caisse stricte : aucun montant estimé ou virtuel ne vient fausser votre vision de l'argent disponible."),
      points: [
        msg("Total reçu : argent réellement entré sur vos comptes"),
        msg("Dépenses payées : argent effectivement décaissé"),
        msg("Solde net : votre marge financière disponible réelle"),
      ],
      icon: Wallet,
      placement: "bottom",
    },
    {
      id: "fin-tabs",
      targetSelector: '[data-tour="finances-tabs"]',
      title: msg("Les 5 Volets Financiers"),
      subtitle: msg("Revenus, Dépenses, Programmées, Budgets, Épargne"),
      description:
        msg("Basculez entre les onglets pour gérer chaque dimension de vos finances :"),
      keyActions: [
        msg("Revenus : paiements attendus vs encaissés"),
        msg("Dépenses : charges ponctuelles réglées"),
        msg("Dépenses programmées : loyers, abonnements et récurrences futures"),
        msg("Budgets : plafonds mensuels avec progression calculée sur le réel"),
        msg("Épargne : suivi de vos cagnottes et projets d'avenir"),
      ],
      commonMistakes:
        msg("Pour qu'une dépense programmée alimente la jauge d'un budget, elle doit être marquée comme payée à son échéance."),
      icon: Wallet,
      placement: "bottom",
    },
    {
      id: "fin-export",
      targetSelector: '[data-tour="finance-export"]',
      title: "Export Comptable CSV",
      subtitle: msg("Données certifiées pour votre comptabilité"),
      description:
        msg("Téléchargez l'intégralité de vos écritures au format CSV compatible avec Excel et les logiciels comptables (délimiteur point-virgule, encodage UTF-8)."),
      icon: Download,
      placement: "bottom",
    },
  ],

  // 6. INBOX (BOÎTE DE RÉCEPTION FINANCIÈRE)
  messages: [
    {
      id: "inbox-header",
      targetSelector: '[data-tour="inbox-header"]',
      title: msg("L'Inbox : Votre Boîte de Traitement Financier"),
      subtitle: msg("La différence fondamentale avec les notifications"),
      description:
        msg("L'Inbox est votre espace d'action prioritaire pour toutes les opérations financières nécessitant votre validation : factures en attente, échéances échues, dépenses à régler et bilans certifiés."),
      purpose:
        msg("Alors que le Centre de notifications vous alerte sur toute la vie de l'application, l'Inbox est votre table de travail pour exécuter vos paiements et règlements en 1 clic."),
      points: [
        msg("À traiter : paiements échus non perçus et dépenses dues immédiatement"),
        msg("En attente : prévisions de revenus et prochaines récurrences planifiées"),
        msg("Historique : trace vérifiable de toutes les opérations réglées"),
      ],
      icon: Inbox,
      placement: "bottom",
    },
    {
      id: "inbox-tabs",
      targetSelector: '[data-tour="inbox-tabs"]',
      title: msg("Organisation en 3 Onglets Étanche"),
      subtitle: msg("À traiter • En attente • Historique"),
      description:
        msg("Basculez entre les onglets pour voir ce qui est urgent, ce qui arrivera plus tard et ce qui a déjà été résolu."),
      keyActions: [
        msg("Onglet 'À traiter' : cliquez sur 'Encaisser' pour valider la réception d'un paiement"),
        msg("Cliquez sur 'Régler' ou 'Régler l'échéance' pour enregistrer une dépense payée"),
        msg("Cliquez sur '+7j' pour reporter une date d'échéance sans la perdre"),
      ],
      interpretation:
        msg("Dès que vous validez un encaissement dans l'Inbox, la notification associée dans le centre de notifications est automatiquement résolue et votre Solde net dans Finances augmente. Aucun double comptage n'est possible."),
      icon: Inbox,
      placement: "bottom",
    },
    {
      id: "inbox-kpis",
      targetSelector: '[data-tour="inbox-kpis"]',
      title: msg("Synthèse des Sommes en Jeu"),
      subtitle: msg("Montants totaux à encaisser et à décaisser"),
      description:
        msg("Ces indicateurs résument en temps réel le volume financier de l'onglet actif. Dans 'À traiter', ils vous indiquent exactement combien d'argent doit rentrer et combien doit sortir."),
      icon: TrendingUp,
      placement: "bottom",
    },
  ],

  // 7. CENTRE DE NOTIFICATIONS & RAPPELS
  notifications: [
    {
      id: "notif-header",
      targetSelector: '[data-tour="notifications-header"]',
      title: msg("Centre de Notifications & Alertes Proactives"),
      subtitle: msg("Toute l'intelligence de Remind Me"),
      description:
        msg("Ce centre regroupe l'ensemble des événements du système : séances à venir, rappels de tâches, expirations d'activités, alertes financières et suggestions d'évolution vers une routine."),
      purpose:
        msg("Vous tenir informé de façon proactive sans surcharger votre attention. Les alertes critiques sont mises en avant, avec des actions rapides intégrées."),
      icon: Bell,
      placement: "bottom",
    },
    {
      id: "notif-filters",
      targetSelector: '[data-tour="notifications-tabs"]',
      title: msg("Filtres Multi-Critères Avancés"),
      subtitle: msg("Recherche textuelle, types, statuts et dates"),
      description:
        msg("Retrouvez n'importe quelle notification en combinant les filtres :"),
      keyActions: [
        msg("Recherche textuelle dans le titre et le corps des notifications"),
        msg("Filtrage par Type (Activités, Séances, Tâches, Finances, Suggestions)"),
        msg("Filtrage par Statut (Non lue, Lue, En attente d'action, Résolue)"),
        msg("Filtrage par Période (Aujourd'hui, 7 jours, 30 jours, Personnalisée)"),
        msg("Filtrage par Activité concernée pour isoler une mission spécifique"),
      ],
      icon: Filter,
      placement: "bottom",
    },
    {
      id: "notif-actions",
      targetSelector: '[data-tour="notifications-list"]',
      title: "Actions Rapides & Historique",
      subtitle: msg("Résolution en un clic sans changer de page"),
      description:
        msg("Chaque carte de notification propose l'action métier correspondante : terminer une séance, valider une routine, renouveler un contrat ou reporter une tâche. L'onglet 'Historique' conserve la trace de toutes les actions passées."),
      icon: CheckCircle2,
      placement: "top",
    },
  ],

  // 8. CLIENTS & CONTACTS
  clients: [
    {
      id: "cli-header",
      targetSelector: '[data-tour="clients-header"]',
      title: "Clients & Organisations Professionnelles",
      subtitle: msg("Votre carnet d'adresses professionnel"),
      description:
        msg("Structurez vos partenaires commerciaux en créant des Organisations (sociétés clientes, écoles, agences) et rattachez-y vos contacts privilégiés."),
      purpose:
        msg("Lier directement vos activités et vos revenus à des clients identifiés pour simplifier vos relances et vos bilans."),
      icon: Users,
      placement: "bottom",
    },
    {
      id: "cli-create",
      targetSelector: '[data-tour="client-create"]',
      title: "Nouveau Contact / Organisation",
      subtitle: msg("Création rapide"),
      description:
        msg("Ajoutez vos interlocuteurs avec leurs emails, téléphones et adresses professionnelles pour lancer un appel ou envoyer un message en un clic."),
      icon: Users,
      placement: "bottom",
    },
  ],

  // 9. RAPPORTS & RENTABILITÉ
  reports: [
    {
      id: "rep-kpi",
      targetSelector: '[data-tour="reports-kpi"]',
      title: msg("Calcul de Rentabilité Réelle"),
      subtitle: msg("Combien vaut réellement votre temps"),
      description:
        msg("Remind Me croise vos heures effectivement passées dans votre calendrier avec vos revenus réellement encaissés pour calculer votre taux horaire réel par activité."),
      interpretation:
        msg("Si une activité vous rapporte beaucoup mais vous demande un nombre d'heures disproportionné, son taux horaire réel chutera. Cet indicateur vous aide à renégocier vos tarifs."),
      icon: BarChart3,
      placement: "bottom",
    },
    {
      id: "rep-export",
      targetSelector: '[data-tour="reports-export-btn"]',
      title: "Exportation & Impression",
      subtitle: msg("Bilan PDF et CSV certifiés"),
      description:
        msg("Générez une version imprimable propre ou téléchargez un tableur CSV complet pour votre bilan annuel ou votre déclaration fiscale."),
      icon: Download,
      placement: "bottom",
    },
  ],

  // 10. PARAMÈTRES
  settings: [
    {
      id: "set-tabs",
      targetSelector: '[data-tour="settings-tabs"]',
      title: msg("Paramètres & Personnalisation Complète"),
      subtitle: msg("Contrôle de votre espace Remind Me"),
      description:
        msg("Gérez votre identité, vos préférences de devises, votre fuseau horaire de travail, l'apparence visuelle (Clair/Sombre) et testez vos alertes audio et notifications push."),
      keyActions: [
        msg("Onglet Profil : ajustez votre nom, devise principale et format de date"),
        msg("Onglet Notifications : testez le carillon sonore et activez les alertes push"),
        msg("Onglet Données : exportez toutes vos informations ou gérez vos sauvegardes"),
      ],
      points: [
        msg("Sécurité PostgreSQL RLS : isolation totale de vos données"),
        msg("Relancez le guide interactif complet à tout moment depuis le Centre d'aide"),
      ],
      icon: Settings,
      placement: "bottom",
    },
  ],
};
