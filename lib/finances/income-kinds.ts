import { msg } from "@/lib/i18n/catalog";

/**
 * Classement des revenus — une seule source de vérité, sans nouveau calcul financier :
 * les totaux restent ceux du module Finances (table income, mois = due_date, reçu = received).
 *
 *  - régulier      : généré automatiquement depuis la rémunération d'une activité (compensation_id)
 *  - ponctuel      : saisi à la main (mission, vente, salaire saisi…)
 *  - exceptionnel  : bonus, gain imprévu, cadeau, autre revenu exceptionnel
 *  - remboursement : argent récupéré — PAS un gain : affiché à part dans les rapports
 */

export const EXCEPTIONAL_INCOME_CATEGORIES = [
  { value: "bonus", label: msg("Bonus"), hint: msg("Prime, récompense, gratification"), emoji: "🎁" },
  { value: "windfall", label: msg("Gain imprévu"), hint: msg("Argent retrouvé, entrée inattendue"), emoji: "🍀" },
  { value: "gift", label: msg("Cadeau reçu"), hint: msg("Somme d'argent offerte"), emoji: "💝" },
  { value: "refund", label: msg("Remboursement reçu"), hint: msg("Argent récupéré (pas un gain)"), emoji: "↩️" },
  { value: "exceptional_other", label: msg("Autre revenu exceptionnel"), hint: msg("Toute autre entrée ponctuelle"), emoji: "✨" },
] as const;

export type ExceptionalIncomeCategory = (typeof EXCEPTIONAL_INCOME_CATEGORIES)[number]["value"];

export const REGULAR_INCOME_TYPES = ["salary", "contract", "freelance", "sales", "coaching", "dividend", "other"] as const;
export const ALL_INCOME_TYPES = [...REGULAR_INCOME_TYPES, ...EXCEPTIONAL_INCOME_CATEGORIES.map((c) => c.value)] as const;
export type IncomeType = (typeof ALL_INCOME_TYPES)[number];

export type IncomeKind = "regular" | "ponctual" | "exceptional" | "refund";

export function isExceptionalType(type: string | null | undefined): boolean {
  return EXCEPTIONAL_INCOME_CATEGORIES.some((c) => c.value === type);
}

export function incomeKindOf(row: { income_type?: string | null; compensation_id?: string | null }): IncomeKind {
  if (row.income_type === "refund") return "refund";
  if (isExceptionalType(row.income_type)) return "exceptional";
  if (row.compensation_id) return "regular";
  return "ponctual";
}

export function exceptionalCategory(type: string | null | undefined) {
  return EXCEPTIONAL_INCOME_CATEGORIES.find((c) => c.value === type) ?? null;
}

/**
 * Répartition des revenus REÇUS d'une période (mêmes lignes que les totaux existants) :
 * le total ne change pas, on indique seulement « dont exceptionnels » et « dont remboursements ».
 */
export function splitReceivedIncome(
  rows: { amount: number | string; received: boolean; income_type?: string | null; compensation_id?: string | null }[]
) {
  let total = 0;
  let exceptional = 0;
  let refunds = 0;
  for (const r of rows) {
    if (!r.received) continue;
    const amount = Number(r.amount) || 0;
    total += amount;
    const kind = incomeKindOf(r);
    if (kind === "exceptional") exceptional += amount;
    else if (kind === "refund") refunds += amount;
  }
  return { total, exceptional, refunds, gains: total - refunds };
}

/** Code Postgres d'une valeur refusée par une contrainte CHECK (migration 0029 absente). */
export const CHECK_VIOLATION = "23514";
