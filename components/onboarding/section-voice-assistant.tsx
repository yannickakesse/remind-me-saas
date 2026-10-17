"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX, Sparkles, X } from "lucide-react";
import {
  playVoiceReminder,
  stopVoiceReminder,
  getLocalVoiceSettings,
  getSectionVoiceGuide,
  isVoicePlaying,
  type VoiceLanguage,
} from "@/lib/voice";
import { useLanguage } from "@/components/i18n/language-provider";

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
  const { locale } = useLanguage();
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

  if (!isSpeaking || !currentNarratingSection) return null;

  const sectionLabel =
    SECTION_LABELS[currentNarratingSection]?.[locale] ||
    SECTION_LABELS[currentNarratingSection]?.fr ||
    currentNarratingSection;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-950/95 dark:bg-slate-900/95 border border-amber-500/40 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-300 pointer-events-auto select-none"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-xs shrink-0 animate-pulse">
        <Volume2 className="h-4 w-4" />
      </div>

      <div className="flex flex-col pr-1">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" /> Guidage vocal
        </span>
        <span className="text-xs font-semibold text-white truncate max-w-[170px] sm:max-w-[220px]">
          {sectionLabel}
        </span>
      </div>

      <button
        type="button"
        onClick={handleStop}
        title="Arrêter la voix"
        aria-label="Arrêter la voix"
        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-zinc-300 hover:text-white text-[11px] font-bold transition-all cursor-pointer ml-1"
      >
        <VolumeX className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Arrêter</span>
      </button>

      <button
        type="button"
        onClick={handleStop}
        title="Fermer"
        aria-label="Fermer l'indicateur"
        className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
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
