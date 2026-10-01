import type { VoiceLanguage, VoiceMessageParams } from "./types";

/**
 * Convertit une heure (ex: "15:00", "09:30", "14:15") en formulation orale naturelle
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
 * Extrait le prénom de l'utilisateur (ou retourne une salutation par défaut)
 */
export function extractFirstName(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "";
}

/**
 * Génère automatiquement le texte du message vocal pour une activité ou un rappel
 * Exemple exact demandé :
 * "Bonjour {prenom}. Vous avez une activité prévue à {heure}. {titre_activite}. Bonne journée."
 */
export function generateVoiceMessage(params: VoiceMessageParams): string {
  const {
    userName,
    activityTitle,
    timeStr,
    category = "activity",
    language = "fr",
    now = new Date(),
  } = params;

  const firstName = extractFirstName(userName);
  const currentHour = now.getHours();
  const isEvening = currentHour >= 18;
  const spokenTime = timeStr ? formatSpokenTime(timeStr, language) : "";

  // 1. Version Française
  if (language === "fr") {
    const salutation = isEvening ? "Bonsoir" : "Bonjour";
    const closing = isEvening ? "Bonne soirée." : "Bonne journée.";
    const userGreeting = firstName ? `${salutation} ${firstName}.` : `${salutation}.`;

    if (category === "task") {
      const timePart = spokenTime ? ` à ${spokenTime}` : "";
      return `${userGreeting} Échéance pour votre tâche${timePart} : ${activityTitle}. ${closing}`;
    }

    if (category === "payment" || category === "expense" || category === "scheduled_expense") {
      const timePart = spokenTime ? ` prévue à ${spokenTime}` : "";
      return `${userGreeting} Rappel pour votre échéance financière${timePart} : ${activityTitle}. ${closing}`;
    }

    // Activité ou séance du calendrier standard
    if (spokenTime) {
      return `${userGreeting} Vous avez une activité prévue à ${spokenTime}. ${activityTitle}. ${closing}`;
    }

    return `${userGreeting} Vous avez une activité prévue : ${activityTitle}. ${closing}`;
  }

  // 2. Version Anglaise
  if (language === "en") {
    const salutation = isEvening ? "Good evening" : "Hello";
    const closing = isEvening ? "Have a great evening." : "Have a great day.";
    const userGreeting = firstName ? `${salutation} ${firstName}.` : `${salutation}.`;

    if (category === "task") {
      const timePart = spokenTime ? ` at ${spokenTime}` : "";
      return `${userGreeting} Reminder for your task${timePart}: ${activityTitle}. ${closing}`;
    }

    if (category === "payment" || category === "expense") {
      return `${userGreeting} Reminder for your payment: ${activityTitle}. ${closing}`;
    }

    if (spokenTime) {
      return `${userGreeting} You have an activity scheduled at ${spokenTime}. ${activityTitle}. ${closing}`;
    }

    return `${userGreeting} You have a scheduled activity: ${activityTitle}. ${closing}`;
  }

  // 3. Version Espagnole
  if (language === "es") {
    const salutation = isEvening ? "Buenas noches" : "Hola";
    const closing = isEvening ? "¡Que tengas una buena noche!" : "¡Que tengas un buen día!";
    const userGreeting = firstName ? `${salutation} ${firstName}.` : `${salutation}.`;

    if (category === "task") {
      const timePart = spokenTime ? ` a ${spokenTime}` : "";
      return `${userGreeting} Recordatorio para tu tarea${timePart}: ${activityTitle}. ${closing}`;
    }

    if (category === "payment" || category === "expense") {
      return `${userGreeting} Recordatorio para tu pago: ${activityTitle}. ${closing}`;
    }

    if (spokenTime) {
      return `${userGreeting} Tienes una actividad programada a ${spokenTime}. ${activityTitle}. ${closing}`;
    }

    return `${userGreeting} Tienes una actividad programada: ${activityTitle}. ${closing}`;
  }

  return `Bonjour ${firstName ? firstName + "." : ""} Rappel pour ${activityTitle}.`;
}
