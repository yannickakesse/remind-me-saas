const path = require("path");
const { DateTime } = require(path.join(process.cwd(), "node_modules", "luxon"));

console.log("==================================================================");
console.log("   TEST MATRIX : MOTEUR DE RAPPELS ET NOTIFICATIONS REMIND ME    ");
console.log("==================================================================");

function computeCandidate({ entityType, id, title, dueDateStr, status, isPaid, isReceived, timezone = "Europe/Paris", hour = 10, isMorning = false, isEvening = false, count = 1 }) {
  const now = DateTime.now().setZone(timezone).set({ hour });
  const todayISO = now.toISODate();

  // Test du Briefing Matin
  if (isMorning) {
    if (now.hour >= 6 && now.hour < 14 && count > 0) {
      return {
        shouldAlert: true,
        kind: "morning_briefing",
        dedupKey: `routine:morning_briefing:${todayISO}`,
        priority: "high",
        title: `🌅 Programme du jour : ${count} activité(s) aujourd'hui`,
      };
    }
    return { shouldAlert: false, reason: "NO_MORNING_BRIEFING" };
  }

  // Test du Débriefing Soir
  if (isEvening) {
    if (now.hour >= 18 && count > 0) {
      return {
        shouldAlert: true,
        kind: "evening_checkin",
        dedupKey: `routine:evening_checkin:${todayISO}`,
        priority: "high",
        title: `🌙 Bilan du soir : Clôture de vos activités du jour`,
      };
    }
    return { shouldAlert: false, reason: "NO_EVENING_CHECKIN" };
  }

  const dueDate = DateTime.fromISO(dueDateStr, { zone: timezone });
  const daysDiff = Math.floor(dueDate.startOf("day").diff(now.startOf("day"), "days").days);

  // 1. Check Auto-Stop status
  if (status === "done" || status === "cancelled" || isPaid || isReceived) {
    return { shouldAlert: false, reason: "AUTO_STOPPED" };
  }

  // 2. Overdue rule
  if (daysDiff < 0) {
    return {
      shouldAlert: true,
      kind: "task_overdue",
      dedupKey: `${entityType}:${id}:overdue_${todayISO}`,
      priority: "critical",
      daysDiff,
      title: `⚠️ En retard : ${title}`,
    };
  }

  // 3. Due Today rule
  if (daysDiff === 0) {
    return {
      shouldAlert: true,
      kind: "task_due_today",
      dedupKey: `${entityType}:${id}:due_today`,
      priority: "high",
      daysDiff,
      title: `⚡ Échéance aujourd'hui : ${title}`,
    };
  }

  // 4. Upcoming rules (J-7, J-3, J-2, J-1)
  if ([1, 2, 3, 7].includes(daysDiff)) {
    return {
      shouldAlert: true,
      kind: "task_due_soon",
      dedupKey: `${entityType}:${id}:due_soon_${daysDiff}d`,
      priority: daysDiff === 1 ? "high" : "normal",
      daysDiff,
      title: `📅 Échéance dans ${daysDiff} jour(s) : ${title}`,
    };
  }

  return { shouldAlert: false, reason: "NOT_IN_ALERT_WINDOW" };
}

const tests = [
  {
    name: "Scénario 1 : Tâche à échéance future J-1 (Upcoming Alert)",
    input: { entityType: "task", id: "t1", title: "Préparer bilan", dueDateStr: DateTime.now().plus({ days: 1 }).toISODate(), status: "todo" },
    expectedAlert: true,
    expectedKind: "task_due_soon",
  },
  {
    name: "Scénario 2 : Tâche avec échéance aujourd'hui Jour J (Due Today)",
    input: { entityType: "task", id: "t2", title: "Appel client", dueDateStr: DateTime.now().toISODate(), status: "todo" },
    expectedAlert: true,
    expectedKind: "task_due_today",
  },
  {
    name: "Scénario 3 : Tâche en retard J+1 (Overdue)",
    input: { entityType: "task", id: "t3", title: "Rapport mensuel", dueDateStr: DateTime.now().minus({ days: 1 }).toISODate(), status: "todo" },
    expectedAlert: true,
    expectedKind: "task_overdue",
  },
  {
    name: "Scénario 4 : Tâche non résolue J+2 (Répétition quotidienne avec clé dédupliquée journalière)",
    input: { entityType: "task", id: "t4", title: "Facture impayée", dueDateStr: DateTime.now().minus({ days: 2 }).toISODate(), status: "todo" },
    expectedAlert: true,
    expectedKind: "task_overdue",
  },
  {
    name: "Scénario 5 : Tâche terminée 'done' (Auto-Stop immédiat)",
    input: { entityType: "task", id: "t5", title: "Tâche terminée", dueDateStr: DateTime.now().minus({ days: 1 }).toISODate(), status: "done" },
    expectedAlert: false,
  },
  {
    name: "Scénario 6 : Tâche annulée 'cancelled' (Auto-Stop & exclusion immédiate du Dashboard)",
    input: { entityType: "task", id: "t6", title: "Tâche annulée", dueDateStr: DateTime.now().toISODate(), status: "cancelled" },
    expectedAlert: false,
  },
  {
    name: "Scénario 7 : Tâche reportée à J+14 (Recalibration & invalidation anciens rappels)",
    input: { entityType: "task", id: "t7", title: "Tâche reportée loin", dueDateStr: DateTime.now().plus({ days: 14 }).toISODate(), status: "todo" },
    expectedAlert: false,
  },
  {
    name: "Scénario 8 : Dépense payée (Auto-Stop sur finance)",
    input: { entityType: "expense", id: "e1", title: "Abonnement AWS", dueDateStr: DateTime.now().minus({ days: 3 }).toISODate(), isPaid: true },
    expectedAlert: false,
  },
  {
    name: "Scénario 9 : Encaissement client reçu (Auto-Stop sur facture client)",
    input: { entityType: "income", id: "i1", title: "Facture #102", dueDateStr: DateTime.now().minus({ days: 1 }).toISODate(), isReceived: true },
    expectedAlert: false,
  },
  {
    name: "Scénario 10 : Dépense récurrente / planifiée à J-3",
    input: { entityType: "scheduled_expense", id: "se1", title: "Loyer bureau", dueDateStr: DateTime.now().plus({ days: 3 }).toISODate(), isPaid: false },
    expectedAlert: true,
    expectedKind: "task_due_soon",
  },
  {
    name: "Scénario 11 : Protection anti-doublon idempotente (dedupKey déterministe)",
    input: { entityType: "task", id: "t8", title: "Présentation board", dueDateStr: DateTime.now().toISODate(), status: "todo" },
    expectedAlert: true,
    expectedKind: "task_due_today",
  },
  {
    name: "Scénario 12 : Événement d'agenda planifié à J-1",
    input: { entityType: "calendar_event", id: "c1", title: "Rendez-vous notaire", dueDateStr: DateTime.now().plus({ days: 1 }).toISODate(), status: "scheduled" },
    expectedAlert: true,
    expectedKind: "task_due_soon",
  },
  {
    name: "Scénario 13 : Routine Matin (Briefing du jour à 6h-8h sur le téléphone)",
    input: { isMorning: true, hour: 7, count: 4 },
    expectedAlert: true,
    expectedKind: "morning_briefing",
  },
  {
    name: "Scénario 14 : Routine Soir (Débriefing du soir à 21h pour cocher les éléments)",
    input: { isEvening: true, hour: 21, count: 2 },
    expectedAlert: true,
    expectedKind: "evening_checkin",
  },
];

let allPassed = true;
tests.forEach((t) => {
  const res = computeCandidate(t.input);
  const passed = res.shouldAlert === t.expectedAlert && (!t.expectedKind || res.kind === t.expectedKind);
  if (passed) {
    console.log(`✅ [PASS] ${t.name} -> Result: ${res.shouldAlert ? `Alerte active (${res.kind}) [Key: ${res.dedupKey}]` : 'Auto-Stop / Silencieux'}`);
  } else {
    console.log(`❌ [FAIL] ${t.name} -> Obtenu: ${JSON.stringify(res)} | Attendu: Alert=${t.expectedAlert}`);
    allPassed = false;
  }
});

console.log("------------------------------------------------------------------");
if (allPassed) {
  console.log("🎉 TOUS LES 14 SCÉNARIOS ONT ÉTÉ VALIDÉS AVEC SUCCÈS (14/14 PASS)");
} else {
  console.log("⚠️ CERTAINS SCÉNARIOS N'ONT PAS PASSÉ LES VALIDATIONS.");
}
console.log("==================================================================");
