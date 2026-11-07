import { msg } from "@/lib/i18n/catalog";
export type PlanType = "free" | "pro" | "premium";

export interface PlanEntitlements {
  planName: string;
  priceMonthly: number; // en dollars (USD), affiché partout ; prélèvement en FCFA (lib/subscriptions/pricing.ts)
  priceYearly: number;
  maxActivities: number;
  maxClients: number;
  maxGoals: number;
  maxBudgets: number;
  /** Objectifs « Mes Objectifs » en cours ou en pause (les terminés et archivés ne comptent pas). */
  maxPersonalGoals: number;
  hourlyProfitability: boolean;
  /** Analyses intelligentes internes (règles et calculs, sans IA externe). */
  smartInsights: boolean;
  multiCurrency: boolean;
  csvExport: boolean;
  recurringAutomation: boolean;
  aiAssistant: boolean;
  predictiveInsights: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanType, PlanEntitlements> = {
  free: {
    planName: msg("Gratuit"),
    priceMonthly: 0,
    priceYearly: 0,
    maxActivities: 3,
    maxClients: 5,
    maxGoals: 2,
    maxBudgets: 3,
    maxPersonalGoals: 3,
    hourlyProfitability: false,
    smartInsights: false,
    // Décision produit (phase 1) : multi-devises et automatisations récurrentes restent gratuites
    multiCurrency: true,
    csvExport: true,
    recurringAutomation: true,
    aiAssistant: false,
    predictiveInsights: false,
  },
  pro: {
    planName: "Pro",
    priceMonthly: 9,
    priceYearly: 90,
    maxActivities: 15,
    maxClients: 50,
    maxGoals: 10,
    maxBudgets: 15,
    maxPersonalGoals: 25,
    hourlyProfitability: true,
    smartInsights: true,
    multiCurrency: true,
    csvExport: true,
    recurringAutomation: true,
    aiAssistant: false,
    predictiveInsights: false,
  },
  premium: {
    planName: "Premium",
    priceMonthly: 19,
    priceYearly: 190,
    maxActivities: Infinity,
    maxClients: Infinity,
    maxGoals: Infinity,
    maxBudgets: Infinity,
    maxPersonalGoals: Infinity,
    hourlyProfitability: true,
    smartInsights: true,
    multiCurrency: true,
    csvExport: true,
    recurringAutomation: true,
    // Pas encore développés : affichés « Bientôt » (voir PLAN_COMING_SOON), jamais présentés comme inclus
    aiAssistant: false,
    predictiveInsights: false,
  },
};

/**
 * Fonctions annoncées mais pas encore disponibles, par forfait.
 * Elles s'affichent avec la mention « Bientôt » et ne sont accordées par aucun contrôle de droits.
 */
export const PLAN_COMING_SOON: Record<PlanType, string[]> = {
  free: [],
  pro: [],
  premium: [msg("Assistant IA & insights prédictifs"), msg("Voix personnalisée à votre prénom")],
};

/** Remise réelle de la facturation annuelle (ex. 90 € au lieu de 12 × 9 € → 17 %). */
export function yearlyDiscountPercent(): number {
  const pro = PLAN_ENTITLEMENTS.pro;
  return Math.round((1 - pro.priceYearly / (pro.priceMonthly * 12)) * 100);
}

export function normalizePlan(plan: string | null | undefined): PlanType {
  const normalized = (plan || "free").toLowerCase().trim();
  if (normalized === "pro") return "pro";
  if (normalized === "premium") return "premium";
  return "free";
}

export function getPlanEntitlements(plan: string | null | undefined): PlanEntitlements {
  const validPlan = normalizePlan(plan);
  return PLAN_ENTITLEMENTS[validPlan] ?? PLAN_ENTITLEMENTS.free;
}

export function isFeatureAllowed(
  plan: string | null | undefined,
  feature: keyof Omit<PlanEntitlements, "planName" | "priceMonthly" | "priceYearly" | "maxActivities" | "maxClients" | "maxGoals" | "maxBudgets" | "maxPersonalGoals">
): boolean {
  const entitlements = getPlanEntitlements(plan);
  return Boolean(entitlements[feature]);
}

export const TRIAL_DAYS = 7;

/** Ligne de la table subscriptions (colonnes d'essai : migration 0026). */
export interface SubscriptionRow {
  plan?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
}

export interface EffectivePlan {
  /** Forfait qui détermine les droits (Pro pendant l'essai). */
  plan: PlanType;
  /** Forfait réellement payé (free pendant l'essai). */
  paidPlan: PlanType;
  isTrial: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  /** Jours restants, arrondis au jour supérieur (0 hors essai). */
  trialDaysLeft: number;
}

/**
 * Forfait effectif d'un utilisateur, calculé avec l'heure du SERVEUR.
 * - Abonnement payé actif et non expiré → ce forfait.
 * - Sinon, essai en cours → droits Pro (jamais Premium : aucun coût externe pendant l'essai).
 * - Sinon → Free. Les données ne sont jamais supprimées : au-delà des quotas, seule la création est bloquée.
 */
export function resolveEffectivePlan(row: SubscriptionRow | null | undefined, now: number = Date.now()): EffectivePlan {
  const status = row?.status ?? "active";
  const periodEnd = row?.current_period_end ? new Date(row.current_period_end).getTime() : null;
  const paidActive = status === "active" && (periodEnd === null || periodEnd > now);
  const paidPlan: PlanType = paidActive ? normalizePlan(row?.plan) : "free";

  const trialEnd = row?.trial_ends_at ? new Date(row.trial_ends_at).getTime() : null;
  const trialRunning = paidPlan === "free" && trialEnd !== null && !Number.isNaN(trialEnd) && trialEnd > now;

  return {
    plan: trialRunning ? "pro" : paidPlan,
    paidPlan,
    isTrial: trialRunning,
    trialStartedAt: row?.trial_started_at ?? null,
    trialEndsAt: row?.trial_ends_at ?? null,
    trialDaysLeft: trialRunning ? Math.max(1, Math.ceil(((trialEnd as number) - now) / 86_400_000)) : 0,
  };
}
