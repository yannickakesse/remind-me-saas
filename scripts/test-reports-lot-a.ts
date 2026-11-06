/**
 * Statistiques financières — lot A : calculs fiables, périodes sans données, comparaisons.
 * Lancer : npx tsx scripts/test-reports-lot-a.ts
 */
import { DateTime } from "luxon";
import { buildProfitabilityReport, type ReportInput } from "../lib/reports/profitability";
import {
  compareValue,
  isRecurringExpense,
  periodCoverage,
  previousPeriod,
  upcomingScheduledOccurrences,
  workedHoursByActivity,
} from "../lib/reports/periods";

let ok = 0;
let total = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? "✅" : "❌"} ${label}${cond || detail === undefined ? "" : "  → " + JSON.stringify(detail)}`);
}

const TZ = "Africa/Abidjan";
const NOW = DateTime.fromISO("2026-11-20T12:00:00", { zone: TZ });
const base = (over: Partial<ReportInput>): ReportInput => ({
  activities: [
    { id: "a1", name: "Coaching", color: "#0a0" },
    { id: "a2", name: "Formation", color: "#00a" },
  ],
  income: [],
  expenses: [],
  sessions: [],
  scheduled: [],
  startDate: "2026-11-01",
  endDate: "2026-11-30",
  timezone: TZ,
  defaultCurrency: "XOF",
  today: "2026-11-20",
  now: NOW,
  accountCreatedAt: "2026-11-05T09:00:00Z",
  earliestOperationDate: null,
  ...over,
});
const inc = (d: string, amount: number, extra: any = {}) => ({ activity_id: null, amount, currency: "XOF", due_date: d, received: true, ...extra });
const exp = (d: string, amount: number, extra: any = {}) => ({ activity_id: null, category: "food", amount, currency: "XOF", due_date: d, paid: true, label: "x", notes: null, ...extra });

// --- 1. Compte créé le 5 novembre, rien en octobre ---
{
  const r = buildProfitabilityReport(base({ income: [inc("2026-11-10", 150000)], earliestOperationDate: "2026-11-10" }));
  check("Novembre (en cours) : période partielle, statistiques présentes", r.coverage === "partial" && r.totalIncomeReceived === 150000);
  check("Octobre : aucune donnée (pas de faux 0 FCFA)", r.comparison.coverage === "none");
  check("Aucune comparaison fabriquée avec octobre", r.comparison.deltas === null);
  check("Courbe : octobre et les mois d'avant ne sont pas tracés", r.monthlyEvolution.length === 1 && r.monthlyEvolution[0]!.monthKey === "2026-11");
  check("Mois sans données marqués « none » (trou, pas zéro)", r.monthlySummaries.filter((m) => m.coverage === "none").length === 11);
  const oct = buildProfitabilityReport(base({ startDate: "2026-10-01", endDate: "2026-10-31", earliestOperationDate: "2026-11-10" }));
  check("Octobre sélectionné : statut « aucune donnée »", oct.coverage === "none");
}

// --- 2. Opération d'octobre saisie en novembre : octobre entre dans les statistiques ---
{
  const r = buildProfitabilityReport(
    base({ income: [inc("2026-11-10", 150000), inc("2026-10-15", 40000)], earliestOperationDate: "2026-10-15" })
  );
  check("Octobre pris en compte grâce à l'opération historique", r.comparison.coverage === "partial");
  check("Comparaison proposée, marquée indicative", !!r.comparison.deltas && r.comparison.deltas.indicative);
  check("Écart revenus encaissés : +110 000 (+275 %)", r.comparison.deltas?.incomeReceived.delta === 110000 && r.comparison.deltas?.incomeReceived.percent === 275);
  check("Courbe : octobre tracé, septembre non", r.monthlyEvolution.map((m) => m.monthKey).join() === "2026-10,2026-11");
}

// --- 3. Statuts de couverture ---
check("Mois terminé, suivi, avec opérations → comparable",
  periodCoverage({ start: "2026-09-01", end: "2026-09-30", today: "2026-11-20", trackingStart: "2026-08-01", operationCount: 3 }) === "complete");
check("Mois terminé, suivi, sans opération → vrai zéro",
  periodCoverage({ start: "2026-09-01", end: "2026-09-30", today: "2026-11-20", trackingStart: "2026-08-01", operationCount: 0 }) === "zero");
check("Mois qui contient le début du suivi → partiel",
  periodCoverage({ start: "2026-08-01", end: "2026-08-31", today: "2026-11-20", trackingStart: "2026-08-12", operationCount: 2 }) === "partial");
check("Mois avant le début du suivi → aucune donnée",
  periodCoverage({ start: "2026-07-01", end: "2026-07-31", today: "2026-11-20", trackingStart: "2026-08-12", operationCount: 0 }) === "none");
check("Aucun compte ni opération → aucune donnée",
  periodCoverage({ start: "2026-11-01", end: "2026-11-30", today: "2026-11-20", trackingStart: null, operationCount: 0 }) === "none");

// --- 4. Devises : jamais additionnées ---
{
  const r = buildProfitabilityReport(
    base({ income: [inc("2026-11-10", 50000), inc("2026-11-11", 100, { currency: "EUR" })], earliestOperationDate: "2026-11-10" })
  );
  const nov = r.monthlySummaries.find((m) => m.monthKey === "2026-11")!;
  check("Courbe mensuelle : 50 000 FCFA (les 100 € ne s'y ajoutent pas)", nov.incomeReceived === 50000 && nov.currency === "XOF", nov);
  check("Total encaissé en FCFA = 50 000", r.totalIncomeReceived === 50000);
  check("Les euros sont listés à part", r.otherCurrencies.length === 1 && r.otherCurrencies[0]!.currency === "EUR" && r.otherCurrencies[0]!.incomeReceived === 100);
  check("Répartition des revenus : FCFA uniquement", r.incomeBreakdown.every((i) => i.currency === "XOF") && r.incomeBreakdown[0]!.amount === 50000);
}

// --- 5. Heures réellement travaillées ---
{
  const sessions = [
    { activity_id: "a1", starts_at: "2026-11-10T09:00:00Z", ends_at: "2026-11-10T11:00:00Z", status: "completed" }, // 2 h
    { activity_id: "a1", starts_at: "2026-11-12T09:00:00Z", ends_at: "2026-11-12T10:00:00Z", status: "planned" }, // passée : 1 h
    { activity_id: "a1", starts_at: "2026-11-25T09:00:00Z", ends_at: "2026-11-25T15:00:00Z", status: "planned" }, // future : 0
    { activity_id: "a1", starts_at: "2026-11-13T09:00:00Z", ends_at: "2026-11-13T12:00:00Z", status: "missed" }, // 0
    { activity_id: "a2", starts_at: "2026-10-31T23:00:00Z", ends_at: "2026-11-01T01:00:00Z", status: "completed" }, // 1 h dans novembre
    { activity_id: "a1", starts_at: "2026-11-20T11:00:00Z", ends_at: "2026-11-20T14:00:00Z", status: "in_progress" }, // en cours : 1 h écoulée
  ];
  const h = workedHoursByActivity(sessions, "2026-11-01", "2026-11-30", TZ, NOW);
  check("Séance terminée comptée (2 h) + passée non signalée (1 h) + en cours (1 h écoulée)", Math.abs((h.byActivity.get("a1") ?? 0) - 4) < 1e-9, h.byActivity.get("a1"));
  check("Séance future et séance manquée : jamais comptées", Math.abs(h.total - 5) < 1e-9, h.total);
  check("Séance à cheval sur deux mois : seule la partie de novembre compte", Math.abs((h.byActivity.get("a2") ?? 0) - 1) < 1e-9);
}

// --- 6. Rentabilité horaire : dépenses générales jamais réparties ---
{
  const r = buildProfitabilityReport(
    base({
      income: [inc("2026-11-10", 100000, { activity_id: "a1" })],
      expenses: [exp("2026-11-11", 20000, { activity_id: "a1" }), exp("2026-11-12", 30000)], // 30 000 = dépense générale
      sessions: [{ activity_id: "a1", starts_at: "2026-11-10T08:00:00Z", ends_at: "2026-11-10T12:00:00Z", status: "completed" }],
      earliestOperationDate: "2026-11-10",
    })
  );
  check("Taux horaire des activités = (100 000 − 20 000) / 4 h = 20 000/h", r.averageHourlyRate === 20000, r.averageHourlyRate);
  check("Solde net global inchangé (50 000)", r.realNetBalance === 50000);
  check("Ligne « Général » séparée, jamais attribuée à une activité",
    r.profitabilityList.some((p) => p.isGeneral && p.expensesPaid === 30000) && r.profitabilityList.find((p) => p.activityId === "a1")?.expensesPaid === 20000);
  const r2 = buildProfitabilityReport(
    base({
      sessions: [{ activity_id: "a2", starts_at: "2026-11-10T08:00:00Z", ends_at: "2026-11-10T10:00:00Z", status: "completed" }],
      earliestOperationDate: "2026-11-10",
    })
  );
  check("Activité avec des heures mais sans montants : signalée « incomplète »", r2.profitabilityList.find((p) => p.activityId === "a2")?.incomplete === true);
}

// --- 7. Répartitions : pas de bascule silencieuse, remboursements à part ---
{
  const r = buildProfitabilityReport(
    base({
      income: [inc("2026-11-10", 80000), inc("2026-11-11", 10000, { income_type: "refund" })],
      expenses: [exp("2026-11-12", 5000, { paid: false, category: "transport" })],
      earliestOperationDate: "2026-11-10",
    })
  );
  check("Aucune dépense payée → répartition des payées vide (pas de bascule vers les prévues)", r.categoryBreakdown.length === 0);
  check("Les dépenses prévues sont listées à part", r.plannedCategoryBreakdown.length === 1 && r.plannedCategoryBreakdown[0]!.amount === 5000);
  check("Remboursement : compté dans les encaissements (90 000)", r.totalIncomeReceived === 90000);
  check("Remboursement : absent de la répartition des sources de revenus", r.incomeBreakdown.reduce((a, i) => a + i.amount, 0) === 80000);
  check("Remboursement : visible à part (10 000)", r.receivedIncomeSplit.refunds === 10000);
}

// --- 8. Dépenses à venir : échéancier inclus, sans double comptage ---
{
  const scheduled = [
    { name: "Loyer", amount: 100000, currency: "XOF", frequency: "monthly", next_due_date: "2026-11-25", end_date: null, status: "planned" },
    { name: "Internet", amount: 15000, currency: "XOF", frequency: "weekly", next_due_date: "2026-11-21", end_date: null, status: "due" },
    { name: "Abonnement annulé", amount: 9000, currency: "XOF", frequency: "monthly", next_due_date: "2026-11-22", end_date: null, status: "cancelled" },
    { name: "Internet", amount: 15000, currency: "XOF", frequency: "once", next_due_date: "2026-10-01", end_date: null, status: "planned" },
  ];
  const occ = upcomingScheduledOccurrences(scheduled, "2026-11-20", "2026-11-30", [{ label: "Internet", due_date: "2026-11-28", amount: 15000 }]);
  check("Loyer du 25 compté, Internet du 21 compté, celui du 28 déjà enregistré non recompté", occ.length === 2 && occ.map((o) => o.date).join() === "2026-11-25,2026-11-21", occ);
  check("Échéance annulée ou hors période ignorée", !occ.some((o) => o.name === "Abonnement annulé" || o.date === "2026-10-01"));
  const r = buildProfitabilityReport(
    base({ scheduled, expenses: [exp("2026-11-15", 3000, { paid: false })], earliestOperationDate: "2026-11-15" })
  );
  check("Dépenses à venir = prévues (3 000) + programmées (100 000 + 2 × 15 000)", r.totalExpensesUpcoming === 133000, r.totalExpensesUpcoming);
  check("Le solde net n'inclut jamais l'à venir", r.realNetBalance === 0);
}

// --- 9. Périodes précédentes ---
const pp = (s: string, e: string) => { const p = previousPeriod(s, e); return `${p.granularity}:${p.start}..${p.end}`; };
check("Mois → mois précédent", pp("2026-11-01", "2026-11-30") === "month:2026-10-01..2026-10-31");
check("Trimestre → trimestre précédent", pp("2026-10-01", "2026-12-31") === "quarter:2026-07-01..2026-09-30");
check("Année → année précédente", pp("2026-01-01", "2026-12-31") === "year:2025-01-01..2025-12-31");
check("Personnalisée (10 jours) → les 10 jours d'avant", pp("2026-11-11", "2026-11-20") === "custom:2026-11-01..2026-11-10");
check("Mars → février (fin de mois correcte)", pp("2026-03-01", "2026-03-31") === "month:2026-02-01..2026-02-28");

// --- 10. Écarts ---
check("Écart en montant et en %", JSON.stringify(compareValue(120, 100)) === JSON.stringify({ current: 120, previous: 100, delta: 20, percent: 20 }));
check("Jamais de % sur une base à zéro", compareValue(5000, 0).percent === null && compareValue(5000, 0).delta === 5000);
check("Base négative : sens du % correct", compareValue(-50, -100).percent === 50);

// --- 11. Dépenses récurrentes (estimation via la note) ---
check("Dépense issue de l'échéancier reconnue", isRecurringExpense("Issu d'une dépense programmée") && isRecurringExpense("Issu de la dépense programmée : x") && !isRecurringExpense("Courses"));
{
  const r = buildProfitabilityReport(
    base({ expenses: [exp("2026-11-10", 50000, { notes: "Issu d'une dépense programmée" }), exp("2026-11-11", 7000)], earliestOperationDate: "2026-11-10" })
  );
  check("Payées : récurrentes 50 000 / ponctuelles 7 000", r.expenseKinds.recurringPaid === 50000 && r.expenseKinds.ponctualPaid === 7000);
}

console.log(`\n${ok}/${total} tests réussis`);
if (ok !== total) process.exit(1);
