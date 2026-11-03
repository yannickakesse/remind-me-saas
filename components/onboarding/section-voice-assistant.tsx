"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import {
  playVoiceReminder,
  stopVoiceReminder,
  getLocalVoiceSettings,
  getSectionVoiceGuide,
  isVoicePlaying,
  type VoiceLanguage,
} from "@/lib/voice";
import { useLanguage } from "@/components/i18n/language-provider";
import { GuideMascot } from "@/components/onboarding/guide-mascot";

const SESSION_VISITED_KEY = "remindme_voice_visited_sections";
const ASSISTANT_PREF_KEY = "remindme_voice_assistant_auto";

function getVisitedSections(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_VISITED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function markSectionVisited(section: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getVisitedSections();
    set.add(section);
    sessionStorage.setItem(SESSION_VISITED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function resolveSectionFromPath(pathname: string): string | null {
  if (!pathname) return null;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "dashboard";
  if (pathname === "/activities" || pathname.startsWith("/activities/")) return "activities";
  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) return "calendar";
  if (pathname === "/tasks" || pathname.startsWith("/tasks/")) return "tasks";
  if (pathname === "/finances" || pathname.startsWith("/finances/")) return "finances";
  if (pathname === "/reports" || pathname.startsWith("/reports/")) return "reports";
  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) return "notifications";
  if (pathname === "/messages" || pathname.startsWith("/messages/")) return "messages";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";
  if (pathname === "/clients" || pathname.startsWith("/clients/")) return "clients";
  return null;
}

const SECTION_LABELS: Record<string, Record<string, string>> = {
  dashboard: { fr: "Tableau de bord", en: "Dashboard", es: "Panel", de: "Dashboard", pt: "Painel" },
  activities: { fr: "Activités", en: "Activities", es: "Actividades", de: "Aktivitäten", pt: "Atividades" },
  calendar: { fr: "Calendrier", en: "Calendar", es: "Calendario", de: "Kalender", pt: "Calendário" },
  tasks: { fr: "Tâches", en: "Tasks", es: "Tareas", de: "Aufgaben", pt: "Tarefas" },
  finances: { fr: "Finances", en: "Finances", es: "Finanzas", de: "Finanzen", pt: "Finanças" },
  reports: { fr: "Rapports", en: "Reports", es: "Informes", de: "Berichte", pt: "Relatórios" },
  notifications: { fr: "Notifications", en: "Notifications", es: "Notificaciones", de: "Benachrichtigungen", pt: "Notificações" },
  messages: { fr: "Inbox", en: "Inbox", es: "Buzón", de: "Posteingang", pt: "Inbox" },
  settings: { fr: "Paramètres", en: "Settings", es: "Configuración", de: "Einstellungen", pt: "Configurações" },
  clients: { fr: "Clients", en: "Clients", es: "Clientes", de: "Kunden", pt: "Clientes" },
};

/**
 * Accompagnement Vocal Contextuel Intelligent (Phase 6)
 *
 * Présente automatiquement chaque nouvelle section découverte à l'utilisateur,
 * sans répétitions intempestives lors des rafraîchissements ou rendus React.
 * Permet un contrôle direct (arrêt immédiat, réécoute, désactivation).
 */
export function SectionVoiceAssistant() {
  const pathname = usePathname();
  const { locale , tr } = useLanguage();
  const [currentNarratingSection, setCurrentNarratingSection] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const assistantTokenRef = useRef(0);

  // Déclencher la lecture vocale d'une section
  const speakSection = useCallback(
    async (section: string, isManual = false) => {
      const prefs = getLocalVoiceSettings();

      // Si la voix globale est désactivée et qu'il ne s'agit pas d'un clic explicite de l'utilisateur
      if (!prefs.voice_reminders && !isManual) {
        return;
      }

      // Si la vidéo d'introduction est active, ne pas superposer
      if (typeof window !== "undefined" && (window as any).__REMINDME_VIDEO_PLAYING) {
        return;
      }

      // Si le guide interactif est ouvert, le guide a priorité absolue
      if (
        (typeof window !== "undefined" && (window as any).__REMINDME_TOUR_ACTIVE) ||
        (typeof document !== "undefined" &&
          (document.querySelector('[data-remindme-tour="active"]') ||
            document.querySelector('[aria-label="Guide interactif Remind Me"]')))
      ) {
        return;
      }

      const voiceLang = (prefs.voice_language || locale || "fr") as VoiceLanguage;
      const text = getSectionVoiceGuide(section, voiceLang);
      if (!text) return;

      assistantTokenRef.current++;
      const currentToken = assistantTokenRef.current;

      stopVoiceReminder(false);
      setCurrentNarratingSection(section);
      setIsSpeaking(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("remindme:voice-section-status", {
            detail: { section, isPlaying: true },
          })
        );
      }

      // Notifier la section comme visitée dans la session
      markSectionVisited(section);

      try {
        await playVoiceReminder({
          text,
          language: voiceLang,
          voiceType: prefs.voice_type,
          priority: isManual ? "preview" : "section",
          rate: prefs.voice_playback_rate || 1.0,
          onStart: () => {
            if (assistantTokenRef.current === currentToken) {
              setIsSpeaking(true);
            }
          },
          onEnd: () => {
            if (assistantTokenRef.current === currentToken) {
              setIsSpeaking(false);
              setCurrentNarratingSection(null);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("remindme:voice-section-status", {
                    detail: { section, isPlaying: false },
                  })
                );
              }
            }
          },
          onError: () => {
            if (assistantTokenRef.current === currentToken) {
              setIsSpeaking(false);
              setCurrentNarratingSection(null);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("remindme:voice-section-status", {
                    detail: { section, isPlaying: false },
                  })
                );
              }
            }
          },
        });
      } catch {
        if (assistantTokenRef.current === currentToken) {
          setIsSpeaking(false);
          setCurrentNarratingSection(null);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("remindme:voice-section-status", {
                detail: { section, isPlaying: false },
              })
            );
          }
        }
      }
    },
    [locale, isSpeaking, currentNarratingSection]
  );

  // Écoute des événements manuels et de synchronisation
  useEffect(() => {
    function handleManualRequest(e: any) {
      const section = e?.detail?.section || resolveSectionFromPath(pathname);
      if (!section) return;

      if (isSpeaking && currentNarratingSection === section) {
        assistantTokenRef.current++;
        stopVoiceReminder(false);
        setIsSpeaking(false);
        setCurrentNarratingSection(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("remindme:voice-section-status", {
              detail: { section, isPlaying: false },
            })
          );
        }
      } else {
        speakSection(section, true);
      }
    }

    function handleStopRequest() {
      assistantTokenRef.current++;
      stopVoiceReminder(false);
      setIsSpeaking(false);
      const prevSection = currentNarratingSection;
      setCurrentNarratingSection(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("remindme:voice-section-status", {
            detail: { section: prevSection, isPlaying: false },
          })
        );
      }
    }

    window.addEventListener("remindme:play-section-voice", handleManualRequest);
    window.addEventListener("remindme:stop-section-voice", handleStopRequest);
    window.addEventListener("remindme:video-active", handleStopRequest);
    window.addEventListener("remindme:start-tour", handleStopRequest);
    window.addEventListener("remindme:start-contextual-tour", handleStopRequest);

    return () => {
      window.removeEventListener("remindme:play-section-voice", handleManualRequest);
      window.removeEventListener("remindme:stop-section-voice", handleStopRequest);
      window.removeEventListener("remindme:video-active", handleStopRequest);
      window.removeEventListener("remindme:start-tour", handleStopRequest);
      window.removeEventListener("remindme:start-contextual-tour", handleStopRequest);
    };
  }, [pathname, speakSection, isSpeaking, currentNarratingSection]);

  // Découverte automatique lors de la navigation
  useEffect(() => {
    const section = resolveSectionFromPath(pathname);
    if (!section) {
      assistantTokenRef.current++;
      stopVoiceReminder(false);
      setIsSpeaking(false);
      setCurrentNarratingSection(null);
      return;
    }

    // Vérifier si l'utilisateur a désactivé l'accompagnement automatique des sections
    try {
      const autoPref = localStorage.getItem(ASSISTANT_PREF_KEY);
      if (autoPref === "disabled") {
        return;
      }
    } catch {}

    const visited = getVisitedSections();
    // Si cette section a déjà été présentée au cours de la session : NE PAS RÉPÉTER
    if (visited.has(section)) {
      return;
    }

    // Vérifier les préférences vocales globales
    const prefs = getLocalVoiceSettings();
    if (!prefs.voice_reminders || prefs.voice_category_briefings === false) {
      return;
    }

    // Délai de 1.4s après navigation pour laisser le temps d'affichage
    const timer = setTimeout(() => {
      // Vérifier si une autre lecture prioritaire est en cours
      if (!isVoicePlaying()) {
        speakSection(section, false);
      }
    }, 1400);

    return () => clearTimeout(timer);
  }, [pathname, speakSection]);

  const handleStop = () => {
    assistantTokenRef.current++;
    stopVoiceReminder(false);
    setIsSpeaking(false);
    setCurrentNarratingSection(null);
  };

  const pageSection = resolveSectionFromPath(pathname);
  if (!pageSection) return null;

  const activeSection = isSpeaking ? currentNarratingSection ?? pageSection : pageSection;
  const sectionLabel =
    SECTION_LABELS[activeSection]?.[locale] || SECTION_LABELS[activeSection]?.fr || activeSection;

  // Bouton rond flottant : un appui lit le guide vocal de la page, un second l'arrête.
  // Placé au-dessus de la barre de navigation mobile (zone de sécurité iPhone comprise).
  return (
    <button
      type="button"
      onClick={() => (isSpeaking ? handleStop() : speakSection(pageSection, true))}
      title={isSpeaking ? `Arrêter le guide vocal — ${sectionLabel}` : `Écouter le guide vocal — ${sectionLabel}`}
      aria-label={isSpeaking ? tr("Arrêter le guide vocal") : tr("Écouter le guide vocal de cette page")}
      aria-pressed={isSpeaking}
      className={`fixed right-4 sm:right-6 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 bg-canvas-raised dark:bg-slate-900 shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-90 cursor-pointer select-none print:hidden ${
        isSpeaking ? "border-signal shadow-signal/30 ring-4 ring-signal/20" : "border-signal/40 hover:border-signal"
      }`}
    >
      {isSpeaking && (
        <span className="absolute inset-0 rounded-full bg-signal/25 animate-ping" aria-hidden="true" />
      )}
      {/* Petit assistant : il « parle » pendant la lecture du guide */}
      <GuideMascot speaking={isSpeaking} className="relative h-10 w-10" />
      <span
        className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-xs ring-2 ring-canvas-raised dark:ring-slate-900 ${
          isSpeaking ? "bg-ink-950 dark:bg-white dark:text-ink-950" : "bg-signal"
        }`}
        aria-hidden="true"
      >
        {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
      </span>
    </button>
  );
}

/**
 * Déclenche manuellement la lecture vocale de la section demandée
 */
export function triggerSectionVoiceGuide(section: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("remindme:play-section-voice", { detail: { section } })
    );
  }
}

/**
 * Arrête immédiatement la lecture vocale de section
 */
export function stopSectionVoiceGuide() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("remindme:stop-section-voice"));
  }
}
