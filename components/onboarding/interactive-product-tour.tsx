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
} from "lucide-react";
import { saveTourState } from "@/lib/onboarding/tour-actions";

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  subtitle: string;
  description: string;
  points?: string[];
  icon: any;
  placement?: "bottom" | "top" | "left" | "right" | "auto";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    targetSelector: '[data-tour="dashboard-header"]',
    title: "Bienvenue sur Remind Me !",
    subtitle: "Votre Tableau de Bord Central",
    description:
      "Votre centre de pilotage quotidien : visualisez en un coup d'œil vos activités en cours, vos séances du jour, vos tâches urgentes et la santé réelle de votre trésorerie.",
    points: [
      "Indicateurs financiers réels (Revenus reçus vs Dépenses payées)",
      "Panneau 'Nécessite votre attention' pour ne rien oublier",
      "Actions rapides pour créer instantanément une activité ou un rappel",
    ],
    icon: LayoutDashboard,
    placement: "bottom",
  },
  {
    id: "activities",
    targetSelector: '[data-tour="nav-activities"]',
    title: "Vos Activités Professionnelles",
    subtitle: "Multi-casquettes, Un Seul Outil",
    description:
      "Chaque métier ou mission a ses propres règles. Configurez vos activités avec leur rémunération, leur fréquence et une couleur de référence dédiée.",
    points: [
      "Attribution d'une couleur unique qui colore tout votre calendrier",
      "Calcul automatique des paiements attendus selon votre fréquence",
      "Liaison directe avec vos organisations et contacts clients",
    ],
    icon: Briefcase,
    placement: "right",
  },
  {
    id: "tasks",
    targetSelector: '[data-tour="nav-tasks"]',
    title: "Vos Tâches & Priorités",
    subtitle: "Cycle de Vie & Rappels Efficaces",
    description:
      "Créez vos tâches, définissez leur niveau de priorité et suivez leur cycle : À faire → En cours → Terminée. Ne laissez plus aucune échéance vous échapper.",
    points: [
      "Rappels programmables (15 min, 30 min, 1h, 1 jour avant)",
      "Alertes sonores et carillon audio en temps réel dans votre navigateur",
      "Actions rapides : Commencer, Terminer, Reporter ou Annuler",
    ],
    icon: CheckSquare,
    placement: "right",
  },
  {
    id: "calendar",
    targetSelector: '[data-tour="nav-calendar"]',
    title: "Votre Calendrier Intelligent",
    subtitle: "Planning Visuel & Idempotent",
    description:
      "Retrouvez toutes vos séances d'activités et vos échéances de paiement dans 4 vues ergonomiques (Mois, Semaine, Jour, Agenda).",
    points: [
      "Événements automatiquement aux couleurs de chaque activité",
      "Détection instantanée des conflits d'horaires et chevauchements",
      "Affichage synchronisé de vos dépenses programmées",
    ],
    icon: Calendar,
    placement: "right",
  },
  {
    id: "finances",
    targetSelector: '[data-tour="nav-finances"]',
    title: "Votre Gestion Financière Réelle",
    subtitle: "Clarté Absolue sur Votre Argent",
    description:
      "Remind Me applique une règle stricte : seul l'argent réellement encaissé ou décaissé entre dans votre solde net réel.",
    points: [
      "Revenus attendus vs Revenus réellement encaissés",
      "Dépenses programmées vs Dépenses réellement payées",
      "Suivi des budgets mensuels et cagnottes d'épargne avec jauges visuelles",
    ],
    icon: Wallet,
    placement: "right",
  },
  {
    id: "notifications",
    targetSelector: '[data-tour="notification-bell"]',
    title: "Notifications & Alertes",
    subtitle: "Restez Toujours Informé",
    description:
      "Votre centre d'alertes centralisé pour vos rappels de cours, factures à échéance, tâches en retard et alertes de rentabilité.",
    points: [
      "Cloche d'alertes in-app avec badge de notifications non lues",
      "Sonneries Web Audio et notifications Push sur iPhone & Android",
      "Personnalisation complète de vos canaux dans les Paramètres",
    ],
    icon: Bell,
    placement: "bottom",
  },
];

const STORAGE_KEY = "remindme_tour_status";

interface InteractiveProductTourProps {
  initialCompleted?: boolean;
}

export function InteractiveProductTour({ initialCompleted = false }: InteractiveProductTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const tourRef = useRef<HTMLDivElement>(null);

  // Vérifier si le tour doit se lancer au montage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedStatus = localStorage.getItem(STORAGE_KEY);
    if (!initialCompleted && !storedStatus) {
      // Démarrage avec un léger délai pour laisser le temps au DOM de se peindre
      const timer = setTimeout(() => {
        setIsActive(true);
        setCurrentStepIndex(0);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [initialCompleted]);

  // Écouter les événements de relance manuelle (ex: depuis les paramètres ou le bouton ?)
  useEffect(() => {
    function handleStartTourEvent() {
      setIsActive(true);
      setCurrentStepIndex(0);
    }

    window.addEventListener("remindme:start-tour", handleStartTourEvent);
    return () => window.removeEventListener("remindme:start-tour", handleStartTourEvent);
  }, []);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Recalcul de la position du spotlight et du popover
  const updatePositions = useCallback(() => {
    if (!isActive || !currentStep) return;

    let target = document.querySelector(currentStep.targetSelector) as HTMLElement | null;

    // Fallbacks si le sélecteur mobile ou desktop n'est pas trouvé
    if (!target) {
      if (currentStep.id === "dashboard") {
        target = document.querySelector("h1") as HTMLElement | null;
      } else if (currentStep.id === "notifications") {
        target = document.querySelector('[data-tour="mobile-notification-bell"]') as HTMLElement | null;
      }
    }

    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      // Calcul de la position du popover
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popoverWidth = Math.min(380, viewportWidth - 32);
      const isMobile = viewportWidth < 768;

      let top = 0;
      let left = 0;

      if (isMobile) {
        // Sur mobile, centrer ou placer en bas pour ne pas cacher
        left = (viewportWidth - popoverWidth) / 2;
        if (rect.top > viewportHeight / 2) {
          top = Math.max(16, rect.top - 320);
        } else {
          top = Math.min(viewportHeight - 340, rect.bottom + 16);
        }
      } else {
        // Sur desktop, positionnement selon placement préféré
        if (currentStep.placement === "right") {
          left = rect.right + 16;
          top = Math.max(16, rect.top - 20);
          if (left + popoverWidth > viewportWidth) {
            left = rect.left - popoverWidth - 16;
          }
        } else if (currentStep.placement === "bottom") {
          left = Math.max(16, Math.min(rect.left, viewportWidth - popoverWidth - 16));
          top = rect.bottom + 16;
        } else {
          left = Math.max(16, (viewportWidth - popoverWidth) / 2);
          top = Math.max(16, rect.bottom + 16);
        }
      }

      // Garde-fous d'écran
      top = Math.max(12, Math.min(top, viewportHeight - 380));
      left = Math.max(12, Math.min(left, viewportWidth - popoverWidth - 12));

      setPopoverStyle({
        top: `${top}px`,
        left: `${left}px`,
        width: `${popoverWidth}px`,
      });
    } else {
      // Si aucun élément cible n'est trouvé, centrer le popover sur l'écran
      setTargetRect(null);
      const viewportWidth = window.innerWidth;
      const popoverWidth = Math.min(380, viewportWidth - 32);
      setPopoverStyle({
        top: "20%",
        left: `${(viewportWidth - popoverWidth) / 2}px`,
        width: `${popoverWidth}px`,
      });
    }
  }, [isActive, currentStep]);

  useEffect(() => {
    updatePositions();
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);

    return () => {
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
    };
  }, [updatePositions]);

  // Navigation clavier (Escape pour fermer, Flèches)
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
  }, [isActive, currentStepIndex]);

  const handleNext = async () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      await handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = async () => {
    setIsActive(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "skipped");
    }
    await saveTourState({ skipped: true, lastStep: currentStepIndex });
  };

  const handleComplete = async () => {
    setIsActive(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "completed");
    }
    await saveTourState({ completed: true, lastStep: TOUR_STEPS.length });
  };

  if (!isActive || !currentStep) return null;

  const Icon = currentStep.icon;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Calcul du trou Spotlight SVG
  const padding = 8;
  const spotlightX = targetRect ? Math.max(0, targetRect.left - padding) : 0;
  const spotlightY = targetRect ? Math.max(0, targetRect.top - padding) : 0;
  const spotlightW = targetRect ? targetRect.width + padding * 2 : 0;
  const spotlightH = targetRect ? targetRect.height + padding * 2 : 0;
  const rx = 12;

  return (
    <div
      ref={tourRef}
      className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Guide interactif Remind Me"
    >
      {/* Masque Sombre avec Découpe Spotlight */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
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

      {/* Anneau doré animé autour de l'élément ciblé */}
      {targetRect && (
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
                Étape {currentStepIndex + 1} / {TOUR_STEPS.length}
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
 * Fonction utilitaire globale pour relancer le tour interactif depuis n'importe quel composant
 */
export function triggerInteractiveTour() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("remindme:start-tour"));
  }
}
