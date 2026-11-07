import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  resolveEffectivePlan,
  getPlanEntitlements,
  type PlanType,
  type PlanEntitlements,
} from "./entitlements";
import { getTr } from "@/lib/i18n/server";
import { isFirstMonthEligible } from "./pricing";

export interface UserSubscriptionInfo {
  /** Forfait qui détermine les droits (Pro pendant l'essai). */
  plan: PlanType;
  /** Forfait réellement payé. */
  paidPlan: PlanType;
  status: string;
  currentPeriodEnd: string | null;
  entitlements: PlanEntitlements;
  isTrial: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialDaysLeft: number;
}

/**
 * Récupère le forfait d'abonnement actif réel d'un utilisateur.
 * Source unique de vérité : la table public.subscriptions.
 */
export async function getUserSubscription(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserSubscriptionInfo> {
  let { data: sub, error } = await (supabase as any)
    .from("subscriptions")
    .select("plan, status, current_period_end, trial_started_at, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  // Colonnes d'essai absentes (migration 0026 pas encore appliquée) : lecture sans l'essai
  if (error) {
    ({ data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle());
  }

  // Pas de repli sur user_metadata : ce champ est modifiable par l'utilisateur lui-même.
  // Un forfait payant expiré ou inactif repasse automatiquement au gratuit ; l'essai donne les droits Pro.
  const effective = resolveEffectivePlan(sub);

  return {
    plan: effective.plan,
    paidPlan: effective.paidPlan,
    status: sub?.status ?? "active",
    currentPeriodEnd: sub?.current_period_end ?? null,
    entitlements: getPlanEntitlements(effective.plan),
    isTrial: effective.isTrial,
    trialStartedAt: effective.trialStartedAt,
    trialEndsAt: effective.trialEndsAt,
    trialDaysLeft: effective.trialDaysLeft,
  };
}

/**
 * Offre de bienvenue (premier mois réduit) : disponible tant qu'aucun paiement réel n'a été enregistré.
 * En cas de lecture impossible, l'offre n'est pas proposée (jamais de remise par erreur).
 */
export async function getFirstMonthOfferEligible(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .from("subscriptions")
    .select("provider, provider_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return isFirstMonthEligible(data);
}

/**
 * Vérifie si l'utilisateur peut créer une nouvelle activité selon son forfait.
 */
export async function assertCanCreateActivity(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const tr = await getTr();
  const sub = await getUserSubscription(supabase, userId);
  const max = sub.entitlements.maxActivities;

  if (max === Infinity) return;

  const todayISO = new Date().toISOString().slice(0, 10);
  const { data: activities, error } = await supabase
    .from("activities")
    .select("id, status, end_date")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) return;

  // Seules les activités 'active' dont la date de fin n'est pas expirée comptent dans le quota
  const activeCount = (activities ?? []).filter(
    (a) => !a.end_date || a.end_date >= todayISO
  ).length;

  if (activeCount > max) {
    throw new Error(
      tr("Votre plan {plan} permet jusqu'à {max} activités actives. Vous avez actuellement {activeCount} activités actives. Vos données et activités historiques restent conservées, mais vous devrez renouveler ou libérer un créneau avant de pouvoir en créer de nouvelles.", { plan: tr(sub.entitlements.planName), max, activeCount })
    );
  }
  if (activeCount >= max) {
    if (sub.plan === "free") {
      throw new Error(tr("Vous avez atteint la limite de votre plan Free (3 activités actives). Passez au plan Pro pour gérer jusqu'à 15 activités."));
    }
    throw new Error(tr("Vous avez atteint la limite de votre plan Pro (15 activités actives). Passez au plan Premium pour gérer des activités illimitées."));
  }
}

/**
 * Vérifie si l'utilisateur peut créer un nouveau contact ou une organisation.
 */
export async function assertCanCreateContact(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const tr = await getTr();
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
      tr("Votre plan {plan} permet jusqu'à {max} contacts et clients. Vous en avez actuellement {total}. Vos données existantes restent conservées, mais vous devrez revenir sous la limite avant de pouvoir en créer de nouveaux.", { plan: tr(sub.entitlements.planName), max, total })
    );
  }

  if (total >= max) {
    if (sub.plan === "free") {
      throw new Error(tr("Vous avez atteint la limite de votre plan Free (5 contacts & clients). Passez au plan Pro pour gérer jusqu'à 50 contacts et clients."));
    }
    throw new Error(tr("Vous avez atteint la limite de votre plan Pro (50 contacts & clients). Passez au plan Premium pour des contacts et clients illimités."));
  }
}

/**
 * Vérifie si l'utilisateur peut créer un nouveau budget mensuel.
 */
export async function assertCanCreateBudget(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const tr = await getTr();
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
      tr("Votre plan {plan} permet jusqu'à {max} budgets mensuels. Vous en avez actuellement {count} budgets. Vos données existantes restent conservées, mais vous devrez revenir sous la limite avant de pouvoir en créer de nouveaux.", { plan: tr(sub.entitlements.planName), max, count })
    );
    }
    if (count >= max) {
      if (sub.plan === "free") {
        throw new Error(tr("Vous avez atteint la limite de votre plan Free (3 budgets mensuels). Passez au plan Pro pour créer jusqu'à 15 budgets mensuels."));
      }
      throw new Error(tr("Vous avez atteint la limite de votre plan Pro (15 budgets mensuels). Passez au plan Premium pour des budgets mensuels illimités."));
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
  const tr = await getTr();
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
      tr("Votre plan {plan} permet jusqu'à {max} objectifs d'épargne. Vous en avez actuellement {count}. Vos données existantes restent conservées, mais vous devrez revenir sous la limite avant de pouvoir en créer de nouveaux.", { plan: tr(sub.entitlements.planName), max, count })
    );
    }
    if (count >= max) {
      if (sub.plan === "free") {
        throw new Error(tr("Vous avez atteint la limite de votre plan Free (2 objectifs d'épargne). Passez au plan Pro pour créer jusqu'à 10 objectifs d'épargne."));
      }
      throw new Error(tr("Vous avez atteint la limite de votre plan Pro (10 objectifs d'épargne). Passez au plan Premium pour des objectifs d'épargne illimités."));
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
  const todayISO = new Date().toISOString().slice(0, 10);
  const [
    { data: activeActivities },
    { count: contactsCount },
    { count: orgsCount },
    { count: budgetsCount },
    { count: goalsCount },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id, end_date")
      .eq("user_id", userId)
      .eq("status", "active"),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("budgets").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("savings_goals").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const activeCount = (activeActivities ?? []).filter(
    (a) => !a.end_date || a.end_date >= todayISO
  ).length;

  return {
    activitiesCount: activeCount,
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
  const tr = await getTr();
  const sub = await getUserSubscription(supabase, userId);
  if (!sub.entitlements[feature]) {
    throw new Error(
      tr("La fonctionnalité \"{feature}\" n'est pas incluse dans votre forfait actuel ({plan}). Mettez à niveau votre abonnement pour y accéder.", { feature: featureLabel, plan: tr(sub.entitlements.planName) })
    );
  }
}

/**
 * Quota « Mes Objectifs » : objectifs en cours ou en pause (terminés, abandonnés et archivés exclus).
 * Renvoie le message à afficher si la limite est atteinte, sinon null.
 * Les objectifs existants ne sont jamais supprimés : seule la création est bloquée.
 */
export async function checkPersonalGoalQuota(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const tr = await getTr();
  const sub = await getUserSubscription(supabase, userId);
  const max = sub.entitlements.maxPersonalGoals;
  if (max === Infinity) return null;

  const { count, error } = await (supabase as any)
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["active", "paused"]);
  if (error || typeof count !== "number" || count < max) return null;

  return sub.plan === "free"
    ? tr("Vous avez atteint la limite du forfait Gratuit ({max} objectifs en cours). Terminez ou archivez un objectif, ou passez au forfait Pro pour en suivre jusqu'à 25.", { max })
    : tr("Vous avez atteint la limite de votre forfait ({max} objectifs en cours). Terminez ou archivez un objectif, ou passez au forfait Premium pour des objectifs illimités.", { max });
}
