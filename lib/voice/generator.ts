import type {
  VoiceLanguage,
  VoiceMessageParams,
  DailyActivityItem,
  MorningBriefingVoiceParams,
  MiddayCheckinVoiceParams,
  EveningSummaryVoiceParams,
  IndividualReminderVoiceParams,
  ActivityCompletedVoiceParams,
} from "./types";
import { spokenActivityContext } from "../activities/classification";

/**
 * Délai avant une activité, dit naturellement (« une heure », « trente minutes », « une quinzaine de minutes »…).
 * Corrige l'ancien comportement qui disait « dix minutes » pour tout rappel de moins de 35 min.
 */
export function spokenDelay(minutes: number | undefined, language: VoiceLanguage = "fr"): string {
  const m = Math.max(1, Math.round(Number(minutes) || 0));
  const hours = m % 60 === 0 ? m / 60 : null;
  const tables: Record<string, Record<number, string>> = {
    fr: { 5: "cinq minutes", 10: "une dizaine de minutes", 15: "une quinzaine de minutes", 20: "vingt minutes", 30: "trente minutes", 45: "trois quarts d'heure", 60: "une heure", 90: "une heure et demie", 120: "deux heures" },
    en: { 5: "five minutes", 10: "ten minutes", 15: "fifteen minutes", 20: "twenty minutes", 30: "thirty minutes", 45: "forty-five minutes", 60: "one hour", 90: "an hour and a half", 120: "two hours" },
    es: { 5: "cinco minutos", 10: "diez minutos", 15: "quince minutos", 20: "veinte minutos", 30: "treinta minutos", 45: "cuarenta y cinco minutos", 60: "una hora", 90: "una hora y media", 120: "dos horas" },
    de: { 5: "fünf Minuten", 10: "zehn Minuten", 15: "fünfzehn Minuten", 20: "zwanzig Minuten", 30: "dreißig Minuten", 45: "einer Dreiviertelstunde", 60: "einer Stunde", 90: "anderthalb Stunden", 120: "zwei Stunden" },
    pt: { 5: "cinco minutos", 10: "dez minutos", 15: "quinze minutos", 20: "vinte minutos", 30: "trinta minutos", 45: "quarenta e cinco minutos", 60: "uma hora", 90: "uma hora e meia", 120: "duas horas" },
  };
  const table = tables[language] ?? tables.fr!;
  if (table[m]) return table[m]!;
  if (hours && hours > 2) {
    return language === "en" ? `${hours} hours` : language === "es" ? `${hours} horas` : language === "de" ? `${hours} Stunden` : language === "pt" ? `${hours} horas` : `${hours} heures`;
  }
  return language === "en" ? `${m} minutes` : language === "es" ? `${m} minutos` : language === "de" ? `${m} Minuten` : language === "pt" ? `${m} minutos` : `${m} minutes`;
}

/** Variante stable pour un même rappel (pas de hasard : deux envois identiques disent la même phrase). */
function pickVariant<T>(variants: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return variants[Math.abs(h) % variants.length]!;
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Rappel d'activité contextuel (français) selon le domaine choisi :
 *  « Votre réunion religieuse « Culte du dimanche » commence dans une dizaine de minutes. »
 *  « Vous avez une activité liée à votre entreprise dans une quinzaine de minutes : « Inventaire ». »
 * Renvoie null si l'activité n'est pas classée (la phrase habituelle est alors utilisée).
 */
export function contextualActivityReminderFr(params: { greeting: string; title: string; leadMinutes: number; activityContext?: string | null; spokenTime?: string }): string | null {
  const ctx = spokenActivityContext(params.activityContext);
  if (!ctx.possessive && !ctx.sectorContext) return null;
  const { greeting, title, leadMinutes, spokenTime } = params;
  const seed = `${title}:${leadMinutes}`;

  if (leadMinutes <= 2) {
    return ctx.possessive
      ? `${greeting} C'est l'heure : ${ctx.possessive} « ${title} » commence maintenant.`
      : `${greeting} C'est l'heure : votre activité liée à ${ctx.sectorContext}, « ${title} », commence maintenant.`;
  }

  const delay = spokenDelay(leadMinutes, "fr");
  const prepare = leadMinutes >= 15 ? " Pensez à vous préparer." : "";
  const at = spokenTime && leadMinutes >= 30 ? `, à ${spokenTime}` : "";

  if (ctx.possessive) {
    return pickVariant(
      [
        `${greeting} ${capitalize(ctx.possessive)} « ${title} » commence dans ${delay}${at}.${prepare}`,
        `${greeting} Dans ${delay}, vous avez ${ctx.possessive} « ${title} ».${prepare}`,
        `${greeting} Petit rappel : ${ctx.possessive} « ${title} » approche, début dans ${delay}.${prepare}`,
      ],
      seed
    );
  }
  return pickVariant(
    [
      `${greeting} Vous avez une activité liée à ${ctx.sectorContext} dans ${delay} : « ${title} ».${prepare}`,
      `${greeting} Dans ${delay}, une activité liée à ${ctx.sectorContext} vous attend : « ${title} ».`,
    ],
    seed
  );
}

/**
 * Extrait le prénom ou renvoie le prénom du profil (ex: "Awa Koné" → "Awa")
 */
export function extractFirstName(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return "";
  const cleaned = fullName.trim().replace(/^(m\.|mr\.|mr|mme\.|mme|mlle\.|mlle|monsieur|madame|mademoiselle|dr\.|dr|prof\.|prof|señor|señora|herr|frau|senhor|senhora)\s+/i, "");
  const parts = cleaned.trim().split(/\s+/);
  return parts[0] || "";
}

/**
 * Formate le nom d'adresse pour la synthèse vocale (prénom du profil connecté, ou chaîne vide)
 */
export function formatSalutationName(
  fullName?: string | null,
  language: VoiceLanguage = "fr",
  includeUserName: boolean = true
): string {
  if (!includeUserName) return "";
  const firstName = extractFirstName(fullName);
  if (!firstName) return "";

  // Prénom seul : aucune civilité supposée (Monsieur/Madame) pour un SaaS multi-utilisateurs.
  return firstName;
}

/**
 * Convertit une heure (ex: "07:00", "15:00", "09:30", "14:15") en formulation orale naturelle
 */
export function formatSpokenTime(timeStr?: string | null, language: VoiceLanguage = "fr"): string {
  if (!timeStr) return "";

  const cleanTime = timeStr.trim().slice(0, 5);
  const parts = cleanTime.split(":");
  if (parts.length < 2 || !parts[0] || !parts[1]) return timeStr;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours)) return timeStr;

  if (language === "fr") {
    if (hours === 12 && minutes === 0) return "midi";
    if (hours === 0 && minutes === 0) return "minuit";

    const hourWord = hours === 1 ? "1 heure" : `${hours} heures`;
    if (minutes === 0) return hourWord;
    if (minutes === 15) return `${hourWord} et quart`;
    if (minutes === 30) return `${hourWord} et demie`;
    if (minutes === 45 && hours < 23) return `${hours + 1} heures moins le quart`;
    return `${hourWord} ${minutes}`;
  }

  if (language === "en") {
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    if (minutes === 0) return `${displayHour} o'clock ${period}`;
    const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${displayHour}:${minStr} ${period}`;
  }

  if (language === "es") {
    if (hours === 12 && minutes === 0) return "mediodía";
    if (hours === 0 && minutes === 0) return "medianoche";

    const hourPrefix = hours === 1 || hours === 13 ? "la 1" : `las ${hours}`;
    if (minutes === 0) return `${hourPrefix} en punto`;
    if (minutes === 15) return `${hourPrefix} y cuarto`;
    if (minutes === 30) return `${hourPrefix} y media`;
    return `${hourPrefix} y ${minutes}`;
  }

  if (language === "de") {
    if (hours === 12 && minutes === 0) return "Mittag";
    if (hours === 0 && minutes === 0) return "Mitternacht";
    if (minutes === 0) return `${hours} Uhr`;
    if (minutes === 30) {
      const nextH = (hours + 1) % 24;
      return `halb ${nextH === 0 ? 24 : nextH}`;
    }
    if (minutes === 15) return `Viertel nach ${hours}`;
    if (minutes === 45) {
      const nextH = (hours + 1) % 24;
      return `Viertel vor ${nextH === 0 ? 24 : nextH}`;
    }
    return `${hours} Uhr ${minutes}`;
  }

  if (language === "pt") {
    if (hours === 12 && minutes === 0) return "meio-dia";
    if (hours === 0 && minutes === 0) return "meia-noite";
    const hourPrefix = hours === 1 || hours === 13 ? "1 hora" : `${hours} horas`;
    if (minutes === 0) return hourPrefix;
    if (minutes === 30) return `${hours === 1 || hours === 13 ? "1" : hours} e meia`;
    if (minutes === 15) return `${hours === 1 || hours === 13 ? "1" : hours} e quinze`;
    return `${hours === 1 || hours === 13 ? "1" : hours} e ${minutes}`;
  }

  return timeStr;
}

/**
 * 🌅 1. BRIEFING DU MATIN (05h00 - 06h00+)
 *
 * Structure attendue :
 * - Salutation chaleureuse : "Bonjour [prénom], j’espère que vous êtes bien réveillé ce matin. Voici votre programme pour aujourd’hui."
 * - Nombre d'activités : "Vous avez [X] activités prévues aujourd’hui."
 * - Énumération chronologique : "À 7 heures, vous avez votre activité... À 10 heures, vous avez..."
 * - Cas 0 activité : "Bonjour [prénom]... Vous n’avez aucune activité prévue aujourd’hui. Profitez-en pour organiser votre journée ou vous reposer..."
 * - Activités déjà complétées tôt : mentionnées comme déjà faites sans redemander de les faire.
 * - Clôture positive : "Voilà pour votre journée. Je vous souhaite une excellente journée et bon courage pour toutes vos activités."
 */
export function generateMorningBriefingVoiceText(params: MorningBriefingVoiceParams): string {
  const { userName, activities = [], language = "fr", includeUserName = true } = params;
  const salutationName = formatSalutationName(userName, language, includeUserName);

  // 1. Version Française
  if (language === "fr") {
    const greeting = salutationName
      ? `Bonjour ${salutationName}, j’espère que vous êtes bien réveillé ce matin.`
      : `Bonjour, j’espère que vous êtes bien réveillé ce matin.`;

    if (activities.length === 0) {
      return `${greeting} Vous n’avez aucune activité prévue aujourd’hui. Profitez-en pour organiser votre journée ou vous reposer. Je vous souhaite une excellente journée.`;
    }

    const pendingActivities = activities.filter((a) => a.status !== "completed");
    const completedActivities = activities.filter((a) => a.status === "completed");

    const countPart =
      activities.length === 1
        ? `Vous avez une activité prévue aujourd’hui.`
        : `Vous avez ${activities.length} activités prévues aujourd’hui.`;

    const intro = `${greeting} Voici votre programme pour aujourd’hui. ${countPart}`;

    const itemsParts: string[] = [];
    for (const act of pendingActivities) {
      const timeSpoken = formatSpokenTime(act.timeStr, "fr");
      if (timeSpoken) {
        itemsParts.push(`À ${timeSpoken}, vous avez ${act.title}.`);
      } else {
        itemsParts.push(`Vous avez ${act.title}.`);
      }
    }

    if (completedActivities.length > 0) {
      const completedNames = completedActivities.map((a) => a.title).join(", ");
      itemsParts.push(`Notez que ${completedActivities.length === 1 ? "l'activité " + completedNames + " est déjà terminée." : "les activités suivantes sont déjà complétées : " + completedNames + "."}`);
    }

    const closing = `Voilà pour votre journée. Je vous souhaite une excellente journée et bon courage pour toutes vos activités.`;
    return `${intro} ${itemsParts.join(" ")} ${closing}`;
  }

  // 2. Version Anglaise
  if (language === "en") {
    const greeting = salutationName
      ? `Good morning ${salutationName}, I hope you are awake and ready for the day.`
      : `Good morning, I hope you are awake and ready for the day.`;

    if (activities.length === 0) {
      return `${greeting} You have no scheduled activities today. Take this opportunity to plan your day or relax. Have a wonderful day.`;
    }

    const countPart =
      activities.length === 1
        ? `You have 1 activity scheduled today.`
        : `You have ${activities.length} activities scheduled today.`;

    const intro = `${greeting} Here is your schedule for today. ${countPart}`;
    const itemsParts = activities.map((act) => {
      const timeSpoken = formatSpokenTime(act.timeStr, "en");
      return timeSpoken ? `At ${timeSpoken}, you have ${act.title}.` : `You have ${act.title}.`;
    });

    const closing = `That covers your day. I wish you a productive day and good luck with all your activities.`;
    return `${intro} ${itemsParts.join(" ")} ${closing}`;
  }

  // 3. Version Espagnole
  if (language === "es") {
    const greeting = salutationName
      ? `¡Buenos días ${salutationName}! Espero que hayas despertado con energía.`
      : `¡Buenos días! Espero que hayas despertado con energía.`;

    if (activities.length === 0) {
      return `${greeting} No tienes ninguna actividad programada para hoy. Aprovecha para organizar tu día o descansar. ¡Te deseo un excelente día!`;
    }

    const countPart =
      activities.length === 1
        ? `Tienes 1 actividad programada para hoy.`
        : `Tienes ${activities.length} actividades programadas para hoy.`;

    const intro = `${greeting} Este es tu programa para hoy. ${countPart}`;
    const itemsParts = activities.map((act) => {
      const timeSpoken = formatSpokenTime(act.timeStr, "es");
      return timeSpoken ? `A ${timeSpoken}, tienes ${act.title}.` : `Tienes ${act.title}.`;
    });

    const closing = `¡Eso es todo por hoy! Te deseo un excelente día y mucho éxito en tus actividades.`;
    return `${intro} ${itemsParts.join(" ")} ${closing}`;
  }

  // 4. Version Allemande
  if (language === "de") {
    const greeting = salutationName
      ? `Guten Morgen ${salutationName}, ich hoffe, Sie sind gut in den Tag gestartet.`
      : `Guten Morgen, ich hoffe, Sie sind gut in den Tag gestartet.`;

    if (activities.length === 0) {
      return `${greeting} Sie haben heute keine geplanten Aktivitäten. Nutzen Sie die Zeit zur Planung oder Erholung. Einen erfolgreichen Tag wünsche ich Ihnen!`;
    }

    const countPart =
      activities.length === 1
        ? `Sie haben heute 1 Aktivität geplant.`
        : `Sie haben heute ${activities.length} Aktivitäten geplant.`;

    const intro = `${greeting} Hier ist Ihr Tagesüberblick. ${countPart}`;
    const itemsParts = activities.map((act) => {
      const timeSpoken = formatSpokenTime(act.timeStr, "de");
      return timeSpoken ? `Um ${timeSpoken} haben Sie ${act.title}.` : `Sie haben ${act.title}.`;
    });

    const closing = `Das war die Übersicht für heute. Ich wünsche Ihnen einen produktiven und erfolgreichen Tag!`;
    return `${intro} ${itemsParts.join(" ")} ${closing}`;
  }

  // 5. Version Portugaise
  if (language === "pt") {
    const greeting = salutationName
      ? `Bom dia ${salutationName}, espero que tenha acordado com muita energia.`
      : `Bom dia, espero que tenha acordado com muita energia.`;

    if (activities.length === 0) {
      return `${greeting} Você não tem atividades agendadas para hoje. Aproveite para planejar ou descansar. Tenha um excelente dia!`;
    }

    const countPart =
      activities.length === 1
        ? `Você tem 1 atividade agendada para hoje.`
        : `Você tem ${activities.length} atividades agendadas para hoje.`;

    const intro = `${greeting} Aqui está o seu programa de hoje. ${countPart}`;
    const itemsParts = activities.map((act) => {
      const timeSpoken = formatSpokenTime(act.timeStr, "pt");
      return timeSpoken ? `Às ${timeSpoken}, você tem ${act.title}.` : `Você tem ${act.title}.`;
    });

    const closing = `Esse é o resumo do seu dia. Desejo muito sucesso e um excelente trabalho em todas as suas atividades!`;
    return `${intro} ${itemsParts.join(" ")} ${closing}`;
  }

  return `Bonjour. Voici votre programme du jour.`;
}

/**
 * ☀️ 2. CHECK-IN DE MIDI / DÉBUT D'APRÈS-MIDI (12h00 - 14h00)
 *
 * Analyse l'état actuel de la journée :
 * - Félicitations pour ce qui a déjà été accompli : "Bravo [prénom] ! Vous avez déjà terminé..."
 * - Rappel des activités à venir l'après-midi / soir : "Pour la suite de votre journée, vous avez encore..."
 * - Alerte factuelle sur les activités du matin non terminées : "J’attire également votre attention sur une activité..."
 * - Cas où tout est terminé : "Félicitations [prénom] ! Toutes vos activités prévues aujourd’hui sont déjà terminées."
 */
export function generateMiddayCheckinVoiceText(params: MiddayCheckinVoiceParams): string {
  const {
    userName,
    completedActivities = [],
    upcomingActivities = [],
    overdueActivities = [],
    language = "fr",
    includeUserName = true,
  } = params;
  const salutationName = formatSalutationName(userName, language, includeUserName);

  if (language === "fr") {
    const greeting = salutationName ? `Bonjour ${salutationName} !` : `Bonjour !`;

    const totalToday = completedActivities.length + upcomingActivities.length + overdueActivities.length;
    if (totalToday === 0) {
      return `${greeting} Point d'étape à mi-journée : vous n’aviez aucune activité programmée. Passez un excellent après-midi.`;
    }

    // Tout est déjà terminé
    if (upcomingActivities.length === 0 && overdueActivities.length === 0 && completedActivities.length > 0) {
      return `${greeting} Félicitations ! Toutes vos activités prévues aujourd’hui sont déjà terminées. Excellent travail et très bel après-midi !`;
    }

    const sentences: string[] = [greeting];

    // 1. Félicitations pour ce qui est fait
    if (completedActivities.length > 0) {
      const completedList = completedActivities.map((a) => a.title).slice(0, 3).join(", ");
      if (completedActivities.length === 1) {
        sentences.push(`Bravo ! Vous avez déjà terminé votre activité : ${completedList}. Félicitations pour votre progression.`);
      } else {
        sentences.push(`Bravo ! Vous avez déjà terminé plusieurs activités prévues aujourd’hui, dont ${completedList}. Félicitations pour votre progression.`);
      }
    }

    // 2. Activités à venir
    if (upcomingActivities.length > 0) {
      const upcomingParts = upcomingActivities.map((a) => {
        const timeSpoken = formatSpokenTime(a.timeStr, "fr");
        return timeSpoken ? `${a.title} à ${timeSpoken}` : a.title;
      });
      if (upcomingActivities.length === 1) {
        sentences.push(`Pour la suite de votre journée, il vous reste une activité : ${upcomingParts[0]}.`);
      } else {
        sentences.push(`Pour la suite de votre journée, vous avez encore ${upcomingParts.join(", et ")}.`);
      }
    }

    // 3. Activités du matin non encore cochées
    if (overdueActivities.length > 0) {
      const overdueList = overdueActivities.map((a) => a.title).slice(0, 2).join(", ");
      if (overdueActivities.length === 1) {
        sentences.push(`J’attire également votre attention sur une activité prévue ce matin qui n’est pas encore marquée comme terminée : ${overdueList}. Pensez à la vérifier.`);
      } else {
        sentences.push(`J’attire également votre attention sur ${overdueActivities.length} activités prévues ce matin non encore marquées comme terminées : ${overdueList}. Pensez à les vérifier.`);
      }
    }

    sentences.push(`Passez un très bel après-midi.`);
    return sentences.join(" ");
  }

  // Version Anglaise
  if (language === "en") {
    const greeting = salutationName ? `Hello ${salutationName}!` : `Hello!`;
    if (upcomingActivities.length === 0 && overdueActivities.length === 0 && completedActivities.length > 0) {
      return `${greeting} Congratulations! All your scheduled activities for today are already completed. Great job and have a wonderful afternoon!`;
    }

    const sentences: string[] = [greeting];
    if (completedActivities.length > 0) {
      sentences.push(`Great job! You have already completed ${completedActivities.length} activities today.`);
    }
    if (upcomingActivities.length > 0) {
      const up = upcomingActivities.map((a) => `${a.title} at ${formatSpokenTime(a.timeStr, "en")}`).join(", ");
      sentences.push(`For the rest of your day, you still have: ${up}.`);
    }
    if (overdueActivities.length > 0) {
      sentences.push(`Please note that ${overdueActivities.length} earlier activity is not marked as completed yet.`);
    }
    sentences.push(`Have a great afternoon.`);
    return sentences.join(" ");
  }

  // Version Espagnole
  if (language === "es") {
    const greeting = salutationName ? `¡Hola ${salutationName}!` : `¡Hola!`;
    if (upcomingActivities.length === 0 && overdueActivities.length === 0 && completedActivities.length > 0) {
      return `${greeting} ¡Felicitaciones! Todas tus actividades programadas para hoy ya están completadas. ¡Excelente trabajo!`;
    }

    const sentences: string[] = [greeting];
    if (completedActivities.length > 0) {
      sentences.push(`¡Bravo! Ya has completado ${completedActivities.length} actividad(es) hoy.`);
    }
    if (upcomingActivities.length > 0) {
      const up = upcomingActivities.map((a) => `${a.title} a ${formatSpokenTime(a.timeStr, "es")}`).join(", ");
      sentences.push(`Para el resto del día, aún tienes: ${up}.`);
    }
    if (overdueActivities.length > 0) {
      sentences.push(`Ten en cuenta que ${overdueActivities.length} actividad anterior aún no está marcada como completada.`);
    }
    sentences.push(`¡Que pases una excelente tarde!`);
    return sentences.join(" ");
  }

  // 4. Version Allemande
  if (language === "de") {
    const greeting = salutationName ? `Guten Tag ${salutationName}!` : `Guten Tag!`;
    const sentences: string[] = [greeting];
    if (completedActivities.length > 0) {
      sentences.push(`Klasse! Sie haben heute bereits ${completedActivities.length} Aktivität(en) abgeschlossen.`);
    }
    if (upcomingActivities.length > 0) {
      const up = upcomingActivities.map((a) => `${a.title} um ${formatSpokenTime(a.timeStr, "de")}`).join(", ");
      sentences.push(`Für den weiteren Tag steht noch an: ${up}.`);
    }
    if (overdueActivities.length > 0) {
      sentences.push(`Bitte beachten Sie, dass ${overdueActivities.length} vorherige Aktivität noch als offen markiert ist.`);
    }
    sentences.push(`Einen weiterhin erfolgreichen Nachmittag!`);
    return sentences.join(" ");
  }

  // 5. Version Portugaise
  if (language === "pt") {
    const greeting = salutationName ? `Olá ${salutationName}!` : `Olá!`;
    const sentences: string[] = [greeting];
    if (completedActivities.length > 0) {
      sentences.push(`Parabéns! Você já concluiu ${completedActivities.length} atividade(s) hoje.`);
    }
    if (upcomingActivities.length > 0) {
      const up = upcomingActivities.map((a) => `${a.title} às ${formatSpokenTime(a.timeStr, "pt")}`).join(", ");
      sentences.push(`Para o restante do dia, você ainda tem: ${up}.`);
    }
    if (overdueActivities.length > 0) {
      sentences.push(`Lembre-se de que ${overdueActivities.length} atividade anterior ainda não foi finalizada.`);
    }
    sentences.push(`Tenha uma excelente tarde!`);
    return sentences.join(" ");
  }

  return `Bonjour. Voici votre point de mi-journée.`;
}

/** « un élément » / « une activité » / « 3 activités » (accord en genre au singulier). */
const plural = (n: number, one: string, many: string, feminine = false) => `${n === 1 ? (feminine ? "une" : "un") : n} ${n === 1 ? one : many}`;

/**
 * Bilan du soir en français : faits, reste à faire, reportés, demain, puis bonne nuit.
 * Uniquement à partir des données (aucune supposition sur l'humeur de la personne).
 * Volontairement concis à l'oral : des nombres, et au plus deux noms.
 */
export function eveningSummaryFr(p: {
  salutationName?: string;
  completed: DailyActivityItem[];
  remaining: DailyActivityItem[];
  postponed?: DailyActivityItem[];
  tomorrow?: DailyActivityItem[];
}): string {
  const postponed = p.postponed ?? [];
  const tomorrow = p.tomorrow ?? [];
  const parts: string[] = [p.salutationName ? `Bonsoir ${p.salutationName} !` : "Bonsoir !", "Votre journée touche à sa fin."];
  const done = p.completed.length;
  const left = p.remaining.length;

  if (done + left + postponed.length === 0) {
    parts.push("Aucune activité ni tâche n'était prévue aujourd'hui.");
  } else {
    if (done > 0 && left === 0) parts.push(done === 1 ? "Vous avez terminé ce qui était prévu aujourd'hui." : `Vous avez terminé les ${done} éléments prévus aujourd'hui.`);
    else if (done > 0) parts.push(`Vous avez terminé ${plural(done, "élément", "éléments")} aujourd'hui.`);
    if (left > 0) {
      const names = p.remaining.slice(0, 2).map((i) => i.title).join(" et ");
      parts.push(
        left === 1
          ? `Il reste ${names} à terminer, à reprendre demain.`
          : `${left} éléments restent à terminer${left <= 2 ? `, dont ${names}` : ""} ; vous pourrez les reprendre demain.`
      );
    }
    if (postponed.length > 0) parts.push(postponed.length === 1 ? "Une activité a été reportée." : `${postponed.length} activités ont été reportées.`);
  }

  const tomorrowActivities = tomorrow.filter((i) => i.category === "activity");
  const tomorrowOthers = tomorrow.length - tomorrowActivities.length;
  if (tomorrowActivities.length > 0) {
    const first = tomorrowActivities.find((i) => i.timeStr);
    const firstAt = first?.timeStr ? `, la première à ${formatSpokenTime(first.timeStr, "fr")}` : "";
    parts.push(`Demain, vous avez ${plural(tomorrowActivities.length, "activité", "activités", true)} au programme${firstAt}.`);
  }
  if (tomorrowOthers > 0) parts.push(`${tomorrowOthers === 1 ? "Une échéance vous attend" : `${tomorrowOthers} échéances vous attendent`} également demain.`);

  parts.push("Prenez maintenant le temps de vous reposer. Je vous souhaite une excellente nuit. À demain !");
  return parts.join(" ");
}

/**
 * 🌙 3. BILAN DU SOIR (20h00 - 22h00+)
 *
 * Analyse la journée entière :
 * - Félicitations pour ce qui a été terminé : "Bravo [prénom] ! Vous avez terminé avec succès..."
 * - Signalement des activités non complétées : "Il reste toutefois une activité que vous n’avez pas encore marquée comme terminée..."
 * - Si tout est complété : "Félicitations [prénom] ! Toutes vos activités prévues aujourd’hui sont terminées avec succès. Félicitations pour votre journée !"
 * - Clôture chaleureuse : "Passez une très bonne soirée et à demain !"
 */
export function generateEveningSummaryVoiceText(params: EveningSummaryVoiceParams): string {
  const { userName, completedActivities = [], uncompletedActivities = [], postponedActivities = [], tomorrowItems = [], language = "fr", includeUserName = true } = params;
  const salutationName = formatSalutationName(userName, language, includeUserName);

  const total = completedActivities.length + uncompletedActivities.length;
  if (language === "fr") {
    return eveningSummaryFr({ salutationName, completed: completedActivities, remaining: uncompletedActivities, postponed: postponedActivities, tomorrow: tomorrowItems });
  }

  if (language === "en") {
    const greeting = salutationName ? `Good evening ${salutationName}.` : `Good evening.`;
    if (total === 0) {
      return `${greeting} End of day summary: no activities were scheduled today. Get some rest. Good night, see you tomorrow!`;
    }
    const allItems = [...completedActivities, ...uncompletedActivities];
    const listPart = allItems.map((a) => (a.timeStr ? `${a.timeStr}: ${a.title}` : a.title)).join(", ");
    return `${greeting} Here is the summary of your scheduled activities today: ${listPart}. Is your day finished? You can mark your entire day as completed. Take some time to rest now. Good night, see you tomorrow!`;
  }

  if (language === "es") {
    const greeting = salutationName ? `Buenas noches ${salutationName}.` : `Buenas noches.`;
    if (total === 0) {
      return `${greeting} Resumen del día: no había actividades programadas hoy. ¡Que pases una excelente noche!`;
    }
    const allItems = [...completedActivities, ...uncompletedActivities];
    const listPart = allItems.map((a) => (a.timeStr ? `${a.timeStr}: ${a.title}` : a.title)).join(", ");
    return `${greeting} Este es el resumen de tus actividades programadas para hoy: ${listPart}. ¿Ha terminado tu jornada? Puedes marcar el día completo como realizado. Tómate ahora un tiempo para descansar. ¡Buenas noches y hasta mañana!`;
  }

  // 4. Version Allemande
  if (language === "de") {
    const greeting = salutationName ? `Guten Abend ${salutationName}.` : `Guten Abend.`;
    if (total === 0) {
      return `${greeting} Tagesbilanz: Heute waren keine Aktivitäten geplant. Erholen Sie sich gut und haben Sie einen schönen Abend!`;
    }
    const allItems = [...completedActivities, ...uncompletedActivities];
    const listPart = allItems.map((a) => (a.timeStr ? `${a.timeStr}: ${a.title}` : a.title)).join(", ");
    return `${greeting} Hier ist die Übersicht Ihrer heutigen Aktivitäten: ${listPart}. Ist Ihr Arbeitstag beendet? Sie können den gesamten Tag als erledigt markieren. Gönnen Sie sich jetzt Ruhe. Gute Nacht und bis morgen!`;
  }

  // 5. Version Portugaise
  if (language === "pt") {
    const greeting = salutationName ? `Boa noite ${salutationName}.` : `Boa noite.`;
    if (total === 0) {
      return `${greeting} Resumo do dia: nenhuma atividade estava agendada para hoje. Descanse bem e tenha uma ótima noite!`;
    }
    const allItems = [...completedActivities, ...uncompletedActivities];
    const listPart = allItems.map((a) => (a.timeStr ? `${a.timeStr}: ${a.title}` : a.title)).join(", ");
    return `${greeting} Aqui está o resumo das suas atividades de hoje: ${listPart}. Seu dia está finalizado? Você pode marcar todo o dia como concluído. Aproveite agora para descansar. Boa noite e até amanhã!`;
  }

  return `Bonsoir. Voici votre bilan du jour.`;
}

/**
 * 🔔 4. RAPPEL INDIVIDUEL D'ACTIVITÉ / TÂCHE / FINANCE
 */
export function generateIndividualReminderVoiceText(
  params: IndividualReminderVoiceParams
): string {
  const {
    userName,
    activityTitle,
    timeStr,
    leadMinutes,
    category = "activity",
    amount,
    currency,
    daysDiff,
    isOverdue = false,
    language = "fr",
    hideAmount = false,
    includeUserName = true,
    customText,
  } = params;

  const salutationName = formatSalutationName(userName, language, includeUserName);
  const spokenTime = timeStr ? formatSpokenTime(timeStr, language) : "";
  const formattedAmount = amount ? `${amount} ${currency || "FCFA"}` : "";

  // Si un texte personnalisé par l'utilisateur est fourni
  if (customText && customText.trim()) {
    const greeting = salutationName
      ? (language === "en" ? `Hello ${salutationName}, ` : language === "es" ? `Hola ${salutationName}, ` : language === "de" ? `Hallo ${salutationName}, ` : language === "pt" ? `Olá ${salutationName}, ` : `Bonjour ${salutationName}, `)
      : (language === "en" ? "Hello, " : language === "es" ? "Hola, " : language === "de" ? "Hallo, " : language === "pt" ? "Olá, " : "Bonjour, ");
    return `${greeting}${customText.trim()}`;
  }

  // 1. Version Française
  if (language === "fr") {
    const greeting = salutationName ? `Bonjour ${salutationName}.` : `Bonjour.`;

    // A. RAPPEL FINANCIER (Paiement attendu)
    if (category === "payment") {
      if (hideAmount) {
        if (daysDiff === 3) {
          return `${greeting} Vous avez un paiement en attente pour votre activité ${activityTitle} dans trois jours.`;
        }
        if (daysDiff === 0) {
          return `${greeting} Aujourd'hui est la date prévue pour un paiement de votre activité ${activityTitle}.`;
        }
        if (daysDiff && daysDiff < 0) {
          return `${greeting} Attention : un paiement pour ${activityTitle} est en attente depuis ${Math.abs(daysDiff)} jours.`;
        }
        return `${greeting} Rappel pour votre paiement attendu concernant ${activityTitle}.`;
      }
      if (daysDiff === 3) {
        return `${greeting} Vous devez recevoir ${formattedAmount} de votre activité ${activityTitle} dans trois jours.`;
      }
      if (daysDiff === 0) {
        return `${greeting} Aujourd'hui est la date prévue pour recevoir ${formattedAmount} de votre activité ${activityTitle}.`;
      }
      if (daysDiff && daysDiff < 0) {
        return `${greeting} Attention : le paiement de ${formattedAmount} pour ${activityTitle} est en attente depuis ${Math.abs(daysDiff)} jours.`;
      }
      return `${greeting} Rappel pour votre paiement attendu : ${formattedAmount} pour ${activityTitle}.`;
    }

    if (category === "expense" || category === "scheduled_expense") {
      const amountPart = (!hideAmount && formattedAmount) ? ` de ${formattedAmount}` : "";
      return `${greeting} Rappel pour votre dépense${amountPart} : ${activityTitle}${spokenTime ? ` prévue à ${spokenTime}` : ""}. Bonne journée !`;
    }

    if (category === "task") {
      return `${greeting} Petit rappel : votre tâche "${activityTitle}" arrive à échéance${spokenTime ? ` à ${spokenTime}` : ""}. Bon courage !`;
    }

    // B. RAPPEL D'ACTIVITÉ (T - 60 min ou T - 10 min)
    if (isOverdue) {
      return `${greeting} Attention : votre séance "${activityTitle}"${spokenTime ? ` prévue à ${spokenTime}` : ""} n'est pas encore confirmée.`;
    }

    // Activité classée (domaine / type) : phrase contextuelle et variée
    if (leadMinutes !== undefined) {
      const contextual = contextualActivityReminderFr({ greeting, title: activityTitle, leadMinutes, activityContext: params.activityContext, spokenTime });
      if (contextual) return contextual;
    }

    // Rappel à l'heure exacte (T - 0 min)
    if (leadMinutes !== undefined && leadMinutes <= 2) {
      return `${greeting} C'est l'heure : votre activité "${activityTitle}" commence maintenant. Excellente séance !`;
    }

    // Deuxième rappel : ~10 minutes avant (ou configuré entre 3 et 34 min)
    if (leadMinutes !== undefined && leadMinutes < 35) {
      return `${greeting} Votre séance avec "${activityTitle}" commence dans ${spokenDelay(leadMinutes, "fr")}. Merci de vous préparer. Bon courage et excellente séance !`;
    }

    // Premier rappel : ~60 minutes avant (ou configuré >= 35 min)
    if (leadMinutes && leadMinutes >= 35) {
      const timePart = spokenTime ? `, à ${spokenTime}` : "";
      return `${greeting} Vous avez une séance avec "${activityTitle}" dans ${spokenDelay(leadMinutes, "fr")}${timePart}. Préparez-vous tranquillement. Bon travail !`;
    }

    // Rappel standard si leadMinutes non précisé
    if (spokenTime) {
      return `${greeting} Vous avez votre séance "${activityTitle}" prévue aujourd'hui à ${spokenTime}. Préparez-vous tranquillement. Bon travail !`;
    }

    return `${greeting} Votre séance "${activityTitle}" approche. Bon courage et excellente séance !`;
  }

  // 2. Version Anglaise
  if (language === "en") {
    const greeting = salutationName ? `Hello ${salutationName}.` : `Hello.`;

    if (category === "payment") {
      if (hideAmount) {
        if (daysDiff === 3) {
          return `${greeting} You have an expected payment from your activity ${activityTitle} in three days.`;
        }
        if (daysDiff === 0) {
          return `${greeting} Today is the scheduled date for a payment from your activity ${activityTitle}.`;
        }
        if (daysDiff && daysDiff < 0) {
          return `${greeting} Attention: a payment for ${activityTitle} has been pending for ${Math.abs(daysDiff)} days.`;
        }
        return `${greeting} Reminder for your expected payment from ${activityTitle}.`;
      }
      if (daysDiff === 3) {
        return `${greeting} You are scheduled to receive ${formattedAmount} from your activity ${activityTitle} in three days.`;
      }
      if (daysDiff === 0) {
        return `${greeting} Today is the expected date to receive ${formattedAmount} from your activity ${activityTitle}.`;
      }
      if (daysDiff && daysDiff < 0) {
        return `${greeting} Attention: the payment of ${formattedAmount} for ${activityTitle} has been pending for ${Math.abs(daysDiff)} days.`;
      }
      return `${greeting} Reminder for your expected payment: ${formattedAmount} for ${activityTitle}.`;
    }

    if (category === "expense" || category === "scheduled_expense") {
      const amountPart = (!hideAmount && formattedAmount) ? ` of ${formattedAmount}` : "";
      return `${greeting} Reminder for your expense${amountPart}: ${activityTitle}${spokenTime ? ` scheduled at ${spokenTime}` : ""}. Have a great day!`;
    }

    if (category === "task") {
      return `${greeting} Quick reminder: your task "${activityTitle}" is due${spokenTime ? ` at ${spokenTime}` : ""}. Have a productive day!`;
    }

    if (leadMinutes !== undefined && leadMinutes <= 2) {
      return `${greeting} It's time: your session for "${activityTitle}" is starting now. Have an excellent session!`;
    }

    if (leadMinutes !== undefined && leadMinutes < 35) {
      return `${greeting} Your session for "${activityTitle}" starts in ${spokenDelay(leadMinutes, "en")}. Please get ready. Good luck and have an excellent session!`;
    }

    if (leadMinutes && leadMinutes >= 35) {
      const timePart = spokenTime ? `, at ${spokenTime}` : "";
      return `${greeting} You have a session for "${activityTitle}" in ${spokenDelay(leadMinutes, "en")}${timePart}. Get ready smoothly. Have a great session!`;
    }

    return `${greeting} Quick reminder: your session for "${activityTitle}" is scheduled today${spokenTime ? ` at ${spokenTime}` : ""}. Have a great session!`;
  }

  // 3. Version Espagnole
  if (language === "es") {
    const greeting = salutationName ? `Hola ${salutationName}.` : `Hola.`;

    if (category === "payment") {
      if (hideAmount) {
        if (daysDiff === 3) {
          return `${greeting} Tienes un pago programado de tu actividad ${activityTitle} en tres días.`;
        }
        if (daysDiff === 0) {
          return `${greeting} Hoy es la fecha programada para un pago de tu actividad ${activityTitle}.`;
        }
        if (daysDiff && daysDiff < 0) {
          return `${greeting} Atención: un pago de ${activityTitle} está pendiente desde hace ${Math.abs(daysDiff)} días.`;
        }
        return `${greeting} Recordatorio para tu pago esperado de ${activityTitle}.`;
      }
      if (daysDiff === 3) {
        return `${greeting} Debes recibir ${formattedAmount} de tu actividad ${activityTitle} en tres días.`;
      }
      if (daysDiff === 0) {
        return `${greeting} Hoy es la fecha programada para recibir ${formattedAmount} de tu actividad ${activityTitle}.`;
      }
      if (daysDiff && daysDiff < 0) {
        return `${greeting} Atención: el pago de ${formattedAmount} para ${activityTitle} está pendiente desde hace ${Math.abs(daysDiff)} días.`;
      }
      return `${greeting} Recordatorio para tu pago esperado: ${formattedAmount} de ${activityTitle}.`;
    }

    if (category === "expense" || category === "scheduled_expense") {
      const amountPart = (!hideAmount && formattedAmount) ? ` de ${formattedAmount}` : "";
      return `${greeting} Recordatorio de tu gasto${amountPart}: ${activityTitle}${spokenTime ? ` previsto a ${spokenTime}` : ""}. ¡Buen día!`;
    }

    if (category === "task") {
      return `${greeting} Recordatorio: tu tarea "${activityTitle}" vence pronto${spokenTime ? ` a ${spokenTime}` : ""}. ¡Mucho éxito!`;
    }

    if (leadMinutes !== undefined && leadMinutes <= 2) {
      return `${greeting} Es la hora: tu actividad "${activityTitle}" comienza ahora. ¡Excelente sesión!`;
    }

    if (leadMinutes !== undefined && leadMinutes < 35) {
      return `${greeting} Tu sesión de "${activityTitle}" comienza en ${spokenDelay(leadMinutes, "es")}. Por favor prepárate. ¡Mucho éxito y excelente sesión!`;
    }

    if (leadMinutes && leadMinutes >= 35) {
      const timePart = spokenTime ? `, a ${spokenTime}` : "";
      return `${greeting} Tienes una sesión de "${activityTitle}" en ${spokenDelay(leadMinutes, "es")}${timePart}. Prepárate con calma. ¡Buen trabajo!`;
    }

    return `${greeting} Recordatorio: tu sesión de "${activityTitle}" está programada para hoy${spokenTime ? ` a ${spokenTime}` : ""}. ¡Mucho éxito!`;
  }

  // 4. Version Allemande
  if (language === "de") {
    const greeting = salutationName ? `Hallo ${salutationName}.` : `Hallo.`;

    if (category === "payment") {
      if (hideAmount) {
        if (daysDiff === 3) {
          return `${greeting} Sie haben in drei Tagen eine anstehende Zahlung aus Ihrer Aktivität ${activityTitle}.`;
        }
        if (daysDiff === 0) {
          return `${greeting} Heute ist das Fälligkeitsdatum für eine Zahlung aus Ihrer Aktivität ${activityTitle}.`;
        }
        if (daysDiff && daysDiff < 0) {
          return `${greeting} Achtung: Eine Zahlung für ${activityTitle} steht seit ${Math.abs(daysDiff)} Tagen aus.`;
        }
        return `${greeting} Erinnerung an eine anstehende Zahlung für ${activityTitle}.`;
      }
      if (daysDiff === 3) {
        return `${greeting} Sie sollen in drei Tagen ${formattedAmount} aus Ihrer Aktivität ${activityTitle} erhalten.`;
      }
      if (daysDiff === 0) {
        return `${greeting} Heute ist das Fälligkeitsdatum für den Erhalt von ${formattedAmount} aus Ihrer Aktivität ${activityTitle}.`;
      }
      if (daysDiff && daysDiff < 0) {
        return `${greeting} Achtung: Die Zahlung von ${formattedAmount} für ${activityTitle} steht seit ${Math.abs(daysDiff)} Tagen aus.`;
      }
      return `${greeting} Erinnerung an Ihre erwartete Zahlung: ${formattedAmount} für ${activityTitle}.`;
    }

    if (category === "expense" || category === "scheduled_expense") {
      const amountPart = (!hideAmount && formattedAmount) ? ` über ${formattedAmount}` : "";
      return `${greeting} Erinnerung an Ihre Ausgabe${amountPart}: ${activityTitle}${spokenTime ? ` geplant um ${spokenTime}` : ""}. Einen schönen Tag!`;
    }

    if (category === "task") {
      return `${greeting} Kurze Erinnerung: Ihre Aufgabe "${activityTitle}" ist fällig${spokenTime ? ` um ${spokenTime}` : ""}. Viel Erfolg!`;
    }

    if (leadMinutes !== undefined && leadMinutes <= 2) {
      return `${greeting} Es ist Zeit: Ihre Einheit für "${activityTitle}" beginnt jetzt. Viel Erfolg bei der Einheit!`;
    }

    if (leadMinutes !== undefined && leadMinutes < 35) {
      return `${greeting} Ihre Einheit für "${activityTitle}" beginnt in ${spokenDelay(leadMinutes, "de")}. Bitte machen Sie sich bereit. Viel Erfolg!`;
    }

    if (leadMinutes && leadMinutes >= 35) {
      const timePart = spokenTime ? `, um ${spokenTime}` : "";
      return `${greeting} Sie haben in ${spokenDelay(leadMinutes, "de")} eine Einheit für "${activityTitle}"${timePart}. Machen Sie sich entspannt bereit!`;
    }

    return `${greeting} Kurze Erinnerung: Ihre Einheit für "${activityTitle}" ist heute geplant${spokenTime ? ` um ${spokenTime}` : ""}. Viel Erfolg!`;
  }

  // 5. Version Portugaise
  if (language === "pt") {
    const greeting = salutationName ? `Olá ${salutationName}.` : `Olá.`;

    if (category === "payment") {
      if (hideAmount) {
        if (daysDiff === 3) {
          return `${greeting} Você tem um pagamento previsto da sua atividade ${activityTitle} em três dias.`;
        }
        if (daysDiff === 0) {
          return `${greeting} Hoje é a data prevista para um pagamento da sua atividade ${activityTitle}.`;
        }
        if (daysDiff && daysDiff < 0) {
          return `${greeting} Atenção: um pagamento para ${activityTitle} está pendente há ${Math.abs(daysDiff)} dias.`;
        }
        return `${greeting} Lembrete para seu pagamento esperado de ${activityTitle}.`;
      }
      if (daysDiff === 3) {
        return `${greeting} Você tem previsão de receber ${formattedAmount} da sua atividade ${activityTitle} em três dias.`;
      }
      if (daysDiff === 0) {
        return `${greeting} Hoje é a data prevista para receber ${formattedAmount} da sua atividade ${activityTitle}.`;
      }
      if (daysDiff && daysDiff < 0) {
        return `${greeting} Atenção: o pagamento de ${formattedAmount} para ${activityTitle} está pendente há ${Math.abs(daysDiff)} dias.`;
      }
      return `${greeting} Lembrete para seu pagamento esperado: ${formattedAmount} de ${activityTitle}.`;
    }

    if (category === "expense" || category === "scheduled_expense") {
      const amountPart = (!hideAmount && formattedAmount) ? ` de ${formattedAmount}` : "";
      return `${greeting} Lembrete da sua despesa${amountPart}: ${activityTitle}${spokenTime ? ` agendada para ${spokenTime}` : ""}. Tenha um ótimo dia!`;
    }

    if (category === "task") {
      return `${greeting} Lembrete: sua tarefa "${activityTitle}" vence em breve${spokenTime ? ` às ${spokenTime}` : ""}. Bom trabalho!`;
    }

    if (leadMinutes !== undefined && leadMinutes <= 2) {
      return `${greeting} É a hora: sua sessão de "${activityTitle}" começa agora. Tenha uma excelente sessão!`;
    }

    if (leadMinutes !== undefined && leadMinutes < 35) {
      return `${greeting} Sua sessão de "${activityTitle}" começa em ${spokenDelay(leadMinutes, "pt")}. Por favor, prepare-se. Boa sessão!`;
    }

    if (leadMinutes && leadMinutes >= 35) {
      const timePart = spokenTime ? `, às ${spokenTime}` : "";
      return `${greeting} Você tem uma sessão de "${activityTitle}" em ${spokenDelay(leadMinutes, "pt")}${timePart}. Prepare-se com calma. Bom trabalho!`;
    }

    return `${greeting} Lembrete: sua sessão de "${activityTitle}" está agendada para hoje${spokenTime ? ` às ${spokenTime}` : ""}. Tenha uma excelente sessão!`;
  }

  return `Rappel pour ${activityTitle}.`;
}

/**
 * ✅ 5. FÉLICITATIONS LORS DE LA COMPLÉTION D'UNE ACTIVITÉ
 */
export function generateActivityCompletedVoiceText(
  params: ActivityCompletedVoiceParams
): string {
  const { userName, activityTitle, language = "fr", includeUserName = true } = params;
  const salutationName = formatSalutationName(userName, language, includeUserName);

  if (language === "fr") {
    const userPart = salutationName ? ` ${salutationName}` : "";
    return `Félicitations${userPart} ! Votre activité "${activityTitle}" a été marquée comme terminée. Excellent travail !`;
  }

  if (language === "en") {
    const userPart = salutationName ? ` ${salutationName}` : "";
    return `Congratulations${userPart}! Your activity "${activityTitle}" has been marked as completed. Great job!`;
  }

  if (language === "es") {
    const userPart = salutationName ? ` ${salutationName}` : "";
    return `¡Felicitaciones${userPart}! Tu actividad "${activityTitle}" ha sido marcada como completada. ¡Excelente trabajo!`;
  }

  if (language === "de") {
    const userPart = salutationName ? ` ${salutationName}` : "";
    return `Herzlichen Glückwunsch${userPart}! Ihre Aktivität "${activityTitle}" wurde als abgeschlossen markiert. Großartige Arbeit!`;
  }

  if (language === "pt") {
    const userPart = salutationName ? ` ${salutationName}` : "";
    return `Parabéns${userPart}! Sua atividade "${activityTitle}" foi marcada como concluída. Excelente trabalho!`;
  }

  return `Activité ${activityTitle} terminée. Félicitations !`;
}

/**
 * 🎙️ DISPATCHEUR GÉNÉRAL DE GÉNÉRATION DE MESSAGE VOCAL
 */
export function generateVoiceMessage(params: VoiceMessageParams): string {
  const kind = params.kind || "";

  if (kind === "custom_reminder" && params.customText && params.customText.trim()) {
    const salutationName = formatSalutationName(params.userName, params.language || "fr", params.includeUserName ?? true);
    const greeting = salutationName
      ? (params.language === "en" ? `Hello ${salutationName}, ` : params.language === "es" ? `Hola ${salutationName}, ` : params.language === "de" ? `Hallo ${salutationName}, ` : params.language === "pt" ? `Olá ${salutationName}, ` : `Bonjour ${salutationName}, `)
      : (params.language === "en" ? "Hello, " : params.language === "es" ? "Hola, " : params.language === "de" ? "Hallo, " : params.language === "pt" ? "Olá, " : "Bonjour, ");
    return `${greeting}${params.customText.trim()}`;
  }

  if (kind === "morning_briefing") {
    return generateMorningBriefingVoiceText({
      userName: params.userName,
      activities: params.activities || [],
      language: params.language || "fr",
      includeUserName: params.includeUserName,
    });
  }

  if (kind === "midday_checkin") {
    return generateMiddayCheckinVoiceText({
      userName: params.userName,
      completedActivities: params.completedActivities || [],
      upcomingActivities: params.upcomingActivities || [],
      overdueActivities: params.overdueActivities || [],
      language: params.language || "fr",
      includeUserName: params.includeUserName,
    });
  }

  if (kind === "evening_summary" || kind === "evening_checkin") {
    return generateEveningSummaryVoiceText({
      userName: params.userName,
      completedActivities: params.completedActivities || [],
      uncompletedActivities: params.uncompletedActivities || [],
      language: params.language || "fr",
      includeUserName: params.includeUserName,
    });
  }

  if (kind === "congratulations") {
    return generateActivityCompletedVoiceText({
      userName: params.userName,
      activityTitle: params.activityTitle || "Activité",
      language: params.language || "fr",
      includeUserName: params.includeUserName,
    });
  }

  // Rappel individuel
  return generateIndividualReminderVoiceText({
    userName: params.userName,
    activityTitle: params.activityTitle || "Activité",
    timeStr: params.timeStr,
    leadMinutes: params.leadMinutes,
    category: params.category,
    amount: params.amount,
    currency: params.currency,
    daysDiff: params.daysDiff,
    isOverdue: params.isOverdue,
    language: params.language || "fr",
    hideAmount: params.hideAmount,
    includeUserName: params.includeUserName,
    customText: params.customText,
    activityContext: params.activityContext,
  });
}
