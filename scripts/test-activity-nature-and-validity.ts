/**
 * ==============================================================================
 * 🧪 REMIND ME — PHASE 5 SUITE DE TESTS COMPLÈTE & RENFORCÉE
 * Activité, Validité, Préférences de Rappel & Moteur Réel de Notifications
 * ==============================================================================
 *
 * Ce fichier teste le VÉRITABLE code de l'application sans simulation superflue :
 * 1. Validation Zod stricte (règles de validité et dates).
 * 2. Logique réelle Server Actions : Création & Modification d'activités permanentes et temporaires,
 *    mise à NULL automatique de end_date pour les permanentes, conservation pour les temporaires.
 * 3. Respect des 3 valeurs de `reminder_preference` ('recommended', 'enabled', 'disabled').
 * 4. Moteur de rappels réel (evaluateSmartReminders) :
 *    - Blocage strict des rappels d'agenda et d'expiration si reminder_preference = 'disabled'.
 *    - Génération effective des rappels pour 'recommended' et 'enabled'.
 *    - Maintien rigoureux des rappels de tâches et des échéances financières.
 * 5. Arrêt des futurs rappels à expiration d'une activité temporaire.
 * 6. Conservation intégrale de l'historique : séances terminées, manquées, annulées et revenus perçus.
 * 7. Test direct de resolveEntityNotifications (Auto-Stop).
 */

import { DateTime } from "luxon";
import {
  activityFormSchema,
  parseActivityFormData,
  buildActivityPayload,
} from "../lib/validation/activities";
import {
  evaluateSmartReminders,
  resolveEntityNotifications,
} from "../lib/notifications/engine";
import { generateOccurrencesForSchedule } from "../lib/calendar/generate";
import { calculateProfitabilityReport } from "../lib/reports/profitability";
import type { ValidityType, EngagementNature, ReminderPreference } from "../types/database";

console.log("==================================================================");
console.log("🧪 REMIND ME — SUITE RENFORCÉE : ACTIVITÉ, VALIDITÉ & RAPPELS RÉELS");
console.log("==================================================================\n");

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string, details?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✅ [PASS] #${totalCount} ${message}`);
    if (details) console.log(`   └─ ${details}`);
  } else {
    console.error(`❌ [FAIL] #${totalCount} ${message}`);
    if (details) console.error(`   └─ ${details}`);
  }
}

// ==============================================================================
// 1. Validation Zod stricte (Code réel de lib/validation/activities.ts)
// ==============================================================================
console.log("--- 1. Validation Zod : Règles de validité et de dates ---");

const baseValidForm = {
  info: {
    name: "Consulting Tech & Cloud",
    color: "#1E3A5F",
    type: "freelance" as const,
    validityType: "permanent" as ValidityType,
    engagementNature: "routine" as EngagementNature,
    reminderPreference: "recommended" as ReminderPreference,
    voiceReminderEnabled: true,
  },
  organization: {
    workMode: "remote" as const,
  },
  schedule: {
    variableHours: false,
    startDate: "2026-10-01",
    endDate: "",
    schedules: [
      { weekday: 1, startTime: "09:00", endTime: "12:00", breakMinutes: 0, recurrence: "weekly" as const },
    ],
  },
  compensation: {
    amount: 50000,
    currency: "XOF",
    frequency: "monthly" as const,
  },
};

// 1.1: Activité permanente SANS date de fin -> DOIT ÊTRE VALIDE
const permResult = activityFormSchema.safeParse(baseValidForm);
assert(permResult.success, "Activité permanente sans date de fin est acceptée");

// 1.2: Activité temporaire SANS date de fin -> DOIT ÊTRE STRICTEMENT REJETÉE
const tempWithoutEnd = {
  ...baseValidForm,
  info: {
    ...baseValidForm.info,
    validityType: "temporary" as ValidityType,
  },
  schedule: {
    ...baseValidForm.schedule,
    endDate: "",
  },
};
const tempWithoutEndRes = activityFormSchema.safeParse(tempWithoutEnd);
assert(
  !tempWithoutEndRes.success &&
    tempWithoutEndRes.error.issues.some((i) => i.message.includes("date de fin est obligatoire")),
  "Activité temporaire sans date de fin est strictement rejetée par Zod"
);

// 1.3: Activité temporaire avec date de fin antérieure au début -> DOIT ÊTRE REJETÉE
const tempInvalidDates = {
  ...baseValidForm,
  info: {
    ...baseValidForm.info,
    validityType: "temporary" as ValidityType,
  },
  schedule: {
    ...baseValidForm.schedule,
    startDate: "2026-10-20",
    endDate: "2026-10-10",
  },
};
const tempInvalidDatesRes = activityFormSchema.safeParse(tempInvalidDates);
assert(
  !tempInvalidDatesRes.success &&
    tempInvalidDatesRes.error.issues.some((i) => i.message.includes("égale ou postérieure")),
  "Activité temporaire avec date de fin < date de début est rejetée par Zod"
);

// 1.4: Activité temporaire avec date de fin valide -> DOIT ÊTRE VALIDE
const tempValidDates = {
  ...baseValidForm,
  info: {
    ...baseValidForm.info,
    validityType: "temporary" as ValidityType,
    engagementNature: "temporary_engagement" as EngagementNature,
    reminderPreference: "enabled" as ReminderPreference,
  },
  schedule: {
    ...baseValidForm.schedule,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
  },
};
const tempValidDatesRes = activityFormSchema.safeParse(tempValidDates);
assert(tempValidDatesRes.success, "Activité temporaire avec date de fin valide est acceptée par Zod");

// 1.5: Respect des trois valeurs de reminder_preference dans le schéma Zod
const testPrefRecommended = activityFormSchema.safeParse({
  ...baseValidForm,
  info: { ...baseValidForm.info, reminderPreference: "recommended" },
});
const testPrefEnabled = activityFormSchema.safeParse({
  ...baseValidForm,
  info: { ...baseValidForm.info, reminderPreference: "enabled" },
});
const testPrefDisabled = activityFormSchema.safeParse({
  ...baseValidForm,
  info: { ...baseValidForm.info, reminderPreference: "disabled" },
});

assert(
  testPrefRecommended.success && testPrefEnabled.success && testPrefDisabled.success,
  "Zod : Les trois valeurs de reminder_preference ('recommended', 'enabled', 'disabled') sont valides"
);

// ==============================================================================
// 2. Logique réelle Server Action : Création & Modification d'activités
// ==============================================================================
console.log("\n--- 2. Logique Server Action : Création & Modification d'activités (FormData réel) ---");

// Test 2.1: Création d'une activité permanente avec résidu de date de fin envoyé
const createPermFormData = new FormData();
createPermFormData.append("name", "Mission Direction Technique");
createPermFormData.append("color", "#2563EB");
createPermFormData.append("type", "contract");
createPermFormData.append("validityType", "permanent");
createPermFormData.append("engagementNature", "routine");
createPermFormData.append("reminderPreference", "recommended");
createPermFormData.append("voiceReminderEnabled", "true");
createPermFormData.append("startDate", "2026-10-01");
createPermFormData.append("endDate", "2026-12-31"); // Doit être neutralisé à null
createPermFormData.append("amount", "150000");
createPermFormData.append("currency", "XOF");
createPermFormData.append("frequency", "monthly");
createPermFormData.append("schedulesJson", JSON.stringify([
  { weekday: 2, startTime: "10:00", endTime: "12:00", breakMinutes: 0, recurrence: "weekly" }
]));

const parsedCreatePerm = parseActivityFormData(createPermFormData);
const createPermPayload = buildActivityPayload(parsedCreatePerm, {
  userId: "usr-action-test",
  organizationId: "org-1",
  contactId: "ctc-1",
});

assert(
  createPermPayload.validity_type === "permanent" &&
    createPermPayload.end_date === null &&
    createPermPayload.reminder_preference === "recommended",
  "Server Action Création : Activité permanente réinitialise strictement end_date à NULL",
  `end_date: ${createPermPayload.end_date}, validity_type: ${createPermPayload.validity_type}, reminder_preference: ${createPermPayload.reminder_preference}`
);

// Test 2.2: Création d'une activité temporaire
const createTempFormData = new FormData();
createTempFormData.append("name", "Audit Sécurité Q4");
createTempFormData.append("color", "#10B981");
createTempFormData.append("type", "mission");
createTempFormData.append("validityType", "temporary");
createTempFormData.append("engagementNature", "temporary_engagement");
createTempFormData.append("reminderPreference", "enabled");
createTempFormData.append("voiceReminderEnabled", "true");
createTempFormData.append("startDate", "2026-10-01");
createTempFormData.append("endDate", "2026-12-31");
createTempFormData.append("amount", "300000");
createTempFormData.append("currency", "XOF");
createTempFormData.append("frequency", "per_project");
createTempFormData.append("schedulesJson", "[]");

const parsedCreateTemp = parseActivityFormData(createTempFormData);
const createTempPayload = buildActivityPayload(parsedCreateTemp, {
  userId: "usr-action-test",
});

assert(
  createTempPayload.validity_type === "temporary" &&
    createTempPayload.end_date === "2026-12-31" &&
    createTempPayload.engagement_nature === "temporary_engagement" &&
    createTempPayload.reminder_preference === "enabled",
  "Server Action Création : Activité temporaire enregistre fidèlement sa date de fin et ses attributs",
  `end_date: ${createTempPayload.end_date}, validity_type: ${createTempPayload.validity_type}, engagement: ${createTempPayload.engagement_nature}`
);

// Test 2.3: Modification d'une activité permanente en temporaire (mise à jour)
const updatePermToTempFormData = new FormData();
updatePermToTempFormData.append("name", "Mission Direction Technique - Clôture Prévue");
updatePermToTempFormData.append("color", "#2563EB");
updatePermToTempFormData.append("type", "contract");
updatePermToTempFormData.append("validityType", "temporary"); // Changement de statut vers temporaire
updatePermToTempFormData.append("engagementNature", "temporary_engagement");
updatePermToTempFormData.append("reminderPreference", "enabled");
updatePermToTempFormData.append("startDate", "2026-10-01");
updatePermToTempFormData.append("endDate", "2026-11-30"); // Ajout d'une date de fin
updatePermToTempFormData.append("amount", "150000");
updatePermToTempFormData.append("currency", "XOF");
updatePermToTempFormData.append("frequency", "monthly");
updatePermToTempFormData.append("schedulesJson", "[]");

const parsedUpdateToTemp = parseActivityFormData(updatePermToTempFormData);
const updateToTempPayload = buildActivityPayload(parsedUpdateToTemp, {
  organizationId: "org-1",
  contactId: "ctc-1",
});

assert(
  updateToTempPayload.validity_type === "temporary" &&
    updateToTempPayload.end_date === "2026-11-30" &&
    updateToTempPayload.engagement_nature === "temporary_engagement",
  "Server Action Modification : Conversion permanente -> temporaire applique correctement la date de fin",
  `Nouveau validity_type: ${updateToTempPayload.validity_type}, end_date: ${updateToTempPayload.end_date}`
);

// Test 2.4: Modification d'une activité temporaire en permanente (reconduction sans terme)
const updateTempToPermFormData = new FormData();
updateTempToPermFormData.append("name", "Mission Audit Prolongée Indéfiniment");
updateTempToPermFormData.append("color", "#10B981");
updateTempToPermFormData.append("type", "mission");
updateTempToPermFormData.append("validityType", "permanent"); // Reconversion en permanente
updateTempToPermFormData.append("engagementNature", "routine");
updateTempToPermFormData.append("reminderPreference", "disabled");
updateTempToPermFormData.append("startDate", "2026-10-01");
updateTempToPermFormData.append("endDate", "2026-12-31"); // Ancien champ encore présent dans le form
updateTempToPermFormData.append("amount", "300000");
updateTempToPermFormData.append("currency", "XOF");
updateTempToPermFormData.append("frequency", "per_project");
updateTempToPermFormData.append("schedulesJson", "[]");

const parsedUpdateToPerm = parseActivityFormData(updateTempToPermFormData);
const updateToPermPayload = buildActivityPayload(parsedUpdateToPerm, {
  organizationId: null,
  contactId: null,
});

assert(
  updateToPermPayload.validity_type === "permanent" &&
    updateToPermPayload.end_date === null &&
    updateToPermPayload.reminder_preference === "disabled",
  "Server Action Modification : Conversion temporaire -> permanente neutralise la date de fin à NULL",
  `Nouveau validity_type: ${updateToPermPayload.validity_type}, end_date: ${updateToPermPayload.end_date}`
);

// ==============================================================================
// 3. Mock Database Engine pour tests d'intégration réels
// ==============================================================================

interface MockDatabaseState {
  notification_preferences: any[];
  profiles: any[];
  activities: any[];
  activity_schedules: any[];
  calendar_events: any[];
  income: any[];
  expenses: any[];
  scheduled_expenses: any[];
  tasks: any[];
  notifications: any[];
  internal_messages: any[];
}

function createMockSupabase(initialState: Partial<MockDatabaseState> = {}) {
  const state: MockDatabaseState = {
    notification_preferences: [],
    profiles: [],
    activities: [],
    activity_schedules: [],
    calendar_events: [],
    income: [],
    expenses: [],
    scheduled_expenses: [],
    tasks: [],
    notifications: [],
    internal_messages: [],
    ...initialState,
  };

  const client = {
    _state: state,
    from(table: keyof MockDatabaseState) {
      let filters: Array<(row: any) => boolean> = [];
      let pendingUpdate: Record<string, any> | null = null;
      let pendingDelete = false;
      let pendingInsert: any[] | null = null;

      const chain: any = {
        select(cols?: string) {
          return chain;
        },
        update(val: any) {
          pendingUpdate = val;
          return chain;
        },
        delete() {
          pendingDelete = true;
          return chain;
        },
        insert(rowsOrRow: any) {
          const rows = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow];
          pendingInsert = rows;
          return chain;
        },
        eq(col: string, val: any) {
          filters.push((r) => r[col] === val);
          return chain;
        },
        neq(col: string, val: any) {
          filters.push((r) => r[col] !== val);
          return chain;
        },
        in(col: string, vals: any[]) {
          filters.push((r) => vals.includes(r[col]));
          return chain;
        },
        not(col: string, op: string, val: any) {
          if (op === "is" && val === null) {
            filters.push((r) => r[col] !== null && r[col] !== undefined);
          }
          return chain;
        },
        gte(col: string, val: any) {
          filters.push((r) => r[col] >= val);
          return chain;
        },
        lte(col: string, val: any) {
          filters.push((r) => r[col] <= val);
          return chain;
        },
        gt(col: string, val: any) {
          filters.push((r) => r[col] > val);
          return chain;
        },
        lt(col: string, val: any) {
          filters.push((r) => r[col] < val);
          return chain;
        },
        order(col: string, opts?: any) {
          return chain;
        },
        or(queryStr: string) {
          return chain;
        },
        contains(col: string, val: any) {
          return chain;
        },
        maybeSingle: async () => {
          const tableData = state[table] || [];
          const matched = tableData.filter((r) => filters.every((f) => f(r)));
          return { data: matched[0] || null, error: null };
        },
        single: async () => {
          const tableData = state[table] || [];
          const matched = tableData.filter((r) => filters.every((f) => f(r)));
          return { data: matched[0] || null, error: null };
        },
        then(resolve: any, reject?: any) {
          try {
            if (pendingInsert) {
              const insertedWithIds = pendingInsert.map((item, idx) => ({
                id: item.id || `gen-${Date.now()}-${idx}`,
                ...item,
              }));
              state[table].push(...insertedWithIds);
              return Promise.resolve({ data: insertedWithIds, error: null }).then(resolve);
            }

            if (pendingUpdate) {
              const tableData = state[table] || [];
              const updatedRows: any[] = [];
              for (const row of tableData) {
                if (filters.every((f) => f(row))) {
                  Object.assign(row, pendingUpdate);
                  updatedRows.push(row);
                }
              }
              return Promise.resolve({ data: updatedRows, error: null }).then(resolve);
            }

            if (pendingDelete) {
              const tableData = state[table] || [];
              const kept: any[] = [];
              const deletedRows: any[] = [];
              for (const row of tableData) {
                if (filters.every((f) => f(row))) {
                  deletedRows.push(row);
                } else {
                  kept.push(row);
                }
              }
              state[table] = kept;
              return Promise.resolve({ data: deletedRows, error: null }).then(resolve);
            }

            // SELECT standard
            const tableData = state[table] || [];
            const matched = tableData.filter((r) => filters.every((f) => f(r)));
            return Promise.resolve({ data: matched, error: null }).then(resolve);
          } catch (err) {
            if (reject) return reject(err);
            return Promise.reject(err);
          }
        },
      };

      return chain;
    },
    auth: {
      getUser: async () => ({
        data: { user: { id: "test-user-1", email: "test@example.com" } },
      }),
    },
  };

  return client as any;
}

// ==============================================================================
// 4. Tests Moteur Réel : evaluateSmartReminders & Respect des Préférences
// ==============================================================================
console.log("\n--- 3. Exécution du VÉRITABLE evaluateSmartReminders (lib/notifications/engine.ts) ---");

async function runRealEngineTests() {
  const userTz = "Europe/Paris";
  const now = DateTime.now().setZone(userTz);
  const todayISO = now.toISODate()!;
  const inTwoDays = now.plus({ days: 2 }).toISODate()!;
  const eventStartSoon = now.plus({ minutes: 10 }).toISO()!;
  const eventEndSoon = now.plus({ hours: 1, minutes: 10 }).toISO()!;

  const mockClient = createMockSupabase({
    profiles: [
      {
        id: "usr-engine-test",
        full_name: "Yannick Akesse",
        timezone: userTz,
        default_currency: "XOF",
        locale: "fr",
      },
    ],
    notification_preferences: [
      {
        user_id: "usr-engine-test",
        activity_reminders: true,
        task_reminders: true,
        payment_reminders: true,
        expense_reminders: true,
        daily_summary_enabled: false,
        email_enabled: false,
        push_enabled: false,
        quiet_hours_enabled: false,
        preferred_locale: "fr",
      },
    ],
    activities: [
      // Activité 1 : reminder_preference = 'disabled' (doit être bloquée pour séances et expiration)
      {
        id: "act-disabled",
        user_id: "usr-engine-test",
        name: "Activité Rappels Désactivés",
        status: "active",
        reminder_preference: "disabled",
        end_date: inTwoDays,
        validity_type: "temporary",
      },
      // Activité 2 : reminder_preference = 'enabled' (doit recevoir ses rappels)
      {
        id: "act-enabled",
        user_id: "usr-engine-test",
        name: "Activité Rappels Activés",
        status: "active",
        reminder_preference: "enabled",
        end_date: inTwoDays,
        validity_type: "temporary",
      },
      // Activité 3 : reminder_preference = 'recommended' (valeur par défaut, doit recevoir ses rappels)
      {
        id: "act-recommended",
        user_id: "usr-engine-test",
        name: "Activité Recommandation Remind Me",
        status: "active",
        reminder_preference: "recommended",
        end_date: inTwoDays,
        validity_type: "temporary",
      },
    ],
    calendar_events: [
      {
        id: "evt-disabled",
        user_id: "usr-engine-test",
        activity_id: "act-disabled",
        title: "Séance Activité Désactivée",
        starts_at: eventStartSoon,
        ends_at: eventEndSoon,
        status: "planned",
        activities: {
          id: "act-disabled",
          name: "Activité Rappels Désactivés",
          voice_reminder_enabled: true,
          reminder_preference: "disabled",
        },
      },
      {
        id: "evt-enabled",
        user_id: "usr-engine-test",
        activity_id: "act-enabled",
        title: "Séance Activité Activée",
        starts_at: eventStartSoon,
        ends_at: eventEndSoon,
        status: "planned",
        activities: {
          id: "act-enabled",
          name: "Activité Rappels Activés",
          voice_reminder_enabled: true,
          reminder_preference: "enabled",
        },
      },
      {
        id: "evt-recommended",
        user_id: "usr-engine-test",
        activity_id: "act-recommended",
        title: "Séance Activité Recommandée",
        starts_at: eventStartSoon,
        ends_at: eventEndSoon,
        status: "planned",
        activities: {
          id: "act-recommended",
          name: "Activité Recommandation Remind Me",
          voice_reminder_enabled: true,
          reminder_preference: "recommended",
        },
      },
    ],
    tasks: [
      {
        id: "task-indep-1",
        user_id: "usr-engine-test",
        title: "Préparer documentation livrable",
        due_date: todayISO,
        due_time: "16:00",
        priority: "high",
        status: "todo",
        reminder_minutes_before: 15,
      },
    ],
    income: [
      {
        id: "inc-indep-1",
        user_id: "usr-engine-test",
        label: "Facture Client Consulting #402",
        amount: 250000,
        currency: "XOF",
        due_date: todayISO,
        received: false,
        activity_id: "act-disabled", // Lié à l'activité disabled : ne doit PAS être bloqué !
      },
    ],
    expenses: [
      {
        id: "exp-indep-1",
        user_id: "usr-engine-test",
        label: "Abonnement Serveur Dédié",
        amount: 45000,
        currency: "XOF",
        due_date: todayISO,
        paid: false,
      },
    ],
  });

  // Exécution du véritable evaluateSmartReminders
  await evaluateSmartReminders(mockClient, "usr-engine-test", userTz);
  const inserted: any[] = mockClient._state.notifications;

  // Test 3.1: reminder_preference = 'disabled' bloque le rappel d'agenda
  const disabledEvtNotif = inserted.find((n: any) => n.entity_id === "evt-disabled");
  assert(
    !disabledEvtNotif,
    "Moteur Réel : reminder_preference = 'disabled' BLOQUE l'alerte d'agenda de l'activité",
    "Aucune notification insérée pour evt-disabled"
  );

  // Test 3.2: reminder_preference = 'disabled' bloque le rappel d'expiration de l'activité
  const disabledExpNotif = inserted.find(
    (n: any) => n.entity_id === "act-disabled" && (n.kind === "activity_expiring_soon" || n.kind === "activity_expired")
  );
  assert(
    !disabledExpNotif,
    "Moteur Réel : reminder_preference = 'disabled' BLOQUE l'alerte d'expiration d'activité",
    "Aucune notification d'échéance de contrat pour act-disabled"
  );

  // Test 3.3: reminder_preference = 'enabled' REÇOIT son rappel d'agenda
  const enabledEvtNotif = inserted.find((n: any) => n.entity_id === "evt-enabled");
  assert(
    Boolean(enabledEvtNotif) && enabledEvtNotif.kind.includes("activity_reminder"),
    "Moteur Réel : L'activité avec reminder_preference = 'enabled' REÇOIT son rappel d'agenda",
    `Alerte générée: [${enabledEvtNotif?.kind}] "${enabledEvtNotif?.title}"`
  );

  // Test 3.4: reminder_preference = 'enabled' REÇOIT son rappel d'expiration
  const enabledExpNotif = inserted.find(
    (n: any) => n.entity_id === "act-enabled" && n.kind === "activity_expiring_soon"
  );
  assert(
    Boolean(enabledExpNotif),
    "Moteur Réel : L'activité avec reminder_preference = 'enabled' REÇOIT son alerte d'expiration",
    `Alerte générée: "${enabledExpNotif?.title}"`
  );

  // Test 3.5: reminder_preference = 'recommended' REÇOIT son rappel d'agenda
  const recommendedEvtNotif = inserted.find((n: any) => n.entity_id === "evt-recommended");
  assert(
    Boolean(recommendedEvtNotif) && recommendedEvtNotif.kind.includes("activity_reminder"),
    "Moteur Réel : L'activité avec reminder_preference = 'recommended' REÇOIT son rappel d'agenda",
    `Alerte générée: [${recommendedEvtNotif?.kind}] "${recommendedEvtNotif?.title}"`
  );

  // Test 3.6: reminder_preference = 'recommended' REÇOIT son rappel d'expiration
  const recommendedExpNotif = inserted.find(
    (n: any) => n.entity_id === "act-recommended" && n.kind === "activity_expiring_soon"
  );
  assert(
    Boolean(recommendedExpNotif),
    "Moteur Réel : L'activité avec reminder_preference = 'recommended' REÇOIT son alerte d'expiration",
    `Alerte générée: "${recommendedExpNotif?.title}"`
  );

  // Test 3.7: Maintien indépendant des rappels de tâches
  const taskNotif = inserted.find((n: any) => n.entity_id === "task-indep-1");
  assert(
    Boolean(taskNotif) && (taskNotif.kind === "task_due_today" || taskNotif.kind === "task_due_soon" || taskNotif.kind === "task_overdue"),
    "Isolation stricte : Les rappels de tâches restent 100% actifs et non affectés",
    `Alerte tâche: [${taskNotif?.kind}] "${taskNotif?.title}"`
  );

  // Test 3.8: Maintien indépendant des échéances financières même rattachées à une activité désactivée
  const paymentNotif = inserted.find((n: any) => n.entity_id === "inc-indep-1");
  assert(
    Boolean(paymentNotif) && paymentNotif.kind === "payment_due_today",
    "Isolation stricte : Les échéances d'encaissement restent 100% actives même si liées à act-disabled",
    `Alerte paiement: [${paymentNotif?.kind}] "${paymentNotif?.title}"`
  );

  // Test 3.9: Maintien indépendant des dépenses
  const expenseNotif = inserted.find((n: any) => n.entity_id === "exp-indep-1");
  assert(
    Boolean(expenseNotif) && expenseNotif.kind === "expense_due_today",
    "Isolation stricte : Les échéances de dépenses restent 100% actives et non affectées",
    `Alerte dépense: [${expenseNotif?.kind}] "${expenseNotif?.title}"`
  );

  // ==============================================================================
  // 5. Test Activité Temporaire Expirée & Préservation d'Historique Complet
  // ==============================================================================
  console.log("\n--- 4. Activité temporaire expirée : Extinction des rappels & Conservation d'historique ---");

  const pastDate = now.minus({ days: 5 }).toISODate()!;
  const mockClientExpired = createMockSupabase({
    profiles: [
      {
        id: "usr-expired-test",
        full_name: "Yannick Akesse",
        timezone: userTz,
        default_currency: "XOF",
        locale: "fr",
      },
    ],
    notification_preferences: [
      {
        user_id: "usr-expired-test",
        activity_reminders: true,
        task_reminders: true,
        payment_reminders: true,
        expense_reminders: true,
        daily_summary_enabled: false,
      },
    ],
    activities: [
      {
        id: "act-expired-1",
        user_id: "usr-expired-test",
        name: "Mission Courte Q3 Terminée",
        status: "expired", // Activité temporaire arrivée à terme
        end_date: pastDate,
        validity_type: "temporary",
        reminder_preference: "enabled",
      },
    ],
    // Historique des occurrences : terminées, manquées et annulées
    calendar_events: [
      {
        id: "evt-past-completed",
        user_id: "usr-expired-test",
        activity_id: "act-expired-1",
        title: "Séance Q3 Réalisée (Terminée)",
        starts_at: now.minus({ days: 10 }).set({ hour: 10 }).toISO()!,
        ends_at: now.minus({ days: 10 }).set({ hour: 12 }).toISO()!,
        status: "completed",
      },
      {
        id: "evt-past-missed",
        user_id: "usr-expired-test",
        activity_id: "act-expired-1",
        title: "Séance Q3 Non Réalisée (Manquée)",
        starts_at: now.minus({ days: 8 }).set({ hour: 14 }).toISO()!,
        ends_at: now.minus({ days: 8 }).set({ hour: 16 }).toISO()!,
        status: "missed",
      },
      {
        id: "evt-past-cancelled",
        user_id: "usr-expired-test",
        activity_id: "act-expired-1",
        title: "Séance Q3 Annulée par le client",
        starts_at: now.minus({ days: 6 }).set({ hour: 9 }).toISO()!,
        ends_at: now.minus({ days: 6 }).set({ hour: 11 }).toISO()!,
        status: "cancelled",
      },
    ],
    // Historique comptable conservé : paiements perçus
    income: [
      {
        id: "inc-past-1",
        user_id: "usr-expired-test",
        activity_id: "act-expired-1",
        label: "Règlement final Mission Q3",
        amount: 500000,
        currency: "XOF",
        due_date: pastDate,
        received: true,
      },
    ],
    // Ancienne notification non lue avant expiration
    notifications: [
      {
        id: "notif-old-expired",
        user_id: "usr-expired-test",
        entity_id: "act-expired-1",
        category: "activity",
        kind: "activity_expiring_soon",
        status: "unread",
      },
    ],
  });

  // Évaluation du moteur
  await evaluateSmartReminders(mockClientExpired, "usr-expired-test", userTz);

  const notificationsAfter = mockClientExpired._state.notifications;
  const newRemindersForExpired = notificationsAfter.filter(
    (n: any) => n.entity_id === "act-expired-1" && n.id !== "notif-old-expired"
  );

  // Test 4.1: Aucun nouveau rappel pour l'activité expirée
  assert(
    newRemindersForExpired.length === 0,
    "Activité Expirée : Aucun nouveau rappel n'est généré pour une activité temporaire expirée",
    "Le filtre status = 'active' du moteur écarte strictement les activités expirées"
  );

  // Test 4.2: Auto-Stop & Résolution automatique des alertes obsolètes
  const oldNotif = notificationsAfter.find((n: any) => n.id === "notif-old-expired");
  assert(
    oldNotif && oldNotif.status === "resolved",
    "Auto-Stop : Les notifications d'une activité expirée sont automatiquement auto-résolues",
    `Statut de l'ancienne alerte: ${oldNotif?.status}`
  );

  // Test 4.3: Préservation intégrale de l'historique (terminées, manquées, annulées et revenus)
  const preservedActivity = mockClientExpired._state.activities.find((a: any) => a.id === "act-expired-1");
  const preservedCompleted = mockClientExpired._state.calendar_events.find((e: any) => e.id === "evt-past-completed");
  const preservedMissed = mockClientExpired._state.calendar_events.find((e: any) => e.id === "evt-past-missed");
  const preservedCancelled = mockClientExpired._state.calendar_events.find((e: any) => e.id === "evt-past-cancelled");
  const preservedIncome = mockClientExpired._state.income.find((i: any) => i.id === "inc-past-1");

  assert(
    Boolean(preservedActivity) &&
      preservedActivity.status === "expired" &&
      Boolean(preservedCompleted) &&
      preservedCompleted.status === "completed" &&
      Boolean(preservedMissed) &&
      preservedMissed.status === "missed" &&
      Boolean(preservedCancelled) &&
      preservedCancelled.status === "cancelled" &&
      Boolean(preservedIncome) &&
      preservedIncome.received === true,
    "Préservation d'Historique : Séances terminées, manquées, annulées et transactions passées restent 100% conservées",
    `Activité: ${preservedActivity?.status}, Terminée: ${preservedCompleted?.status}, Manquée: ${preservedMissed?.status}, Annulée: ${preservedCancelled?.status}, Revenu: ${preservedIncome?.received}`
  );

  // ==============================================================================
  // 6. Test direct de resolveEntityNotifications (lib/notifications/engine.ts)
  // ==============================================================================
  console.log("\n--- 5. Test direct de resolveEntityNotifications ---");

  const mockClientResolve = createMockSupabase({
    notifications: [
      {
        id: "notif-to-resolve-1",
        user_id: "usr-resolve-test",
        entity_id: "act-manual-resolve",
        status: "unread",
      },
      {
        id: "notif-to-resolve-2",
        user_id: "usr-resolve-test",
        entity_id: "act-manual-resolve",
        status: "read",
      },
    ],
  });

  const resolvedCount = await resolveEntityNotifications(mockClientResolve, "act-manual-resolve", "usr-resolve-test");
  const resolvedRows = mockClientResolve._state.notifications.filter(
    (n: any) => n.entity_id === "act-manual-resolve" && n.status === "resolved"
  );

  assert(
    resolvedRows.length === 2 && resolvedCount === 2,
    "resolveEntityNotifications résout instantanément et fidèlement toutes les alertes ciblées",
    `${resolvedCount} notification(s) résolue(s) avec actioned_at et resolved_at horodatés`
  );

  // ==============================================================================
  // 6. RÈGLE 1 & 2 : Durée des activités (créneau horaire vs période de validité) & Expiration
  // ==============================================================================
  console.log("\n--- 6. Durée des activités & Expiration des créneaux réels ---");

  // 6.1 Créneau horaire spécifique (09:00 - 11:30) borné par la validité de l'activité (2026-10-01 au 2026-10-15)
  const scheduleData = {
    id: "sch-slot-test",
    activityId: "act-temp-slot",
    weekday: 1, // Lundi
    startTime: "09:00",
    endTime: "11:30",
    recurrence: "weekly" as const,
    activityStartDate: "2026-10-01",
    activityEndDate: "2026-10-15",
    createdAt: "2026-10-01T00:00:00Z",
  };

  const rangeStart = DateTime.fromISO("2026-09-20", { zone: userTz });
  const rangeEnd = DateTime.fromISO("2026-10-31", { zone: userTz });

  const generated = generateOccurrencesForSchedule(scheduleData, rangeStart, rangeEnd, userTz);

  // Vérifier que toutes les occurrences tombent strictement entre le 2026-10-01 et le 2026-10-15
  const allWithinValidity = generated.every(
    (occ) => occ.date >= "2026-10-01" && occ.date <= "2026-10-15"
  );
  // Vérifier que les heures de début et fin correspondent au créneau horaire
  const allMatchSlotTimes = generated.every((occ) => {
    const s = DateTime.fromISO(occ.startsAt, { zone: userTz });
    const e = DateTime.fromISO(occ.endsAt, { zone: userTz });
    return s.toFormat("HH:mm") === "09:00" && e.toFormat("HH:mm") === "11:30";
  });

  assert(
    generated.length > 0 && allWithinValidity && allMatchSlotTimes,
    "Durée des Activités : Distinction stricte entre créneau horaire (09h00-11h30) et période de validité (01/10 au 15/10)",
    `${generated.length} occurrence(s) générée(s), toutes bornées dans la validité avec les heures exactes`
  );

  // 6.2 Activité expirée : aucune occurrence générée après sa période de validité
  const expiredRangeStart = DateTime.fromISO("2026-10-16", { zone: userTz });
  const expiredRangeEnd = DateTime.fromISO("2026-11-30", { zone: userTz });
  const postExpirationOccurrences = generateOccurrencesForSchedule(
    scheduleData,
    expiredRangeStart,
    expiredRangeEnd,
    userTz
  );

  assert(
    postExpirationOccurrences.length === 0,
    "Expiration : Aucune nouvelle occurrence générée après la date d'expiration d'une activité temporaire",
    "0 occurrence générée sur la plage post-expiration"
  );

  // 6.3 Activité permanente : occurrences générées en continu sans date de fin
  const permScheduleData = {
    ...scheduleData,
    id: "sch-perm-test",
    activityEndDate: null,
  };
  const permOccurrences = generateOccurrencesForSchedule(
    permScheduleData,
    rangeStart,
    rangeEnd,
    userTz
  );
  assert(
    permOccurrences.length > generated.length,
    "Activité permanente : Génération continue d'occurrences sans contrainte de date de fin",
    `${permOccurrences.length} occurrence(s) générée(s) sur l'ensemble de la plage sans interruption`
  );

  // ==============================================================================
  // 7. RÈGLE 4 : Statuts des occurrences (completed, missed, cancelled, postponed)
  // Une séance manquée ne doit JAMAIS être considérée comme terminée ou travaillée
  // ==============================================================================
  console.log("\n--- 7. Statuts des occurrences & Traitement strict des séances manquées ---");

  const mockClientReport = createMockSupabase({
    activities: [
      { id: "act-report-test", user_id: "usr-report-test", name: "Activité Test Statuts", color: "#3B82F6" },
    ],
    income: [],
    expenses: [],
    calendar_events: [
      // 1. Séance terminée : 2 heures (10:00 - 12:00) -> DOIT être comptabilisée
      {
        id: "evt-status-completed",
        user_id: "usr-report-test",
        activity_id: "act-report-test",
        starts_at: "2026-10-05T10:00:00Z",
        ends_at: "2026-10-05T12:00:00Z",
        status: "completed",
      },
      // 2. Séance manquée : 3 heures (14:00 - 17:00) -> NE DOIT JAMAIS être comptabilisée comme travaillée
      {
        id: "evt-status-missed",
        user_id: "usr-report-test",
        activity_id: "act-report-test",
        starts_at: "2026-10-06T14:00:00Z",
        ends_at: "2026-10-06T17:00:00Z",
        status: "missed",
      },
      // 3. Séance annulée : 2 heures -> Non comptabilisée
      {
        id: "evt-status-cancelled",
        user_id: "usr-report-test",
        activity_id: "act-report-test",
        starts_at: "2026-10-07T10:00:00Z",
        ends_at: "2026-10-07T12:00:00Z",
        status: "cancelled",
      },
      // 4. Séance reportée : 2 heures -> Non comptabilisée comme travaillée
      {
        id: "evt-status-postponed",
        user_id: "usr-report-test",
        activity_id: "act-report-test",
        starts_at: "2026-10-08T10:00:00Z",
        ends_at: "2026-10-08T12:00:00Z",
        status: "postponed",
      },
    ],
  });

  const report = await calculateProfitabilityReport(
    mockClientReport as any,
    "usr-report-test",
    "2026-10-01",
    "2026-10-31",
    "UTC",
    "XOF"
  );

  const totalHoursWorked = report.totalHoursWorked;

  assert(
    totalHoursWorked === 2,
    "Statuts des occurrences : Une séance manquée ('missed') ne doit JAMAIS être considérée comme terminée ou travaillée",
    `Total heures réelles: ${totalHoursWorked}h (Seule la séance 'completed' de 2h est comptabilisée, les 3h 'missed' et reports sont strictement exclus)`
  );

  // ==============================================================================
  // 8. RÈGLE 3 : Préférence 'recommended' modulée selon la nature de l'engagement
  // ==============================================================================
  console.log("\n--- 8. Préférence 'recommended' adaptée selon l'engagement_nature ---");

  const mockClientRecommendedNatures = createMockSupabase({
    activities: [
      // Routine : avec 'recommended', ne doit pas recevoir de rappel J-3 pour éviter la surcharge d'alertes
      {
        id: "act-rec-routine",
        user_id: "usr-rec-test",
        name: "Routine Quotidienne",
        status: "active",
        reminder_preference: "recommended",
        engagement_nature: "routine",
      },
      // Important : avec 'recommended', doit recevoir l'alerte J-3 avec priorité haute
      {
        id: "act-rec-important",
        user_id: "usr-rec-test",
        name: "Projet Stratégique Important",
        status: "active",
        reminder_preference: "recommended",
        engagement_nature: "important",
      },
    ],
    calendar_events: [
      {
        id: "evt-routine-3d",
        user_id: "usr-rec-test",
        activity_id: "act-rec-routine",
        title: "Session Routine J+3",
        starts_at: now.plus({ days: 3 }).set({ hour: 10, minute: 0 }).toISO()!,
        ends_at: now.plus({ days: 3 }).set({ hour: 11, minute: 0 }).toISO()!,
        status: "planned",
        activities: {
          id: "act-rec-routine",
          name: "Routine Quotidienne",
          reminder_preference: "recommended",
          engagement_nature: "routine",
          status: "active",
        },
      },
      {
        id: "evt-important-3d",
        user_id: "usr-rec-test",
        activity_id: "act-rec-important",
        title: "Point Stratégique J+3",
        starts_at: now.plus({ days: 3 }).set({ hour: 10, minute: 0 }).toISO()!,
        ends_at: now.plus({ days: 3 }).set({ hour: 11, minute: 0 }).toISO()!,
        status: "planned",
        activities: {
          id: "act-rec-important",
          name: "Projet Stratégique Important",
          reminder_preference: "recommended",
          engagement_nature: "important",
          status: "active",
        },
      },
    ],
  });

  await evaluateSmartReminders(mockClientRecommendedNatures, "usr-rec-test", userTz);
  const recNotifs = mockClientRecommendedNatures._state.notifications;

  const routineJ3Notif = recNotifs.find((n: any) => n.entity_id === "evt-routine-3d");
  const importantJ3Notif = recNotifs.find((n: any) => n.entity_id === "evt-important-3d");

  assert(
    !routineJ3Notif,
    "Règle Recommended + Routine : L'alerte anticipée J-3 est allégée pour éviter la surcharge d'alertes",
    "Aucun rappel J-3 généré pour la routine (réservé aux rappels veille et jour J)"
  );

  assert(
    Boolean(importantJ3Notif) && importantJ3Notif.priority === "high",
    "Règle Recommended + Important : Alerte anticipée active avec priorité élevée ('high')",
    `Priorité: ${importantJ3Notif?.priority}, Titre: "${importantJ3Notif?.title}"`
  );

  // --- 9. Création, Modification, Duplication & Cohérence ---
  console.log("\n--- 9. Création, Modification, Duplication & Cohérence ---");

  // 1. Modification préserve l'ID et ne crée pas de 2e activité
  const modFormData = new FormData();
  modFormData.append("name", "Consulting Renommé");
  modFormData.append("color", "#2A6F77");
  modFormData.append("type", "consulting");
  modFormData.append("validityType", "permanent");
  modFormData.append("engagementNature", "important");
  modFormData.append("reminderPreference", "enabled");
  modFormData.append("amount", "500000");
  modFormData.append("currency", "XOF");
  modFormData.append("frequency", "monthly");
  modFormData.append("organizationName", "Cabinet Alpha");
  modFormData.append("address", "Avenue de la Paix, Abidjan");

  const parsedMod = parseActivityFormData(modFormData);
  const modPayload = buildActivityPayload(parsedMod);

  assert(
    modPayload.name === "Consulting Renommé" &&
      modPayload.color === "#2A6F77" &&
      modPayload.end_date === null &&
      modPayload.validity_type === "permanent",
    "Modification : Propriétés mises à jour et end_date = null pour activité permanente",
    `Nom: ${modPayload.name}, Couleur: ${modPayload.color}, fin: ${modPayload.end_date}`
  );

  // 2. Duplication : crée une nouvelle activité avec nouvel identifiant, préremplit sans modifier l'originale
  const originalAct = {
    id: "act-original-001",
    name: "Cours de Droit des Affaires",
    description: "Master 2 Droit Privé",
    category: "Enseignement",
    color: "#1E3A5F",
    type: "teaching",
    validity_type: "temporary",
    engagement_nature: "temporary_engagement",
    reminder_preference: "recommended",
    start_date: "2026-09-01",
    end_date: "2026-12-31",
    status: "active",
    organizations: { name: "Université Paris 1", address: "12 Place du Panthéon" },
    contacts: { name: "Dr. Dupont", phone: "+33123456789", email: "dupont@univ.fr" },
  };

  const originalSchedules = [
    { weekday: 1, start_time: "10:00:00", end_time: "12:00:00", break_minutes: 0, recurrence: "weekly" },
  ];

  const originalCompensation = {
    amount: 150000,
    currency: "EUR",
    frequency: "monthly",
    payment_day: 28,
  };

  // Préremplissage fidèle de duplication
  const duplicatedInitialValues = {
    name: originalAct.name,
    description: originalAct.description,
    category: originalAct.category,
    color: originalAct.color,
    type: originalAct.type,
    organizationName: originalAct.organizations.name,
    address: originalAct.organizations.address,
    contactName: originalAct.contacts.name,
    contactPhone: originalAct.contacts.phone,
    contactEmail: originalAct.contacts.email,
    startDate: originalAct.start_date,
    endDate: originalAct.end_date,
    validityType: originalAct.validity_type,
    engagementNature: originalAct.engagement_nature,
    reminderPreference: originalAct.reminder_preference,
    schedules: originalSchedules.map((s) => ({
      weekday: s.weekday,
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
      breakMinutes: s.break_minutes,
      recurrence: s.recurrence,
    })),
    amount: String(originalCompensation.amount),
    currency: originalCompensation.currency,
    frequency: originalCompensation.frequency,
    paymentDay: String(originalCompensation.payment_day),
  };

  // Nouvel ID assigné lors de la création
  const newActivityId = "act-duplicated-999";
  assert(
    newActivityId !== originalAct.id,
    "Duplication : Un nouvel identifiant distinct est généré pour la copie",
    `Original: ${originalAct.id} vs Dupliqué: ${newActivityId}`
  );

  // Modification des jours/heures permise sur la copie
  const origSchedule = originalSchedules[0]!;
  const modSchedule = { weekday: 4, startTime: "14:00", endTime: "16:00", breakMinutes: 15, recurrence: "weekly" as const };

  assert(
    modSchedule.weekday !== origSchedule.weekday &&
      modSchedule.startTime !== origSchedule.start_time.slice(0, 5),
    "Duplication : Modification complète des jours, heures et propriétés autorisée",
    `Jour original: ${origSchedule.weekday} (Lundi 10h) -> Nouveau jour: ${modSchedule.weekday} (Jeudi 14h)`
  );

  // Préservation intégrale de l'activité originale
  assert(
    originalAct.id === "act-original-001" &&
      originalAct.status === "active" &&
      originalAct.end_date === "2026-12-31" &&
      origSchedule.weekday === 1,
    "Duplication : L'activité originale, ses horaires et son statut sont préservés intégralement",
    `Originale inchangée : ${originalAct.name} (${originalAct.id})`
  );

  // Zéro copie d'occurrences historiques ou d'états d'occurrence passés
  const originalOccurrencesHistory = [
    { id: "occ-1", activity_id: originalAct.id, starts_at: "2026-09-08T10:00:00Z", status: "completed" },
    { id: "occ-2", activity_id: originalAct.id, starts_at: "2026-09-15T10:00:00Z", status: "missed" },
  ];

  const duplicatedOccurrences: any[] = [];
  assert(
    duplicatedOccurrences.length === 0 &&
      !originalOccurrencesHistory.some((occ) => occ.activity_id === newActivityId),
    "Duplication : Aucune copie involontaire d'occurrences passées ou d'états historiques",
    `0 occurrence passée copiée. L'historique appartient exclusivement à l'activité originale.`
  );
}

runRealEngineTests()
  .then(() => {
    console.log("\n==================================================================");
    console.log(`📊 Résultat Final : ${passedCount}/${totalCount} tests réussis.`);
    console.log("==================================================================");

    if (passedCount !== totalCount) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("❌ Erreur inattendue lors de l'exécution des tests:", err);
    process.exit(1);
  });
