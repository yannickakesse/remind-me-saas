/**
 * Phase 3 — tests du calcul de progression du module « Mes Objectifs ».
 * Lancer : npx tsx scripts/test-phase3-goals.ts
 */
import { computeGoalProgress, crossedMilestones, type GoalRow, type StepRow } from "../lib/goals/progress";

let ok = 0;
let total = 0;
function check(label: string, cond: boolean) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? "✅" : "❌"} ${label}`);
}

const baseGoal: GoalRow = {
  id: "g1", title: "Objectif", description: null, domain: "personal", motivation: null,
  start_date: "2026-11-01", due_date: null, kind: "qualitative", expected_result: null, unit: null,
  start_value: 0, target_value: null, current_value: 0, status: "active", completed_at: null,
  color: null, last_progress_at: null, created_at: "2026-11-01T00:00:00Z",
};
const step = (i: number, status: StepRow["status"], extra: Partial<StepRow> = {}): StepRow => ({
  id: `s${i}`, goal_id: "g1", title: `Étape ${i}`, description: null, period: "monthly", start_date: null,
  due_date: null, target_value: null, weight: 1, position: i, status, completed_at: null, linked_task_id: null, ...extra,
});

// Quantitatif : 1 400 pompes
const pushups: GoalRow = { ...baseGoal, kind: "quantitative", unit: "pompes", target_value: 1400, current_value: 350 };
const p1 = computeGoalProgress(pushups, [], "2026-11-10");
check("1 400 pompes, 350 faites → 25 %", p1.percent === 25 && p1.method === "value");

// Quantitatif décroissant : perdre du poids (90 → 80 kg)
const weight: GoalRow = { ...baseGoal, kind: "quantitative", start_value: 90, target_value: 80, current_value: 85 };
check("Cible plus basse que le départ (90 → 80, à 85) → 50 %", computeGoalProgress(weight, [], "2026-11-10").percent === 50);

// Dépassement plafonné
check("Valeur au-delà de la cible → 100 % maximum", computeGoalProgress({ ...pushups, current_value: 2000 }, [], "2026-11-10").percent === 100);

// Qualitatif : anglais en 6 étapes
const english = [step(1, "done"), step(2, "done"), step(3, "todo"), step(4, "todo"), step(5, "todo"), step(6, "todo")];
const pe = computeGoalProgress(baseGoal, english, "2026-11-10");
check("Anglais : 2 étapes sur 6 → 33,3 %", pe.percent === 33.3 && pe.stepsDone === 2 && pe.stepsRemaining === 4);

check("Étape ignorée exclue du calcul (2 faites / 5 comptées → 40 %)",
  computeGoalProgress(baseGoal, [...english.slice(0, 5), step(6, "skipped")], "2026-11-10").percent === 40);

check("Étapes pondérées (jalon de poids 3 terminé sur 4 → 75 %)",
  computeGoalProgress(baseGoal, [step(1, "done", { weight: 3 }), step(2, "todo")], "2026-11-10").percent === 75);

check("Qualitatif sans étape → pas de pourcentage inventé", computeGoalProgress(baseGoal, [], "2026-11-10").percent === null);
check("Objectif terminé → 100 %", computeGoalProgress({ ...baseGoal, status: "completed" }, [], "2026-11-10").percent === 100);

// Rythme et échéance (1er nov. → 1er mai, soit 181 jours)
const dated: GoalRow = { ...pushups, due_date: "2027-05-01" };
const early = computeGoalProgress({ ...dated, current_value: 50 }, [], "2027-02-01"); // ~51 % attendu, 3,6 % fait
check("Très en dessous du rythme attendu → « en retard »", early.pace === "behind");
const fine = computeGoalProgress({ ...dated, current_value: 700 }, [], "2027-02-01");
check("Au rythme attendu → « dans les temps »", fine.pace === "on_track");
check("Jours restants calculés", fine.daysLeft === 89);
check("Sans date limite → rythme inconnu (aucune conclusion)", computeGoalProgress(pushups, [], "2026-11-10").pace === "unknown");
check("Date limite dépassée et non terminé → en retard", computeGoalProgress({ ...dated, due_date: "2026-11-05" }, [], "2026-11-10").overdue);
check("Objectif en pause → pas de jugement de rythme", computeGoalProgress({ ...dated, status: "paused", current_value: 10 }, [], "2027-02-01").pace === "unknown");

check("Étapes en retard comptées", computeGoalProgress(baseGoal, [step(1, "todo", { due_date: "2026-11-05" }), step(2, "done", { due_date: "2026-11-05" })], "2026-11-10").overdueSteps === 1);

// Paliers
check("Paliers franchis de 20 % à 80 % → 25, 50, 75", JSON.stringify(crossedMilestones(20, 80)) === "[25,50,75]");
check("Aucun palier franchi de 30 % à 40 %", crossedMilestones(30, 40).length === 0);

console.log(`\n${ok}/${total} tests réussis`);
if (ok !== total) process.exit(1);
