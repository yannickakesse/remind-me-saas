/**
 * Phase 4 — tests du moteur d'analyse interne (aucune IA externe).
 * Lancer : npx tsx scripts/test-phase4-intelligence.ts
 */
import { computeInsights, summarizeInsights, type InsightSnapshot } from "../lib/intelligence/rules";
import type { GoalRow } from "../lib/goals/progress";

let ok = 0;
let total = 0;
function check(label: string, cond: boolean) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? "✅" : "❌"} ${label}`);
}

// 18 novembre 2026, 10h à Abidjan (UTC+0) : 12 jours restants dans le mois
const base: InsightSnapshot = {
  timezone: "Africa/Abidjan",
  now: "2026-11-18T10:00:00Z",
  currency: "XOF",
  accountCreatedAt: "2026-06-01T00:00:00Z",
  budgets: [], expenses: [], income: [], events: [], activities: [], tasks: [],
  scheduledExpenses: [], savingsGoals: [], goals: [], goalSteps: [],
};
const has = (s: InsightSnapshot, rule: string, level?: string) =>
  computeInsights(s).some((i) => i.rule === rule && (!level || i.level === level));

// 1. Budgets
const budget = { id: "b1", category: "food", categoryLabel: "Repas", monthly_limit: 100000, currency: "XOF" };
const spend = (amount: number, date = "2026-11-10") => ({ amount, currency: "XOF", category: "food", paid: true, paid_at: `${date}T12:00:00Z`, due_date: date });
check("Budget à 85 % avec 12 jours restants → attention", has({ ...base, budgets: [budget], expenses: [spend(85000)] }, "budget_burn", "attention"));
check("Budget à 60 % → rien à signaler", !has({ ...base, budgets: [budget], expenses: [spend(60000)] }, "budget_burn"));
check("Budget dépassé (110 %) → urgent", has({ ...base, budgets: [budget], expenses: [spend(110000)] }, "budget_burn", "urgent"));
check("Dépense du mois précédent ignorée", !has({ ...base, budgets: [budget], expenses: [spend(95000, "2026-10-28")] }, "budget_burn"));
check("Budget à 85 % le 27 du mois (fin proche) → pas d'alerte", !has({ ...base, now: "2026-11-27T10:00:00Z", budgets: [budget], expenses: [spend(85000)] }, "budget_burn"));
const perDay = computeInsights({ ...base, budgets: [budget], expenses: [spend(85000)] }).find((i) => i.rule === "budget_burn")?.params.perDay;
check("Recommandation chiffrée : 15 000 / 12 jours = 1 250 par jour", perDay === 1250);

// 2-3. Tendances sur mois complets
const inc = (amount: number, date: string) => ({ amount, currency: "XOF", received: true, received_at: `${date}T12:00:00Z`, due_date: date, label: "Mission" });
check("Revenus octobre −30 % vs septembre → attention", has({ ...base, income: [inc(100000, "2026-09-15"), inc(70000, "2026-10-15")] }, "income_trend", "attention"));
check("Revenus +25 % → information positive", has({ ...base, income: [inc(100000, "2026-09-15"), inc(125000, "2026-10-15")] }, "income_trend", "info"));
check("Variation de 10 % → rien", !has({ ...base, income: [inc(100000, "2026-09-15"), inc(90000, "2026-10-15")] }, "income_trend"));
check("Mois en cours (partiel) jamais comparé", !has({ ...base, income: [inc(100000, "2026-10-15"), inc(10000, "2026-11-05")] }, "income_trend"));
check("Autre devise ignorée", !has({ ...base, income: [inc(100000, "2026-09-15"), { ...inc(1000, "2026-10-15"), currency: "EUR" }] }, "income_trend"));
const young = { ...base, accountCreatedAt: "2026-11-01T00:00:00Z", income: [inc(100000, "2026-09-15"), inc(10000, "2026-10-15")] };
check("Compte récent → pas de tendance inventée", !has(young, "income_trend"));
check("Compte récent → « données insuffisantes » affiché", has(young, "not_enough_data", "insufficient"));
check("Dépenses +40 % → attention", has({ ...base, expenses: [spend(50000, "2026-09-10"), spend(70000, "2026-10-10")] }, "expense_trend", "attention"));

// 4. Journée surchargée
const ev = (i: number, day: string, h: number, dur = 1) => ({
  id: `e${i}`, title: "Séance", starts_at: `${day}T${String(h).padStart(2, "0")}:00:00Z`,
  ends_at: `${day}T${String(h + dur).padStart(2, "0")}:00:00Z`, status: "planned", activity_id: "a1", original_starts_at: null, is_exception: false,
});
check("4 séances le même jour → journée chargée", has({ ...base, events: [ev(1, "2026-11-20", 8), ev(2, "2026-11-20", 10), ev(3, "2026-11-20", 13), ev(4, "2026-11-20", 16)] }, "overloaded_day"));
check("9 h de séances → journée chargée", has({ ...base, events: [ev(1, "2026-11-21", 8, 5), ev(2, "2026-11-21", 14, 4)] }, "overloaded_day"));
check("Séances annulées non comptées", !has({ ...base, events: [1, 2, 3, 4].map((i) => ({ ...ev(i, "2026-11-20", 6 + i * 2), status: "cancelled" })) }, "overloaded_day"));
check("Journée hors horizon de 7 jours ignorée", !has({ ...base, events: [1, 2, 3, 4].map((i) => ev(i, "2026-12-10", 6 + i * 2)) }, "overloaded_day"));

// 5. Reports
const post = (i: number, d: string) => ({ ...ev(i, "2026-11-25", 9), status: "postponed", is_exception: true, original_starts_at: `${d}T09:00:00Z` });
const acts = [{ id: "a1", name: "Cours de maths" }];
check("Activité reportée 3 fois en 60 jours → attention", has({ ...base, activities: acts, events: [post(1, "2026-10-01"), post(2, "2026-10-20"), post(3, "2026-11-10")] }, "postponed_activity"));
check("2 reports seulement → rien", !has({ ...base, activities: acts, events: [post(1, "2026-10-01"), post(2, "2026-10-20")] }, "postponed_activity"));

// 6. Échéances groupées
const task = (i: number, d: string) => ({ id: `t${i}`, title: `Tâche ${i}`, due_date: d, status: "todo" });
check("4 échéances dans la semaine → attention", has({ ...base, tasks: [task(1, "2026-11-19"), task(2, "2026-11-20"), task(3, "2026-11-22")], scheduledExpenses: [{ id: "s1", name: "Loyer", next_due_date: "2026-11-21", status: "planned" }] }, "deadline_cluster", "attention"));
check("Tâches terminées non comptées", !has({ ...base, tasks: [1, 2, 3, 4].map((i) => ({ ...task(i, "2026-11-20"), status: "done" })) }, "deadline_cluster"));

// 7. Épargne
check("Épargne sans mise à jour depuis 30 jours → attention", has({ ...base, savingsGoals: [{ id: "g", name: "Voiture", target_amount: 1000000, current_amount: 200000, updated_at: "2026-10-19T00:00:00Z", deadline: null }] }, "savings_stale"));
check("Épargne atteinte → rien", !has({ ...base, savingsGoals: [{ id: "g", name: "Voiture", target_amount: 1000, current_amount: 1000, updated_at: "2026-01-01T00:00:00Z", deadline: null }] }, "savings_stale"));

// 8. Mes Objectifs
const goal: GoalRow = {
  id: "go1", title: "1 400 pompes", description: null, domain: "health_sport", motivation: "Être en forme", start_date: "2026-11-01",
  due_date: "2026-12-01", kind: "quantitative", expected_result: null, unit: "pompes", start_value: 0, target_value: 1400, current_value: 100,
  status: "active", completed_at: null, color: null, last_progress_at: "2026-11-16T10:00:00Z", created_at: "2026-11-01T00:00:00Z",
};
check("Objectif en retard sur le rythme (7 % vs ~57 %) → attention", has({ ...base, goals: [goal] }, "goal_behind"));
check("Objectif sans progression depuis 9 jours → attention", has({ ...base, goals: [{ ...goal, current_value: 900, last_progress_at: "2026-11-09T10:00:00Z" }] }, "goal_inactive"));
check("Objectif à date dépassée → urgent", has({ ...base, goals: [{ ...goal, due_date: "2026-11-10" }] }, "goal_overdue", "urgent"));
check("Objectif en pause → aucune alerte", !computeInsights({ ...base, goals: [{ ...goal, status: "paused" }] }).some((i) => i.rule.startsWith("goal")));

// Tri et résumé
const mixed = computeInsights({ ...base, budgets: [budget], expenses: [spend(110000)], goals: [goal], accountCreatedAt: "2026-11-01T00:00:00Z" });
check("Urgent en premier, « données insuffisantes » en dernier", mixed[0]!.level === "urgent" && mixed[mixed.length - 1]!.level === "insufficient");
check("Le résumé ne compte pas « données insuffisantes »", summarizeInsights(mixed).total === mixed.length - 1);
check("Chaque constat porte ses chiffres et un identifiant stable", mixed.every((i) => i.id.length > 0 && typeof i.params === "object"));

console.log(`\n${ok}/${total} tests réussis`);
if (ok !== total) process.exit(1);
