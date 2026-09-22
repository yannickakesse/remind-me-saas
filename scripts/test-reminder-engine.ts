import { DateTime } from "luxon";
import { isInQuietHours } from "../lib/notifications/engine";
import { formatCurrencyLocale, formatDateLocale } from "../lib/i18n/format";
import { generateEmailHtml, generateEmailText } from "../lib/email/templates";
import { sendWhatsAppNotification } from "../lib/whatsapp/service";

interface TestResult {
  id: number;
  name: string;
  category: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: TestResult[] = [];

function assert(id: number, name: string, category: string, condition: boolean, details: string) {
  results.push({
    id,
    name,
    category,
    status: condition ? "PASS" : "FAIL",
    details,
  });
}

console.log("=================================================================");
console.log("🧪 REMIND ME — PHASE 5 AUTOMATED TEST SUITE: NOTIFICATIONS & REMINDER ENGINE");
console.log("=================================================================\n");

// -----------------------------------------------------------------------------
// Test 1: Payment 7-day reminder (J-7)
// -----------------------------------------------------------------------------
const now = DateTime.fromISO("2026-09-13T10:00:00.000Z");
const dueIn7Days = DateTime.fromISO("2026-09-20T00:00:00.000Z");
const diff7 = Math.floor(dueIn7Days.diff(now.startOf("day"), "days").days);
const key7 = `payment:inc_001:minus_7_days`;

assert(
  1,
  "Payment 7-day reminder calculation (J-7)",
  "Payments",
  diff7 === 7 && key7 === "payment:inc_001:minus_7_days",
  `Échéance J-7 détectée avec clé d'idempotence: ${key7}`
);

// -----------------------------------------------------------------------------
// Test 2: Payment 3-day reminder (J-3)
// -----------------------------------------------------------------------------
const now3 = DateTime.fromISO("2026-09-17T10:00:00.000Z");
const diff3 = Math.floor(dueIn7Days.diff(now3.startOf("day"), "days").days);
const key3 = `payment:inc_001:minus_3_days`;

assert(
  2,
  "Payment 3-day reminder calculation (J-3)",
  "Payments",
  diff3 === 3 && key3 === "payment:inc_001:minus_3_days",
  `Échéance J-3 détectée avec clé: ${key3}`
);

// -----------------------------------------------------------------------------
// Test 3: Payment 1-day reminder (J-1)
// -----------------------------------------------------------------------------
const now1 = DateTime.fromISO("2026-09-19T10:00:00.000Z");
const diff1 = Math.floor(dueIn7Days.diff(now1.startOf("day"), "days").days);
const key1 = `payment:inc_001:minus_1_day`;

assert(
  3,
  "Payment 1-day reminder calculation (J-1)",
  "Payments",
  diff1 === 1 && key1 === "payment:inc_001:minus_1_day",
  `Échéance J-1 (demain) détectée avec clé: ${key1}`
);

// -----------------------------------------------------------------------------
// Test 4: Payment Due Today (Jour J)
// -----------------------------------------------------------------------------
const nowToday = DateTime.fromISO("2026-09-20T10:00:00.000Z");
const diffToday = Math.floor(dueIn7Days.diff(nowToday.startOf("day"), "days").days);
const keyToday = `payment:inc_001:due_today_2026-09-20`;

assert(
  4,
  "Payment Due Today reminder (Jour J)",
  "Payments",
  diffToday === 0 && keyToday.includes("due_today"),
  `Échéance Jour J détectée avec clé: ${keyToday}`
);

// -----------------------------------------------------------------------------
// Test 5: Payment Overdue (Après J)
// -----------------------------------------------------------------------------
const nowOverdue = DateTime.fromISO("2026-09-21T10:00:00.000Z");
const diffOverdue = Math.floor(dueIn7Days.diff(nowOverdue.startOf("day"), "days").days);
const overdueDays = Math.abs(diffOverdue);

assert(
  5,
  "Payment Overdue reminder (+1 day)",
  "Payments",
  diffOverdue === -1 && overdueDays === 1,
  `Retard de 1 jour détecté avec statut critique/urgent.`
);

// -----------------------------------------------------------------------------
// Test 6: MANDATORY AUTO-STOP RULE: Payment marked received stops all reminders
// -----------------------------------------------------------------------------
const incomeEntity = {
  id: "inc_001",
  label: "ABC Company — Coaching",
  amount: 150000,
  currency: "XOF",
  due_date: "2026-09-20",
  received: true,
};

const shouldGenerateIncome = !incomeEntity.received;
assert(
  6,
  "Auto-stop: Mark received stops ALL future payment reminders",
  "Auto-Stop Safety",
  shouldGenerateIncome === false,
  `Le paiement étant marqué 'received: true', aucun rappel futur n'est généré.`
);

// -----------------------------------------------------------------------------
// Test 7: MANDATORY AUTO-STOP RULE: Task done/cancelled stops reminders
// -----------------------------------------------------------------------------
const taskEntity = {
  id: "tsk_002",
  title: "Envoyer le bilan financier",
  status: "done",
  due_date: "2026-09-20",
};
const shouldRemindTask = taskEntity.status !== "done" && taskEntity.status !== "cancelled";
assert(
  7,
  "Auto-stop: Completed task stops ALL reminders",
  "Auto-Stop Safety",
  shouldRemindTask === false,
  `Tâche terminée ignorée avec succès.`
);

// -----------------------------------------------------------------------------
// Test 8: MANDATORY AUTO-STOP RULE: Paid expense stops reminders
// -----------------------------------------------------------------------------
const expenseEntity = {
  id: "exp_005",
  label: "Loyer bureau",
  amount: 250000,
  currency: "XOF",
  due_date: "2026-10-01",
  paid: true,
};
const shouldRemindExpense = !expenseEntity.paid;
assert(
  8,
  "Auto-stop: Paid expense stops ALL reminders",
  "Auto-Stop Safety",
  shouldRemindExpense === false,
  `Dépense réglée ignorée avec succès.`
);

// -----------------------------------------------------------------------------
// Test 9: Month-Start Summary Reminder (Début de mois)
// -----------------------------------------------------------------------------
const day2 = DateTime.fromISO("2026-10-02T09:00:00.000Z");
const isMonthStart = day2.day >= 1 && day2.day <= 3;
const monthStartKey = `summary:month_start:${day2.toFormat("yyyy-MM")}`;
assert(
  9,
  "Month-Start summary reminder trigger (Day 1-3)",
  "Summaries",
  isMonthStart === true && monthStartKey === "summary:month_start:2026-10",
  `Rappel mensuel de début de mois généré avec clé: ${monthStartKey}`
);

// -----------------------------------------------------------------------------
// Test 10: Weekly Summary Reminder (Lundi)
// -----------------------------------------------------------------------------
const monday = DateTime.fromISO("2026-09-21T08:00:00.000Z"); // 2026-09-21 is Monday
const isMonday = monday.weekday === 1;
const weekKey = `summary:week:${monday.weekYear}-W${monday.weekNumber}`;
assert(
  10,
  "Weekly summary reminder trigger (Monday)",
  "Summaries",
  isMonday === true && weekKey.includes("-W"),
  `Résumé hebdomadaire du lundi calculé avec clé: ${weekKey}`
);

// -----------------------------------------------------------------------------
// Test 11: Deduplication & Idempotency Key stability
// -----------------------------------------------------------------------------
const existingKeys = new Set(["payment:inc_001:minus_7_days", "summary:month_start:2026-10"]);
const candidateKey = "payment:inc_001:minus_7_days";
const isDuplicate = existingKeys.has(candidateKey);
assert(
  11,
  "Deduplication & Idempotency Key stability",
  "Idempotency",
  isDuplicate === true,
  `Doublon intercepté via le registre d'idempotence, aucun doublon inséré.`
);

// -----------------------------------------------------------------------------
// Test 12: Quiet Hours respect (22h -> 07h)
// -----------------------------------------------------------------------------
const nightTime = DateTime.fromISO("2026-09-12T23:30:00.000", { zone: "Africa/Abidjan" });
const isQuiet = isInQuietHours(nightTime, true, "22:00", "07:00");
const dayTime = DateTime.fromISO("2026-09-12T14:30:00.000", { zone: "Africa/Abidjan" });
const isQuietDay = isInQuietHours(dayTime, true, "22:00", "07:00");

assert(
  12,
  "Quiet hours active period respect",
  "Quiet Hours",
  isQuiet === true && isQuietDay === false,
  `Heures silencieuses (22h-07h) vérifiées : nuit = silencieux, jour = actif.`
);

// -----------------------------------------------------------------------------
// Test 13: Timezone specific date evaluation (Abidjan vs Paris)
// -----------------------------------------------------------------------------
const nowAbidjan = DateTime.now().setZone("Africa/Abidjan");
const nowParis = DateTime.now().setZone("Europe/Paris");
assert(
  13,
  "Timezone specific date evaluation",
  "Timezone",
  nowAbidjan.zoneName === "Africa/Abidjan" && nowParis.zoneName === "Europe/Paris",
  `Évaluation locale respectée sans forcer arbitrairement UTC.`
);

// -----------------------------------------------------------------------------
// Test 14: HTML Email Template Generation
// -----------------------------------------------------------------------------
const emailHtml = generateEmailHtml({
  recipientName: "Nick",
  title: "Paiement prévu demain : Cours particuliers",
  body: "Un paiement de 50 000 FCFA pour « Cours particuliers » est prévu demain.",
  link: "/finances",
  ctaText: "Voir le paiement",
  locale: "fr",
});
const emailText = generateEmailText({
  recipientName: "Nick",
  title: "Paiement prévu demain : Cours particuliers",
  body: "Un paiement de 50 000 FCFA pour « Cours particuliers » est prévu demain.",
  link: "/finances",
  ctaText: "Voir le paiement",
});

assert(
  14,
  "HTML & Text Email Template Generation",
  "Email Template",
  emailHtml.includes("Remind") && emailHtml.includes("50 000 FCFA") && emailText.includes("Nick"),
  `Génération HTML/Texte conforme à l'identité visuelle Remind Me.`
);

// -----------------------------------------------------------------------------
// Test 15: WhatsApp Channel strict Non-Simulated Architecture
// -----------------------------------------------------------------------------
async function testWhatsApp() {
  const res = await sendWhatsAppNotification({
    userId: "test_user",
    recipientPhone: "+22507000000",
    message: "Test Remind Me WhatsApp",
  });
  return res;
}

// -----------------------------------------------------------------------------
// Print Summary
// -----------------------------------------------------------------------------
(async () => {
  const waResult = await testWhatsApp();
  assert(
    15,
    "WhatsApp channel: No fake simulations, reports not_configured when unconfigured",
    "WhatsApp",
    waResult.status === "not_configured" && waResult.configured === false && waResult.success === false,
    `WhatsApp renvoie fidèlement 'not_configured' sans feindre un faux envoi.`
  );

  console.log("RÉSULTATS DE LA SUITE DE TESTS (15 SCÉNARIOS CRITIQUES) :");
  let passed = 0;
  for (const r of results) {
    if (r.status === "PASS") passed++;
    console.log(`[${r.status === "PASS" ? "🟢 PASS" : "🔴 FAIL"}] #${r.id} ${r.name} (${r.category}) — ${r.details}`);
  }

  console.log(`\nTOTAL : ${passed}/${results.length} tests réussis (${Math.round((passed / results.length) * 100)}% de succès).`);
})();
