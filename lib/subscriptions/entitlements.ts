export type PlanType = "free" | "pro" | "premium";

export interface PlanEntitlements {
  planName: string;
  priceMonthly: number; // in EUR
  priceYearly: number;
  maxActivities: number;
  maxClients: number;
  maxGoals: number;
  maxBudgets: number;
  hourlyProfitability: boolean;
  multiCurrency: boolean;
  csvExport: boolean;
  recurringAutomation: boolean;
  aiAssistant: boolean;
  predictiveInsights: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanType, PlanEntitlements> = {
  free: {
    planName: "Gratuit",
    priceMonthly: 0,
    priceYearly: 0,
    maxActivities: 3,
    maxClients: 5,
    maxGoals: 2,
    maxBudgets: 3,
    hourlyProfitability: false,
    multiCurrency: false,
    csvExport: true,
    recurringAutomation: false,
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
    hourlyProfitability: true,
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
    hourlyProfitability: true,
    multiCurrency: true,
    csvExport: true,
    recurringAutomation: true,
    aiAssistant: true,
    predictiveInsights: true,
  },
};

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
  feature: keyof Omit<PlanEntitlements, "planName" | "priceMonthly" | "priceYearly" | "maxActivities" | "maxClients" | "maxGoals" | "maxBudgets">
): boolean {
  const entitlements = getPlanEntitlements(plan);
  return Boolean(entitlements[feature]);
}
