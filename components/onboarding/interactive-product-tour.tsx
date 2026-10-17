"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
  Info,
  AlertCircle,
  Check,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/i18n/language-provider";
import { saveTourState } from "@/lib/onboarding/tour-actions";
import {
  playVoiceReminder,
  stopVoiceReminder,
  getLocalVoiceSettings,
  getTourStepVoiceText,
  type VoiceLanguage,
} from "@/lib/voice";
import {
  TourStep,
  MAIN_TOUR_STEPS,
  CONTEXTUAL_TOURS,
} from "./tour-data";

export type { TourStep };
export { MAIN_TOUR_STEPS, CONTEXTUAL_TOURS };

const STORAGE_KEY = "remindme_tour_status";

interface InteractiveProductTourProps {
  initialCompleted?: boolean;
}

export function InteractiveProductTour({ initialCompleted = false }: InteractiveProductTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isActive, setIsActive] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<TourStep[]>(MAIN_TOUR_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [isContextual, setIsContextual] = useState(false);
  const [viewport, setViewport] = useState({ width: 1920, height: 1080 });
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isSpeakingStep, setIsSpeakingStep] = useState(false);
  const speechTokenRef = useRef(0);
  const tourRef = useRef<HTMLDivElement>(null);

  // Synchronisation de la taille du viewport pour le calcul SVG précis
  useEffect(() => {
    function handleResize() {
      if (typeof window !== "undefined") {
        setViewport({ width: window.innerWidth, height: window.innerHeight });
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      speechTokenRef.current++;
      stopVoiceReminder(false);
      setIsSpeakingStep(false);
      if (typeof window !== "undefined") {
        (window as any).__REMINDME_TOUR_ACTIVE = true;
        window.dispatchEvent(new CustomEvent("remindme:stop-section-voice"));
      }
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
      speechTokenRef.current++;
      stopVoiceReminder(false);
      setIsSpeakingStep(false);
      if (typeof window !== "undefined") {
        (window as any).__REMINDME_TOUR_ACTIVE = true;
        window.dispatchEvent(new CustomEvent("remindme:stop-section-voice"));
      }
      const section = e?.detail?.section || "dashboard";
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
        const style = window.getComputedStyle(el);
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        ) {
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
      const popoverWidth = Math.min(460, viewportWidth - 32);
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
      const popoverWidth = Math.min(420, viewportWidth - 28);
      const isMobile = viewportWidth < 768;

      let top = 0;
      let left = 0;

      if (isMobile) {
        // Sur mobile : centrage horizontal, placement au-dessus ou en-dessous selon l'espace disponible
        left = (viewportWidth - popoverWidth) / 2;
        if (rect.top > viewportHeight / 2) {
          // Si l'élément cible est dans la moitié inférieure de l'écran, placer le popover en haut
          top = Math.max(16, rect.top - 360);
          if (top + 280 > rect.top) {
            top = 16;
          }
        } else {
          // Si l'élément cible est dans la moitié supérieure, placer le popover en dessous
          top = Math.min(viewportHeight - 320, rect.bottom + 14);
        }
      } else {
        // Sur desktop : positionnement selon le placement souhaité avec bascule anti-chevauchement
        if (currentStep.placement === "right") {
          left = rect.right + 16;
          top = Math.max(16, rect.top - 20);
          if (left + popoverWidth > viewportWidth) {
            left = Math.max(16, rect.left - popoverWidth - 16);
          }
        } else if (currentStep.placement === "bottom") {
          left = Math.max(16, Math.min(rect.left, viewportWidth - popoverWidth - 16));
          top = rect.bottom + 14;
          if (top + 380 > viewportHeight) {
            top = Math.max(16, rect.top - 380);
          }
        } else if (currentStep.placement === "top") {
          left = Math.max(16, Math.min(rect.left, viewportWidth - popoverWidth - 16));
          if (rect.top >= 360) {
            top = rect.top - 360;
          } else {
            top = rect.bottom + 14;
          }
        } else {
          left = Math.max(16, (viewportWidth - popoverWidth) / 2);
          top = Math.max(16, rect.bottom + 14);
        }
      }

      // Garde-fous d'écran stricts (aucun débordement possible)
      top = Math.max(12, Math.min(top, Math.max(12, viewportHeight - 260)));
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
      const popoverWidth = Math.min(440, viewportWidth - 32);
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
    const timer1 = setTimeout(updatePositions, 100);
    const timer2 = setTimeout(updatePositions, 350);
    const timer3 = setTimeout(updatePositions, 700);
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
    };
  }, [updatePositions, pathname]);

  // Navigation au clavier (Échap, Flèches Gauche / Droite)
  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          (target as HTMLElement).isContentEditable);

      if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
      } else if (e.key === "ArrowRight") {
        if (!isInput) {
          e.preventDefault();
          handleNext();
        }
      } else if (e.key === "ArrowLeft") {
        if (!isInput) {
          e.preventDefault();
          handlePrev();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStepIndex, currentSteps]);

  // Synchronisation vocale avec l'étape affichée (Objectif 1.A)
  useEffect(() => {
    if (!isActive || !currentStep) {
      if (typeof window !== "undefined") {
        (window as any).__REMINDME_TOUR_ACTIVE = false;
      }
      stopVoiceReminder(false);
      setIsSpeakingStep(false);
      return;
    }

    if (typeof window !== "undefined") {
      (window as any).__REMINDME_TOUR_ACTIVE = true;
    }

    // Si la vidéo d'introduction est en cours, ne pas superposer la voix du guide
    if (typeof window !== "undefined" && (window as any).__REMINDME_VIDEO_PLAYING) {
      stopVoiceReminder(false);
      setIsSpeakingStep(false);
      return;
    }

    const prefs = getLocalVoiceSettings();
    if (!prefs.voice_reminders || isVoiceMuted) {
      stopVoiceReminder(false);
      setIsSpeakingStep(false);
      return;
    }

    const currentToken = ++speechTokenRef.current;
    stopVoiceReminder(false);

    const voiceLang = (prefs.voice_language || "fr") as VoiceLanguage;
    const voiceText = getTourStepVoiceText(currentStep, voiceLang);

    if (!voiceText) return;

    // Délai court de 350ms pour laisser le spotlight se positionner visuellement avant de parler
    const timer = setTimeout(async () => {
      if (speechTokenRef.current !== currentToken || !isActive) return;

      setIsSpeakingStep(true);
      try {
        await playVoiceReminder({
          text: voiceText,
          language: voiceLang,
          voiceType: prefs.voice_type,
          priority: "tour",
          rate: prefs.voice_playback_rate || 1.0,
          onStart: () => {
            if (speechTokenRef.current === currentToken) {
              setIsSpeakingStep(true);
            }
          },
          onEnd: () => {
            if (speechTokenRef.current === currentToken) {
              setIsSpeakingStep(false);
            }
          },
          onError: () => {
            if (speechTokenRef.current === currentToken) {
              setIsSpeakingStep(false);
            }
          },
        });
      } catch {
        if (speechTokenRef.current === currentToken) {
          setIsSpeakingStep(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      stopVoiceReminder(false);
      setIsSpeakingStep(false);
    };
  }, [isActive, currentStep, currentStepIndex, isVoiceMuted]);

  // Arrêt immédiat si la vidéo motion est lancée en cours de tour
  useEffect(() => {
    function handleVideoActive() {
      speechTokenRef.current++;
      stopVoiceReminder(false);
      setIsSpeakingStep(false);
    }
    window.addEventListener("remindme:video-active", handleVideoActive);
    return () => window.removeEventListener("remindme:video-active", handleVideoActive);
  }, []);

  const handleNext = async () => {
    speechTokenRef.current++;
    stopVoiceReminder(false);
    setIsSpeakingStep(false);
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
    speechTokenRef.current++;
    stopVoiceReminder(false);
    setIsSpeakingStep(false);
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
    speechTokenRef.current++;
    stopVoiceReminder(false);
    setIsSpeakingStep(false);
    setIsActive(false);
    if (typeof window !== "undefined") {
      (window as any).__REMINDME_TOUR_ACTIVE = false;
    }
    if (!isContextual && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "skipped");
      await saveTourState({ skipped: true, lastStep: currentStepIndex });
    }
  };

  const handleComplete = async () => {
    speechTokenRef.current++;
    stopVoiceReminder(false);
    setIsSpeakingStep(false);
    setIsActive(false);
    if (typeof window !== "undefined") {
      (window as any).__REMINDME_TOUR_ACTIVE = false;
    }
    if (!isContextual && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "completed");
      await saveTourState({ completed: true, lastStep: currentSteps.length });
    }
  };

  if (!isActive || !currentStep) return null;

  const Icon = currentStep.icon;
  const isLastStep = currentStepIndex === currentSteps.length - 1;

  // Calcul géométrique du trou Spotlight SVG (avec padding sécurisé)
  const isTargetValid = targetRect !== null && targetRect.width > 0 && targetRect.height > 0;
  const padding = 8;
  const spotlightX = isTargetValid ? Math.max(0, targetRect.left - padding) : 0;
  const spotlightY = isTargetValid ? Math.max(0, targetRect.top - padding) : 0;
  const spotlightW = isTargetValid ? targetRect.width + padding * 2 : 0;
  const spotlightH = isTargetValid ? targetRect.height + padding * 2 : 0;
  const rx = 14;

  const progressPercent = Math.round(((currentStepIndex + 1) / currentSteps.length) * 100);

  // Chemin SVG avec découpe géométrique directe (fillRule evenodd) :
  // Le trou n'a AUCUNE géométrie SVG, donc les clics passent naturellement à l'élément HTML en dessous.
  const pathD = isTargetValid
    ? `M 0 0 h ${viewport.width} v ${viewport.height} h -${viewport.width} Z M ${spotlightX + rx} ${spotlightY} H ${spotlightX + spotlightW - rx} A ${rx} ${rx} 0 0 1 ${spotlightX + spotlightW} ${spotlightY + rx} V ${spotlightY + spotlightH - rx} A ${rx} ${rx} 0 0 1 ${spotlightX + spotlightW - rx} ${spotlightY + spotlightH} H ${spotlightX + rx} A ${rx} ${rx} 0 0 1 ${spotlightX} ${spotlightY + spotlightH - rx} V ${spotlightY + rx} A ${rx} ${rx} 0 0 1 ${spotlightX + rx} ${spotlightY} Z`
    : `M 0 0 h ${viewport.width} v ${viewport.height} h -${viewport.width} Z`;

  return (
    <div
      ref={tourRef}
      className="fixed inset-0 z-50 overflow-hidden pointer-events-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      data-remindme-tour="active"
      aria-label={t("help.modal_title") || "Guide interactif Remind Me"}
    >
      {/* Masque Sombre avec Découpe Spotlight directe :
          La zone sombre intercepte les clics pour fermer/passer le guide, tandis que le trou
          laisse interagir librement avec l'élément mis en avant. */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={pathD}
          fillRule="evenodd"
          fill="rgba(11, 15, 25, 0.52)"
          className="pointer-events-auto cursor-pointer"
          onClick={handleSkip}
          aria-hidden="true"
        />
      </svg>

      {/* Anneau doré animé autour de l'élément ciblé uniquement si cible valide */}
      {isTargetValid && (
        <div
          className="absolute pointer-events-none rounded-2xl border-2 border-gold ring-4 ring-gold/25 shadow-lg shadow-gold/20 transition-all duration-300 animate-pulse"
          style={{
            left: `${spotlightX}px`,
            top: `${spotlightY}px`,
            width: `${spotlightW}px`,
            height: `${spotlightH}px`,
          }}
        />
      )}

      {/* Popover Carte Flottante Élégante */}
      <div
        className="fixed z-50 flex flex-col rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 p-5 sm:p-6 shadow-2xl backdrop-blur-md transition-all duration-200 max-h-[88vh] overflow-y-auto pointer-events-auto select-text"
        style={popoverStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre de progression subtile */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-ink-100 dark:bg-ink-800 rounded-t-3xl overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* En-tête avec étape & bouton fermer */}
        <div className="flex items-center justify-between gap-2 border-b border-ink-100 dark:border-ink-800 pb-3 mt-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-400/15 to-yellow-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25 shrink-0">
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-signal-soft/80 dark:bg-signal-soft/30 px-2 py-0.5 text-[10px] font-black text-signal uppercase tracking-wider">
                  {t("tour.step_counter", { current: currentStepIndex + 1, total: currentSteps.length })}
                </span>
                {isContextual && (
                  <span className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                    {t("tour.badge_contextual") || "Guide contextuel"}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-ink-500 dark:text-ink-400 font-medium line-clamp-1">
                {currentStep.subtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (isSpeakingStep) {
                  speechTokenRef.current++;
                  stopVoiceReminder(false);
                  setIsSpeakingStep(false);
                  setIsVoiceMuted(true);
                } else if (isVoiceMuted) {
                  setIsVoiceMuted(false);
                } else {
                  // Relancer la lecture de l'étape affichée
                  speechTokenRef.current++;
                  const currentToken = speechTokenRef.current;
                  const prefs = getLocalVoiceSettings();
                  const voiceLang = (prefs.voice_language || "fr") as VoiceLanguage;
                  const voiceText = getTourStepVoiceText(currentStep, voiceLang);
                  if (voiceText) {
                    setIsSpeakingStep(true);
                    playVoiceReminder({
                      text: voiceText,
                      language: voiceLang,
                      voiceType: prefs.voice_type,
                      priority: "tour",
                      rate: prefs.voice_playback_rate || 1.0,
                      onEnd: () => {
                        if (speechTokenRef.current === currentToken) setIsSpeakingStep(false);
                      },
                      onError: () => {
                        if (speechTokenRef.current === currentToken) setIsSpeakingStep(false);
                      },
                    });
                  }
                }
              }}
              className={`rounded-xl p-1.5 transition-all cursor-pointer ${
                isSpeakingStep
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/40 animate-pulse"
                  : isVoiceMuted
                  ? "text-ink-300 dark:text-ink-600 hover:text-ink-600 dark:hover:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
                  : "text-ink-500 hover:text-ink-900 dark:hover:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800"
              }`}
              title={
                isSpeakingStep
                  ? "Couper la voix du guide"
                  : isVoiceMuted
                  ? "Activer la voix du guide"
                  : "Réécouter l'étape"
              }
              aria-label="Contrôle audio du guide"
            >
              {isVoiceMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="rounded-xl p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-700 dark:hover:text-ink-200 transition-colors cursor-pointer"
              title={t("tour.btn_close")}
              aria-label={t("tour.btn_close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Corps pédagogique du message */}
        <div className="py-3.5 space-y-3">
          <h3 className="text-base sm:text-lg font-black text-ink-950 dark:text-white tracking-tight leading-snug">
            {currentStep.title}
          </h3>

          <p className="text-xs sm:text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
            {currentStep.description}
          </p>

          {/* Rôle / Finalité si précisée */}
          {currentStep.purpose && (
            <div className="p-2.5 rounded-xl bg-signal-soft/20 border border-signal/20 text-[11px] text-ink-800 dark:text-ink-200 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-signal shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-signal">{t("tour.purpose_title")} : </strong>
                <span>{currentStep.purpose}</span>
              </div>
            </div>
          )}

          {/* Opérations clés */}
          {currentStep.keyActions && currentStep.keyActions.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-ink-800 dark:text-ink-200 uppercase tracking-wider block">
                {t("tour.key_actions_title")} :
              </span>
              <ul className="space-y-1">
                {currentStep.keyActions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[11px] text-ink-600 dark:text-ink-300">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-signal/15 text-signal text-[9px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comment interpréter */}
          {currentStep.interpretation && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">{t("tour.interpretation_title")} : </strong>
                <span>{currentStep.interpretation}</span>
              </div>
            </div>
          )}

          {/* Erreurs courantes à éviter */}
          {currentStep.commonMistakes && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">{t("tour.common_mistakes_title")} : </strong>
                <span>{currentStep.commonMistakes}</span>
              </div>
            </div>
          )}

          {/* Puces de synthèse */}
          {currentStep.points && currentStep.points.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {currentStep.points.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-ink-600 dark:text-ink-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pied de carte : Navigation Précédent / Suivant / Passer */}
        <div className="flex items-center justify-between pt-3 border-t border-ink-100 dark:border-ink-800 mt-1">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-ink-500 hover:text-ink-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {t("tour.btn_skip")}
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 rounded-xl border border-ink-200 dark:border-ink-700 bg-canvas dark:bg-ink-800 px-3 py-1.5 text-xs font-bold text-ink-800 dark:text-ink-200 hover:bg-canvas-subtle dark:hover:bg-ink-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t("tour.btn_prev")}
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              {isLastStep ? (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> {t("tour.btn_finish")}
                </>
              ) : (
                <>
                  {t("tour.btn_next")} <ArrowRight className="h-3.5 w-3.5" />
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
    window.dispatchEvent(
      new CustomEvent("remindme:start-contextual-tour", { detail: { section } })
    );
  }
}
