/**
 * Règles d'affichage des offres (fonctions pures, testées par scripts/test-offers.ts).
 *
 * - Dès le premier jour, l'utilisateur découvre que des offres payantes existent, puis tous les 2 jours
 *   (tous les 3 jours pour un abonné Pro, à qui seul Premium est proposé).
 * - Fin d'essai (J-2, J-1, dernier jour) et fin de période payée (J-3 à J0) : une fois par jour, en toute transparence.
 * - Jamais pour un abonné Premium, sauf le rappel de fin de période.
 * - Jamais pendant une saisie, sur une page de création ou de modification, ni sur la page des abonnements.
 */

export type OfferVariant = "welcome" | "pro" | "premium" | "trial_ending" | "renew";

export interface OfferContext {
  now: number;
  /** Forfait qui donne les droits (Pro pendant l'essai). */
  plan: "free" | "pro" | "premium";
  /** Forfait réellement payé. */
  paidPlan: "free" | "pro" | "premium";
  isTrial: boolean;
  trialDaysLeft: number;
  /** Fin de la période payée (ISO) ou null. */
  periodEnd: string | null;
}

export interface OfferMemory {
  lastShownAt?: number | null;
  shownCount?: number;
  lastVariant?: OfferVariant | null;
}

const DAY = 24 * 60 * 60 * 1000;
export const OFFER_INTERVAL_DAYS = 2;
export const OFFER_INTERVAL_DAYS_PRO = 3;

function daysUntil(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - now) / DAY);
}

/** Offre à présenter maintenant, ou null. */
export function pickOffer(ctx: OfferContext, memory: OfferMemory): OfferVariant | null {
  const since = memory.lastShownAt ? ctx.now - memory.lastShownAt : Infinity;

  // 1. Fin de période payée : rappel quotidien de J-3 à J0 (renouveler = la période s'ajoute à la suite)
  const left = ctx.paidPlan !== "free" ? daysUntil(ctx.periodEnd, ctx.now) : null;
  if (left !== null && left >= 0 && left <= 3) return since >= DAY ? "renew" : null;

  // 2. Abonné Premium : rien d'autre
  if (ctx.paidPlan === "premium") return null;

  // 3. Essai : transparence sur la fin (J-2 et dernier jour), une fois par jour
  if (ctx.isTrial && ctx.trialDaysLeft <= 2) return since >= DAY ? "trial_ending" : null;

  // 4. Rythme régulier
  const interval = (ctx.paidPlan === "pro" ? OFFER_INTERVAL_DAYS_PRO : OFFER_INTERVAL_DAYS) * DAY;
  if (since < interval) return null;

  if (ctx.paidPlan === "pro") return "premium";
  if (!memory.shownCount) return "welcome"; // premier jour : « votre compte est gratuit, voici les offres »
  // Ensuite : Pro et Premium en alternance (pendant l'essai, Premium est l'étape suivante)
  if (ctx.isTrial) return memory.lastVariant === "premium" ? "pro" : "premium";
  return memory.lastVariant === "pro" ? "premium" : "pro";
}

/** Pages où une offre ne doit jamais interrompre (création, modification, paiement, abonnements). */
export function isOfferBlockedPath(pathname: string, search = ""): boolean {
  if (!pathname) return true;
  if (/\/(new|edit)(\/|$)/.test(pathname)) return true;
  if (pathname.startsWith("/onboarding")) return true;
  if (pathname.startsWith("/settings") && /tab=subscription/.test(search)) return true;
  return false;
}
