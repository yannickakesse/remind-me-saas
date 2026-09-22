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

  if (error) return;

  if (typeof count === "number") {
    if (count > max) {
      throw new Error(
        `Votre plan ${sub.entitlements.planName} permet jusqu'à ${max} activités. Vous avez actuellement ${count} activités. Vos données existantes restent conservées, mais vous devrez revenir sous la limite avant de pouvoir en créer de nouvelles.`
      );
    }
    if (count >= max) {
      if (sub.plan === "free") {
        throw new Error(
          "Vous avez atteint la limite de votre plan Free (3 activités). Passez au plan Pro pour gérer jusqu'à 15 activités."
        );
      }
      throw new Error(
        "Vous avez atteint la limite de votre plan Pro (15 activités). Passez au plan Premium pour gérer des activités illimitées."
      );
    }
  }
}

/**
 * Vérifie si l'utilisateur peut créer un nouveau contact ou une organisation.
 */
export async function assertCanCreateContact(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const sub = await getUserSubscription(supabase, userId);
  const max = sub.entitlements.maxClients;

  if (max === Infinity) return;

  const [{ count: contactsCount }, { count: orgsCount }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const total = (contactsCount || 0) + (orgsCount || 0);

  if (total > max) {
    throw new Error(
      `Votre plan ${sub.entitlements.planName} permet jusqu'à ${max} contacts et clients. Vous en avez actuellement ${total}. Vos données existantes restent conservées, mais vous devrez revenir sous la limite avant de pouvoir en créer de nouveaux.`
    );
  }

  if (total >= max) {
    if (sub.plan === "free") {
      throw new Error(
        "Vous avez atteint la limite de votre plan Free (5 contacts & clients). Passez au plan Pro pour gérer jusqu'à 50 contacts et clients."
      );
    }
    throw new Error(
      "Vous avez atteint la limite de votre plan Pro (50 contacts & clients). Passez au plan Premium pour des contacts et clients illimités."
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

  if (typeof count === "number") {
    if (count > max) {
      throw new Error(
        `Votre plan ${sub.entitlements.planName} permet jusqu'à ${max} budgets mensuels. Vous en avez actuellement ${count} budgets. Vos données existantes restent conservées, mais vous devrez revenir sous la limite avant de pouvoir en créer de nouveaux.`
      );
    }
    if (count >= max) {
      if (sub.plan === "free") {
        throw new Error(
          "Vous avez atteint la limite de votre plan Free (3 budgets mensuels). Passez au plan Pro pour créer jusqu'à 15 budgets mensuels."
        );
      }
      throw new Error(
        "Vous avez atteint la limite de votre plan Pro (15 budgets mensuels). Passez au plan Premium pour des budgets mensuels illimités."
      );
    }
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

  if (typeof count === "number") {
    if (count > max) {
      throw new Error(
        `Votre plan ${sub.entitlements.planName} permet jusqu'à ${max} objectifs d'épargne. Vous en avez actuellement ${count}. Vos données existantes restent conservées, mais vous devrez revenir sous la limite avant de pouvoir en créer de nouveaux.`
      );
    }
    if (count >= max) {
      if (sub.plan === "free") {
        throw new Error(
          "Vous avez atteint la limite de votre plan Free (2 objectifs d'épargne). Passez au plan Pro pour créer jusqu'à 10 objectifs d'épargne."
        );
      }
      throw new Error(
        "Vous avez atteint la limite de votre plan Pro (10 objectifs d'épargne). Passez au plan Premium pour des objectifs d'épargne illimités."
      );
    }
  }
}

/**
 * Récupère les compteurs d'utilisation actuels de l'utilisateur.
 */
export async function getUserUsageCounts(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const [
    { count: activitiesCount },
    { count: contactsCount },
    { count: orgsCount },
    { count: budgetsCount },
    { count: goalsCount },
  ] = await Promise.all([
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("budgets").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("savings_goals").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return {
    activitiesCount: activitiesCount ?? 0,
    contactsClientsCount: (contactsCount ?? 0) + (orgsCount ?? 0),
    budgetsCount: budgetsCount ?? 0,
    goalsCount: goalsCount ?? 0,
  };
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
