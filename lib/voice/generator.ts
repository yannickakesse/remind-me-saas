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

/**
 * Extrait le prénom ou construit une salutation polie naturelle (ex: "Monsieur Yannick")
 */
export function extractFirstName(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "";
}

/**
 * Formate le nom d'adresse pour la synthèse vocale (ex: "Monsieur Yannick", "Mr. Yannick", "Señor Yannick")
 */
export function formatSalutationName(
  fullName?: string | null,
  language: VoiceLanguage = "fr"
): string {
  const firstName = extractFirstName(fullName);
  if (!firstName) return "";

  if (language === "fr") {
    return `Monsieur ${firstName}`;
  }
  if (language === "en") {
    return `Mr. ${firstName}`;
  }
  if (language === "es") {
    return `Señor ${firstName}`;
  }
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

  return timeStr;
}

/**
 * 🌅 1. BRIEFING DU MATIN (05h00 - 06h00+)
 *
 * Structure attendue :
 * - Salutation chaleureuse : "Bonjour Monsieur Yannick, j’espère que vous êtes bien réveillé ce matin. Voici votre programme pour aujourd’hui."
 * - Nombre d'activités : "Vous avez [X] activités prévues aujourd’hui."
 * - Énumération chronologique : "À 7 heures, vous avez votre activité... À 10 heures, vous avez..."
 * - Cas 0 activité : "Bonjour Monsieur Yannick... Vous n’avez aucune activité prévue aujourd’hui. Profitez-en pour organiser votre journée ou vous reposer..."
 * - Activités déjà complétées tôt : mentionnées comme déjà faites sans redemander de les faire.
 * - Clôture positive : "Voilà pour votre journée. Je vous souhaite une excellente journée et bon courage pour toutes vos activités."
 */
export function generateMorningBriefingVoiceText(params: MorningBriefingVoiceParams): string {
  const { userName, activities = [], language = "fr" } = params;
  const salutationName = formatSalutationName(userName, language);

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

  return `Bonjour. Voici votre programme du jour.`;
}

/**
 * ☀️ 2. CHECK-IN DE MIDI / DÉBUT D'APRÈS-MIDI (12h00 - 14h00)
 *
 * Analyse l'état actuel de la journée :
 * - Félicitations pour ce qui a déjà été accompli : "Bravo Monsieur Yannick ! Vous avez déjà terminé..."
 * - Rappel des activités à venir l'après-midi / soir : "Pour la suite de votre journée, vous avez encore..."
 * - Alerte factuelle sur les activités du matin non terminées : "J’attire également votre attention sur une activité..."
 * - Cas où tout est terminé : "Félicitations Monsieur Yannick ! Toutes vos activités prévues aujourd’hui sont déjà terminées."
 */
export function generateMiddayCheckinVoiceText(params: MiddayCheckinVoiceParams): string {
  const {
    userName,
    completedActivities = [],
    upcomingActivities = [],
    overdueActivities = [],
    language = "fr",
  } = params;
  const salutationName = formatSalutationName(userName, language);

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

  return `Bonjour. Voici votre point de mi-journée.`;
}

/**
 * 🌙 3. BILAN DU SOIR (20h00 - 22h00+)
 *
 * Analyse la journée entière :
 * - Félicitations pour ce qui a été terminé : "Bravo Monsieur Yannick ! Vous avez terminé avec succès..."
 * - Signalement des activités non complétées : "Il reste toutefois une activité que vous n’avez pas encore marquée comme terminée..."
 * - Si tout est complété : "Félicitations Monsieur Yannick ! Toutes vos activités prévues aujourd’hui sont terminées avec succès. Félicitations pour votre journée !"
 * - Clôture chaleureuse : "Passez une très bonne soirée et à demain !"
 */
export function generateEveningSummaryVoiceText(params: EveningSummaryVoiceParams): string {
  const { userName, completedActivities = [], uncompletedActivities = [], language = "fr" } = params;
  const salutationName = formatSalutationName(userName, language);

  const total = completedActivities.length + uncompletedActivities.length;
  if (language === "fr") {
    const greeting = salutationName ? `Bonsoir ${salutationName}.` : `Bonsoir.`;

    if (total === 0) {
      return `${greeting} Bilan de fin de journée : aucune activité n'était programmée aujourd'hui. Reposez-vous bien et passez une excellente soirée.`;
    }

    const allItems = [...completedActivities, ...uncompletedActivities];
    const activitiesLines = allItems.map((act) => {
      const timeSpoken = act.timeStr ? formatSpokenTime(act.timeStr, "fr") : "";
      return timeSpoken ? `${timeSpoken} : ${act.title}` : act.title;
    });

    const listPart = activitiesLines.join(", ");
    return `${greeting} Voici le bilan de vos activités prévues aujourd'hui : ${listPart}. Votre journée est-elle terminée ? Vous pouvez marquer l'ensemble de votre journée comme effectué. Bonne soirée et bonne continuation !`;
  }

  if (language === "en") {
    const greeting = salutationName ? `Good evening ${salutationName}.` : `Good evening.`;
    if (total === 0) {
      return `${greeting} End of day summary: no activities were scheduled today. Have a restful evening!`;
    }
    const allItems = [...completedActivities, ...uncompletedActivities];
    const listPart = allItems.map((a) => (a.timeStr ? `${a.timeStr}: ${a.title}` : a.title)).join(", ");
    return `${greeting} Here is the summary of your scheduled activities today: ${listPart}. Is your day finished? You can mark your entire day as completed. Have a wonderful evening!`;
  }

  if (language === "es") {
    const greeting = salutationName ? `Buenas noches ${salutationName}.` : `Buenas noches.`;
    if (total === 0) {
      return `${greeting} Resumen del día: no había actividades programadas hoy. ¡Que pases una excelente noche!`;
    }
    const allItems = [...completedActivities, ...uncompletedActivities];
    const listPart = allItems.map((a) => (a.timeStr ? `${a.timeStr}: ${a.title}` : a.title)).join(", ");
    return `${greeting} Este es el resumen de tus actividades programadas para hoy: ${listPart}. ¿Ha terminado tu jornada? Puedes marcar el día completo como realizado. ¡Buenas noches y mucho éxito!`;
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
  } = params;

  const salutationName = formatSalutationName(userName, language);
  const spokenTime = timeStr ? formatSpokenTime(timeStr, language) : "";
  const formattedAmount = amount ? `${amount} ${currency || "FCFA"}` : "";

  // 1. Version Française
  if (language === "fr") {
    const greeting = salutationName ? `Bonjour ${salutationName}.` : `Bonjour.`;

    // A. RAPPEL FINANCIER (Paiement attendu)
    if (category === "payment") {
      if (daysDiff === 3) {
        return `Bonjour, vous devez recevoir ${formattedAmount} de votre activité ${activityTitle} dans trois jours.`;
      }
      if (daysDiff === 0) {
        return `Bonjour, aujourd'hui est la date prévue pour recevoir ${formattedAmount} de votre activité ${activityTitle}.`;
      }
      if (daysDiff && daysDiff < 0) {
        return `Bonjour, attention : le paiement de ${formattedAmount} pour ${activityTitle} est en attente depuis ${Math.abs(daysDiff)} jours.`;
      }
      return `Bonjour, rappel pour votre paiement attendu : ${formattedAmount} pour ${activityTitle}.`;
    }

    if (category === "expense" || category === "scheduled_expense") {
      return `${greeting} rappel pour votre dépense : ${activityTitle}${spokenTime ? ` prévue à ${spokenTime}` : ""}. Bonne journée !`;
    }

    if (category === "task") {
      return `${greeting} petit rappel : votre tâche "${activityTitle}" arrive à échéance${spokenTime ? ` à ${spokenTime}` : ""}. Bon courage !`;
    }

    // B. RAPPEL D'ACTIVITÉ (T - 60 min ou T - 10 min)
    if (isOverdue) {
      return `${greeting} attention : votre séance "${activityTitle}"${spokenTime ? ` prévue à ${spokenTime}` : ""} n'est pas encore confirmée.`;
    }

    // Premier rappel : ~60 minutes avant (ou configuré >= 35 min)
    if (leadMinutes && leadMinutes >= 35) {
      const timePart = spokenTime ? `, à ${spokenTime}` : "";
      return `${greeting} Vous avez une séance avec "${activityTitle}" dans une heure${timePart}. Préparez-vous tranquillement. Bon travail !`;
    }

    // Deuxième rappel : ~10 minutes avant (ou configuré < 35 min)
    if (leadMinutes !== undefined && leadMinutes < 35) {
      return `${greeting} Votre séance avec "${activityTitle}" commence dans dix minutes. Merci de vous préparer. Bon courage et excellente séance !`;
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
      if (daysDiff === 3) {
        return `Hello, you are scheduled to receive ${formattedAmount} from your activity ${activityTitle} in three days.`;
      }
      if (daysDiff === 0) {
        return `Hello, today is the expected date to receive ${formattedAmount} from your activity ${activityTitle}.`;
      }
      return `Hello, reminder for your expected payment: ${formattedAmount} for ${activityTitle}.`;
    }

    if (leadMinutes && leadMinutes >= 35) {
      const timePart = spokenTime ? `, at ${spokenTime}` : "";
      return `${greeting} You have a session for "${activityTitle}" in one hour${timePart}. Get ready smoothly. Have a great session!`;
    }

    if (leadMinutes !== undefined && leadMinutes < 35) {
      return `${greeting} Your session for "${activityTitle}" starts in ten minutes. Please get ready. Good luck and have an excellent session!`;
    }

    return `${greeting} quick reminder: your session for "${activityTitle}" is scheduled today${spokenTime ? ` at ${spokenTime}` : ""}. Have a great session!`;
  }

  // 3. Version Espagnole
  if (language === "es") {
    const greeting = salutationName ? `Hola ${salutationName}.` : `Hola.`;

    if (category === "payment") {
      if (daysDiff === 3) {
        return `Hola, debes recibir ${formattedAmount} de tu actividad ${activityTitle} en tres días.`;
      }
      if (daysDiff === 0) {
        return `Hola, hoy es la fecha programada para recibir ${formattedAmount} de tu actividad ${activityTitle}.`;
      }
      return `Hola, recordatorio para tu pago esperado: ${formattedAmount} de ${activityTitle}.`;
    }

    if (leadMinutes && leadMinutes >= 35) {
      const timePart = spokenTime ? `, a las ${spokenTime}` : "";
      return `${greeting} Tienes una sesión de "${activityTitle}" en una hora${timePart}. Prepárate con calma. ¡Buen trabajo!`;
    }

    if (leadMinutes !== undefined && leadMinutes < 35) {
      return `${greeting} Tu sesión de "${activityTitle}" comienza en diez minutos. Por favor prepárate. ¡Mucho éxito y excelente sesión!`;
    }

    return `${greeting} recordatorio: tu sesión de "${activityTitle}" está programada para hoy${spokenTime ? ` a las ${spokenTime}` : ""}. ¡Mucho éxito!`;
  }

  return `Rappel pour ${activityTitle}.`;
}

/**
 * ✅ 5. FÉLICITATIONS LORS DE LA COMPLÉTION D'UNE ACTIVITÉ
 */
export function generateActivityCompletedVoiceText(
  params: ActivityCompletedVoiceParams
): string {
  const { userName, activityTitle, language = "fr" } = params;
  const salutationName = formatSalutationName(userName, language);

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

  return `Activité ${activityTitle} terminée. Félicitations !`;
}

/**
 * 🎙️ DISPATCHEUR GÉNÉRAL DE GÉNÉRATION DE MESSAGE VOCAL
 */
export function generateVoiceMessage(params: VoiceMessageParams): string {
  const kind = params.kind || "";

  if (kind === "morning_briefing") {
    return generateMorningBriefingVoiceText({
      userName: params.userName,
      activities: params.activities || [],
      language: params.language || "fr",
    });
  }

  if (kind === "midday_checkin") {
    return generateMiddayCheckinVoiceText({
      userName: params.userName,
      completedActivities: params.completedActivities || [],
      upcomingActivities: params.upcomingActivities || [],
      overdueActivities: params.overdueActivities || [],
      language: params.language || "fr",
    });
  }

  if (kind === "evening_summary" || kind === "evening_checkin") {
    return generateEveningSummaryVoiceText({
      userName: params.userName,
      completedActivities: params.completedActivities || [],
      uncompletedActivities: params.uncompletedActivities || [],
      language: params.language || "fr",
    });
  }

  if (kind === "congratulations") {
    return generateActivityCompletedVoiceText({
      userName: params.userName,
      activityTitle: params.activityTitle || "Activité",
      language: params.language || "fr",
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
  });
}
