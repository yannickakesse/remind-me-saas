"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Calendar,
  Wallet,
  Bell,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  Clock,
  Download,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { saveTourState } from "@/lib/onboarding/tour-actions";

export interface TourStep {
  id: string;
  route?: string; // Route cible vers laquelle naviguer automatiquement
  targetSelector: string;
  fallbackSelector?: string;
  title: string;
  subtitle: string;
  description: string;
  points?: string[];
  icon: any;
  placement?: "bottom" | "top" | "left" | "right" | "auto";
  isModal?: boolean; // Étape d'introduction ou conclusion sans spotlight découpé arbitrairement
}

/**
 * NIVEAU 1 — TOUR GÉNÉRAL (Première visite ou relance globale)
 * Règle stricte : Le texte décrit EXACTEMENT l'élément ciblé et navigue sur la bonne page.
 */
export const MAIN_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    targetSelector: "",
    title: "Bienvenue sur Remind Me 👋",
    subtitle: "Espace multi-activités & trésorerie",
    description:
      "Votre plateforme unifiée pour organiser vos différentes activités professionnelles, votre temps, vos tâches prioritaires et votre argent sans friction.",
    points: [
      "Multi-activités : gérez salariat, freelance et missions au même endroit",
      "Planning & Conflits : calendrier intelligent et alertes de chevauchement",
      "Finance réelle : distinction stricte entre attendu et réellement encaissé",
    ],
    icon: Sparkles,
    isModal: true,
  },
  {
    id: "dashboard",
    route: "/dashboard",
    targetSelector: '[data-tour="dashboard-header"]',
    fallbackSelector: '[data-tour="dashboard-kpi"]',
    title: "Tableau de Bord Central",
    subtitle: "Pilotage quotidien",
    description:
      "Votre centre de pilotage : visualisez en un coup d'œil l'état de votre journée, vos alertes prioritaires et la santé réelle de votre trésorerie.",
    points: [
      "Indicateurs en temps réel (Revenus reçus vs Dépenses payées)",
      "Panneau 'Nécessite votre attention' pour traiter les urgences",
      "Actions rapides pour créer instantanément une activité ou un rappel",
    ],
    icon: LayoutDashboard,
    placement: "bottom",
  },
  {
    id: "activities",
    route: "/activities",
    targetSelector: '[data-tour="activity-create"]',
    fallbackSelector: '[data-tour="nav-activities"]',
    title: "Vos Activités Professionnelles",
    subtitle: "Multi-casquettes, un seul outil",
    description:
      "Chaque métier ou contrat a ses propres règles. Configurez vos activités avec leur rémunération, leur fréquence et une couleur de référence dédiée.",
    points: [
      "Attribution d'une couleur unique qui colore tout votre calendrier",
      "Calcul automatique des paiements attendus selon votre fréquence",
      "Liaison directe avec vos entreprises clientes et contacts",
    ],
    icon: Briefcase,
    placement: "bottom",
  },
  {
    id: "tasks",
    route: "/tasks",
    targetSelector: '[data-tour="task-tabs"]',
    fallbackSelector: '[data-tour="task-create"]',
    title: "Gestion des Tâches & Rappels",
    subtitle: "Cycle de vie & alertes sonores",
    description:
      "Pilotez vos actions quotidiennes, définissez leurs priorités et suivez leur cycle de 'À faire' à 'Terminée' sans laisser filer d'échéance.",
    points: [
      "Rappels sonores et carillon audio en temps réel dans votre navigateur",
      "Cycle clair : À faire → En cours → Terminée ou Reportée (+7j)",
      "Filtrage instantané par urgence, date et activité",
    ],
    icon: CheckSquare,
    placement: "bottom",
  },
  {
    id: "calendar",
    route: "/calendar",
    targetSelector: '[data-tour="calendar-views"]',
    fallbackSelector: '[data-tour="nav-calendar"]',
    title: "Calendrier & Planning Visuel",
    subtitle: "4 vues ergonomiques",
    description:
      "Retrouvez toutes vos séances d'activités et vos échéances de paiement dans 4 vues complémentaires (Mois, Semaine, Jour, Agenda).",
    points: [
      "Créneaux automatiquement aux couleurs de chaque activité",
      "Détection instantanée des conflits d'horaires et chevauchements",
      "Affichage synchronisé de vos dépenses programmées à échéance",
    ],
    icon: Calendar,
    placement: "bottom",
  },
  {
    id: "finances",
    route: "/finances",
    targetSelector: '[data-tour="finances-tabs"]',
    fallbackSelector: '[data-tour="nav-finances"]',
    title: "Gestion Financière Réelle",
    subtitle: "Clarté absolue sur votre argent",
    description:
      "Remind Me applique une règle stricte : seul l'argent réellement encaissé ou décaissé entre dans votre solde net réel.",
    points: [
      "Revenus attendus vs Revenus réellement encaissés",
      "Dépenses programmées vs Dépenses payées",
      "Suivi des budgets mensuels et épargne avec jauges visuelles",
    ],
    icon: Wallet,
    placement: "bottom",
  },
  {
    id: "notifications",
    targetSelector: '[data-tour="mobile-notification-bell"]',
    fallbackSelector: '[data-tour="notification-bell"]',
    title: "Centre de Notifications & Alertes",
    subtitle: "Restez toujours alerté",
    description:
      "Votre centre d'alertes centralisé pour vos rappels de cours, factures à échéance, tâches en retard et alertes de rentabilité.",
    points: [
      "Cloche d'alertes in-app avec pastille de notifications non lues",
      "Sonneries Web Audio et notifications Push sur mobile",
      "Actions directes possibles depuis chaque notification",
    ],
    icon: Bell,
    placement: "bottom",
  },
  {
    id: "completion",
    targetSelector: '[data-tour="help-center-btn"]',
    title: "Vous êtes prêt ! 🎉",
    subtitle: "Aide permanente toujours disponible",
    description:
      "Besoin d'une précision sur une page spécifique ? Cliquez à tout moment sur le bouton '?' en haut à droite pour ouvrir les guides détaillés de chaque section.",
    points: [
      "Guides interactifs contextuels (Finance, Tâches, Activités...)",
      "Explications détaillées des règles de calcul financier",
      "Relance du guide interactif à tout moment en 1 clic",
    ],
    icon: HelpCircle,
    isModal: true,
  },
];

/**
 * NIVEAU 2 — GUIDES CONTEXTUELS PAR SECTION
 * Lancés à la demande depuis le bouton '?' ou depuis une page spécifique.
 */
export const CONTEXTUAL_TOURS: Record<string, TourStep[]> = {
  finances: [
    {
      id: "finance-header",
      targetSelector: '[data-tour="finance-header"]',
      title: "Vue d'ensemble Finance",
      subtitle: "Gestion de trésorerie",
      description:
        "Retrouvez ici vos revenus, vos dépenses, vos budgets et vos objectifs financiers calculés avec rigueur.",
      points: [
        "Distinction claire entre prévu et encaissé",
        "Export CSV comptable conforme",
      ],
      icon: Wallet,
      placement: "bottom",
    },
    {
      id: "finance-pending-revenue",
      targetSelector: '[data-tour="finance-pending-revenue"]',
      title: "Revenus en attente",
      subtitle: "Revenus attendus",
      description:
        "Ici apparaissent les montants attendus selon la fréquence de vos activités, mais qui n'ont pas encore été encaissés.",
      points: [
        "Ne gonflent pas prématurément votre solde net",
        "Peuvent être reportés ou encaissés en 1 clic",
      ],
      icon: Clock,
      placement: "bottom",
    },
    {
      id: "finance-received-revenue",
      targetSelector: '[data-tour="finance-received-revenue"]',
      title: "Revenus Encaissés (Total reçu)",
      subtitle: "Argent réellement reçu",
      description:
        "Lorsqu'un paiement est validé ('Marquer comme encaissé'), il s'intègre immédiatement à votre Total reçu et à votre Solde net.",
      points: [
        "Représente la trésorerie réelle entrée sur vos comptes",
        "Historique immuable consultable par mois",
      ],
      icon: TrendingUp,
      placement: "bottom",
    },
    {
      id: "finance-paid-expenses",
      targetSelector: '[data-tour="finance-paid-expenses"]',
      title: "Dépenses Payées",
      subtitle: "Décaissements réels",
      description:
        "Retrouvez ici le montant des dépenses effectivement payées. Chaque dépense payée est automatiquement déduite de votre solde net.",
      points: [
        "Issu de vos dépenses programmées marquées comme payées",
        "Alimente les jauges de vos budgets mensuels",
      ],
      icon: Wallet,
      placement: "bottom",
    },
    {
      id: "finance-tabs",
      targetSelector: '[data-tour="finances-tabs"]',
      title: "Onglets & Dépenses Programmées",
      subtitle: "Budgets & Épargne",
      description:
        "Basculez entre vos Dépenses programmées, vos Budgets mensuels plafonnés et vos Cagnottes d'épargne.",
      points: [
        "Dépenses programmées : loyers, abonnements et factures futures",
        "Budgets : suivi de consommation par catégorie avec jauge",
        "Épargne & Objectifs : suivi de votre progression financière",
      ],
      icon: Wallet,
      placement: "bottom",
    },
    {
      id: "finance-export",
      targetSelector: '[data-tour="finance-export"]',
      title: "Exportation Comptable CSV",
      subtitle: "Données téléchargeables",
      description:
        "Exportez l'intégralité de vos écritures financières au format CSV compatible Excel (délimiteur point-virgule et encodage UTF-8).",
      points: [
        "Idéal pour vos déclarations et analyses externes",
        "Période personnalisable selon vos besoins",
      ],
      icon: Download,
      placement: "bottom",
    },
  ],
  activities: [
    {
      id: "act-nav",
      targetSelector: '[data-tour="nav-activities"]',
      title: "Vos Activités & Métiers",
      subtitle: "Organisation multi-casquettes",
      description:
        "Une activité représente un travail salarié, un contrat freelance, une entreprise ou une mission avec sa propre rémunération et fréquence.",
      points: [
        "Attribution d'une couleur unique par activité",
        "Calcul automatique des revenus attendus",
      ],
      icon: Briefcase,
      placement: "right",
    },
    {
      id: "act-create",
      targetSelector: '[data-tour="activity-create"]',
      title: "Créer une Activité",
      subtitle: "Nouvelle mission ou métier",
      description:
        "Définissez le nom, le type, la couleur, la fréquence de facturation et associez-la à un client ou contact.",
      points: [
        "La couleur choisie colore automatiquement vos créneaux du calendrier",
        "La rémunération génère vos revenus attendus dans Finance",
      ],
      icon: Briefcase,
      placement: "bottom",
    },
    {
      id: "act-list",
      targetSelector: '[data-tour="activities-list"]',
      title: "Gestion des Activités",
      subtitle: "Statuts & Rémunérations",
      description:
        "Modifiez le montant, mettez en pause ou archivez une activité. Si vous ajustez le montant, cela s'applique aux futurs revenus sans modifier l'historique encaissé.",
      points: [
        "Mise en pause ou réactivation en 1 clic",
        "Consommation horaire et rentabilité synchronisées",
      ],
      icon: Briefcase,
      placement: "top",
    },
  ],
  tasks: [
    {
      id: "task-nav",
      targetSelector: '[data-tour="nav-tasks"]',
      title: "Gestion des Tâches",
      subtitle: "Priorités & Actions",
      description:
        "Retrouvez toutes les actions à réaliser, suivez leur progression et programmez des rappels sonores efficaces.",
      points: [
        "Cycle de vie clair : À faire, En cours, Terminée",
        "Rappels audios déclenchés à la minute exacte",
      ],
      icon: CheckSquare,
      placement: "right",
    },
    {
      id: "task-create",
      targetSelector: '[data-tour="task-create"]',
      title: "Nouvelle Tâche",
      subtitle: "Création rapide",
      description:
        "Créez une tâche avec son titre, sa priorité, son échéance et définissez un rappel sonore (15 min, 30 min, 1h, 1 jour avant).",
      points: [
        "Possibilité de lier la tâche à une activité dédiée",
        "Carillon sonore dans le navigateur à l'échéance",
      ],
      icon: CheckSquare,
      placement: "bottom",
    },
    {
      id: "task-tabs",
      targetSelector: '[data-tour="task-tabs"]',
      title: "Filtres Temporels",
      subtitle: "Vue ciblée",
      description:
        "Isolez instantanément les tâches en retard, celles prévues aujourd'hui, celles à venir ou consultez l'historique des tâches achevées.",
      points: [
        "Badge rouge d'alerte pour les tâches en retard",
        "Bouton 'Reporter (+7j)' pour reprogrammer rapidement",
      ],
      icon: CheckSquare,
      placement: "bottom",
    },
  ],
  calendar: [
    {
      id: "cal-nav",
      targetSelector: '[data-tour="nav-calendar"]',
      title: "Calendrier Intelligent",
      subtitle: "Planning unifié",
      description:
        "Retrouvez l'ensemble de vos séances d'activités, réunions et dépenses programmées dans un calendrier visuel.",
      points: [
        "Événements aux couleurs de chaque activité",
        "Détection en direct des conflits d'horaires",
      ],
      icon: Calendar,
      placement: "right",
    },
    {
      id: "cal-views",
      targetSelector: '[data-tour="calendar-views"]',
      title: "Sélecteur de Vues",
      subtitle: "4 granularités",
      description:
        "Basculez en un clic entre la vue Mois, Semaine, Jour et Agenda pour adapter votre visibilité selon vos besoins.",
      points: [
        "Vue Mois : vue macroscopique de toutes vos échéances",
        "Vue Semaine & Jour : détail précis des créneaux horaires",
        "Vue Agenda : liste chronologique simplifiée",
      ],
      icon: Calendar,
      placement: "bottom",
    },
    {
      id: "cal-grid",
      targetSelector: '[data-tour="calendar-grid"]',
      title: "Grille de Planning & Alertes",
      subtitle: "Conflits & Dépenses",
      description:
        "Chaque séance apparaît avec sa couleur de référence. Les dépenses programmées sont indiquées sous forme de pastilles ambrées à leur date d'échéance.",
      points: [
        "Alerte visuelle immédiate si deux créneaux se chevauchent",
        "Accès aux détails et modifications en cliquant sur un créneau",
      ],
      icon: Calendar,
      placement: "top",
    },
  ],
  reports: [
    {
      id: "rep-nav",
      targetSelector: '[data-tour="nav-reports"]',
      title: "Rapports & Rentabilité",
      subtitle: "Valorisation de votre temps",
      description:
        "Analysez la profitabilité réelle de chaque activité en croisant vos heures passées dans le calendrier et vos revenus réellement encaissés.",
      points: [
        "Taux horaire moyen réel calculé sans estimation arbitraire",
        "Évolution mensuelle des encaissements et décaissements",
      ],
      icon: BarChart3,
      placement: "right",
    },
    {
      id: "rep-export",
      targetSelector: '[data-tour="reports-export-btn"]',
      title: "Exportation Complète",
      subtitle: "Rapports comptables",
      description:
        "Téléchargez vos analyses au format CSV pour les partager avec votre expert-comptable ou vos associés.",
      points: [
        "Inclut la ventilation par catégorie et par activité",
        "Calculs certifiés sur les écritures réelles",
      ],
      icon: Download,
      placement: "bottom",
    },
  ],
  clients: [
    {
      id: "cli-nav",
      targetSelector: '[data-tour="nav-clients"]',
      title: "Clients & Contacts",
      subtitle: "Carnet d'adresses professionnel",
      description:
        "Structurez votre réseau : créez des organisations (entreprises clientes, écoles, institutions) et rattachez-y vos contacts et activités.",
      points: [
        "Liaison directe avec vos contrats et revenus",
        "Accès rapide aux téléphones et emails de relance",
      ],
      icon: Users,
      placement: "right",
    },
    {
      id: "cli-create",
      targetSelector: '[data-tour="client-create"]',
      title: "Nouveau Contact / Organisation",
      subtitle: "Ajout simplifié",
      description:
        "Ajoutez des partenaires d'affaires pour centraliser toutes vos communications et facturations associées.",
      points: [
        "Organisation rattachable à plusieurs activités",
        "Historique des échanges et coordonnées",
      ],
      icon: Users,
      placement: "bottom",
    },
  ],
  settings: [
    {
      id: "set-nav",
      targetSelector: '[data-tour="nav-settings"]',
      title: "Paramètres de Remind Me",
      subtitle: "Personnalisation & Sécurité",
      description:
        "Gérez vos informations de compte, vos devises par défaut, vos fuseaux horaires et configurez vos notifications.",
      points: [
        "Profil : Nom, devise par défaut, fuseau horaire",
        "Apparence : Thème Clair, Sombre ou Système",
        "Notifications : Test de la sonnerie audio et push mobile",
      ],
      icon: Settings,
      placement: "right",
    },
    {
      id: "set-tabs",
      targetSelector: '[data-tour="settings-tabs"]',
      title: "Onglets de Configuration",
      subtitle: "Contrôle total",
      description:
        "Naviguez facilement entre votre Profil, vos Canaux de notification, vos Paramètres de sécurité, vos Sessions actives et la gestion de vos Données.",
      points: [
        "Isolation stricte PostgreSQL RLS pour vos données",
        "Test en direct du carillon sonore de rappel",
      ],
      icon: Settings,
      placement: "bottom",
    },
  ],
};

const STORAGE_KEY = "remindme_tour_status";

interface InteractiveProductTourProps {
  initialCompleted?: boolean;
}

export function InteractiveProductTour({ initialCompleted = false }: InteractiveProductTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<TourStep[]>(MAIN_TOUR_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [isContextual, setIsContextual] = useState(false);
  const tourRef = useRef<HTMLDivElement>(null);

  // Vérifier si le tour de premier niveau doit se lancer au premier chargement
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedStatus = localStorage.getItem(STORAGE_KEY);
    if (!initialCompleted && !storedStatus) {
      const timer = setTimeout(() => {
        setCurrentSteps(MAIN_TOUR_STEPS);
        setIsContextual(false);
        setIsActive(true);
        setCurrentStepIndex(0);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [initialCompleted]);

  // Écouter les événements de relance globale (remindme:start-tour)
  useEffect(() => {
    function handleStartGlobalTour() {
      setCurrentSteps(MAIN_TOUR_STEPS);
      setIsContextual(false);
      setIsActive(true);
      setCurrentStepIndex(0);
      if (pathname !== "/dashboard") {
        router.push("/dashboard");
      }
    }

    // Écouter les événements de guide contextuel (remindme:start-contextual-tour)
    function handleStartContextualTour(e: any) {
      const section = e?.detail?.section || "finances";
      const steps = CONTEXTUAL_TOURS[section] || MAIN_TOUR_STEPS;
      setCurrentSteps(steps);
      setIsContextual(true);
      setIsActive(true);
      setCurrentStepIndex(0);
    }

    window.addEventListener("remindme:start-tour", handleStartGlobalTour);
    window.addEventListener("remindme:start-contextual-tour", handleStartContextualTour);

    return () => {
      window.removeEventListener("remindme:start-tour", handleStartGlobalTour);
      window.removeEventListener("remindme:start-contextual-tour", handleStartContextualTour);
    };
  }, [pathname, router]);

  const currentStep = currentSteps[currentStepIndex];

  // Helper pour trouver un élément véritablement visible dans le DOM
  function findVisibleElement(sel?: string): HTMLElement | null {
    if (!sel || typeof document === "undefined") return null;
    try {
      const elements = document.querySelectorAll(sel);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return el;
        }
      }
    } catch (_) {}
    return null;
  }

  // Recalcul précis de la position du spotlight et du popover avec défilement automatique
  const updatePositions = useCallback(() => {
    if (!isActive || !currentStep) return;

    // Si c'est une étape modale (Bienvenue / Completion sans spotlight découpé)
    if (currentStep.isModal || !currentStep.targetSelector) {
      setTargetRect(null);
      const viewportWidth = window.innerWidth;
      const popoverWidth = Math.min(420, viewportWidth - 32);
      setPopoverStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: `${popoverWidth}px`,
      });
      return;
    }

    let target = findVisibleElement(currentStep.targetSelector);

    // Fallbacks si le sélecteur principal n'est pas encore visible (ex: mobile vs desktop)
    if (!target && currentStep.fallbackSelector) {
      target = findVisibleElement(currentStep.fallbackSelector);
    }

    if (target) {
      // Défilement automatique vers la cible pour s'assurer qu'elle est dans le viewport
      try {
        target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      } catch (_) {}

      const rect = target.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popoverWidth = Math.min(390, viewportWidth - 28);
      const isMobile = viewportWidth < 768;

      let top = 0;
      let left = 0;

      if (isMobile) {
        // Sur mobile : centrage horizontal, placement au-dessus ou en-dessous selon l'espace disponible
        left = (viewportWidth - popoverWidth) / 2;
        if (rect.top > viewportHeight / 2) {
          top = Math.max(16, rect.top - 330);
        } else {
          top = Math.min(viewportHeight - 340, rect.bottom + 14);
        }
      } else {
        // Sur desktop : positionnement selon le placement souhaité
        if (currentStep.placement === "right") {
          left = rect.right + 16;
          top = Math.max(16, rect.top - 20);
          if (left + popoverWidth > viewportWidth) {
            left = Math.max(16, rect.left - popoverWidth - 16);
          }
        } else if (currentStep.placement === "bottom") {
          left = Math.max(16, Math.min(rect.left, viewportWidth - popoverWidth - 16));
          top = rect.bottom + 14;
          if (top + 340 > viewportHeight) {
            top = Math.max(16, rect.top - 340);
          }
        } else if (currentStep.placement === "top") {
          left = Math.max(16, Math.min(rect.left, viewportWidth - popoverWidth - 16));
          top = Math.max(16, rect.top - 340);
        } else {
          left = Math.max(16, (viewportWidth - popoverWidth) / 2);
          top = Math.max(16, rect.bottom + 14);
        }
      }

      // Garde-fous d'écran stricts (aucun débordement possible)
      top = Math.max(12, Math.min(top, viewportHeight - 370));
      left = Math.max(12, Math.min(left, viewportWidth - popoverWidth - 12));

      setPopoverStyle({
        top: `${top}px`,
        left: `${left}px`,
        width: `${popoverWidth}px`,
        transform: "none",
      });
    } else {
      // Si aucun élément cible visible n'existe dans le DOM actuel : centrer proprement sans trou découpé erroné
      setTargetRect(null);
      const viewportWidth = window.innerWidth;
      const popoverWidth = Math.min(400, viewportWidth - 32);
      setPopoverStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: `${popoverWidth}px`,
      });
    }
  }, [isActive, currentStep]);

  useEffect(() => {
    updatePositions();
    // Intervalles de stabilisation pour laisser le temps aux transitions de pages / animations
    const timer1 = setTimeout(updatePositions, 100);
    const timer2 = setTimeout(updatePositions, 350);
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
    };
  }, [updatePositions, pathname]);

  // Navigation au clavier (Échap, Flèches Gauche / Droite)
  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStepIndex, currentSteps]);

  const handleNext = async () => {
    if (currentStepIndex < currentSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextStep = currentSteps[nextIndex];
      if (nextStep?.route && pathname !== nextStep.route) {
        router.push(nextStep.route);
      }
      setCurrentStepIndex(nextIndex);
    } else {
      await handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      const prevStep = currentSteps[prevIndex];
      if (prevStep?.route && pathname !== prevStep.route) {
        router.push(prevStep.route);
      }
      setCurrentStepIndex(prevIndex);
    }
  };

  const handleSkip = async () => {
    setIsActive(false);
    if (!isContextual && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "skipped");
      await saveTourState({ skipped: true, lastStep: currentStepIndex });
    }
  };

  const handleComplete = async () => {
    setIsActive(false);
    if (!isContextual && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "completed");
      await saveTourState({ completed: true, lastStep: currentSteps.length });
    }
  };

  if (!isActive || !currentStep) return null;

  const Icon = currentStep.icon;
  const isLastStep = currentStepIndex === currentSteps.length - 1;

  // Calcul géométrique du trou Spotlight SVG (avec garde stricte sur les dimensions)
  const isTargetValid = targetRect !== null && targetRect.width > 0 && targetRect.height > 0;
  const padding = 8;
  const spotlightX = isTargetValid ? Math.max(0, targetRect.left - padding) : 0;
  const spotlightY = isTargetValid ? Math.max(0, targetRect.top - padding) : 0;
  const spotlightW = isTargetValid ? targetRect.width + padding * 2 : 0;
  const spotlightH = isTargetValid ? targetRect.height + padding * 2 : 0;
  const rx = 12;

  return (
    <div
      ref={tourRef}
      className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Guide interactif Remind Me"
    >
      {/* Masque Sombre avec Découpe Spotlight uniquement si cible valide */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {isTargetValid && (
              <rect
                x={spotlightX}
                y={spotlightY}
                width={spotlightW}
                height={spotlightH}
                rx={rx}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(11, 15, 25, 0.78)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Anneau doré animé autour de l'élément ciblé uniquement si cible valide */}
      {isTargetValid && (
        <div
          className="absolute pointer-events-none rounded-xl border-2 border-gold ring-4 ring-gold/20 shadow-gold-subtle transition-all duration-300 animate-pulse"
          style={{
            left: `${spotlightX}px`,
            top: `${spotlightY}px`,
            width: `${spotlightW}px`,
            height: `${spotlightH}px`,
          }}
        />
      )}

      {/* Popover Carte Flottante */}
      <div
        className="fixed z-50 flex flex-col rounded-2xl border border-ink-200/80 bg-canvas-raised p-5 shadow-2xl backdrop-blur-md transition-all duration-200"
        style={popoverStyle}
      >
        {/* En-tête avec étape & bouton fermer */}
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold-dark font-bold text-xs">
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-md bg-signal-soft px-2 py-0.5 text-[11px] font-bold text-signal">
                Étape {currentStepIndex + 1} / {currentSteps.length}
              </span>
              <span className="text-[11px] text-ink-500 font-medium hidden sm:inline">
                {currentStep.subtitle}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
            title="Passer le guide (Échap)"
            aria-label="Fermer le guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corps du message */}
        <div className="py-3.5 space-y-2.5">
          <h3 className="text-base font-extrabold text-ink-950 tracking-tight flex items-center gap-1.5">
            {currentStep.title}
          </h3>
          <p className="text-xs text-ink-700 leading-relaxed">
            {currentStep.description}
          </p>

          {currentStep.points && currentStep.points.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {currentStep.points.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-ink-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-positive shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pied de carte : Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-ink-100">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-medium text-ink-500 hover:text-ink-900 transition-colors"
          >
            Passer
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 rounded-lg border border-ink-300 bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-ink-100 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Précédent
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-dark px-3.5 py-1.5 text-xs font-bold text-white shadow-gold-subtle hover:brightness-110 active:scale-95 transition-all"
            >
              {isLastStep ? (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> C'est parti !
                </>
              ) : (
                <>
                  Suivant <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Fonction utilitaire globale pour relancer le tour interactif de niveau 1 (Global)
 */
export function triggerInteractiveTour() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("remindme:start-tour"));
  }
}

/**
 * Fonction utilitaire pour lancer le guide contextuel d'une section spécifique (Niveau 2)
 */
export function triggerContextualTour(section: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("remindme:start-contextual-tour", { detail: { section } }));
  }
}
