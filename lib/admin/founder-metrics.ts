/**
 * Indicateurs du fondateur : inscriptions, confirmations, essais, abonnements, échéances, revenus.
 * - computeFounderMetrics : calcul pur (testable) à partir des lignes brutes.
 * - loadFounderMetrics : lecture serveur avec la clé de service (jamais côté navigateur).
 */
import { resolveEffectivePlan, PLAN_ENTITLEMENTS } from "@/lib/subscriptions/entitlements";
import { PLAN_PRICES_XOF } from "@/lib/subscriptions/pricing";

const DAY = 86_400_000;

export interface RawUser {
  id: string;
  email: string | null;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}
export interface RawProfile {
  id: string;
  full_name: string | null;
  country_code?: string | null;
  onboarding_completed?: boolean | null;
}
export interface RawSubscription {
  user_id: string;
  plan: string | null;
  status: string | null;
  current_period_start?: string | null;
  current_period_end: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  provider?: string | null;
  provider_subscription_id?: string | null;
}

export type UserState = "paid_pro" | "paid_premium" | "trial" | "free" | "unconfirmed";

export interface FounderUserRow {
  id: string;
  email: string;
  name: string;
  country: string | null;
  createdAt: string;
  confirmed: boolean;
  lastSignInAt: string | null;
  state: UserState;
  plan: "free" | "pro" | "premium";
  /** Fin de la période payée ou de l'essai, selon l'état. */
  endsAt: string | null;
  activities: number;
  realPayment: boolean;
  /** Début de la dernière période payée réellement (date du dernier paiement). */
  paidAt: string | null;
}

export interface FounderMetrics {
  generatedAt: string;
  users: { total: number; today: number; last7: number; last30: number; confirmed: number; unconfirmed: number; active7: number; onboarded: number };
  trials: { active: number; endingSoon: number; endedNotPaid: number };
  paid: { pro: number; premium: number; total: number; real: number; conversionRate: number };
  revenue: { monthlyXof: number; monthlyUsd: number };
  expiringSoon: FounderUserRow[];
  recentlyExpired: FounderUserRow[];
  trialsEndingSoon: FounderUserRow[];
  recentSignups: FounderUserRow[];
  signupsByDay: { day: string; count: number }[];
  allUsers: FounderUserRow[];
}

/** Payé réellement (Bictorys), par opposition au mode démo ou à une attribution manuelle. */
function isRealPayment(s?: RawSubscription | null) {
  return Boolean(s && ((s.provider || "").toLowerCase() === "bictorys" || s.provider_subscription_id));
}

/** Période annuelle si la période payée dépasse ~6 mois. */
function isYearly(s: RawSubscription) {
  if (!s.current_period_start || !s.current_period_end) return false;
  return new Date(s.current_period_end).getTime() - new Date(s.current_period_start).getTime() > 200 * DAY;
}

export function computeFounderMetrics(
  users: RawUser[],
  profiles: RawProfile[],
  subscriptions: RawSubscription[],
  activityCounts: Record<string, number>,
  nowMs: number = Date.now()
): FounderMetrics {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const subByUser = new Map(subscriptions.map((s) => [s.user_id, s]));
  const startOfToday = new Date(nowMs);
  startOfToday.setUTCHours(0, 0, 0, 0);

  const rows: FounderUserRow[] = users.map((u) => {
    const sub = subByUser.get(u.id) ?? null;
    const eff = resolveEffectivePlan(sub as any, nowMs);
    const confirmed = Boolean(u.email_confirmed_at);
    let state: UserState;
    if (!confirmed) state = "unconfirmed";
    else if (eff.paidPlan === "premium") state = "paid_premium";
    else if (eff.paidPlan === "pro") state = "paid_pro";
    else if (eff.isTrial) state = "trial";
    else state = "free";
    const p = profileById.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "—",
      name: p?.full_name?.trim() || (u.email ? u.email.split("@")[0] ?? "—" : "—"),
      country: p?.country_code ?? null,
      createdAt: u.created_at,
      confirmed,
      lastSignInAt: u.last_sign_in_at,
      state,
      plan: eff.paidPlan,
      endsAt: eff.paidPlan !== "free" ? sub?.current_period_end ?? null : eff.isTrial ? sub?.trial_ends_at ?? null : null,
      activities: activityCounts[u.id] ?? 0,
      realPayment: isRealPayment(sub),
      paidAt: isRealPayment(sub) ? sub?.current_period_start ?? null : null,
    };
  });
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const ts = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);
  const within = (iso: string | null | undefined, ms: number) => nowMs - ts(iso) <= ms && nowMs - ts(iso) >= 0;

  const paidRows = rows.filter((r) => r.state === "paid_pro" || r.state === "paid_premium");
  const confirmedCount = rows.filter((r) => r.confirmed).length;

  // Revenu mensuel récurrent estimé : abonnements payés réellement et encore actifs (annuel ramené au mois)
  let monthlyXof = 0;
  let monthlyUsd = 0;
  for (const r of paidRows) {
    if (!r.realPayment) continue;
    const sub = subByUser.get(r.id)!;
    const plan = r.plan as "pro" | "premium";
    if (isYearly(sub)) {
      monthlyXof += PLAN_PRICES_XOF[plan].yearly / 12;
      monthlyUsd += PLAN_ENTITLEMENTS[plan].priceYearly / 12;
    } else {
      monthlyXof += PLAN_PRICES_XOF[plan].monthly;
      monthlyUsd += PLAN_ENTITLEMENTS[plan].priceMonthly;
    }
  }

  const expiringSoon = paidRows
    .filter((r) => r.endsAt && ts(r.endsAt) > nowMs && ts(r.endsAt) - nowMs <= 7 * DAY)
    .sort((a, b) => ts(a.endsAt) - ts(b.endsAt));

  // Abonnement payé dont la période est terminée depuis moins de 30 jours (non renouvelé)
  const recentlyExpired = rows
    .filter((r) => {
      const sub = subByUser.get(r.id);
      if (!sub || !sub.current_period_end || (sub.plan || "free") === "free") return false;
      const end = ts(sub.current_period_end);
      return end <= nowMs && nowMs - end <= 30 * DAY && r.state !== "paid_pro" && r.state !== "paid_premium";
    })
    .map((r) => ({ ...r, endsAt: subByUser.get(r.id)?.current_period_end ?? null }))
    .sort((a, b) => ts(b.endsAt) - ts(a.endsAt));

  const trialRows = rows.filter((r) => r.state === "trial");
  const trialsEndingSoon = trialRows
    .filter((r) => r.endsAt && ts(r.endsAt) - nowMs <= 2 * DAY)
    .sort((a, b) => ts(a.endsAt) - ts(b.endsAt));
  const endedNotPaid = rows.filter((r) => {
    const sub = subByUser.get(r.id);
    return r.state === "free" && sub?.trial_ends_at && ts(sub.trial_ends_at) <= nowMs;
  }).length;

  const signupsByDay: { day: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(startOfToday.getTime() - i * DAY).toISOString().slice(0, 10);
    signupsByDay.push({ day: d, count: rows.filter((r) => r.createdAt.slice(0, 10) === d).length });
  }

  return {
    generatedAt: new Date(nowMs).toISOString(),
    users: {
      total: rows.length,
      today: rows.filter((r) => ts(r.createdAt) >= startOfToday.getTime()).length,
      last7: rows.filter((r) => within(r.createdAt, 7 * DAY)).length,
      last30: rows.filter((r) => within(r.createdAt, 30 * DAY)).length,
      confirmed: confirmedCount,
      unconfirmed: rows.length - confirmedCount,
      active7: rows.filter((r) => within(r.lastSignInAt, 7 * DAY)).length,
      onboarded: profiles.filter((p) => p.onboarding_completed).length,
    },
    trials: { active: trialRows.length, endingSoon: trialsEndingSoon.length, endedNotPaid },
    paid: {
      pro: paidRows.filter((r) => r.state === "paid_pro").length,
      premium: paidRows.filter((r) => r.state === "paid_premium").length,
      total: paidRows.length,
      real: paidRows.filter((r) => r.realPayment).length,
      conversionRate: confirmedCount ? Math.round((paidRows.filter((r) => r.realPayment).length / confirmedCount) * 1000) / 10 : 0,
    },
    revenue: { monthlyXof: Math.round(monthlyXof), monthlyUsd: Math.round(monthlyUsd * 100) / 100 },
    expiringSoon,
    recentlyExpired,
    trialsEndingSoon,
    recentSignups: rows.slice(0, 15),
    signupsByDay,
    allUsers: rows,
  };
}

/** Lecture complète avec la clé de service (serveur uniquement). */
export async function loadFounderMetrics(admin: any, nowMs: number = Date.now()): Promise<FounderMetrics> {
  const users: RawUser[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Lecture des comptes impossible : " + error.message);
    const batch = data?.users ?? [];
    users.push(
      ...batch.map((u: any) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at ?? u.confirmed_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }))
    );
    if (batch.length < 1000) break;
  }

  const [{ data: profiles }, subsRes, { data: activities }] = await Promise.all([
    admin.from("profiles").select("id, full_name, country_code, onboarding_completed"),
    admin
      .from("subscriptions")
      .select("user_id, plan, status, current_period_start, current_period_end, trial_started_at, trial_ends_at, provider, provider_subscription_id"),
    admin.from("activities").select("user_id"),
  ]);
  let subscriptions = subsRes.data;
  if (subsRes.error) {
    // Colonnes d'essai ou de fournisseur absentes : lecture minimale
    ({ data: subscriptions } = await admin.from("subscriptions").select("user_id, plan, status, current_period_end"));
  }

  const activityCounts: Record<string, number> = {};
  for (const a of (activities ?? []) as { user_id: string }[]) activityCounts[a.user_id] = (activityCounts[a.user_id] ?? 0) + 1;

  return computeFounderMetrics(users, (profiles ?? []) as RawProfile[], (subscriptions ?? []) as RawSubscription[], activityCounts, nowMs);
}

/** Adresses du fondateur (variable FOUNDER_EMAILS, séparées par des virgules). */
export function founderEmails(): string[] {
  return (process.env.FOUNDER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isFounder(email: string | null | undefined): boolean {
  const list = founderEmails();
  return Boolean(email) && list.includes(String(email).toLowerCase());
}

