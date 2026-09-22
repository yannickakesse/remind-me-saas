import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  normalizePlan,
  getPlanEntitlements,
  type PlanType,
  type PlanEntitlements,
} from "./entitlements";

export interface UserSubscriptionInfo {
  plan: PlanType;
  status: string;
  currentPeriodEnd: string | null;
  entitlements: PlanEntitlements;
}

/**
 * Récupère le forfait d'abonnement actif réel d'un utilisateur.
 * Source unique de vérité : la table public.subscriptions.
 */
export async function getUserSubscription(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserSubscriptionInfo> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  let rawPlan = sub?.plan;

  if (!rawPlan) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === userId && user?.user_metadata?.subscription_plan) {
      rawPlan = user.user_metadata.subscription_plan;
    }
  }

  const plan = normalizePlan(rawPlan);
  const status = sub?.status ?? "active";
  const currentPeriodEnd = sub?.current_period_end ?? null;

  return {
    plan,
    status,
    currentPeriodEnd,
    entitlements: getPlanEntitlements(plan),
  };
}

/**
 * Vérifie si l'utilisateur peut créer une nouvelle activité selon son forfait.
 */
export async function assertCanCreateActivity(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const sub = await getUserSubscription(supabase, userId);
  const max = sub.entitlements.maxActivities;

  if (max === Infinity) return;

  const { count, error } = await supabase
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return; // En cas d'erreur de comptage ponctuelle, ne pas bloquer arbitrairement

  if (typeof count === "number" && count >= max) {
    throw new Error(
      `Limite de votre forfait ${sub.entitlements.planName} atteinte (${max} activités maximum). Passez au forfait supérieur pour créer des activités illimitées.`
    );
  }
}

/**
 * Vérifie si l'utilisateur peut créer un nouveau contact / organisation.
 */
export async function assertCanCreateContact(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const sub = await getUserSubscription(supabase, userId);
  const max = sub.entitlements.maxClients;

  if (max === Infinity) return;

  const { count, error } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return;

  if (typeof count === "number" && count >= max) {
    throw new Error(
      `Limite de votre forfait ${sub.entitlements.planName} atteinte (${max} contacts maximum). Passez au forfait supérieur pour ajouter davantage de clients.`
    );
  }
}

/**
 * Vérifie si l'utilisateur peut créer un nouveau budget mensuel.
 */
export async function assertCanCreateBudget(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const sub = await getUserSubscription(supabase, userId);
  const max = sub.entitlements.maxBudgets;

  if (max === Infinity) return;

  const { count, error } = await supabase
    .from("budgets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return;

  if (typeof count === "number" && count >= max) {
    throw new Error(
      `Limite de votre forfait ${sub.entitlements.planName} atteinte (${max} budgets maximum). Passez au forfait supérieur pour créer des budgets supplémentaires.`
    );
  }
}

/**
 * Vérifie si l'utilisateur peut créer un nouvel objectif d'épargne.
 */
export async function assertCanCreateSavingsGoal(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const sub = await getUserSubscription(supabase, userId);
  const max = sub.entitlements.maxGoals;

  if (max === Infinity) return;

  const { count, error } = await supabase
    .from("savings_goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return;

  if (typeof count === "number" && count >= max) {
    throw new Error(
      `Limite de votre forfait ${sub.entitlements.planName} atteinte (${max} objectifs d'épargne maximum). Passez au forfait supérieur pour créer davantage d'objectifs.`
    );
  }
}

/**
 * Vérifie si une fonctionnalité spécifique est incluse dans le forfait.
 */
export async function assertFeatureAllowed(
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: "hourlyProfitability" | "multiCurrency" | "aiAssistant" | "predictiveInsights",
  featureLabel: string
): Promise<void> {
  const sub = await getUserSubscription(supabase, userId);
  if (!sub.entitlements[feature]) {
    throw new Error(
      `La fonctionnalité "${featureLabel}" n'est pas incluse dans votre forfait actuel (${sub.entitlements.planName}). Mettez à niveau votre abonnement pour y accéder.`
    );
  }
}
