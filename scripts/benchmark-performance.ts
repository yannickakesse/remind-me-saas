import { performance } from "perf_hooks";
import { DateTime } from "luxon";
import { aggregateFinancesForMonth } from "../lib/finances/aggregate";
import { detectConflicts } from "../lib/calendar/conflicts";
import { generateOccurrencesForSchedule } from "../lib/calendar/generate";
import { generateIncomeOccurrences } from "../lib/finances/generate";
import { normalizePlan, getPlanEntitlements } from "../lib/subscriptions/entitlements";

console.log("=================================================================");
console.log("⚡ REMIND ME — PERFORMANCE & REACTIVITY AUDIT SUITE");
console.log("=================================================================\n");

interface BenchmarkResult {
  operation: string;
  category: "FRONTEND" | "BACKEND" | "SYNC" | "LOGIC";
  durationMs: number;
  rating: "🟢 EXCELLENT" | "🟡 ACCEPTABLE" | "🟠 LENT" | "🔴 PROBLÉMATIQUE";
  details: string;
}

const results: BenchmarkResult[] = [];

function rate(ms: number, fastThreshold = 50, acceptableThreshold = 200): "🟢 EXCELLENT" | "🟡 ACCEPTABLE" | "🟠 LENT" | "🔴 PROBLÉMATIQUE" {
  if (ms < fastThreshold) return "🟢 EXCELLENT";
  if (ms < acceptableThreshold) return "🟡 ACCEPTABLE";
  if (ms < 600) return "🟠 LENT";
  return "🔴 PROBLÉMATIQUE";
}

// 1. Benchmark: Finance Month Aggregates (100 income, 150 expenses)
const t0 = performance.now();
const mockIncome = Array.from({ length: 100 }, (_, i) => ({
  id: `inc-${i}`,
  amount: 50000 + i * 1000,
  currency: "XOF",
  received: i % 2 === 0,
  due_date: "2026-10-15",
  created_at: "2026-10-01T00:00:00Z",
}));

const mockExpenses = Array.from({ length: 150 }, (_, i) => ({
  id: `exp-${i}`,
  amount: 15000 + i * 500,
  currency: "XOF",
  paid: i % 3 === 0,
  due_date: "2026-10-10",
  created_at: "2026-10-01T00:00:00Z",
}));

for (let iter = 0; iter < 100; iter++) {
  aggregateFinancesForMonth(mockIncome, mockExpenses, "2026-10-04");
}
const t1 = performance.now();
const financeAggDuration = (t1 - t0) / 100;
results.push({
  operation: "Finance In-Memory Aggregations (250 records x 100 iters)",
  category: "LOGIC",
  durationMs: Number(financeAggDuration.toFixed(2)),
  rating: rate(financeAggDuration, 5, 20),
  details: `Agrégation instantanée calculée en ${financeAggDuration.toFixed(2)}ms par cycle.`,
});

// 2. Benchmark: Calendar Conflict Detection (100 events)
const t2 = performance.now();
const mockEvents = Array.from({ length: 100 }, (_, i) => {
  const start = DateTime.fromISO("2026-10-01T08:00:00Z").plus({ days: Math.floor(i / 4), hours: (i % 4) * 2 });
  return {
    id: `event-${i}`,
    activity_id: `act-${i % 5}`,
    schedule_id: `sched-${i % 5}`,
    title: `Séance ${i}`,
    starts_at: start.toISO()!,
    ends_at: start.plus({ hours: 2 }).toISO()!,
    status: "planned" as const,
    is_exception: false,
    original_starts_at: null,
    notes: null,
    activity: { color: "#1E3A5F", name: "Activité test" },
  };
});

for (let iter = 0; iter < 100; iter++) {
  detectConflicts(mockEvents);
}
const t3 = performance.now();
const conflictDuration = (t3 - t2) / 100;
results.push({
  operation: "Calendar Conflict Detection (100 events x 100 iters)",
  category: "LOGIC",
  durationMs: Number(conflictDuration.toFixed(2)),
  rating: rate(conflictDuration, 5, 20),
  details: `Détection des chevauchements d'horaires en ${conflictDuration.toFixed(2)}ms.`,
});

// 3. Benchmark: Calendar Occurrence Generation (5 schedules for 31 days)
const t4 = performance.now();
const fromDate = DateTime.fromISO("2026-10-01T00:00:00Z");
const toDate = DateTime.fromISO("2026-10-31T23:59:59Z");
for (let iter = 0; iter < 50; iter++) {
  for (let s = 1; s <= 5; s++) {
    generateOccurrencesForSchedule(
      {
        id: `sch-${s}`,
        activityId: `act-${s}`,
        weekday: (s % 7) + 1,
        startTime: "09:00:00",
        endTime: "11:00:00",
        recurrence: "weekly",
        activityStartDate: "2026-09-01",
        activityEndDate: null,
        createdAt: "2026-09-01T00:00:00Z",
      },
      fromDate,
      toDate,
      "UTC"
    );
  }
}
const t5 = performance.now();
const schedGenDuration = (t5 - t4) / 50;
results.push({
  operation: "Calendar Recurring Schedule Generation (Month View)",
  category: "SYNC",
  durationMs: Number(schedGenDuration.toFixed(2)),
  rating: rate(schedGenDuration, 5, 20),
  details: `Génération des occurrences de calendrier pour 5 activités calculée en ${schedGenDuration.toFixed(2)}ms.`,
});

// 4. Benchmark: Income Occurrences Generation (10 compensations for month)
const t6 = performance.now();
for (let iter = 0; iter < 50; iter++) {
  for (let c = 1; c <= 10; c++) {
    generateIncomeOccurrences(
      {
        id: `comp-${c}`,
        activityId: `act-${c}`,
        activityName: `Mission ${c}`,
        frequency: c % 2 === 0 ? "monthly" : "weekly",
        amount: 250000,
        currency: "XOF",
        paymentDay: 28,
        anchorDateISO: "2026-09-01",
        startDateISO: "2026-09-01",
        endDateISO: null,
      },
      "2026-10-01",
      "2026-10-31"
    );
  }
}
const t7 = performance.now();
const incGenDuration = (t7 - t6) / 50;
results.push({
  operation: "Income Occurrences Generation (10 contracts)",
  category: "SYNC",
  durationMs: Number(incGenDuration.toFixed(2)),
  rating: rate(incGenDuration, 5, 20),
  details: `Calcul prévisionnel des échéances de rémunération en ${incGenDuration.toFixed(2)}ms.`,
});

// Display results
console.table(
  results.map((r) => ({
    Opération: r.operation,
    Catégorie: r.category,
    "Durée (ms)": `${r.durationMs} ms`,
    Évaluation: r.rating,
  }))
);

console.log("\n=================================================================");
console.log("✅ AUDIT SYNTHESIS:");
console.log("-----------------------------------------------------------------");
results.forEach((r) => {
  console.log(`${r.rating} [${r.category}] ${r.operation}: ${r.durationMs}ms — ${r.details}`);
});
console.log("=================================================================\n");
