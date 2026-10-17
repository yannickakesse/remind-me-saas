"use client";

import { useEffect, useState, useRef } from "react";
import { DateTime } from "luxon";
import { Sunrise, Sun, Moon, Sparkles, Volume2, X } from "lucide-react";
import {
  playVoiceReminder,
  stopVoiceReminder,
  getLocalVoiceSettings,
  isVoicePlaying,
} from "@/lib/voice";
import { useLanguage } from "@/components/i18n/language-provider";

interface DailyWelcomeBannerProps {
  userName?: string | null;
  timezone?: string;
  hasActivitiesToday?: boolean;
  tourCompleted?: boolean;
}

const SESSION_STORAGE_KEY = "remindme_session_welcome_shown";
const VISITED_BEFORE_KEY = "remindme_visited_before";
const MOTION_MODAL_KEY = "remindme_motion_popup_last_shown";

export function DailyWelcomeBanner({
  userName,
  timezone = "Europe/Paris",
  hasActivitiesToday = false,
  tourCompleted = true,
}: DailyWelcomeBannerProps) {
  const { locale, t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [greetingText, setGreetingText] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const [greetingIcon, setGreetingIcon] = useState<"sunrise" | "sun" | "moon">("sun");
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [voiceTextState, setVoiceTextState] = useState<string>("");
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Ne pas afficher si déjà affiché pendant la même session
    try {
      const alreadyShownThisSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (alreadyShownThisSession) {
        return;
      }
    } catch {}

    // 2. Vérifier les conflits avec d'autres fenêtres d'accueil prioritaires
    // Si le tour interactif d'onboarding n'est pas terminé, laisser la priorité au tour
    if (tourCompleted === false) {
      return;
    }

    // Si la vidéo de bienvenue WelcomeVideoModal est sur le point de s'ouvrir, différer/supprimer
    try {
      const lastVideoShownStr = localStorage.getItem(MOTION_MODAL_KEY);
      const now = Date.now();
      const videoCooldown = 2.5 * 24 * 60 * 60 * 1000;
      if (!lastVideoShownStr || now - parseInt(lastVideoShownStr, 10) > videoCooldown) {
        // La vidéo de bienvenue va se lancer, on ne superpose pas l'accueil
        return;
      }
    } catch {}

    // 3. Calcul de la salutation textuelle selon l'heure locale et le vrai nom d'utilisateur
    const userNow = DateTime.now().setZone(timezone);
    const hour = userNow.hour;

    // Extraction du vrai nom du compte (sans jamais forcer "Boss" en dur)
    const rawName = userName?.trim() || "";
    const firstName = rawName.split(/\s+/)[0] || "";
    const nameWithSpace = firstName ? ` ${firstName}` : "";

    // Détermination de la langue de synthèse vocale configurée
    const localPrefs = getLocalVoiceSettings();
    const voiceLang = (localPrefs.voice_language || locale || "fr") as string;

    let greeting = "";
    let sub = "";
    let icon: "sunrise" | "sun" | "moon" = "sun";

    if (hour >= 5 && hour < 12) {
      icon = "sunrise";
      if (locale === "en") {
        greeting = `Good morning${nameWithSpace}! Welcome to Remind Me.`;
        sub = hasActivitiesToday
          ? "Your reminders and daily schedule are ready."
          : "Your Remind Me cockpit is ready. Have a wonderful morning.";
      } else if (locale === "es") {
        greeting = `¡Buenos días${nameWithSpace}! Bienvenido a Remind Me.`;
        sub = hasActivitiesToday
          ? "Sus recordatorios y actividades de hoy están listos."
          : "Su panel de Remind Me está listo. ¡Que tenga una excelente mañana!";
      } else if (locale === "de") {
        greeting = `Guten Morgen${nameWithSpace}! Willkommen bei Remind Me.`;
        sub = hasActivitiesToday
          ? "Ihre heutigen Erinnerungen und Ihr Tagesplan sind bereit."
          : "Ihr Remind Me Cockpit ist bereit. Einen wunderbaren Morgen!";
      } else if (locale === "pt") {
        greeting = `Bom dia${nameWithSpace}! Bem-vindo ao Remind Me.`;
        sub = hasActivitiesToday
          ? "Seus lembretes e sua programação de hoje estão prontos."
          : "Seu cockpit Remind Me está pronto. Tenha uma excelente manhã.";
      } else {
        greeting = `Bonjour${nameWithSpace} ! Bienvenue sur Remind Me.`;
        sub = hasActivitiesToday
          ? "Vos rappels et votre programme du jour sont prêts."
          : "Votre cockpit Remind Me est prêt. Passez une excellente matinée.";
      }
    } else if (hour >= 12 && hour < 18) {
      icon = "sun";
      if (locale === "en") {
        greeting = `Good afternoon${nameWithSpace}! Glad to see you on Remind Me.`;
        sub = hasActivitiesToday
          ? "Your activities and reminders are synchronized."
          : "Your multi-activity space is up to date.";
      } else if (locale === "es") {
        greeting = `¡Buenas tardes${nameWithSpace}! Un placer tenerle en Remind Me.`;
        sub = hasActivitiesToday
          ? "Sus actividades y recordatorios están sincronizados."
          : "Su espacio multiactividad está al día.";
      } else if (locale === "de") {
        greeting = `Guten Tag${nameWithSpace}! Schön, Sie bei Remind Me wiederzusehen.`;
        sub = hasActivitiesToday
          ? "Ihre Aktivitäten und Erinnerungen sind synchronisiert."
          : "Ihr Multi-Aktivitäten-Bereich ist aktuell.";
      } else if (locale === "pt") {
        greeting = `Boa tarde${nameWithSpace}! Feliz em ver você no Remind Me.`;
        sub = hasActivitiesToday
          ? "Suas atividades e lembretes estão sincronizados."
          : "Seu espaço multiatividades está atualizado.";
      } else {
        greeting = `Bon après-midi${nameWithSpace} ! Heureux de vous retrouver sur Remind Me.`;
        sub = hasActivitiesToday
          ? "Vos activités et vos rappels sont synchronisés."
          : "Votre espace multi-activités est à jour.";
      }
    } else if (hour >= 18 && hour < 23) {
      icon = "moon";
      if (locale === "en") {
        greeting = `Good evening${nameWithSpace}! Your reminders are ready.`;
        sub = "Review your achievements and prepare smoothly for tomorrow.";
      } else if (locale === "es") {
        greeting = `¡Buenas noches${nameWithSpace}! Sus recordatorios están listos.`;
        sub = "Revise sus logros y prepare tranquilamente el día de mañana.";
      } else if (locale === "de") {
        greeting = `Guten Abend${nameWithSpace}! Ihre Erinnerungen sind bereit.`;
        sub = "Sehen Sie Ihre Erfolge ein und bereiten Sie den morgigen Tag vor.";
      } else if (locale === "pt") {
        greeting = `Boa noite${nameWithSpace}! Seus lembretes estão prontos.`;
        sub = "Veja suas realizações e prepare o dia de amanhã com tranquilidade.";
      } else {
        greeting = `Bonsoir${nameWithSpace} ! Vos rappels sont prêts.`;
        sub = "Consultez vos réalisations et préparez sereinement votre journée de demain.";
      }
    } else {
      // Période nocturne (23h00 - 05h00) : formule sobre
      icon = "moon";
      if (locale === "en") {
        greeting = `Good evening${nameWithSpace}! Welcome to Remind Me.`;
        sub = "Your workspace is peacefully synced.";
      } else if (locale === "es") {
        greeting = `¡Buenas noches${nameWithSpace}! Bienvenido a Remind Me.`;
        sub = "Su espacio está sincronizado con total tranquilidad.";
      } else if (locale === "de") {
        greeting = `Guten Abend${nameWithSpace}! Willkommen bei Remind Me.`;
        sub = "Ihr Arbeitsbereich ist ruhig und aktuell synchronisiert.";
      } else if (locale === "pt") {
        greeting = `Boa noite${nameWithSpace}! Bem-vindo ao Remind Me.`;
        sub = "Seu espaço está sincronizado com total tranquilidade.";
      } else {
        greeting = `Bonsoir${nameWithSpace} ! Bienvenue sur Remind Me.`;
        sub = "Votre espace est synchronisé en toute sérénité.";
      }
    }

    setGreetingText(greeting);
    setSubtitleText(sub);
    setGreetingIcon(icon);

    // 4. Génération de la phrase vocale naturelle adaptée selon la langue vocale (voice_language)
    let isFirstVisit = false;
    try {
      isFirstVisit = !localStorage.getItem(VISITED_BEFORE_KEY);
      localStorage.setItem(VISITED_BEFORE_KEY, "true");
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    } catch {
      // no-op
    }

    let spokenText = "";
    const addressedName = firstName ? firstName : "";

    if (voiceLang === "en") {
      if (isFirstVisit) {
        if (hasActivitiesToday) {
          spokenText = addressedName
            ? `Good morning ${addressedName}, welcome to Remind Me! Your reminders and daily schedule are ready. Have a productive day.`
            : `Good morning, welcome to Remind Me! Your reminders and daily schedule are ready. Have a productive day.`;
        } else {
          spokenText = addressedName
            ? `Good morning ${addressedName}, welcome to Remind Me! You have no activities scheduled today. Have a wonderful day.`
            : `Good morning, welcome to Remind Me! You have no activities scheduled today. Have a wonderful day.`;
        }
      } else {
        if (hour >= 5 && hour < 12) {
          if (hasActivitiesToday) {
            spokenText = addressedName
              ? `Good morning ${addressedName}, welcome back to Remind Me! Your reminders and daily schedule are ready. Have a wonderful and productive day.`
              : `Good morning, welcome back to Remind Me! Your reminders and daily schedule are ready. Have a wonderful and productive day.`;
          } else {
            spokenText = addressedName
              ? `Good morning ${addressedName}, welcome back to Remind Me! You have no activities scheduled today. Have a wonderful day.`
              : `Good morning, welcome back to Remind Me! You have no activities scheduled today. Have a wonderful day.`;
          }
        } else if (hour >= 12 && hour < 18) {
          spokenText = addressedName
            ? `Good afternoon ${addressedName}! Great to see you on Remind Me.${hasActivitiesToday ? " Your activities are ready." : ""}`
            : `Good afternoon! Great to see you on Remind Me.${hasActivitiesToday ? " Your activities are ready." : ""}`;
        } else if (hour >= 18 && hour < 23) {
          spokenText = addressedName
            ? `Good evening ${addressedName}! Your reminders are ready. Welcome back to Remind Me.`
            : `Good evening! Your reminders are ready. Welcome back to Remind Me.`;
        } else {
          spokenText = addressedName
            ? `Good evening ${addressedName}! Welcome to Remind Me.`
            : `Good evening! Welcome to Remind Me.`;
        }
      }
    } else if (voiceLang === "es") {
      if (isFirstVisit) {
        if (hasActivitiesToday) {
          spokenText = addressedName
            ? `¡Buenos días ${addressedName}, bienvenido a Remind Me! Sus recordatorios y actividades de hoy están listos. Que tenga un día muy productivo.`
            : `¡Buenos días, bienvenido a Remind Me! Sus recordatorios y actividades de hoy están listos. Que tenga un día muy productivo.`;
        } else {
          spokenText = addressedName
            ? `¡Buenos días ${addressedName}, bienvenido a Remind Me! No tiene actividades programadas para hoy. Que tenga un excelente día.`
            : `¡Buenos días, bienvenido a Remind Me! No tiene actividades programadas para hoy. Que tenga un excelente día.`;
        }
      } else {
        if (hour >= 5 && hour < 12) {
          if (hasActivitiesToday) {
            spokenText = addressedName
              ? `¡Buenos días ${addressedName}, bienvenido de nuevo a Remind Me! Sus recordatorios y actividades de hoy están listos. Que tenga una excelente jornada.`
              : `¡Buenos días, bienvenido de nuevo a Remind Me! Sus recordatorios y actividades de hoy están listos. Que tenga una excelente jornada.`;
          } else {
            spokenText = addressedName
              ? `¡Buenos días ${addressedName}, bienvenido de nuevo a Remind Me! No tiene actividades programadas para hoy. Que tenga un excelente día.`
              : `¡Buenos días, bienvenido de nuevo a Remind Me! No tiene actividades programadas para hoy. Que tenga un excelente día.`;
          }
        } else if (hour >= 12 && hour < 18) {
          spokenText = addressedName
            ? `¡Buenas tardes ${addressedName}! Un placer tenerle en Remind Me.${hasActivitiesToday ? " Sus actividades están listas." : ""}`
            : `¡Buenas tardes! Un placer tenerle en Remind Me.${hasActivitiesToday ? " Sus actividades están listas." : ""}`;
        } else if (hour >= 18 && hour < 23) {
          spokenText = addressedName
            ? `¡Buenas noches ${addressedName}! Sus recordatorios están listos. Bienvenido de nuevo a Remind Me.`
            : `¡Buenas noches! Sus recordatorios están listos. Bienvenido de nuevo a Remind Me.`;
        } else {
          spokenText = addressedName
            ? `¡Buenas noches ${addressedName}! Bienvenido a Remind Me.`
            : `¡Buenas noches! Bienvenido a Remind Me.`;
        }
      }
    } else if (voiceLang === "de") {
      if (isFirstVisit) {
        if (hasActivitiesToday) {
          spokenText = addressedName
            ? `Guten Morgen ${addressedName}, willkommen bei Remind Me! Ihre heutigen Erinnerungen und Aktivitäten sind bereit. Einen produktiven Tag!`
            : `Guten Morgen, willkommen bei Remind Me! Ihre heutigen Erinnerungen und Aktivitäten sind bereit. Einen produktiven Tag!`;
        } else {
          spokenText = addressedName
            ? `Guten Morgen ${addressedName}, willkommen bei Remind Me! Sie haben heute keine geplanten Aktivitäten. Einen schönen Tag!`
            : `Guten Morgen, willkommen bei Remind Me! Sie haben heute keine geplanten Aktivitäten. Einen schönen Tag!`;
        }
      } else {
        if (hour >= 5 && hour < 12) {
          if (hasActivitiesToday) {
            spokenText = addressedName
              ? `Guten Morgen ${addressedName}, willkommen zurück bei Remind Me! Ihre heutigen Erinnerungen und Aktivitäten sind bereit. Einen produktiven Tag!`
              : `Guten Morgen, willkommen zurück bei Remind Me! Ihre heutigen Erinnerungen und Aktivitäten sind bereit. Einen produktiven Tag!`;
          } else {
            spokenText = addressedName
              ? `Guten Morgen ${addressedName}, willkommen zurück bei Remind Me! Sie haben heute keine geplanten Aktivitäten. Einen schönen Tag!`
              : `Guten Morgen, willkommen zurück bei Remind Me! Sie haben heute keine geplanten Aktivitäten. Einen schönen Tag!`;
          }
        } else if (hour >= 12 && hour < 18) {
          spokenText = addressedName
            ? `Guten Tag ${addressedName}! Schön, Sie bei Remind Me wiederzusehen.${hasActivitiesToday ? " Ihre Aktivitäten sind bereit." : ""}`
            : `Guten Tag! Schön, Sie bei Remind Me wiederzusehen.${hasActivitiesToday ? " Ihre Aktivitäten sind bereit." : ""}`;
        } else if (hour >= 18 && hour < 23) {
          spokenText = addressedName
            ? `Guten Abend ${addressedName}! Ihre Erinnerungen sind bereit. Willkommen zurück bei Remind Me.`
            : `Guten Abend! Ihre Erinnerungen sind bereit. Willkommen zurück bei Remind Me.`;
        } else {
          spokenText = addressedName
            ? `Guten Abend ${addressedName}! Willkommen bei Remind Me.`
            : `Guten Abend! Willkommen bei Remind Me.`;
        }
      }
    } else if (voiceLang === "pt") {
      if (isFirstVisit) {
        if (hasActivitiesToday) {
          spokenText = addressedName
            ? `Bom dia ${addressedName}, bem-vindo ao Remind Me! Seus lembretes e atividades de hoje estão prontos. Tenha um dia muito produtivo.`
            : `Bom dia, bem-vindo ao Remind Me! Seus lembretes e atividades de hoje estão prontos. Tenha um dia muito produtivo.`;
        } else {
          spokenText = addressedName
            ? `Bom dia ${addressedName}, bem-vindo ao Remind Me! Você não tem atividades agendadas hoje. Tenha um ótimo dia.`
            : `Bom dia, bem-vindo ao Remind Me! Você não tem atividades agendadas hoje. Tenha um ótimo dia.`;
        }
      } else {
        if (hour >= 5 && hour < 12) {
          if (hasActivitiesToday) {
            spokenText = addressedName
              ? `Bom dia ${addressedName}, bem-vindo de volta ao Remind Me! Seus lembretes e atividades de hoje estão prontos. Tenha um excelente dia produtivo.`
              : `Bom dia, bem-vindo de volta ao Remind Me! Seus lembretes e atividades de hoje estão prontos. Tenha um excelente dia produtivo.`;
          } else {
            spokenText = addressedName
              ? `Bom dia ${addressedName}, bem-vindo de volta ao Remind Me! Você não tem atividades agendadas hoje. Tenha um ótimo dia.`
              : `Bom dia, bem-vindo de volta au Remind Me! Você não tem atividades agendadas hoje. Tenha um ótimo dia.`;
          }
        } else if (hour >= 12 && hour < 18) {
          spokenText = addressedName
            ? `Boa tarde ${addressedName}! Feliz em ver você de volta no Remind Me.${hasActivitiesToday ? " Suas atividades estão prontas." : ""}`
            : `Boa tarde! Feliz em ver você de volta no Remind Me.${hasActivitiesToday ? " Suas atividades estão prontas." : ""}`;
        } else if (hour >= 18 && hour < 23) {
          spokenText = addressedName
            ? `Boa noite ${addressedName}! Seus lembretes estão prontos. Bem-vindo de volta ao Remind Me.`
            : `Boa noite! Seus lembretes estão prontos. Bem-vindo de volta ao Remind Me.`;
        } else {
          spokenText = addressedName
            ? `Boa noite ${addressedName}! Bem-vindo ao Remind Me.`
            : `Boa noite! Bem-vindo ao Remind Me.`;
        }
      }
    } else {
      // Français par défaut
      if (isFirstVisit) {
        if (hasActivitiesToday) {
          spokenText = addressedName
            ? `Bonjour ${addressedName}, bienvenue sur Remind Me ! Vos rappels et vos activités du jour sont prêts. Je vous souhaite une excellente journée productive.`
            : `Bonjour, bienvenue sur Remind Me ! Vos rappels et vos activités du jour sont prêts. Je vous souhaite une excellente journée productive.`;
        } else {
          spokenText = addressedName
            ? `Bonjour ${addressedName}, bienvenue sur Remind Me ! Vous n'avez aucune activité prévue pour le moment. Je vous souhaite une très belle journée.`
            : `Bonjour, bienvenue sur Remind Me ! Vous n'avez aucune activité prévue pour le moment. Je vous souhaite une très belle journée.`;
        }
      } else {
        if (hour >= 5 && hour < 12) {
          if (hasActivitiesToday) {
            spokenText = addressedName
              ? `Bonjour ${addressedName}, bon retour sur Remind Me ! Vos rappels et vos activités du jour sont prêts. Passez une excellente journée productive.`
              : `Bonjour, bon retour sur Remind Me ! Vos rappels et vos activités du jour sont prêts. Passez une excellente journée productive.`;
          } else {
            spokenText = addressedName
              ? `Bonjour ${addressedName}, bon retour sur Remind Me ! Vous n'avez aucune activité prévue aujourd'hui. Passez une excellente journée.`
              : `Bonjour, bon retour sur Remind Me ! Vous n'avez aucune activité prévue aujourd'hui. Passez une excellente journée.`;
          }
        } else if (hour >= 12 && hour < 18) {
          spokenText = addressedName
            ? `Bon après-midi ${addressedName} ! Heureux de vous retrouver sur Remind Me.${hasActivitiesToday ? " Vos activités sont prêtes." : ""}`
            : `Bon après-midi ! Heureux de vous retrouver sur Remind Me.${hasActivitiesToday ? " Vos activités sont prêtes." : ""}`;
        } else if (hour >= 18 && hour < 23) {
          spokenText = addressedName
            ? `Bonsoir ${addressedName} ! Vos rappels sont prêts. Bon retour sur Remind Me.`
            : `Bonsoir ! Vos rappels sont prêts. Bon retour sur Remind Me.`;
        } else {
          spokenText = addressedName
            ? `Bonsoir ${addressedName} ! Bienvenue sur Remind Me.`
            : `Bonsoir ! Bienvenue sur Remind Me.`;
        }
      }
    }

    setVoiceTextState(spokenText);

    // 5. Afficher le composant centré après un court délai fluide (300ms)
    const showTimer = setTimeout(() => {
      setMounted(true);

      // Déclencher la voix si les paramètres de l'utilisateur l'autorisent et aucun rappel n'est en cours
      const localPrefs = getLocalVoiceSettings();
      if (localPrefs.voice_reminders && spokenText && !isVoicePlaying()) {
        playVoiceReminder({
          text: spokenText,
          language: localPrefs.voice_language,
          voiceType: localPrefs.voice_type,
          priority: "greeting",
          onStart: () => {
            setAudioPlayed(true);
          },
          onEnd: () => {
            setAudioPlayed(false);
          },
          onError: () => {
            setAudioPlayed(false);
          },
        }).then((didPlay) => {
          if (didPlay) {
            setAudioPlayed(true);
          }
        }).catch(() => {
          setAudioPlayed(false);
        });
      }
    }, 300);

    // 6. Disparition automatique fluide après environ 3.2 secondes
    const fadeTimer = setTimeout(() => {
      if (!dismissedRef.current) {
        setIsFadingOut(true);
      }
    }, 3300);

    // 7. Retrait complet du DOM après la fin de la transition d'effacement
    const unmountTimer = setTimeout(() => {
      if (!dismissedRef.current) {
        setMounted(false);
      }
    }, 3850);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [userName, timezone, hasActivitiesToday, tourCompleted, locale]);

  const handleManualDismiss = () => {
    dismissedRef.current = true;
    setIsFadingOut(true);
    setTimeout(() => {
      setMounted(false);
    }, 250);
  };

  const handleManualSpeak = () => {
    if (!voiceTextState) return;
    const localPrefs = getLocalVoiceSettings();
    playVoiceReminder({
      text: voiceTextState,
      language: localPrefs.voice_language,
      voiceType: localPrefs.voice_type,
      priority: "greeting",
      onStart: () => setAudioPlayed(true),
      onEnd: () => setAudioPlayed(false),
      onError: () => setAudioPlayed(false),
    }).catch(() => {});
  };

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none select-none transition-all duration-500 ${
        isFadingOut
          ? "opacity-0 scale-95 pointer-events-none"
          : "opacity-100 scale-100 animate-in fade-in zoom-in-95 duration-400"
      }`}
    >
      {/* Carte d'accueil centrée, discrète et élégante */}
      <div className="relative pointer-events-auto overflow-hidden rounded-3xl bg-canvas-raised/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xl p-5 sm:p-6 w-full max-w-md ring-1 ring-black/5 dark:ring-white/10 transition-all">
        {/* Lueur subtile d'arrière-plan */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-signal/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-4">
          {/* Icône d'accueil selon l'heure */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-signal/20 to-gold/20 flex items-center justify-center shrink-0 shadow-inner border border-signal/25">
            {greetingIcon === "sunrise" && (
              <Sunrise className="w-6 h-6 text-amber-500 animate-pulse" />
            )}
            {greetingIcon === "sun" && (
              <Sun className="w-6 h-6 text-amber-500 animate-spin-slow" />
            )}
            {greetingIcon === "moon" && (
              <Moon className="w-6 h-6 text-indigo-400" />
            )}
          </div>

          {/* Titre & Message d'accueil */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-ink-950 dark:text-white tracking-tight leading-snug">
                {greetingText}
              </h3>
            </div>
            <p className="text-xs text-ink-600 dark:text-zinc-300 mt-1 font-medium leading-relaxed">
              {subtitleText}
            </p>
          </div>

          {/* Bouton fermeture immédiate facultative */}
          <button
            type="button"
            onClick={handleManualDismiss}
            className="absolute top-0 right-0 p-1.5 rounded-xl text-ink-400 hover:text-ink-700 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={t("actions.close") || "Fermer"}
            aria-label={t("actions.close") || "Fermer"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barre de progression visuelle de 3 secondes pour rassurer sur la disparition automatique */}
        <div className="mt-3.5 h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-signal to-gold rounded-full w-full animate-out-shrink" />
        </div>
      </div>
    </div>
  );
}
