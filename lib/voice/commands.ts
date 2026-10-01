import type { VoiceCommand } from "./types";

/**
 * Analyseur de commandes vocales naturelles (Voice Command Parser)
 * Prépare l'architecture évolutive pour les futures interactions vocales & IA
 * Exemples supportés :
 * - "Rappelle-moi dans 20 minutes" -> { action: "snooze", params: { minutes: 20 } }
 * - "Rappelle-moi dans 1 heure" -> { action: "snooze", params: { hours: 1, minutes: 60 } }
 * - "Marquer comme fait" / "Terminé" -> { action: "complete" }
 * - "Confirmer la séance" -> { action: "confirm" }
 */
export function parseVoiceCommand(transcript: string): VoiceCommand {
  const clean = transcript.trim().toLowerCase();

  // 1. Commande de Snooze / Report : "Rappelle-moi dans X minutes / heures"
  const snoozeMinuteMatch = clean.match(/rappelle[\s-]?moi\s+dans\s+(\d+)\s+minute/i) ||
    clean.match(/snooze\s+(\d+)\s+min/i) ||
    clean.match(/reporte\s+de\s+(\d+)\s+min/i);

  if (snoozeMinuteMatch && snoozeMinuteMatch[1]) {
    const minutes = parseInt(snoozeMinuteMatch[1], 10);
    return {
      rawTranscript: transcript,
      action: "snooze",
      params: { minutes },
    };
  }

  const snoozeHourMatch = clean.match(/rappelle[\s-]?moi\s+dans\s+(\d+)\s+heure/i) ||
    clean.match(/reporte\s+d['’]\s*(\d+)\s+heure/i);

  if (snoozeHourMatch && snoozeHourMatch[1]) {
    const hours = parseInt(snoozeHourMatch[1], 10);
    return {
      rawTranscript: transcript,
      action: "snooze",
      params: { hours, minutes: hours * 60 },
    };
  }

  if (clean.includes("rappelle-moi dans 20 minutes") || clean.includes("rappelle moi dans 20 minutes")) {
    return {
      rawTranscript: transcript,
      action: "snooze",
      params: { minutes: 20 },
    };
  }

  // 2. Commande de complétion : "Marquer comme fait", "Tâche terminée", "C'est fait"
  if (
    clean.includes("marquer comme fait") ||
    clean.includes("terminé") ||
    clean.includes("c'est fait") ||
    clean.includes("marquer comme terminée")
  ) {
    return {
      rawTranscript: transcript,
      action: "complete",
    };
  }

  // 3. Commande de confirmation de séance
  if (
    clean.includes("confirmer la séance") ||
    clean.includes("séance effectuée") ||
    clean.includes("activité réalisée")
  ) {
    return {
      rawTranscript: transcript,
      action: "confirm",
    };
  }

  // 4. Commande de lecture du résumé
  if (
    clean.includes("résumé de ma journée") ||
    clean.includes("mon planning") ||
    clean.includes("qu'est-ce que j'ai aujourd'hui")
  ) {
    return {
      rawTranscript: transcript,
      action: "read_summary",
    };
  }

  return {
    rawTranscript: transcript,
    action: "unknown",
  };
}

/**
 * Interface pour la reconnaissance vocale (Speech-to-Text) évolutive
 */
export function startVoiceRecognition(options: {
  language?: string;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (err: any) => void;
  onEnd?: () => void;
}): { stop: () => void } | null {
  if (typeof window === "undefined") return null;

  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    console.info("[VoiceRecognition] SpeechRecognition non supporté sur ce navigateur.");
    return null;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.lang = options.language || "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      options.onResult(finalTranscript || interimTranscript, Boolean(finalTranscript));
    };

    if (options.onError) {
      recognition.onerror = options.onError;
    }

    if (options.onEnd) {
      recognition.onend = options.onEnd;
    }

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {}
      },
    };
  } catch (err) {
    console.warn("[VoiceRecognition] Start failed:", err);
    return null;
  }
}
