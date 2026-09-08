export type PlanType = "free" | "pro" | "premium";

export interface PlanEntitlements {
  planName: string;
  priceMonthly: number; // in EUR / equivalent
  priceYearly: number;
  maxActivities: number;
  maxClients: number;
  maxGoals: number;
  maxBudgets: number;
  advancedReports: boolean;
  multiCurrency: boolean;
  csvExport: boolean;
  recurringAutomation: boolean;
  aiAssistant: boolean;
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
    advancedReports: false,
    multiCurrency: false,
    csvExport: true,
    recurringAutomation: false,
    aiAssistant: false,
  },
  pro: {
    planName: "Pro",
    priceMonthly: 9,
    priceYearly: 90,
    maxActivities: 15,
    maxClients: 50,
    maxGoals: 10,
    maxBudgets: 15,
    advancedReports: true,
    multiCurrency: true,
    csvExport: true,
    recurringAutomation: true,
    aiAssistant: false,
  },
  premium: {
    planName: "Premium",
    priceMonthly: 19,
    priceYearly: 190,
    maxActivities: Infinity,
    maxClients: Infinity,
    maxGoals: Infinity,
    maxBudgets: Infinity,
    advancedReports: true,
    multiCurrency: true,
    csvExport: true,
    recurringAutomation: true,
    aiAssistant: true,
  },
};

export function getPlanEntitlements(plan: string | null | undefined): PlanEntitlements {
  const normalized = (plan || "free").toLowerCase() as PlanType;
  return PLAN_ENTITLEMENTS[normalized] ?? PLAN_ENTITLEMENTS.free;
}

export function isFeatureAllowed(plan: string | null | undefined, feature: keyof PlanEntitlements): boolean {
  const entitlements = getPlanEntitlements(plan);
  const val = entitlements[feature];
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val > 0;
  return Boolean(val);
}
