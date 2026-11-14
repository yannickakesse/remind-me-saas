import { DateTime } from "luxon";
import { computeGoalProgress, type GoalRow, type StepRow } from "@/lib/goals/progress";
import { msg } from "@/lib/i18n/catalog";

/**
 * Remind Me Intelligence — moteur d'analyse INTERNE (aucune API d'IA externe).
 *
 * Principe : uniquement des règles métier et des calculs sur les données réelles de l'utilisateur.
 * Chaque constat est accompagné des chiffres qui le justifient. Quand les données ne suffisent pas,
 * le moteur le dit (« données insuffisantes ») au lieu de deviner. Fonctions pures, testables.
 *
 * Les textes sont des modèles en français (msg) traduits à l'affichage (tr) avec leurs paramètres.
 * Conventions des paramètres, mis en forme à l'affichage selon la langue :
 *  - « 2026-11-18 » → date longue (« mercredi 18 novembre 2026 »), « 2026-10 » → mois (« octobre 2026 ») ;
 *  - clé terminée par « Min » → durée (« 8 h 45 ») ; grands nombres → séparateurs de milliers.
 */

export type InsightLevel = "urgent" | "attention" | "info" | "insufficient";
export type InsightDomain = "agenda" | "finances" | "goals";

/** Séance d'une journée analysée (heures locales « HH:mm », « 24:00 » si elle continue après minuit). */
export interface DayEvent {
  title: string;
  start: string;
  end: string;
}
export interface DayOverlap {
  a: string;
  b: string;
  from: string;
  to: string;
  /** Fin de la première séance (pour proposer un nouvel horaire). */
  aEnd: string;
  minutes: number;
}
/** Charge réelle d'une journée : chevauchements comptés une fois, pauses entre les séances. */
export interface DayLoad {
  date: string;
  count: number;
  occupiedMinutes: number;
  /** Plus longue pause entre deux séances (null : une seule plage occupée). */
  longestBreakMinutes: number | null;
  firstStart: string | null;
  lastEnd: string | null;
  events: DayEvent[];
  overlaps: DayOverlap[];
}

export interface Insight {
  /** Identifiant stable (règle + élément) : sert à éviter les répétitions. */
  id: string;
  rule:
    | "budget_burn"
    | "income_trend"
    | "expense_trend"
    | "schedule_conflict"
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
  domain: InsightDomain;
  /** Période concernée : jour « yyyy-MM-dd » ou mois « yyyy-MM » (affichée en clair). */
  when?: string;
  title: string;
  detail: string;
  recommendation?: string;
  params: Record<string, string | number>;
  link?: string;
  /** Détail de la journée (règles agenda) : séances, pauses, chevauchements. */
  day?: DayLoad;
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

/** Seuils des journées (en minutes). */
export const DAY_RULES = {
  /** Au-delà : journée chargée (temps réellement occupé). */
  heavyMinutes: 8 * 60,
  /** À partir de ce temps occupé, une journée sans vraie pause est signalée. */
  longMinutes: 6 * 60,
  /** Pause minimale attendue entre deux séances sur une longue journée. */
  minBreakMinutes: 30,
  /** Nombre de jours analysés, aujourd'hui compris. */
  horizonDays: 7,
};

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;

/**
 * Charge réelle de chaque journée à venir (aujourd'hui compris) :
 * séances annulées ou déjà terminées ignorées, séance après minuit coupée à la fin du jour,
 * temps occupé = union des plages (un chevauchement n'est compté qu'une fois).
 */
export function computeDayLoads(s: InsightSnapshot): DayLoad[] {
  const tz = s.timezone || "UTC";
  const now = DateTime.fromISO(s.now).setZone(tz);
  const loads: DayLoad[] = [];
  for (let d = 0; d < DAY_RULES.horizonDays; d++) {
    const dayStart = now.startOf("day").plus({ days: d });
    const dayEnd = dayStart.plus({ days: 1 });
    const items: { title: string; s: number; e: number }[] = [];
    for (const e of s.events) {
      if (e.status === "cancelled") continue;
      const start = DateTime.fromISO(e.starts_at, { zone: tz });
      const end = DateTime.fromISO(e.ends_at, { zone: tz });
      if (!start.isValid || !end.isValid || end <= now) continue;
      if (start >= dayEnd || end <= dayStart) continue;
      if (start < dayStart) continue; // commencée la veille : comptée sur son jour de début
      const sMin = Math.max(0, start.diff(dayStart, "minutes").minutes);
      const eMin = Math.min(24 * 60, end.diff(dayStart, "minutes").minutes);
      items.push({ title: e.title, s: sMin, e: Math.max(sMin, eMin) });
    }
    items.sort((a, b) => a.s - b.s || a.e - b.e);

    const overlaps: DayOverlap[] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!;
        const b = items[j]!;
        if (b.s >= a.e) break;
        const minutes = Math.min(a.e, b.e) - b.s;
        if (minutes > 0) overlaps.push({ a: a.title, b: b.title, from: hhmm(b.s), to: hhmm(Math.min(a.e, b.e)), aEnd: hhmm(a.e), minutes: round(minutes) });
      }
    }

    // Union des plages (temps occupé) et pauses entre elles
    const blocks: [number, number][] = [];
    for (const it of items) {
      const last = blocks[blocks.length - 1];
      if (last && it.s <= last[1]) last[1] = Math.max(last[1], it.e);
      else blocks.push([it.s, it.e]);
    }
    const occupied = blocks.reduce((a, [x, y]) => a + (y - x), 0);
    const breaks = blocks.slice(1).map(([x], i) => x - blocks[i]![1]);

    loads.push({
      date: dayStart.toISODate()!,
      count: items.length,
      occupiedMinutes: round(occupied),
      longestBreakMinutes: breaks.length ? round(Math.max(...breaks)) : null,
      firstStart: items.length ? hhmm(items[0]!.s) : null,
      lastEnd: blocks.length ? hhmm(blocks[blocks.length - 1]![1]) : null,
      events: items.map((it) => ({ title: it.title, start: hhmm(it.s), end: hhmm(it.e) })),
      overlaps,
    });
  }
  return loads;
}

const isHeavy = (l: DayLoad) => l.occupiedMinutes > DAY_RULES.heavyMinutes;
const isLongWithoutBreak = (l: DayLoad) =>
  l.occupiedMinutes >= DAY_RULES.longMinutes && (l.longestBreakMinutes ?? 0) < DAY_RULES.minBreakMinutes;

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
    const when = monthStart.toFormat("yyyy-MM");
    if (ratio >= 1) {
      out.push({
        id: `budget_burn:${b.id}:${when}`,
        rule: "budget_burn",
        level: "urgent",
        domain: "finances",
        when,
        title: msg("Budget « {category} » dépassé ({percent} %)"),
        detail: msg("{spent} {currency} dépensés pour un plafond de {limit} {currency}, alors qu'il reste {daysLeft} jour(s) dans le mois."),
        recommendation: msg("Reportez les dépenses non essentielles de cette catégorie au mois prochain, ou ajustez le plafond s'il n'est plus réaliste."),
        params,
        link: "/finances?tab=budgets",
      });
    } else if (ratio >= 0.8 && daysLeft / daysInMonth > 0.25) {
      const perDay = daysLeft > 0 ? round((b.monthly_limit - spent) / daysLeft, 2) : 0;
      out.push({
        id: `budget_burn:${b.id}:${when}`,
        rule: "budget_burn",
        level: "attention",
        domain: "finances",
        when,
        title: msg("Budget « {category} » consommé à {percent} %"),
        detail: msg("{spent} {currency} sur {limit} {currency}, alors qu'il reste encore {daysLeft} jours dans le mois."),
        recommendation: msg("Pour tenir le plafond, limitez-vous à environ {perDay} {currency} par jour dans cette catégorie jusqu'à la fin du mois."),
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
  // Mois au format ISO : mis en forme dans la langue de l'utilisateur à l'affichage (« octobre 2026 »)
  const monthName = (m: DateTime) => m.toFormat("yyyy-MM");
  const historyOk = accountAgeDays >= 45;

  const trend = (rule: "income_trend" | "expense_trend", a: number, b: number) => {
    // a = mois M-1, b = mois M-2
    if (b <= 0) return;
    const change = (a - b) / b;
    const params = { previous: round(b, 2), last: round(a, 2), currency: s.currency, change: pct(Math.abs(change)), m1: monthName(m1), m2: monthName(m2) };
    const when = monthName(m1);
    if (rule === "income_trend" && change <= -0.2) {
      out.push({
        id: `income_trend:${when}`, rule, level: "attention", domain: "finances", when,
        title: msg("Revenus en baisse de {change} %"),
        detail: msg("{last} {currency} encaissés en {m1}, contre {previous} {currency} en {m2}."),
        recommendation: msg("Vérifiez les paiements attendus non encore encaissés et relancez les clients concernés."),
        params, link: "/finances?tab=income",
      });
    } else if (rule === "income_trend" && change >= 0.2) {
      out.push({
        id: `income_trend:${when}`, rule, level: "info", domain: "finances", when,
        title: msg("Revenus en hausse de {change} %"),
        detail: msg("{last} {currency} encaissés en {m1}, contre {previous} {currency} en {m2}."),
        params, link: "/finances?tab=income",
      });
    } else if (rule === "expense_trend" && change >= 0.2) {
      out.push({
        id: `expense_trend:${when}`, rule, level: "attention", domain: "finances", when,
        title: msg("Dépenses en hausse de {change} %"),
        detail: msg("{last} {currency} dépensés en {m1}, contre {previous} {currency} en {m2}."),
        recommendation: msg("Repérez les catégories qui ont le plus augmenté et fixez-leur un budget mensuel."),
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
  // 4. Journées à venir : chevauchements (urgent), journée chargée ou sans pause (à surveiller)
  //    Temps réellement occupé (chevauchements comptés une fois) ; un grand nombre de
  //    séances courtes et espacées n'est PAS signalé.
  // ---------------------------------------------------------------------
  const loads = computeDayLoads(s);
  const heavyDays = loads.filter((l) => l.overlaps.length === 0 && (isHeavy(l) || isLongWithoutBreak(l)));
  const lightest = (except: string) =>
    loads
      .filter((l) => l.date !== except && l.date !== today && l.occupiedMinutes < 4 * 60)
      .sort((a, b) => a.occupiedMinutes - b.occupiedMinutes)[0];
  for (const l of loads) {
    const link = `/calendar?view=day&date=${l.date}`;
    const base = { count: l.count, occupiedMin: l.occupiedMinutes, first: l.firstStart ?? "", last: l.lastEnd ?? "" };
    if (l.overlaps.length > 0) {
      const o = l.overlaps[0]!;
      out.push({
        id: `schedule_conflict:${l.date}`, rule: "schedule_conflict", level: "urgent", domain: "agenda", when: l.date,
        title: l.overlaps.length === 1 ? msg("Deux activités se chevauchent") : msg("{conflicts} chevauchements dans la journée"),
        detail: msg("« {a} » et « {b} » se chevauchent de {from} à {to}."),
        recommendation: msg("Déplacez « {b} » après {aEnd}, ou vers un autre jour."),
        params: { ...base, conflicts: l.overlaps.length, a: o.a, b: o.b, from: o.from, to: o.to, overlapMin: o.minutes, aEnd: o.aEnd },
        link, day: l,
      });
      continue;
    }
    if (!isHeavy(l) && !isLongWithoutBreak(l)) continue;
    const noBreak = isLongWithoutBreak(l);
    // Conseil individuel seulement s'il n'y a qu'une journée concernée (sinon : conseil général)
    let recommendation: string | undefined;
    let lightDate = "";
    if (heavyDays.length === 1) {
      const light = lightest(l.date);
      if (noBreak) recommendation = msg("Glissez une pause d'au moins 30 minutes entre deux séances.");
      else if (light) {
        recommendation = msg("Si une séance peut attendre, le {lightDate} est votre journée la plus légère.");
        lightDate = light.date;
      }
    }
    out.push({
      id: `overloaded_day:${l.date}`, rule: "overloaded_day", level: "attention", domain: "agenda", when: l.date,
      title: noBreak ? msg("Journée longue, presque sans pause") : msg("Journée chargée"),
      detail: noBreak
        ? msg("{occupiedMin} d'activités, de {first} à {last}, sans pause de plus de {breakMin}.")
        : msg("{count} activité(s) pour {occupiedMin} de temps réellement occupé, de {first} à {last}."),
      recommendation,
      params: { ...base, breakMin: l.longestBreakMinutes ?? 0, lightDate },
      link, day: l,
    });
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
      id: `postponed_activity:${activityId}`, rule: "postponed_activity", level: "attention", domain: "agenda",
      title: msg("« {name} » a été reportée {count} fois"),
      detail: msg("{count} séances de cette activité ont été déplacées au cours des 60 derniers jours."),
      recommendation: msg("Les horaires actuels ne conviennent peut-être plus : ajustez le créneau habituel de l'activité."),
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
      id: `deadline_cluster:${today}`, rule: "deadline_cluster", level: deadlines.length >= 7 ? "urgent" : "attention", domain: "agenda",
      title: msg("{count} échéances dans les 7 prochains jours"),
      detail: msg("Tâches, paiements attendus et dépenses programmées se concentrent cette semaine."),
      recommendation: msg("Traitez d'abord les échéances les plus proches et préparez dès maintenant celles qui demandent le plus de temps."),
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
        id: `savings_stale:${g.id}`, rule: "savings_stale", level: "attention", domain: "finances",
        title: msg("Épargne « {name} » : aucune mise à jour depuis {days} jours"),
        detail: msg("{current} sur {target} ({percent} %). Aucun versement n'a été enregistré récemment."),
        recommendation: msg("Si vous avez épargné, enregistrez le versement ; sinon, un petit montant régulier suffit à garder le cap."),
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
        id: `goal_overdue:${g.id}`, rule: "goal_overdue", level: "urgent", domain: "goals",
        title: msg("Objectif « {title} » : date limite dépassée"),
        detail: msg("La date limite est passée depuis {days} jour(s), avec {percent} % de progression."),
        recommendation: msg("Fixez une nouvelle date réaliste, ou marquez l'objectif comme atteint s'il l'est."),
        params: { title: g.title, days: -(p.daysLeft ?? 0), percent: p.percent === null ? "—" : round(p.percent) }, link,
      });
      continue;
    }
    if (p.pace === "behind" && p.percent !== null && p.expectedPercent !== null) {
      out.push({
        id: `goal_behind:${g.id}`, rule: "goal_behind", level: "attention", domain: "goals",
        title: msg("Objectif « {title} » en retard sur le rythme prévu"),
        detail: msg("{percent} % réalisés alors que {expected} % étaient attendus à ce jour."),
        recommendation: msg("Réorganisez les étapes restantes ou ajustez la date limite pour garder un rythme tenable."),
        params: { title: g.title, percent: round(p.percent), expected: p.expectedPercent }, link,
      });
    }
    if (p.overdueSteps > 0) {
      out.push({
        id: `goal_steps_late:${g.id}`, rule: "goal_steps_late", level: "attention", domain: "goals",
        title: msg("{count} étape(s) en retard pour « {title} »"),
        detail: msg("Ces étapes avaient une date prévue déjà passée."),
        recommendation: msg("Terminez-les, décalez-les ou ignorez celles qui ne sont plus utiles."),
        params: { title: g.title, count: p.overdueSteps }, link,
      });
    }
    const idle = Math.floor(now.diff(DateTime.fromISO(g.last_progress_at || g.created_at).setZone(tz), "days").days);
    if (idle >= 7) {
      out.push({
        id: `goal_inactive:${g.id}`, rule: "goal_inactive", level: "attention", domain: "goals",
        title: msg("Objectif « {title} » sans progression depuis {days} jours"),
        detail: g.motivation ? msg("Votre motivation : « {motivation} »") : msg("Aucune étape ni progression enregistrée récemment."),
        recommendation: msg("Une petite étape aujourd'hui suffit pour relancer la dynamique."),
        params: { title: g.title, days: idle, motivation: String(g.motivation ?? "").slice(0, 140) }, link,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Données insuffisantes : on le dit plutôt que de deviner
  // ---------------------------------------------------------------------
  if (!historyOk) {
    out.push({
      id: "not_enough_data:history", rule: "not_enough_data", level: "insufficient", domain: "finances",
      title: msg("Tendances disponibles après deux mois complets"),
      detail: msg("Les comparaisons de revenus et de dépenses d'un mois sur l'autre apparaîtront dès que vous aurez assez d'historique."),
      params: {},
    });
  }

  // Gravité d'abord ; à gravité égale, la date la plus proche (les constats sans date restent après)
  return out
    .map((i, idx) => ({ i, idx }))
    .sort((x, y) => {
      const lv = LEVEL_ORDER[x.i.level] - LEVEL_ORDER[y.i.level];
      if (lv !== 0) return lv;
      const dx = x.i.when && x.i.when.length === 10 ? x.i.when : "9999";
      const dy = y.i.when && y.i.when.length === 10 ? y.i.when : "9999";
      return dx < dy ? -1 : dx > dy ? 1 : x.idx - y.idx;
    })
    .map((x) => x.i);
}

export function summarizeInsights(list: Insight[]) {
  return {
    urgent: list.filter((i) => i.level === "urgent").length,
    attention: list.filter((i) => i.level === "attention").length,
    info: list.filter((i) => i.level === "info").length,
    total: list.filter((i) => i.level !== "insufficient").length,
  };
}

/** Vue d'ensemble : charge des 7 prochains jours et UN conseil général (au lieu de le répéter sur chaque carte). */
export interface InsightsOverview {
  days: { date: string; occupiedMinutes: number; state: "conflict" | "heavy" | "normal" }[];
  advice: { text: string; params: Record<string, string | number> } | null;
}

export function buildInsightsOverview(s: InsightSnapshot, insights: Insight[]): InsightsOverview {
  const loads = computeDayLoads(s);
  const today = DateTime.fromISO(s.now).setZone(s.timezone || "UTC").toISODate()!;
  const flagged = new Map(insights.filter((i) => i.day).map((i) => [i.when!, i.rule]));
  const days = loads.map((l) => ({
    date: l.date,
    occupiedMinutes: l.occupiedMinutes,
    state: flagged.get(l.date) === "schedule_conflict" ? ("conflict" as const) : flagged.has(l.date) ? ("heavy" as const) : ("normal" as const),
  }));
  const heavy = days.filter((d) => d.state === "heavy");
  if (heavy.length >= 2) {
    const total = heavy.reduce((a, d) => a + d.occupiedMinutes, 0);
    const light = days
      .filter((d) => d.state === "normal" && d.date !== today && d.date > heavy[0]!.date)
      .sort((a, b) => a.occupiedMinutes - b.occupiedMinutes)[0];
    return {
      days,
      advice: light
        ? { text: msg("{count} journées chargées cette semaine ({totalMin} d'activités). Gardez le {lightDate} plus léger pour récupérer."), params: { count: heavy.length, totalMin: total, lightDate: light.date } }
        : { text: msg("{count} journées chargées cette semaine ({totalMin} d'activités). Prévoyez de vraies pauses entre vos séances."), params: { count: heavy.length, totalMin: total } },
    };
  }
  const conflicts = days.filter((d) => d.state === "conflict").length;
  if (conflicts >= 2) {
    return { days, advice: { text: msg("{count} journées comportent des activités qui se chevauchent : commencez par les régler."), params: { count: conflicts } } };
  }
  return { days, advice: null };
}
