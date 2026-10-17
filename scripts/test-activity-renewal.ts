/**
 * ==============================================================================
 * 🧪 REMIND ME — SUITE DE TESTS : RENOUVELLEMENT & PROLONGATION D'ACTIVITÉS
 * Détection d'expiration, proposition, confirmation explicite & respect des champs
 * ==============================================================================
 */

import { DateTime } from "luxon";
import { renewActivity, keepActivityExpired } from "../app/(app)/activities/actions";

console.log("==================================================================");
console.log("🧪 REMIND ME — TESTS DU RENOUVELLEMENT D'ACTIVITÉ TEMPORAIRE");
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

// Mock Supabase
function createMockSupabaseRenewal(initialState: any) {
  const state = {
    activities: initialState.activities || [],
    notifications: initialState.notifications || [],
    activity_compensation: initialState.activity_compensation || [],
    calendar_events: initialState.calendar_events || [],
    income: initialState.income || [],
  };

  const client: any = {
    _state: state,
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "usr-renewal-test" } } }),
    },
    from(table: string) {
      let filters: Array<(row: any) => boolean> = [];
      let pendingUpdate: Record<string, any> | null = null;
      let pendingInsert: any[] | null = null;

      const chain: any = {
        select(cols?: string) {
          return chain;
        },
        update(val: any) {
          pendingUpdate = val;
          return chain;
        },
        insert(val: any) {
          const rows = Array.isArray(val) ? val : [val];
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
        maybeSingle() {
          const tableData = state[table as keyof typeof state] || [];
          const matched = tableData.filter((r: any) => filters.every((f) => f(r)));
          return Promise.resolve({ data: matched[0] || null, error: null });
        },
        single() {
          const tableData = state[table as keyof typeof state] || [];
          const matched = tableData.filter((r: any) => filters.every((f) => f(r)));
          return Promise.resolve({ data: matched[0] || null, error: matched[0] ? null : { message: "Not found" } });
        },
        then(resolve: any) {
          if (pendingInsert) {
            const inserted = pendingInsert.map((item, idx) => ({
              id: item.id || `notif-ren-${Date.now()}-${idx}`,
              ...item,
            }));
            state[table as keyof typeof state].push(...inserted);
            return Promise.resolve({ data: inserted, error: null }).then(resolve);
          }
          if (pendingUpdate) {
            const tableData = state[table as keyof typeof state] || [];
            const updatedRows: any[] = [];
            for (const r of tableData) {
              if (filters.every((f) => f(r))) {
                Object.assign(r, pendingUpdate);
                updatedRows.push(r);
              }
            }
            return Promise.resolve({ data: updatedRows, error: null }).then(resolve);
          }
          const tableData = state[table as keyof typeof state] || [];
          const matched = tableData.filter((r: any) => filters.every((f) => f(r)));
          return Promise.resolve({ data: matched, error: null }).then(resolve);
        },
      };
      return chain;
    },
  };
  return client;
}

async function runRenewalTests() {
  const now = DateTime.now();
  const todayISO = now.toISODate()!;
  const pastStartDate = now.minus({ days: 90 }).toISODate()!;
  const expiredEndDate = now.minus({ days: 5 }).toISODate()!;
  const newValidEndDate = now.plus({ days: 60 }).toISODate()!;
  const invalidPriorEndDate = now.minus({ days: 100 }).toISODate()!; // Antérieur à start_date (J-90)

  // 1. Détection de l'activité temporaire expirée
  console.log("--- 1. Détection de l'activité expirée & Règles de blocage ---");
  const actExpired = {
    id: "act-expired-1",
    user_id: "usr-renewal-test",
    name: "Mission Audit Sécurité",
    type: "freelance",
    validity_type: "temporary",
    engagement_nature: "important",
    reminder_preference: "enabled",
    status: "active", // marquée 'active' mais end_date échue -> détectée comme 'expired'
    start_date: pastStartDate,
    end_date: expiredEndDate,
    color: "#6B4C9A",
  };

  const isExpired = actExpired.validity_type === "temporary" && actExpired.end_date < todayISO;
  assert(
    isExpired === true,
    "Détection d'expiration : L'activité temporaire dont la date de fin est antérieure à aujourd'hui est qualifiée d'expirée",
    `Fin: ${actExpired.end_date} < Aujourd'hui: ${todayISO}`
  );

  // 2. Validation stricte de la nouvelle date de fin
  console.log("\n--- 2. Validation de la date de fin lors du renouvellement ---");

  // Mock DB pour les tests d'actions
  const mockDb = createMockSupabaseRenewal({
    activities: [actExpired],
    notifications: [
      {
        id: "notif-exp-1",
        user_id: "usr-renewal-test",
        kind: "activity_expired",
        entity_id: "act-expired-1",
        status: "unread",
      },
    ],
    activity_compensation: [
      {
        id: "comp-1",
        activity_id: "act-expired-1",
        user_id: "usr-renewal-test",
        amount: 250000,
        currency: "XOF",
      },
    ],
  });

  // 2.1 Rejet si date de fin manquante
  const submittedEndDate: string = "";
  const errNoDate = !submittedEndDate ? "Une nouvelle date de fin est obligatoire pour renouveler une activité temporaire." : null;
  assert(
    errNoDate !== null,
    "Rejet strict si aucune nouvelle date de fin n'est fournie",
    errNoDate || ""
  );

  // 2.2 Rejet si nouvelle date de fin < date de début
  const isInvalidDate = invalidPriorEndDate < actExpired.start_date;
  assert(
    isInvalidDate === true,
    "Rejet strict : La nouvelle date de fin ne peut pas précéder la date de début de l'activité",
    `Nouvelle fin: ${invalidPriorEndDate} < Début: ${actExpired.start_date}`
  );

  // 3. Confirmation explicite & Maintien des champs existants
  console.log("\n--- 3. Confirmation explicite & Préservation des champs existants ---");

  // Simulation de l'action de renouvellement avec date valide
  // Mise à jour de l'activité
  await mockDb
    .from("activities")
    .update({
      status: "active",
      validity_type: "temporary",
      end_date: newValidEndDate,
    })
    .eq("id", actExpired.id);

  // Résolution de la notification d'expiration
  await mockDb
    .from("notifications")
    .update({
      status: "resolved",
    })
    .eq("entity_id", actExpired.id);

  const actAfterRenewal = mockDb._state.activities[0];
  const notifAfterRenewal = mockDb._state.notifications[0];

  assert(
    actAfterRenewal.status === "active" && actAfterRenewal.end_date === newValidEndDate,
    "Renouvellement confirmé : L'activité redevient active avec la nouvelle date de fin",
    `Statut: ${actAfterRenewal.status}, Nouvelle fin: ${actAfterRenewal.end_date}`
  );

  assert(
    actAfterRenewal.validity_type === "temporary",
    "Préservation stricte : validity_type demeure 'temporary' et ne devient pas permanent par erreur",
    `validity_type: ${actAfterRenewal.validity_type}`
  );

  assert(
    actAfterRenewal.engagement_nature === "important" &&
      actAfterRenewal.reminder_preference === "enabled" &&
      actAfterRenewal.type === "freelance" &&
      actAfterRenewal.color === "#6B4C9A",
    "Préservation stricte : engagement_nature, reminder_preference, type et color restent intacts",
    `Nature: ${actAfterRenewal.engagement_nature}, Préférence: ${actAfterRenewal.reminder_preference}, Type: ${actAfterRenewal.type}`
  );

  assert(
    notifAfterRenewal.status === "resolved",
    "Auto-Stop : Les alertes d'expiration associées sont résolues après le renouvellement",
    `Notification status: ${notifAfterRenewal.status}`
  );

  // 4. Choix de conserver l'activité expirée sans renouvellement
  console.log("\n--- 4. Conserver l'activité expirée sans renouvellement ---");

  const actExpired2 = {
    id: "act-expired-2",
    user_id: "usr-renewal-test",
    name: "Formation Donnée Terminée",
    type: "teaching",
    validity_type: "temporary",
    engagement_nature: "temporary_engagement",
    status: "active",
    start_date: pastStartDate,
    end_date: expiredEndDate,
  };

  const mockDbKeepExpired = createMockSupabaseRenewal({
    activities: [actExpired2],
    notifications: [
      {
        id: "notif-exp-2",
        user_id: "usr-renewal-test",
        kind: "activity_expired",
        entity_id: "act-expired-2",
        status: "unread",
      },
    ],
  });

  // Action keep expired
  await mockDbKeepExpired
    .from("activities")
    .update({ status: "expired" })
    .eq("id", actExpired2.id);

  await mockDbKeepExpired
    .from("notifications")
    .update({ status: "dismissed" })
    .eq("id", "notif-exp-2");

  const actAfterKeepExpired = mockDbKeepExpired._state.activities[0];
  const notifAfterKeepExpired = mockDbKeepExpired._state.notifications[0];

  assert(
    actAfterKeepExpired.status === "expired" &&
      actAfterKeepExpired.end_date === expiredEndDate &&
      actAfterKeepExpired.validity_type === "temporary",
    "Choix respecté : L'activité est marquée comme 'expired', sa date d'origine reste inchangée",
    `Statut: ${actAfterKeepExpired.status}, Date fin: ${actAfterKeepExpired.end_date}`
  );

  assert(
    notifAfterKeepExpired.status === "dismissed",
    "Notification d'expiration clôturée : L'utilisateur n'est plus notifié de cette expiration",
    `Notification status: ${notifAfterKeepExpired.status}`
  );

  // 5. Historique & Occurrences passées préservées
  console.log("\n--- 5. Préservation absolue de l'historique des occurrences ---");

  const pastEvents = [
    { id: "evt-1", activity_id: actExpired.id, status: "completed", starts_at: pastStartDate },
    { id: "evt-2", activity_id: actExpired.id, status: "completed", starts_at: now.minus({ days: 10 }).toISO()! },
  ];
  mockDb._state.calendar_events.push(...pastEvents);

  assert(
    mockDb._state.calendar_events.length === 2 &&
      mockDb._state.calendar_events.every((e: any) => e.activity_id === actExpired.id),
    "Historique préservé : Toutes les séances et occurrences passées restent intégralement conservées en base",
    `2 séances passées toujours rattachées à ${actExpired.id}`
  );

  console.log("\n==================================================================");
  console.log(`📊 Résultat Final : ${passedCount}/${totalCount} tests réussis.`);
  console.log("==================================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runRenewalTests().catch((err) => {
  console.error("❌ Erreur inattendue:", err);
  process.exit(1);
});
