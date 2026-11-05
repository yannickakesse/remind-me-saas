"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Pause, Play, Volume2, X } from "lucide-react";
import {
  playVoiceReminder,
  playAudioFile,
  pauseVoice,
  resumeVoice,
  stopVoiceReminder,
  speakVoiceReminder,
  isSpeechSupported,
  getLocalVoiceSettings,
  getSectionVoiceGuide,
  getGuideAudioSrc,
  GUIDE_AUDIO_LANGUAGES,
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
  if (pathname === "/goals" || pathname.startsWith("/goals/")) return "goals";
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
  goals: { fr: "Mes Objectifs", en: "My Goals", es: "Mis objetivos", de: "Meine Ziele", pt: "Meus objetivos" },
};

/**
 * Guide vocal de chaque page (bouton mascotte).
 *
 * 1. Audio préenregistré (registre lib/voice/guide-audio.ts) dans le lecteur central.
 * 2. Sinon, voix ElevenLabs générée à partir du texte du guide.
 * 3. Sinon, le texte du guide s'affiche, avec une écoute possible par la voix de l'appareil.
 * Un appui lance la lecture, un autre la met en pause, puis la reprend ; la croix l'arrête.
 */
type GuideStatus = "idle" | "loading" | "playing" | "paused";

export function SectionVoiceAssistant() {
  const pathname = usePathname();
  const { locale, tr } = useLanguage();
  const [currentNarratingSection, setCurrentNarratingSection] = useState<string | null>(null);
  const [status, setStatus] = useState<GuideStatus>("idle");
  const [fallback, setFallback] = useState<{ section: string; text: string; lang: VoiceLanguage } | null>(null);
  const assistantTokenRef = useRef(0);
  const statusRef = useRef<GuideStatus>("idle");
  statusRef.current = status;
  const isSpeaking = status !== "idle";

  const announce = (section: string | null, isPlaying: boolean) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("remindme:voice-section-status", { detail: { section, isPlaying } }));
  };

  const reset = useCallback((section: string | null) => {
    setStatus("idle");
    setCurrentNarratingSection(null);
    announce(section, false);
  }, []);

  const stopAll = useCallback(
    (section: string | null) => {
      assistantTokenRef.current++;
      stopVoiceReminder(false);
      reset(section);
    },
    [reset]
  );

  // Langue du guide : celle de l'interface si un guide existe pour elle, sinon la langue des rappels vocaux.
  const guideLanguage = useCallback((): VoiceLanguage => {
    const ui = (locale || "fr").slice(0, 2) as VoiceLanguage;
    if ((GUIDE_AUDIO_LANGUAGES as readonly string[]).includes(ui)) return ui;
    return getLocalVoiceSettings().voice_language;
  }, [locale]);

  const speakSection = useCallback(
    async (section: string, isManual = false) => {
      const prefs = getLocalVoiceSettings();
      if (!prefs.voice_reminders && !isManual) return;
      if (typeof window !== "undefined" && (window as any).__REMINDME_VIDEO_PLAYING) return;
      if (
        (typeof window !== "undefined" && (window as any).__REMINDME_TOUR_ACTIVE) ||
        (typeof document !== "undefined" &&
          (document.querySelector('[data-remindme-tour="active"]') ||
            document.querySelector('[aria-label="Guide interactif Remind Me"]')))
      ) {
        return;
      }

      const voiceLang = guideLanguage();
      const text = getSectionVoiceGuide(section, voiceLang);
      if (!text) return;

      const token = ++assistantTokenRef.current;
      const isMine = () => assistantTokenRef.current === token;
      stopVoiceReminder(false);
      setFallback(null);
      setCurrentNarratingSection(section);
      setStatus("loading");
      announce(section, true);
      markSectionVisited(section);

      const finish = () => {
        if (isMine()) reset(section);
      };
      const rate = prefs.voice_playback_rate || 1.0;
      const priority = isManual ? "preview" : "section";

      // 1. Audio préenregistré (lancé immédiatement : compatible iPhone)
      const src = getGuideAudioSrc(section, voiceLang);
      if (src) {
        const started = await playAudioFile({ src, priority, rate, onEnd: finish });
        if (!isMine()) return;
        if (started) {
          setStatus("playing");
          return;
        }
        if (!isManual) return finish(); // lecture automatique bloquée : rester discret
      }

      // 2. Voix ElevenLabs (3. texte affiché si elle est indisponible)
      await playVoiceReminder({
        text,
        language: voiceLang,
        voiceType: prefs.voice_type,
        priority,
        rate,
        onStart: () => {
          if (isMine()) setStatus("playing");
        },
        onEnd: finish,
        onError: () => {
          if (!isMine()) return;
          finish();
          if (isManual) setFallback({ section, text, lang: voiceLang });
        },
      }).then((ok) => {
        if (!ok && isMine() && statusRef.current === "loading") finish();
      });
    },
    [guideLanguage, reset]
  );

  // Synchronisation avec le lecteur central (pause, reprise, arrêt par une autre lecture)
  useEffect(() => {
    function onVoiceState(e: any) {
      const { playing, paused } = e?.detail || {};
      if (statusRef.current === "idle" || statusRef.current === "loading") return;
      if (!playing) {
        assistantTokenRef.current++;
        reset(currentNarratingSection);
      } else setStatus(paused ? "paused" : "playing");
    }
    window.addEventListener("remindme:voice-state", onVoiceState);
    return () => window.removeEventListener("remindme:voice-state", onVoiceState);
  }, [reset, currentNarratingSection]);

  // Événements manuels (boutons « Guide » des pages) et arrêts imposés (vidéo, visite guidée)
  useEffect(() => {
    function handleManualRequest(e: any) {
      const section = e?.detail?.section || resolveSectionFromPath(pathname);
      if (!section) return;
      if (isSpeaking && currentNarratingSection === section) stopAll(section);
      else speakSection(section, true);
    }
    function handleStopRequest() {
      setFallback(null);
      stopAll(currentNarratingSection);
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
  }, [pathname, speakSection, stopAll, isSpeaking, currentNarratingSection]);

  // Découverte automatique lors de la navigation
  useEffect(() => {
    const section = resolveSectionFromPath(pathname);
    setFallback(null);
    if (!section) {
      if (statusRef.current !== "idle") stopAll(null);
      return;
    }
    // Changement de page : le guide de la page précédente s'arrête
    if (statusRef.current !== "idle") stopAll(null);

    try {
      if (localStorage.getItem(ASSISTANT_PREF_KEY) === "disabled") return;
    } catch {}
    if (getVisitedSections().has(section)) return;
    const prefs = getLocalVoiceSettings();
    if (!prefs.voice_reminders || prefs.voice_category_briefings === false) return;

    const timer = setTimeout(() => {
      if (!isVoicePlaying()) speakSection(section, false);
    }, 1400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const pageSection = resolveSectionFromPath(pathname);
  if (!pageSection) return null;

  const activeSection = isSpeaking ? currentNarratingSection ?? pageSection : pageSection;
  const sectionLabel =
    SECTION_LABELS[activeSection]?.[locale] || SECTION_LABELS[activeSection]?.fr || activeSection;

  const onMainPress = () => {
    if (status === "playing") pauseVoice();
    else if (status === "paused") resumeVoice();
    else if (status === "idle") speakSection(pageSection, true);
  };

  const mainLabel =
    status === "playing"
      ? tr("Mettre le guide vocal en pause")
      : status === "paused"
      ? tr("Reprendre le guide vocal")
      : tr("Écouter le guide vocal de cette page");

  return (
    <>
      {fallback && fallback.section === pageSection && (
        <div
          role="status"
          className="fixed right-4 sm:right-6 bottom-[calc(10rem+env(safe-area-inset-bottom,0px))] md:bottom-24 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-signal/30 bg-canvas-raised dark:bg-slate-900 p-4 shadow-xl print:hidden"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-signal">{tr("Guide — {sectionLabel}", { sectionLabel })}</p>
            <button
              type="button"
              onClick={() => setFallback(null)}
              aria-label={tr("Fermer")}
              className="-mt-1 -mr-1 rounded-full p-1 text-ink-400 hover:text-ink-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-800 dark:text-ink-200">{fallback.text}</p>
          <p className="mt-2 text-xs text-ink-500">{tr("La voix Remind Me est momentanément indisponible.")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => speakSection(pageSection, true)}
              className="rounded-full bg-signal px-3 py-1.5 text-xs font-semibold text-white"
            >
              {tr("Réessayer l'écoute")}
            </button>
            {isSpeechSupported() && (
              <button
                type="button"
                onClick={() => {
                  const { text, lang } = fallback;
                  setFallback(null);
                  stopVoiceReminder(false);
                  speakVoiceReminder({ text, language: lang, rate: getLocalVoiceSettings().voice_playback_rate || 1.0 });
                }}
                className="rounded-full border border-ink-200 dark:border-ink-600 px-3 py-1.5 text-xs font-semibold text-ink-800 dark:text-ink-200"
              >
                {tr("Voix de l'appareil")}
              </button>
            )}
          </div>
        </div>
      )}

      {isSpeaking && (
        <button
          type="button"
          onClick={() => stopAll(currentNarratingSection)}
          aria-label={tr("Arrêter le guide vocal")}
          title={tr("Arrêter le guide vocal")}
          className="fixed right-[4.75rem] sm:right-[5.25rem] bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:bottom-[2.25rem] z-40 flex h-9 w-9 items-center justify-center rounded-full bg-ink-950 text-white shadow-lg dark:bg-white dark:text-ink-950 print:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <button
        type="button"
        onClick={onMainPress}
        title={`${mainLabel} — ${sectionLabel}`}
        aria-label={mainLabel}
        aria-pressed={status === "playing"}
        className={`fixed right-4 sm:right-6 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 bg-canvas-raised dark:bg-slate-900 shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-90 cursor-pointer select-none print:hidden ${
          isSpeaking ? "border-signal shadow-signal/30 ring-4 ring-signal/20" : "border-signal/40 hover:border-signal"
        }`}
      >
        {status === "playing" && (
          <span className="absolute inset-0 rounded-full bg-signal/25 animate-ping" aria-hidden="true" />
        )}
        <GuideMascot speaking={status === "playing"} className="relative h-10 w-10" />
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-xs ring-2 ring-canvas-raised dark:ring-slate-900 ${
            isSpeaking ? "bg-ink-950 dark:bg-white dark:text-ink-950" : "bg-signal"
          }`}
          aria-hidden="true"
        >
          {status === "loading" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : status === "playing" ? (
            <Pause className="h-3 w-3" />
          ) : status === "paused" ? (
            <Play className="h-3 w-3" />
          ) : (
            <Volume2 className="h-3 w-3" />
          )}
        </span>
      </button>
    </>
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
