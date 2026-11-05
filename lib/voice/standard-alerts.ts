/**
 * Voix standard des rappels (audios préenregistrés avec ElevenLabs).
 *
 * C'est la voix PAR DÉFAUT de Remind Me : elle fonctionne sans abonnement ElevenLabs,
 * sans attente réseau et sans consommer de crédits. Chaque phrase annonce le type
 * d'événement et le délai (« Un paiement est attendu dans trois jours »), le détail
 * (nom, montant, heure) restant affiché dans la notification écrite.
 *
 * Fichiers : /public/voice/alerts/<clé>-<langue>.mp3
 * Textes   : lib/voice/standard-alerts-texts.json (source du fichier docs/voix-rappels-a-coller.txt)
 *
 * Pour remplacer un audio : déposer le fichier sous le même nom et incrémenter STANDARD_ALERTS_VERSION.
 */

/** Passe à true quand les fichiers audio sont présents dans /public/voice/alerts. */
export const STANDARD_ALERTS_READY = true;

export const STANDARD_ALERTS_VERSION = "1";

export const STANDARD_ALERT_LANGUAGES = ["fr", "en", "es", "de", "pt"] as const;

export type StandardAlertKey =
  | "activity_in_3d" | "activity_in_2d" | "activity_tomorrow" | "activity_today"
  | "activity_in_2h" | "activity_in_1h" | "activity_in_30m" | "activity_in_15m"
  | "activity_in_10m" | "activity_in_5m" | "activity_soon" | "activity_now" | "activity_overdue"
  | "payment_in_7d" | "payment_in_3d" | "payment_in_2d" | "payment_tomorrow"
  | "payment_today" | "payment_overdue" | "payment_soon"
  | "expense_in_7d" | "expense_in_3d" | "expense_in_2d" | "expense_tomorrow"
  | "expense_today" | "expense_overdue" | "expense_soon"
  | "task_in_3d" | "task_in_2d" | "task_tomorrow" | "task_today" | "task_soon" | "task_overdue"
  | "contract_in_7d" | "contract_in_3d" | "contract_in_2d" | "contract_tomorrow" | "contract_expired"
  | "morning_briefing" | "evening_checkin" | "generic"
  | "goal_step_today" | "goal_step_overdue" | "goal_deadline_week" | "goal_deadline_tomorrow"
  | "goal_inactive" | "goal_reminder" | "goal_milestone" | "goal_completed";

/**
 * Phrases écrites mais pas encore enregistrées (docs/voix-objectifs-a-coller.txt).
 * Tant qu'elles sont ici, la phrase générale « nouveau rappel » est jouée à leur place (jamais de silence).
 * Retirer une clé de cette liste une fois ses 5 fichiers déposés dans /public/voice/alerts.
 */
const NOT_YET_RECORDED = new Set<StandardAlertKey>([
  "goal_step_today", "goal_step_overdue", "goal_deadline_week", "goal_deadline_tomorrow",
  "goal_inactive", "goal_reminder", "goal_milestone", "goal_completed",
]);

/** Ce qu'il faut savoir d'un rappel pour choisir sa phrase (champs d'une notification). */
export interface ReminderAlertInfo {
  kind?: string | null;
  category?: string | null;
  metadata?: Record<string, any> | null;
}

/** Délai en jours → suffixe de phrase (seuls les délais réellement envoyés par l'app ont une phrase). */
function byDays(prefix: "activity" | "payment" | "expense" | "task" | "contract", days: unknown, allowed: number[]) {
  const d = Number(days);
  if (d === 1) return `${prefix}_tomorrow` as StandardAlertKey;
  if (allowed.includes(d)) return `${prefix}_in_${d}d` as StandardAlertKey;
  return null;
}

/** Rappel « N minutes avant » une activité : phrase exacte si N est proche d'un palier, sinon « bientôt ». */
function byLeadMinutes(minutes: number): StandardAlertKey {
  if (minutes <= 1) return "activity_now";
  const tiers: Array<[number, number, StandardAlertKey]> = [
    [5, 2, "activity_in_5m"],
    [10, 2, "activity_in_10m"],
    [15, 3, "activity_in_15m"],
    [30, 5, "activity_in_30m"],
    [60, 10, "activity_in_1h"],
    [120, 15, "activity_in_2h"],
  ];
  for (const [target, tolerance, key] of tiers) {
    if (Math.abs(minutes - target) <= tolerance) return key;
  }
  return "activity_soon";
}

/** Choisit la phrase standard qui correspond le mieux au rappel. Toujours une réponse (au pire « generic »). */
export function resolveStandardAlertKey(info?: ReminderAlertInfo | null): StandardAlertKey {
  const kind = info?.kind || "";
  const meta = info?.metadata || {};
  const days = meta.days;

  const lead = kind.match(/^activity_reminder_(\d+)m$/);
  if (lead) return byLeadMinutes(Number(lead[1]));

  switch (kind) {
    case "activity_reminder_now":
      return "activity_now";
    case "activity_today":
      return "activity_today";
    case "activity_upcoming":
      return byDays("activity", days, [2, 3]) ?? "activity_soon";
    case "activity_overdue":
      return "activity_overdue";
    case "activity_expiring_soon":
      return byDays("contract", days, [2, 3, 7]) ?? "generic";
    case "activity_expired":
      return "contract_expired";
    case "payment_upcoming":
      return byDays("payment", days, [2, 3, 7]) ?? "payment_soon";
    case "payment_due_today":
      return "payment_today";
    case "payment_overdue":
      return "payment_overdue";
    case "expense_upcoming":
      return byDays("expense", days, [2, 3, 7]) ?? "expense_soon";
    case "expense_due_today":
      return "expense_today";
    case "expense_overdue":
      return "expense_overdue";
    case "task_upcoming":
      return byDays("task", days, [2, 3]) ?? "task_soon";
    case "task_due_today":
      return "task_today";
    case "task_due_soon":
      return "task_soon";
    case "task_overdue":
      return "task_overdue";
    case "morning_briefing":
      return "morning_briefing";
    case "evening_checkin":
      return "evening_checkin";
    case "goal_step_due_today":
      return "goal_step_today";
    case "goal_step_overdue":
      return "goal_step_overdue";
    case "goal_deadline_soon":
      return Number(days) === 1 ? "goal_deadline_tomorrow" : "goal_deadline_week";
    case "goal_inactive":
      return "goal_inactive";
    case "goal_reminder":
      return "goal_reminder";
    case "goal_milestone":
      return "goal_milestone";
    case "goal_completed":
      return "goal_completed";
  }
  return "generic";
}

/** Chemin de l'audio standard, ou null s'il n'existe pas (fichiers absents ou langue non enregistrée). */
export function getStandardAlertSrc(key: StandardAlertKey, language: string): string | null {
  if (!STANDARD_ALERTS_READY) return null;
  const lang = (language || "").slice(0, 2).toLowerCase();
  if (!(STANDARD_ALERT_LANGUAGES as readonly string[]).includes(lang)) return null;
  const file = NOT_YET_RECORDED.has(key) ? "generic" : key;
  return `/voice/alerts/${file}-${lang}.mp3?v=${STANDARD_ALERTS_VERSION}`;
}

/**
 * Voix personnalisée ElevenLabs (prénom, nom de l'activité, heure) en priorité ?
 * Désactivée par défaut : à activer (NEXT_PUBLIC_VOICE_PERSONALIZED=1 sur Vercel) quand l'abonnement
 * ElevenLabs est actif. Si elle échoue, la voix standard prend automatiquement le relais.
 */
export function isPersonalizedVoiceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VOICE_PERSONALIZED === "1";
}
