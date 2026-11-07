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

/**
 * Offre de bienvenue : premier mois à prix réduit (abonnement mensuel uniquement, une seule fois par compte).
 * Pro : $9 → $4 · Premium : $19 → $9. Les mois suivants reviennent au prix normal.
 */
export const FIRST_MONTH_PRICE_USD: Record<PlanType, number> = { free: 0, pro: 4, premium: 9 };
/** Montants réellement prélevés en FCFA pour ce premier mois. */
export const FIRST_MONTH_PRICES_XOF: Record<PlanType, number> = { free: 0, pro: 2600, premium: 5900 };

/**
 * Le compte a-t-il droit au premier mois réduit ? Oui tant qu'aucun paiement réel n'a jamais été enregistré
 * (l'essai gratuit et le forfait gratuit n'y comptent pas).
 */
export function isFirstMonthEligible(
  sub: { provider?: string | null; provider_subscription_id?: string | null } | null | undefined
): boolean {
  if (!sub) return true;
  return (sub.provider || "").toLowerCase() !== "bictorys" && !sub.provider_subscription_id;
}

/** Montant à prélever (FCFA) pour un forfait, une périodicité et l'éligibilité à l'offre de bienvenue. */
export function checkoutAmountXof(plan: PlanType, billingCycle: "monthly" | "yearly", firstMonth: boolean): number {
  if (billingCycle === "monthly" && firstMonth && FIRST_MONTH_PRICES_XOF[plan] > 0) return FIRST_MONTH_PRICES_XOF[plan];
  return PLAN_PRICES_XOF[plan][billingCycle];
}

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
