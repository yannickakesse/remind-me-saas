import { DateTime } from "luxon";
import { computeGoalProgress, type GoalRow, type StepRow } from "@/lib/goals/progress";

/**
 * Remind Me Intelligence — moteur d'analyse INTERNE (aucune API d'IA externe).
 *
 * Principe : uniquement des règles métier et des calculs sur les données réelles de l'utilisateur.
 * Chaque constat est accompagné des chiffres qui le justifient. Quand les données ne suffisent pas,
 * le moteur le dit (« données insuffisantes ») au lieu de deviner. Fonctions pures, testables.
 *
 * Les textes sont des modèles en français traduits à l'affichage (tr) avec leurs paramètres.
 */

export type InsightLevel = "urgent" | "attention" | "info" | "insufficient";

export interface Insight {
  /** Identifiant stable (règle + élément) : sert à éviter les répétitions. */
  id: string;
  rule:
    | "budget_burn"
    | "income_trend"
    | "expense_trend"
    | "overloaded_day"
    | "postponed_activity"
    | "deadline_cluster"
    | "savings_stale"
    | "goal_overdue"
    | "goal_behind"
    | "goal_inactive"
    | "goal_steps_late"
    | "not_enough_data";
  level: InsightLevel;
  title: string;
  detail: string;
  recommendation?: string;
  params: Record<string, string | number>;
  link?: string;
}

export interface InsightSnapshot {
  timezone: string;
  /** Instant de l'analyse (ISO) — l'heure du serveur. */
  now: string;
  currency: string;
  accountCreatedAt: string;
  budgets: { id: string; category: string; categoryLabel: string; monthly_limit: number; currency: string }[];
  expenses: { amount: number; currency: string; category: string; paid: boolean; paid_at: string | null; due_date: string | null }[];
  income: { amount: number; currency: string; received: boolean; received_at: string | null; due_date: string | null; label: string }[];
  events: { id: string; title: string; starts_at: string; ends_at: string; status: string; activity_id: string | null; original_starts_at: string | null; is_exception: boolean }[];
  activities: { id: string; name: string }[];
  tasks: { id: string; title: string; due_date: string | null; status: string }[];
  scheduledExpenses: { id: string; name: string; next_due_date: string | null; status: string }[];
  savingsGoals: { id: string; name: string; target_amount: number; current_amount: number; updated_at: string; deadline: string | null }[];
  goals: GoalRow[];
  goalSteps: StepRow[];
}

const LEVEL_ORDER: Record<InsightLevel, number> = { urgent: 0, attention: 1, info: 2, insufficient: 3 };

const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
const pct = (n: number) => `${round(n * 100)}`;

export function computeInsights(s: InsightSnapshot): Insight[] {
  const tz = s.timezone || "UTC";
  const now = DateTime.fromISO(s.now).setZone(tz);
  const today = now.toISODate()!;
  const monthStart = now.startOf("month");
  const daysInMonth = now.daysInMonth ?? 30;
  const dayOfMonth = now.day;
  const out: Insight[] = [];
  const local = (iso: string | null) => (iso ? DateTime.fromISO(iso, { zone: tz }) : null);
  const inMonth = (iso: string | null, m: DateTime) => {
    const d = local(iso);
    return !!d && d.isValid && d >= m.startOf("month") && d <= m.endOf("month");
  };

  // ---------------------------------------------------------------------
  // 1. Budgets : consommation par rapport au temps écoulé dans le mois
  // ---------------------------------------------------------------------
  for (const b of s.budgets) {
    if (!(b.monthly_limit > 0)) continue;
    const spent = s.expenses
      .filter((e) => e.category === b.category && e.currency === b.currency && inMonth(e.paid ? e.paid_at ?? e.due_date : e.due_date, monthStart))
      .reduce((a, e) => a + Number(e.amount), 0);
    const ratio = spent / b.monthly_limit;
    const daysLeft = daysInMonth - dayOfMonth;
    const params = {
      category: b.categoryLabel,
      percent: pct(ratio),
      spent: round(spent, 2),
      limit: round(b.monthly_limit, 2),
      currency: b.currency,
      daysLeft,
    };
    if (ratio >= 1) {
      out.push({
        id: `budget_burn:${b.id}:${monthStart.toFormat("yyyy-MM")}`,
        rule: "budget_burn",
        level: "urgent",
        title: "Budget « {category} » dépassé ({percent} %)",
        detail: "{spent} {currency} dépensés pour un plafond de {limit} {currency}, alors qu'il reste {daysLeft} jour(s) dans le mois.",
        recommendation: "Reportez les dépenses non essentielles de cette catégorie au mois prochain, ou ajustez le plafond s'il n'est plus réaliste.",
        params,
        link: "/finances?tab=budgets",
      });
    } else if (ratio >= 0.8 && daysLeft / daysInMonth > 0.25) {
      const perDay = daysLeft > 0 ? round((b.monthly_limit - spent) / daysLeft, 2) : 0;
      out.push({
        id: `budget_burn:${b.id}:${monthStart.toFormat("yyyy-MM")}`,
        rule: "budget_burn",
        level: "attention",
        title: "Budget « {category} » consommé à {percent} %",
        detail: "{spent} {currency} sur {limit} {currency}, alors qu'il reste encore {daysLeft} jours dans le mois.",
        recommendation: "Pour tenir le plafond, limitez-vous à environ {perDay} {currency} par jour dans cette catégorie jusqu'à la fin du mois.",
        params: { ...params, perDay },
        link: "/finances?tab=budgets",
      });
    }
  }

  // ---------------------------------------------------------------------
  // 2-3. Tendances revenus / dépenses : deux derniers mois COMPLETS (pas de mois partiel)
  // ---------------------------------------------------------------------
  const m1 = monthStart.minus({ months: 1 });
  const m2 = monthStart.minus({ months: 2 });
  const accountAgeDays = now.diff(DateTime.fromISO(s.accountCreatedAt).setZone(tz), "days").days;
  const sumIncome = (m: DateTime) =>
    s.income.filter((i) => i.received && i.currency === s.currency && inMonth(i.received_at, m)).reduce((a, i) => a + Number(i.amount), 0);
  const sumExpenses = (m: DateTime) =>
    s.expenses.filter((e) => e.paid && e.currency === s.currency && inMonth(e.paid_at, m)).reduce((a, e) => a + Number(e.amount), 0);
  const monthName = (m: DateTime) => m.toFormat("MM/yyyy");
  const historyOk = accountAgeDays >= 45;

  const trend = (rule: "income_trend" | "expense_trend", a: number, b: number) => {
    // a = mois M-1, b = mois M-2
    if (b <= 0) return;
    const change = (a - b) / b;
    const params = { previous: round(b, 2), last: round(a, 2), currency: s.currency, change: pct(Math.abs(change)), m1: monthName(m1), m2: monthName(m2) };
    if (rule === "income_trend" && change <= -0.2) {
      out.push({
        id: `income_trend:${m1.toFormat("yyyy-MM")}`, rule, level: "attention",
        title: "Revenus en baisse de {change} %",
        detail: "{last} {currency} encaissés en {m1}, contre {previous} {currency} en {m2}.",
        recommendation: "Vérifiez les paiements attendus non encore encaissés et relancez les clients concernés.",
        params, link: "/finances?tab=income",
      });
    } else if (rule === "income_trend" && change >= 0.2) {
      out.push({
        id: `income_trend:${m1.toFormat("yyyy-MM")}`, rule, level: "info",
        title: "Revenus en hausse de {change} %",
        detail: "{last} {currency} encaissés en {m1}, contre {previous} {currency} en {m2}.",
        params, link: "/finances?tab=income",
      });
    } else if (rule === "expense_trend" && change >= 0.2) {
      out.push({
        id: `expense_trend:${m1.toFormat("yyyy-MM")}`, rule, level: "attention",
        title: "Dépenses en hausse de {change} %",
        detail: "{last} {currency} dépensés en {m1}, contre {previous} {currency} en {m2}.",
        recommendation: "Repérez les catégories qui ont le plus augmenté et fixez-leur un budget mensuel.",
        params, link: "/finances?tab=expenses",
      });
    }
  };
  // Mois avec plusieurs devises : pas de comparaison (une « baisse » pourrait n'être qu'un changement de devise)
  const mixedIncome = s.income.some((i) => i.received && i.currency !== s.currency && (inMonth(i.received_at, m1) || inMonth(i.received_at, m2)));
  const mixedExpenses = s.expenses.some((e) => e.paid && e.currency !== s.currency && (inMonth(e.paid_at, m1) || inMonth(e.paid_at, m2)));
  if (historyOk) {
    if (!mixedIncome) trend("income_trend", sumIncome(m1), sumIncome(m2));
    if (!mixedExpenses) trend("expense_trend", sumExpenses(m1), sumExpenses(m2));
  }

  // ---------------------------------------------------------------------
  // 4. Journées surchargées sur les 7 prochains jours
  // ---------------------------------------------------------------------
  const byDay = new Map<string, { count: number; minutes: number }>();
  for (const e of s.events) {
    if (e.status === "cancelled") continue;
    const start = local(e.starts_at)!;
    const end = local(e.ends_at)!;
    if (!start.isValid || start < now.startOf("day") || start > now.plus({ days: 7 }).endOf("day")) continue;
    const key = start.toISODate()!;
    const cur = byDay.get(key) ?? { count: 0, minutes: 0 };
    cur.count++;
    cur.minutes += Math.max(0, end.diff(start, "minutes").minutes);
    byDay.set(key, cur);
  }
  for (const [day, v] of byDay) {
    const hours = round(v.minutes / 60, 1);
    if (v.count > 3 || hours > 8) {
      out.push({
        id: `overloaded_day:${day}`, rule: "overloaded_day", level: hours > 10 ? "urgent" : "attention",
        title: "Journée chargée le {date}",
        detail: "{count} séance(s) prévues pour environ {hours} heures au total.",
        recommendation: "Prévoyez des pauses, ou déplacez une séance non prioritaire vers un jour plus léger.",
        params: { date: day, count: v.count, hours }, link: "/calendar",
      });
    }
  }

  // ---------------------------------------------------------------------
  // 5. Activités souvent reportées (60 derniers jours)
  // ---------------------------------------------------------------------
  const postponed = new Map<string, number>();
  for (const e of s.events) {
    if (!e.activity_id || !(e.status === "postponed" || e.is_exception) || !e.original_starts_at) continue;
    const orig = local(e.original_starts_at)!;
    if (orig < now.minus({ days: 60 }) || orig > now) continue;
    postponed.set(e.activity_id, (postponed.get(e.activity_id) ?? 0) + 1);
  }
  for (const [activityId, count] of postponed) {
    if (count < 3) continue;
    const name = s.activities.find((a) => a.id === activityId)?.name ?? "";
    out.push({
      id: `postponed_activity:${activityId}`, rule: "postponed_activity", level: "attention",
      title: "« {name} » a été reportée {count} fois",
      detail: "{count} séances de cette activité ont été déplacées au cours des 60 derniers jours.",
      recommendation: "Les horaires actuels ne conviennent peut-être plus : ajustez le créneau habituel de l'activité.",
      params: { name, count }, link: `/activities/${activityId}/edit`,
    });
  }

  // ---------------------------------------------------------------------
  // 6. Échéances regroupées sur les 7 prochains jours
  // ---------------------------------------------------------------------
  const horizon = now.plus({ days: 7 }).toISODate()!;
  const soon = (d: string | null) => !!d && d >= today && d <= horizon;
  const deadlines = [
    ...s.tasks.filter((t) => t.status !== "done" && t.status !== "cancelled" && soon(t.due_date)).map((t) => t.title),
    ...s.scheduledExpenses.filter((x) => x.status !== "cancelled" && x.status !== "paid" && soon(x.next_due_date)).map((x) => x.name),
    ...s.income.filter((i) => !i.received && soon(i.due_date)).map((i) => i.label),
  ];
  if (deadlines.length >= 4) {
    out.push({
      id: `deadline_cluster:${today}`, rule: "deadline_cluster", level: deadlines.length >= 7 ? "urgent" : "attention",
      title: "{count} échéances dans les 7 prochains jours",
      detail: "Tâches, paiements attendus et dépenses programmées se concentrent cette semaine.",
      recommendation: "Traitez d'abord les échéances les plus proches et préparez dès maintenant celles qui demandent le plus de temps.",
      params: { count: deadlines.length }, link: "/tasks",
    });
  }

  // ---------------------------------------------------------------------
  // 7. Objectifs d'épargne sans mise à jour depuis 3 semaines
  // ---------------------------------------------------------------------
  for (const g of s.savingsGoals) {
    if (Number(g.current_amount) >= Number(g.target_amount)) continue;
    const idle = Math.floor(now.diff(DateTime.fromISO(g.updated_at).setZone(tz), "days").days);
    if (idle >= 21) {
      out.push({
        id: `savings_stale:${g.id}`, rule: "savings_stale", level: "attention",
        title: "Épargne « {name} » : aucune mise à jour depuis {days} jours",
        detail: "{current} sur {target} ({percent} %). Aucun versement n'a été enregistré récemment.",
        recommendation: "Si vous avez épargné, enregistrez le versement ; sinon, un petit montant régulier suffit à garder le cap.",
        params: { name: g.name, days: idle, current: round(Number(g.current_amount), 2), target: round(Number(g.target_amount), 2), percent: pct(Number(g.current_amount) / Number(g.target_amount)) },
        link: "/finances?tab=savings",
      });
    }
  }

  // ---------------------------------------------------------------------
  // 8. Mes Objectifs : échéance dépassée, retard sur le rythme, inactivité, étapes en retard
  // ---------------------------------------------------------------------
  for (const g of s.goals.filter((x) => x.status === "active")) {
    const p = computeGoalProgress(g, s.goalSteps.filter((st) => st.goal_id === g.id), today);
    const link = `/goals/${g.id}`;
    if (p.overdue) {
      out.push({
        id: `goal_overdue:${g.id}`, rule: "goal_overdue", level: "urgent",
        title: "Objectif « {title} » : date limite dépassée",
        detail: "La date limite est passée depuis {days} jour(s), avec {percent} % de progression.",
        recommendation: "Fixez une nouvelle date réaliste, ou marquez l'objectif comme atteint s'il l'est.",
        params: { title: g.title, days: -(p.daysLeft ?? 0), percent: p.percent === null ? "—" : round(p.percent) }, link,
      });
      continue;
    }
    if (p.pace === "behind" && p.percent !== null && p.expectedPercent !== null) {
      out.push({
        id: `goal_behind:${g.id}`, rule: "goal_behind", level: "attention",
        title: "Objectif « {title} » en retard sur le rythme prévu",
        detail: "{percent} % réalisés alors que {expected} % étaient attendus à ce jour.",
        recommendation: "Réorganisez les étapes restantes ou ajustez la date limite pour garder un rythme tenable.",
        params: { title: g.title, percent: round(p.percent), expected: p.expectedPercent }, link,
      });
    }
    if (p.overdueSteps > 0) {
      out.push({
        id: `goal_steps_late:${g.id}`, rule: "goal_steps_late", level: "attention",
        title: "{count} étape(s) en retard pour « {title} »",
        detail: "Ces étapes avaient une date prévue déjà passée.",
        recommendation: "Terminez-les, décalez-les ou ignorez celles qui ne sont plus utiles.",
        params: { title: g.title, count: p.overdueSteps }, link,
      });
    }
    const idle = Math.floor(now.diff(DateTime.fromISO(g.last_progress_at || g.created_at).setZone(tz), "days").days);
    if (idle >= 7) {
      out.push({
        id: `goal_inactive:${g.id}`, rule: "goal_inactive", level: "attention",
        title: "Objectif « {title} » sans progression depuis {days} jours",
        detail: g.motivation ? "Votre motivation : « {motivation} »" : "Aucune étape ni progression enregistrée récemment.",
        recommendation: "Une petite étape aujourd'hui suffit pour relancer la dynamique.",
        params: { title: g.title, days: idle, motivation: String(g.motivation ?? "").slice(0, 140) }, link,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Données insuffisantes : on le dit plutôt que de deviner
  // ---------------------------------------------------------------------
  if (!historyOk) {
    out.push({
      id: "not_enough_data:history", rule: "not_enough_data", level: "insufficient",
      title: "Tendances disponibles après deux mois complets",
      detail: "Les comparaisons de revenus et de dépenses d'un mois sur l'autre apparaîtront dès que vous aurez assez d'historique.",
      params: {},
    });
  }

  return out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

export function summarizeInsights(list: Insight[]) {
  return {
    urgent: list.filter((i) => i.level === "urgent").length,
    attention: list.filter((i) => i.level === "attention").length,
    info: list.filter((i) => i.level === "info").length,
    total: list.filter((i) => i.level !== "insufficient").length,
  };
}
