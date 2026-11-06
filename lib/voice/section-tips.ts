import { msg } from "@/lib/i18n/catalog";

/**
 * Recommandations du robot, par section : des conseils concrets pour bien utiliser Remind Me.
 * Affichées (et lues quand l'audio enregistré existe) quelques secondes après la présentation
 * de la section, ou à l'arrivée si la présentation a déjà été entendue. Une seule par visite,
 * en priorité celles jamais vues, au plus 3 par jour.
 * Audio : clé `tip_<section>_<n>` dans le registre lib/voice/journey-audio.ts.
 */
export interface SectionTip {
  id: string;
  text: string;
  href?: string;
  cta?: string;
}

export const SECTION_TIPS: Record<string, SectionTip[]> = {
  dashboard: [
    { id: "tip_dashboard_1", text: msg("Ajoutez vos dépenses programmées, comme le loyer ou les abonnements : le tableau de bord vous montrera ce qui reste vraiment à payer ce mois-ci."), href: "/finances?tab=scheduled", cta: msg("Ajouter") },
    { id: "tip_dashboard_2", text: msg("Touchez une séance du programme du jour pour la marquer terminée : vos statistiques de rentabilité seront plus justes.") },
  ],
  activities: [
    { id: "tip_activities_1", text: msg("Renseignez la rémunération de chaque activité : Remind Me calculera ce que vous gagnez réellement par heure.") },
    { id: "tip_activities_2", text: msg("Ajoutez les horaires habituels de vos activités : vos séances apparaîtront toutes seules dans le calendrier.") },
  ],
  calendar: [
    { id: "tip_calendar_1", text: msg("Ajoutez des horaires à vos activités pour remplir votre calendrier automatiquement."), href: "/activities", cta: msg("Mes activités") },
    { id: "tip_calendar_2", text: msg("Quand une séance est terminée, marquez-la : vous saurez exactement combien d'heures vous avez travaillé.") },
  ],
  tasks: [
    { id: "tip_tasks_1", text: msg("Donnez une date à vos tâches importantes : Remind Me vous les rappellera au bon moment.") },
    { id: "tip_tasks_2", text: msg("Liez une tâche à une activité pour retrouver facilement tout ce qui concerne un même client.") },
  ],
  finances: [
    { id: "tip_finances_1", text: msg("Fixez un budget pour votre plus grosse catégorie de dépenses : Remind Me vous préviendra avant le dépassement."), href: "/finances?tab=budgets", cta: msg("Créer un budget") },
    { id: "tip_finances_2", text: msg("Enregistrez un revenu dès qu'il est reçu : votre solde du mois restera toujours exact.") },
  ],
  reports: [
    { id: "tip_reports_1", text: msg("Comparez ce mois-ci au mois précédent dans vos statistiques : vous verrez tout de suite ce qui progresse et ce qui recule.") },
    { id: "tip_reports_2", text: msg("Téléchargez votre rapport en PDF : un document A4 clair, prêt à partager ou à archiver.") },
  ],
  notifications: [
    { id: "tip_notifications_1", text: msg("Traitez vos rappels au fur et à mesure : une liste à jour vous évite d'oublier un paiement.") },
  ],
  messages: [
    { id: "tip_messages_1", text: msg("Consultez l'Inbox chaque semaine : vos bilans et vos alertes importantes y sont gardés.") },
  ],
  settings: [
    { id: "tip_settings_1", text: msg("Activez les notifications push pour recevoir vos rappels même quand l'application est fermée."), href: "/settings?tab=notifications", cta: msg("Activer") },
    { id: "tip_settings_2", text: msg("Ajoutez votre prénom à votre profil : vos rappels vocaux pourront vous saluer.") },
  ],
  clients: [
    { id: "tip_clients_1", text: msg("Reliez vos clients à vos activités : vous verrez en un coup d'œil qui vous paie quoi.") },
  ],
  goals: [
    { id: "tip_goals_1", text: msg("Découpez votre objectif en petites étapes : on avance plus facilement un pas à la fois.") },
    { id: "tip_goals_2", text: msg("Notez pourquoi vous voulez l'atteindre : Remind Me vous le rappellera dans les moments de doute.") },
  ],
};

const SEEN_KEY = "remindme_tips_seen";
const DAY_KEY = "remindme_tips_day";
export const TIPS_DISABLED_KEY = "remindme_tips_disabled";
const MAX_PER_DAY = 3;

/** Choisit la recommandation à montrer pour une section (ou null : quota du jour atteint, désactivé…). */
export function pickSectionTip(section: string): SectionTip | null {
  try {
    if (localStorage.getItem(TIPS_DISABLED_KEY)) return null;
    const tips = SECTION_TIPS[section];
    if (!tips?.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    const day = JSON.parse(localStorage.getItem(DAY_KEY) || "{}") as { d?: string; n?: number };
    if (day.d === today && (day.n ?? 0) >= MAX_PER_DAY) return null;
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") as Record<string, number>;
    // Jamais vues d'abord, puis la plus anciennement vue
    return [...tips].sort((a, b) => (seen[a.id] ?? 0) - (seen[b.id] ?? 0))[0] ?? null;
  } catch {
    return null;
  }
}

export function markTipShown(id: string) {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") as Record<string, number>;
    seen[id] = Date.now();
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    const today = new Date().toISOString().slice(0, 10);
    const day = JSON.parse(localStorage.getItem(DAY_KEY) || "{}") as { d?: string; n?: number };
    localStorage.setItem(DAY_KEY, JSON.stringify({ d: today, n: day.d === today ? (day.n ?? 0) + 1 : 1 }));
  } catch {}
}
