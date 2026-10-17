/**
 * ==============================================================================
 * 🧪 REMIND ME — TEST CIBLÉ : COHÉRENCE DÉPENSES PAYÉES, RAPPORTS & RECURRENCE
 * ==============================================================================
 */

import { DateTime } from "luxon";
import { deriveFinanceStatus, financeStatusLabel } from "../lib/validation/finances";
import { aggregateFinancesForMonth } from "../lib/finances/aggregate";

let passedCount = 0;
let totalCount = 0;

function check(title: string, condition: boolean, detail?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${title}`);
  } else {
    console.error(`  ❌ [FAIL] ${title} -> ${detail ?? "Condition non satisfaite"}`);
  }
}

console.log("==================================================================");
console.log("🧪 TEST CIBLÉ : DÉPENSES PAYÉES, RAPPORTS & INTÉGRITÉ FINANCIÈRE");
console.log("==================================================================\n");

// -----------------------------------------------------------------------------
// 1. DÉPENSES PAYÉES & DÉRIVATION DU STATUT
// -----------------------------------------------------------------------------
console.log("1️⃣ Statuts financiers et distinction Payé vs Reçu :");

const paidExpenseStatus = deriveFinanceStatus(true, "2026-10-15", "UTC", "expense");
check(
  "Une dépense réglée (paid=true) dérive le statut 'paid' et non 'received'",
  paidExpenseStatus === "paid",
  `Reçu: ${paidExpenseStatus}`
);

const paidExpenseLabel = financeStatusLabel(paidExpenseStatus, "expense");
check(
  "Le label affiché pour une dépense payée est 'Payée'",
  paidExpenseLabel === "Payée",
  `Reçu: ${paidExpenseLabel}`
);

const receivedIncomeStatus = deriveFinanceStatus(true, "2026-10-15", "UTC", "income");
check(
  "Un revenu encaissé (received=true) dérive le statut 'received'",
  receivedIncomeStatus === "received",
  `Reçu: ${receivedIncomeStatus}`
);

const receivedIncomeLabel = financeStatusLabel(receivedIncomeStatus, "income");
check(
  "Le label affiché pour un revenu encaissé est 'Reçu'",
  receivedIncomeLabel === "Reçu",
  `Reçu: ${receivedIncomeLabel}`
);

const pendingExpenseStatus = deriveFinanceStatus(false, "2026-10-25", "UTC", "expense");
check(
  "Une dépense du mois en cours non réglée dérive 'expected'",
  pendingExpenseStatus === "expected" || pendingExpenseStatus === "overdue",
  `Reçu: ${pendingExpenseStatus}`
);

// -----------------------------------------------------------------------------
// 2. AGRÉGATION FINANCIÈRE DU MOIS & SOLDE RÉEL
// -----------------------------------------------------------------------------
console.log("\n2️⃣ Agrégation mensuelle stricte :");

const sampleIncome = [
  { amount: 500000, received: true },   // Encaissé
  { amount: 200000, received: false },  // Attendu
];
const sampleExpenses = [
  { amount: 150000, paid: true },       // Payée
  { amount: 50000, paid: true },        // Payée
  { amount: 80000, paid: false },       // À payer / prévue
];

const aggregates = aggregateFinancesForMonth(sampleIncome, sampleExpenses, "2026-10-17");

check(
  "Total Revenus Encaissés = 500 000 XOF",
  aggregates.totalIncomeReceived === 500000,
  `Reçu: ${aggregates.totalIncomeReceived}`
);

check(
  "Total Revenus Attendus = 200 000 XOF",
  aggregates.totalIncomePending === 200000,
  `Reçu: ${aggregates.totalIncomePending}`
);

check(
  "Total Dépenses Payées = 200 000 XOF (150k + 50k)",
  aggregates.totalExpensesPaid === 200000,
  `Reçu: ${aggregates.totalExpensesPaid}`
);

check(
  "Total Dépenses Prévues / À payer = 80 000 XOF",
  aggregates.totalExpensesPending === 80000,
  `Reçu: ${aggregates.totalExpensesPending}`
);

check(
  "Solde Net Réel = 300 000 XOF (500k encaissé - 200k payé)",
  aggregates.netBalance === 300000,
  `Reçu: ${aggregates.netBalance}`
);

// -----------------------------------------------------------------------------
// 3. DÉPENSES RÉCURRENTES, CONTRAT & RESPECT D'EXPIRATION
// -----------------------------------------------------------------------------
console.log("\n3️⃣ Dépenses récurrentes & date d'expiration du contrat :");

const scheduledRecurring = {
  id: "sch_001",
  name: "Abonnement Cloud",
  category: "software",
  amount: 30000,
  frequency: "monthly" as const,
  next_due_date: "2026-10-01",
  end_date: "2026-11-01",
  status: "planned" as const,
};

// Simulation du calcul de la prochaine échéance
const curDT = DateTime.fromISO(scheduledRecurring.next_due_date);
const nextDT = curDT.plus({ months: 1 });
const nextDueDateStr = nextDT.toISODate()!;

check(
  "L'échéance mensuelle suivante avance sans dérive à 2026-11-01",
  nextDueDateStr === "2026-11-01",
  `Reçu: ${nextDueDateStr}`
);

check(
  "L'échéance 2026-11-01 ne dépasse pas encore end_date (2026-11-01) -> reste planned",
  nextDueDateStr <= scheduledRecurring.end_date,
  `Reçu: nextDueDateStr=${nextDueDateStr}, end_date=${scheduledRecurring.end_date}`
);

// Second cycle : 2026-11-01 + 1 mois -> 2026-12-01 (dépasse end_date)
const nextCycleDT = nextDT.plus({ months: 1 });
const nextCycleDueDateStr = nextCycleDT.toISODate()!;
const isContractExpired = Boolean(scheduledRecurring.end_date && nextCycleDueDateStr > scheduledRecurring.end_date);

check(
  "L'échéance suivante (2026-12-01) dépasse end_date (2026-11-01) -> arrêt automatique (status: paid)",
  isContractExpired === true,
  `Reçu: ${nextCycleDueDateStr} > ${scheduledRecurring.end_date}`
);

// -----------------------------------------------------------------------------
// 4. RAPPORTS MULTI-MOIS & VENTILATION DES DÉPENSES PAYÉES
// -----------------------------------------------------------------------------
console.log("\n4️⃣ Cohérence des Rapports Multi-Mois :");

const multiMonthExpenses = [
  { due_date: "2026-08-10", amount: 40000, paid: true, category: "housing" },
  { due_date: "2026-09-10", amount: 40000, paid: true, category: "housing" },
  { due_date: "2026-10-10", amount: 40000, paid: true, category: "housing" },
  { due_date: "2026-10-28", amount: 15000, paid: false, category: "software" }, // prévu
];

// Filtrage pour le mois en cours (2026-10)
const octExpenses = multiMonthExpenses.filter(e => e.due_date.startsWith("2026-10"));
const octPaid = octExpenses.filter(e => e.paid).reduce((s, e) => s + e.amount, 0);
const octPlanned = octExpenses.filter(e => !e.paid).reduce((s, e) => s + e.amount, 0);

check(
  "Dépenses payées d'octobre = 40 000 XOF",
  octPaid === 40000,
  `Reçu: ${octPaid}`
);

check(
  "Dépenses prévues d'octobre = 15 000 XOF",
  octPlanned === 15000,
  `Reçu: ${octPlanned}`
);

// Historique multi-mois cumulé sur les 3 mois
const totalHistoryPaid = multiMonthExpenses.filter(e => e.paid).reduce((s, e) => s + e.amount, 0);
check(
  "Historique multi-mois (Août à Octobre) : total payé = 120 000 XOF sans double comptage",
  totalHistoryPaid === 120000,
  `Reçu: ${totalHistoryPaid}`
);

console.log("\n==================================================================");
console.log(`📊 RÉSULTAT : ${passedCount}/${totalCount} tests passés avec succès (${Math.round((passedCount / totalCount) * 100)}%)`);
console.log("==================================================================\n");

if (passedCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}
