/**
 * Prix des forfaits.
 * - Affichage : en dollars (USD) partout — montants de PLAN_ENTITLEMENTS (Pro 9 $ / mois, Premium 19 $ / mois).
 * - Paiement : Bictorys prélève en FCFA (XOF) les montants ci-dessous, inchangés ; ils sont rappelés au moment de payer.
 * Fichier sans dépendance serveur : utilisable dans l'interface comme dans le paiement.
 */
import type { PlanType } from "./entitlements";

export const DISPLAY_CURRENCY = "USD";

/** Montants réellement prélevés par Bictorys, en FCFA. */
export const PLAN_PRICES_XOF: Record<PlanType, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 5900, yearly: 59000 },
  premium: { monthly: 12500, yearly: 125000 },
};

/** « $9 », « $16 », « $9.50 » : format universel du dollar. */
export function formatUsd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** « 5 900 FCFA » */
export function formatXof(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

/**
 * Nouvelle période après un paiement.
 * - Même forfait encore actif (paiement anticipé) : la période s'ajoute à la suite de la période en cours.
 * - Sinon (première souscription, forfait expiré ou changement de forfait) : la période commence maintenant.
 */
export function computePaidPeriod(
  existing: { plan?: string | null; status?: string | null; current_period_end?: string | null } | null,
  plan: PlanType,
  billingCycle: "monthly" | "yearly",
  now: Date = new Date()
): { start: Date; end: Date; extended: boolean } {
  const currentEnd = existing?.current_period_end ? new Date(existing.current_period_end) : null;
  const extended =
    Boolean(currentEnd) &&
    existing?.status === "active" &&
    (existing?.plan || "").toLowerCase() === plan &&
    (currentEnd as Date).getTime() > now.getTime();
  const base = extended ? new Date((currentEnd as Date).getTime()) : new Date(now.getTime());
  const end = new Date(base.getTime());
  if (billingCycle === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return { start: now, end, extended };
}
