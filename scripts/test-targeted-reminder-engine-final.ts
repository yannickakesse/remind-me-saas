/**
 * ==============================================================================
 * 🧪 REMIND ME — TEST CIBLÉ : MOTEUR DE RAPPELS, PRÉFÉRENCES & INTÉGRITÉ
 * ==============================================================================
 */

import { DateTime } from "luxon";
import { isInQuietHours, evaluateSmartReminders } from "../lib/notifications/engine";

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
console.log("🧪 TEST CIBLÉ : MOTEUR DE RAPPELS, HEURES SILENCIEUSES & AUTO-STOP");
console.log("==================================================================\n");

// -----------------------------------------------------------------------------
// 1. HEURES SILENCIEUSES & FUSEAUX HORAIRES
// -----------------------------------------------------------------------------
console.log("1️⃣ Heures silencieuses (Quiet Hours) :");

const tz = "Europe/Paris";
const nightTime = DateTime.fromISO("2026-10-17T23:30:00", { zone: tz });
const morningTime = DateTime.fromISO("2026-10-17T10:00:00", { zone: tz });

check(
  "23h30 est dans la plage silencieuse (22h00 - 07h00)",
  isInQuietHours(nightTime, true, "22:00", "07:00") === true
);

check(
  "10h00 n'est PAS dans la plage silencieuse (22h00 - 07h00)",
  isInQuietHours(morningTime, true, "22:00", "07:00") === false
);

check(
  "Désactivation des heures silencieuses -> false même à 23h30",
  isInQuietHours(nightTime, false, "22:00", "07:00") === false
);

// -----------------------------------------------------------------------------
// 2. MOCK COMPLET DU SUPABASE CLIENT POUR EVALUATE_SMART_REMINDERS
// -----------------------------------------------------------------------------
console.log("\n2️⃣ Exécution ciblée du moteur réel evaluateSmartReminders :");

const insertedNotifications: any[] = [];
const updatedNotifications: any[] = [];

function createMockSupabase(dataset: {
  activities?: any[];
  calendarEvents?: any[];
  income?: any[];
  expenses?: any[];
  scheduledExpenses?: any[];
  tasks?: any[];
  notifications?: any[];
}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: "usr_engine_test", email: "test@remindme.com" } } }),
    },
    from: (table: string) => {
      let currentData: any[] = [];
      if (table === "notification_preferences") {
        currentData = [{ user_id: "usr_engine_test", payment_reminders: true, expense_reminders: true, activity_reminders: true, task_reminders: true, email_enabled: false, push_enabled: false }];
      } else if (table === "profiles") {
        currentData = [{ id: "usr_engine_test", full_name: "John Doe", timezone: "UTC", locale: "fr" }];
      } else if (table === "activities") {
        currentData = dataset.activities ?? [];
      } else if (table === "calendar_events") {
        currentData = dataset.calendarEvents ?? [];
      } else if (table === "income") {
        currentData = dataset.income ?? [];
      } else if (table === "expenses") {
        currentData = dataset.expenses ?? [];
      } else if (table === "scheduled_expenses") {
        currentData = dataset.scheduledExpenses ?? [];
      } else if (table === "tasks") {
        currentData = dataset.tasks ?? [];
      } else if (table === "notifications") {
        currentData = dataset.notifications ?? [];
      }

      let filtered = [...currentData];
      const chain: any = {
        select: (cols: string) => chain,
        eq: (col: string, val: any) => {
          filtered = filtered.filter((r) => r[col] === val);
          return chain;
        },
        neq: (col: string, val: any) => {
          filtered = filtered.filter((r) => r[col] !== val);
          return chain;
        },
        gte: (col: string, val: any) => {
          filtered = filtered.filter((r) => r[col] >= val);
          return chain;
        },
        lte: (col: string, val: any) => {
          filtered = filtered.filter((r) => r[col] <= val);
          return chain;
        },
        in: (col: string, vals: any[]) => {
          filtered = filtered.filter((r) => vals.includes(r[col]));
          return chain;
        },
        not: (col: string, op: string, val: any) => {
          if (op === "is" && val === null) {
            filtered = filtered.filter((r) => r[col] !== null && r[col] !== undefined);
          }
          return chain;
        },
        or: (condition: string) => chain,
        order: () => chain,
        limit: (n: number) => {
          filtered = filtered.slice(0, n);
          return chain;
        },
        maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
        single: async () => ({ data: filtered[0] ?? null, error: null }),
        update: (payload: any) => {
          updatedNotifications.push({ payload, targets: filtered });
          return {
            ...chain,
            select: () => ({ data: filtered, error: null }),
          };
        },
        insert: (rows: any[]) => {
          insertedNotifications.push(...rows);
          return {
            ...chain,
            select: () => ({ data: rows, error: null }),
          };
        },
        then: (resolve: any) => resolve({ data: filtered, error: null }),
      };
      return chain;
    },
  } as any;
}

// Scénario de test :
// - Activité 1 : reminder_preference = 'disabled' -> Aucun rappel d'événement
// - Activité 2 : start_date dans le futur (2026-11-01) -> Aucun rappel d'événement avant début officiel
// - Activité 3 : active, reminder_preference = 'enabled' -> Doit générer son rappel
// - Dépense programmée avec end_date expirée -> Aucun rappel d'échéance généré
// - Tâche terminée -> Doit être auto-résolue par Auto-Stop
// - Revenu payé -> Doit être auto-résolu par Auto-Stop
const nowIso = "2026-10-17T12:00:00Z";
const tomorrowEventStarts = "2026-10-18T10:00:00Z";
const tomorrowEventEnds = "2026-10-18T11:00:00Z";

const mockClient = createMockSupabase({
  activities: [
    {
      id: "act_disabled",
      name: "Activité Désactivée",
      status: "active",
      validity_type: "permanent",
      reminder_preference: "disabled",
      engagement_nature: "routine",
      end_date: null,
      start_date: "2026-01-01",
    },
    {
      id: "act_future_start",
      name: "Activité Future Début Nov",
      status: "active",
      validity_type: "permanent",
      reminder_preference: "enabled",
      engagement_nature: "important",
      start_date: "2026-11-01", // Futur
      end_date: null,
    },
    {
      id: "act_enabled",
      name: "Activité Normale",
      status: "active",
      validity_type: "permanent",
      reminder_preference: "enabled",
      engagement_nature: "important",
      start_date: "2026-01-01",
      end_date: null,
    },
  ],
  calendarEvents: [
    {
      id: "evt_disabled",
      title: "Séance Désactivée",
      starts_at: tomorrowEventStarts,
      ends_at: tomorrowEventEnds,
      status: "planned",
      activity_id: "act_disabled",
      activities: {
        id: "act_disabled",
        name: "Activité Désactivée",
        reminder_preference: "disabled",
        status: "active",
        validity_type: "permanent",
        start_date: "2026-01-01",
      },
    },
    {
      id: "evt_future_start",
      title: "Séance Anticipée Avant StartDate",
      starts_at: tomorrowEventStarts, // 2026-10-18 < 2026-11-01
      ends_at: tomorrowEventEnds,
      status: "planned",
      activity_id: "act_future_start",
      activities: {
        id: "act_future_start",
        name: "Activité Future Début Nov",
        reminder_preference: "enabled",
        status: "active",
        validity_type: "permanent",
        start_date: "2026-11-01",
      },
    },
    {
      id: "evt_enabled",
      title: "Séance Activée",
      starts_at: tomorrowEventStarts,
      ends_at: tomorrowEventEnds,
      status: "planned",
      activity_id: "act_enabled",
      activities: {
        id: "act_enabled",
        name: "Activité Normale",
        reminder_preference: "enabled",
        status: "active",
        validity_type: "permanent",
        start_date: "2026-01-01",
      },
    },
  ],
  scheduledExpenses: [
    {
      id: "sch_expired",
      name: "Licence Expirée",
      amount: 50000,
      currency: "XOF",
      next_due_date: "2026-10-18",
      end_date: "2026-09-30", // Fin de contrat déjà passée
      status: "planned",
      frequency: "monthly",
    },
    {
      id: "sch_active",
      name: "Loyer En Cours",
      amount: 150000,
      currency: "XOF",
      next_due_date: "2026-10-18",
      end_date: "2026-12-31", // Actif
      status: "planned",
      frequency: "monthly",
    },
  ],
  tasks: [
    {
      id: "tsk_done",
      title: "Tâche Terminée",
      due_date: "2026-10-17",
      status: "done", // Clôturée
    },
    {
      id: "tsk_pending",
      title: "Tâche À Faire Urgent",
      due_date: "2026-10-18",
      status: "todo",
      priority: "urgent",
    },
  ],
  income: [
    {
      id: "inc_received",
      label: "Virement Reçu",
      amount: 250000,
      currency: "XOF",
      due_date: "2026-10-17",
      received: true, // Encaissé
    },
  ],
  notifications: [
    {
      id: "notif_tsk_done",
      entity_id: "tsk_done",
      status: "unread",
      idempotency_key: "task:tsk_done:old",
    },
    {
      id: "notif_inc_received",
      entity_id: "inc_received",
      status: "unread",
      idempotency_key: "payment:inc_received:old",
    },
  ],
});

async function runEngineTests() {
  await evaluateSmartReminders(mockClient, "usr_engine_test", "UTC");

  // Vérification 1: reminder_preference = 'disabled' bloque le rappel d'agenda
  const notifForDisabled = insertedNotifications.find(
    (n) => n.entity_id === "evt_disabled"
  );
  check(
    "L'événement de l'activité avec reminder_preference = 'disabled' N'A PAS reçu de rappel",
    notifForDisabled === undefined
  );

  // Vérification 2: session avant start_date de l'activité est bloquée
  const notifBeforeStartDate = insertedNotifications.find(
    (n) => n.entity_id === "evt_future_start"
  );
  check(
    "L'événement prévu avant le start_date de l'activité N'A PAS reçu de rappel prématuré",
    notifBeforeStartDate === undefined
  );

  // Vérification 3: événement valide d'activité 'enabled' reçoit son rappel
  const notifForEnabled = insertedNotifications.find(
    (n) => n.entity_id === "evt_enabled"
  );
  check(
    "L'événement valide de l'activité avec reminder_preference = 'enabled' A BIEN reçu son rappel",
    notifForEnabled !== undefined
  );

  // Vérification 4: Dépense programmée dont end_date est dépassée ne reçoit pas de rappel
  const notifExpiredContract = insertedNotifications.find(
    (n) => n.entity_id === "sch_expired"
  );
  check(
    "La dépense programmée dont le contrat est expiré (next_due_date > end_date) NE reçoit AUCUN rappel",
    notifExpiredContract === undefined
  );

  // Vérification 5: Dépense programmée valide reçoit son rappel
  const notifActiveContract = insertedNotifications.find(
    (n) => n.entity_id === "sch_active"
  );
  check(
    "La dépense programmée valide en cours de contrat A BIEN reçu son rappel",
    notifActiveContract !== undefined
  );

  // Vérification 6: Tâche urgente reçoit son rappel
  const notifTask = insertedNotifications.find(
    (n) => n.entity_id === "tsk_pending"
  );
  check(
    "La tâche active en cours A BIEN reçu son rappel d'échéance",
    notifTask !== undefined
  );

  // Vérification 7: Auto-Stop a bien résolu les notifications des entités déjà complétées (tâche done & revenu received)
  const autoResolvedEntities = updatedNotifications.flatMap(
    (u) => u.targets.map((t: any) => t.id)
  );
  check(
    "Auto-Stop a résolu les notifications de la tâche terminée (tsk_done)",
    autoResolvedEntities.includes("notif_tsk_done")
  );
  check(
    "Auto-Stop a résolu les notifications du revenu encaissé (inc_received)",
    autoResolvedEntities.includes("notif_inc_received")
  );

  console.log("\n==================================================================");
  console.log(`📊 RÉSULTAT : ${passedCount}/${totalCount} tests passés avec succès (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log("==================================================================\n");

  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runEngineTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
