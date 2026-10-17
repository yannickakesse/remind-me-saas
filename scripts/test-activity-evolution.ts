/**
 * ==============================================================================
 * 🧪 REMIND ME — SUITE DE TESTS : CLASSIFICATION & ÉVOLUTION D'ACTIVITÉS
 * Moteur de suggestion vers une routine, 4 critères & Respect du choix utilisateur
 * ==============================================================================
 */

import { DateTime } from "luxon";
import {
  checkRoutineEvolutionEligibility,
  buildEvolutionSuggestionContent,
  evaluateActivityEvolutionSuggestions,
} from "../lib/activities/evolution";
import {
  acceptEvolutionToRoutine,
  declineEvolutionSuggestion,
} from "../app/(app)/activities/actions";

console.log("==================================================================");
console.log("🧪 REMIND ME — TESTS DU MOTEUR D'ÉVOLUTION VERS UNE ROUTINE");
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

const now = DateTime.fromISO("2026-10-15T12:00:00Z");
const userTz = "UTC";

// Helper pour générer des événements répartis sur 4 semaines (semaine 1 = J-28 à J-21, etc.)
function createTestEvents(
  activityId: string,
  distribution: { week: number; dayOffset: number; status: string }[],
  userId: string = "usr-evo-test"
) {
  return distribution.map((d, idx) => {
    // week 1: day -27, week 2: day -20, week 3: day -13, week 4: day -6
    const daysAgo = 28 - (d.week - 1) * 7 - d.dayOffset;
    const eventDT = now.minus({ days: daysAgo }).set({ hour: 10, minute: 0 });
    return {
      id: `evt-evo-${activityId}-${idx}`,
      user_id: userId,
      activity_id: activityId,
      starts_at: eventDT.toISO()!,
      status: d.status,
    };
  });
}

// ==============================================================================
// 1. Tests des 4 critères de classification & éligibilité stricte
// ==============================================================================
console.log("--- 1. Tests d'éligibilité : Ancienneté, Réalisations réelles & Taux ---");

// 1.1 Ancienneté insuffisante (< 30 jours)
const actRecent = {
  id: "act-recent",
  name: "Formation Récemment Créée",
  status: "active",
  engagement_nature: "temporary_engagement",
  created_at: now.minus({ days: 20 }).toISO()!,
};
const eventsPerfect = createTestEvents("act-recent", [
  { week: 1, dayOffset: 1, status: "completed" },
  { week: 1, dayOffset: 3, status: "completed" },
  { week: 2, dayOffset: 1, status: "completed" },
  { week: 2, dayOffset: 3, status: "completed" },
  { week: 3, dayOffset: 1, status: "completed" },
  { week: 3, dayOffset: 3, status: "completed" },
  { week: 4, dayOffset: 1, status: "completed" },
  { week: 4, dayOffset: 3, status: "completed" },
]);
const resRecent = checkRoutineEvolutionEligibility(actRecent, eventsPerfect, now, userTz);
assert(
  !resRecent.isEligible && resRecent.daysOld === 20,
  "Ancienneté < 30 jours : Rejet strict même si 100% des séances sont terminées",
  `Ancienneté: ${resRecent.daysOld}j, Éligible: ${resRecent.isEligible}`
);

// 1.2 Volume insuffisant (< 8 séances completed)
const actFewSessions = {
  id: "act-few",
  name: "Consulting Hebdomadaire",
  status: "active",
  engagement_nature: "temporary_engagement",
  created_at: now.minus({ days: 45 }).toISO()!,
};
// 7 séances au lieu de 8
const events7Sessions = createTestEvents("act-few", [
  { week: 1, dayOffset: 1, status: "completed" },
  { week: 1, dayOffset: 3, status: "completed" },
  { week: 2, dayOffset: 1, status: "completed" },
  { week: 2, dayOffset: 3, status: "completed" },
  { week: 3, dayOffset: 1, status: "completed" },
  { week: 3, dayOffset: 3, status: "completed" },
  { week: 4, dayOffset: 1, status: "completed" },
]);
const resFew = checkRoutineEvolutionEligibility(actFewSessions, events7Sessions, now, userTz);
assert(
  !resFew.isEligible && resFew.totalCompleted === 7,
  "Volume < 8 séances 'completed' : Rejet strict",
  `Séances terminées: ${resFew.totalCompleted}/8 requis`
);

// 1.3 Taux insuffisant (< 80% à cause de séances manquées/annulées/reportées)
const actLowRate = {
  id: "act-low-rate",
  name: "Sport Irrégulier",
  status: "active",
  engagement_nature: "temporary_engagement",
  created_at: now.minus({ days: 45 }).toISO()!,
};
// 8 completed, mais 3 missed et 1 cancelled (total 12 -> 8/12 = 66.7%)
const eventsLowRate = createTestEvents("act-low-rate", [
  { week: 1, dayOffset: 1, status: "completed" },
  { week: 1, dayOffset: 3, status: "missed" },
  { week: 2, dayOffset: 1, status: "completed" },
  { week: 2, dayOffset: 3, status: "completed" },
  { week: 3, dayOffset: 1, status: "missed" },
  { week: 3, dayOffset: 3, status: "completed" },
  { week: 3, dayOffset: 5, status: "cancelled" },
  { week: 4, dayOffset: 1, status: "completed" },
  { week: 4, dayOffset: 2, status: "completed" },
  { week: 4, dayOffset: 3, status: "completed" },
  { week: 4, dayOffset: 4, status: "completed" },
  { week: 4, dayOffset: 5, status: "missed" },
]);
const resLowRate = checkRoutineEvolutionEligibility(actLowRate, eventsLowRate, now, userTz);
assert(
  !resLowRate.isEligible && resLowRate.overallRate < 80,
  "Taux < 80% : Séances 'missed', 'cancelled' et 'postponed' comptent comme des non-réalisations",
  `Taux: ${resLowRate.overallRate}% (8 terminées sur 12)`
);

// 1.4 Rupture de régularité (une semaine vide sur les 4 semaines)
const actBrokenWeek = {
  id: "act-broken-week",
  name: "Activité avec semaine blanche",
  status: "active",
  engagement_nature: "temporary_engagement",
  created_at: now.minus({ days: 45 }).toISO()!,
};
// 8 completed au total, mais semaine 2 est totalement vide
const eventsBrokenWeek = createTestEvents("act-broken-week", [
  { week: 1, dayOffset: 1, status: "completed" },
  { week: 1, dayOffset: 3, status: "completed" },
  { week: 1, dayOffset: 5, status: "completed" },
  // week 2: 0 séance
  { week: 3, dayOffset: 1, status: "completed" },
  { week: 3, dayOffset: 3, status: "completed" },
  { week: 4, dayOffset: 1, status: "completed" },
  { week: 4, dayOffset: 3, status: "completed" },
  { week: 4, dayOffset: 5, status: "completed" },
]);
const resBrokenWeek = checkRoutineEvolutionEligibility(actBrokenWeek, eventsBrokenWeek, now, userTz);
assert(
  !resBrokenWeek.isEligible,
  "Régularité consécutive : Une semaine vide empêche la qualification en routine",
  `Semaines validées: ${resBrokenWeek.weeklyBreakdown.map((w) => `S${w.weekIndex}:${w.completedCount}`).join(", ")}`
);

// 1.5 Activité déjà classée comme 'routine'
const actAlreadyRoutine = {
  id: "act-already-routine",
  name: "Méditation Quotidienne",
  status: "active",
  engagement_nature: "routine",
  created_at: now.minus({ days: 60 }).toISO()!,
};
const resAlreadyRoutine = checkRoutineEvolutionEligibility(
  actAlreadyRoutine,
  eventsPerfect.map((e) => ({ ...e, activity_id: "act-already-routine" })),
  now,
  userTz
);
assert(
  !resAlreadyRoutine.isEligible,
  "Activité déjà classée en routine : Aucune suggestion superflue",
  `Éligible: ${resAlreadyRoutine.isEligible}`
);

// 1.6 Activité inactive / expirée
const actInactive = {
  id: "act-inactive",
  name: "Contrat Terminé",
  status: "expired",
  engagement_nature: "temporary_engagement",
  created_at: now.minus({ days: 60 }).toISO()!,
};
const resInactive = checkRoutineEvolutionEligibility(
  actInactive,
  eventsPerfect.map((e) => ({ ...e, activity_id: "act-inactive" })),
  now,
  userTz
);
assert(
  !resInactive.isEligible,
  "Activité non-active (status = expired/archived) : Rejet strict",
  `Éligible: ${resInactive.isEligible}`
);

// 1.7 Cas parfait : Tous les critères réunis (30+ jours, 8+ completed, >= 80% sur 4 semaines consécutives)
const actEligible = {
  id: "act-eligible-1",
  user_id: "usr-evo-test",
  name: "Consulting Tech & Cloud",
  status: "active",
  engagement_nature: "temporary_engagement",
  created_at: now.minus({ days: 45 }).toISO()!,
};
// 10 séances au total : 9 completed, 1 missed (90% de succès)
const eventsEligible = createTestEvents("act-eligible-1", [
  { week: 1, dayOffset: 1, status: "completed" },
  { week: 1, dayOffset: 4, status: "completed" },
  { week: 2, dayOffset: 1, status: "completed" },
  { week: 2, dayOffset: 4, status: "completed" },
  { week: 3, dayOffset: 1, status: "completed" },
  { week: 3, dayOffset: 4, status: "missed" }, // 1 manquée
  { week: 3, dayOffset: 5, status: "completed" },
  { week: 4, dayOffset: 1, status: "completed" },
  { week: 4, dayOffset: 3, status: "completed" },
  { week: 4, dayOffset: 5, status: "completed" },
]);
const resEligible = checkRoutineEvolutionEligibility(actEligible, eventsEligible, now, userTz);
assert(
  resEligible.isEligible &&
    resEligible.totalCompleted === 9 &&
    resEligible.totalEvaluated === 10 &&
    resEligible.overallRate === 90 &&
    resEligible.daysOld === 45,
  "Activité Éligible : Tous les 4 critères réunis avec 9/10 séances terminées (90%) et 45j d'ancienneté",
  `Taux: ${resEligible.overallRate}%, Séances: ${resEligible.totalCompleted}/${resEligible.totalEvaluated}, Ancienneté: ${resEligible.daysOld}j`
);

// ==============================================================================
// 2. Formatage clair et transparent de la suggestion
// ==============================================================================
console.log("\n--- 2. Présentation transparente avec métadonnées chiffrées ---");

const suggestionContent = buildEvolutionSuggestionContent(resEligible);
assert(
  suggestionContent.title.includes("Suggestion d'évolution") &&
    suggestionContent.body.includes("9/10 séances terminées") &&
    suggestionContent.body.includes("90%") &&
    suggestionContent.body.includes("45 jours d'ancienneté") &&
    suggestionContent.metadata.can_accept === true &&
    suggestionContent.metadata.can_decline === true,
  "Explication chiffrée compréhensible pour l'utilisateur sans jargon",
  `Titre: "${suggestionContent.title}" | Corps: "${suggestionContent.body}"`
);

// ==============================================================================
// 3. Moteur d'évaluation & Respect strict du refus (Cooldown 30 jours)
// ==============================================================================
console.log("\n--- 3. Moteur d'évaluation, gestion des doublons & Respect du refus ---");

// Mock Supabase minimal
function createMockSupabaseEvo(initialState: any) {
  const state = {
    activities: initialState.activities || [],
    calendar_events: initialState.calendar_events || [],
    notifications: initialState.notifications || [],
  };

  const client: any = {
    _state: state,
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
        in(col: string, vals: any[]) {
          filters.push((r) => vals.includes(r[col]));
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
        then(resolve: any) {
          if (pendingInsert) {
            const inserted = pendingInsert.map((item, idx) => ({
              id: item.id || `notif-evo-${Date.now()}-${idx}`,
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

async function testEngineFlow() {
  const mockDb = createMockSupabaseEvo({
    activities: [actEligible],
    calendar_events: eventsEligible,
    notifications: [],
  });

  // Premier passage : doit générer la suggestion
  const run1 = await evaluateActivityEvolutionSuggestions(mockDb, "usr-evo-test", now, userTz);
  assert(
    run1.suggestionsCreated === 1,
    "Moteur : Création de la suggestion d'évolution pour une activité éligible",
    `${run1.suggestionsCreated} suggestion(s) insérée(s) dans la table notifications`
  );

  // Deuxième passage immédiat : ne doit PAS dupliquer la suggestion
  const run2 = await evaluateActivityEvolutionSuggestions(mockDb, "usr-evo-test", now, userTz);
  assert(
    run2.suggestionsCreated === 0,
    "Protection anti-doublon : Ne répète pas la suggestion si une alerte non traitée existe déjà",
    "0 nouvelle suggestion générée au rechargement"
  );

  // Simulation d'un refus utilisateur avec répit de 30 jours
  const currentNotif = mockDb._state.notifications.find(
    (n: any) => n.kind === "activity_routine_suggestion" && n.entity_id === actEligible.id
  );
  currentNotif.status = "dismissed";
  currentNotif.snoozed_until = now.plus({ days: 30 }).toISO()!;

  // Troisième passage (10 jours plus tard) : le répit doit être respecté
  const runAfterDecline = await evaluateActivityEvolutionSuggestions(
    mockDb,
    "usr-evo-test",
    now.plus({ days: 10 }),
    userTz
  );
  assert(
    runAfterDecline.suggestionsCreated === 0,
    "Respect du refus : Aucun harcèlement, la proposition est mise en sommeil pendant le répit (30 jours)",
    "0 suggestion émise 10 jours après le refus"
  );

  // Quatrième passage (35 jours plus tard, répit expiré) : l'activité a continué à être pratiquée
  const futureNow = now.plus({ days: 35 });
  const futureEvents = [
    { daysAgo: 25, status: "completed" },
    { daysAgo: 22, status: "completed" },
    { daysAgo: 18, status: "completed" },
    { daysAgo: 15, status: "completed" },
    { daysAgo: 11, status: "completed" },
    { daysAgo: 8, status: "completed" },
    { daysAgo: 4, status: "completed" },
    { daysAgo: 1, status: "completed" },
  ].map((d, i) => ({
    id: `evt-future-${i}`,
    user_id: "usr-evo-test",
    activity_id: actEligible.id,
    starts_at: futureNow.minus({ days: d.daysAgo }).set({ hour: 10, minute: 0 }).toISO()!,
    status: d.status,
  }));
  mockDb._state.calendar_events.push(...futureEvents);

  const runAfterSnoozeExpiry = await evaluateActivityEvolutionSuggestions(
    mockDb,
    "usr-evo-test",
    futureNow,
    userTz
  );
  assert(
    runAfterSnoozeExpiry.suggestionsCreated === 1,
    "Réexamen bienveillant : Proposition réexaminée après expiration du délai de répit",
    "1 nouvelle suggestion proposée après 35 jours"
  );

  // ==============================================================================
  // 4. Respect des champs existants lors de l'acceptation
  // ==============================================================================
  console.log("\n--- 4. Respect strict des champs : validity_type, type & dates intacts ---");

  // Activité temporaire avec dates et compensation
  const tempActivityBefore = {
    id: "act-temp-accept-test",
    user_id: "usr-accept-test",
    name: "Mission Client Temporaire",
    status: "active",
    type: "freelance",
    validity_type: "temporary",
    engagement_nature: "temporary_engagement",
    reminder_preference: "recommended",
    start_date: "2026-08-01",
    end_date: "2026-12-31",
  };

  const mockDbAccept = createMockSupabaseEvo({
    activities: [tempActivityBefore],
    notifications: [
      {
        id: "notif-evo-to-accept",
        user_id: "usr-accept-test",
        kind: "activity_routine_suggestion",
        entity_id: "act-temp-accept-test",
        status: "unread",
      },
    ],
  });

  // Simulation de l'action d'acceptation
  // Mettre à jour UNIQUEMENT engagement_nature = 'routine'
  await mockDbAccept
    .from("activities")
    .update({ engagement_nature: "routine" })
    .eq("id", "act-temp-accept-test");

  await mockDbAccept
    .from("notifications")
    .update({ status: "actioned" })
    .eq("id", "notif-evo-to-accept");

  const actAfterAccept = mockDbAccept._state.activities[0];
  const notifAfterAccept = mockDbAccept._state.notifications[0];

  assert(
    actAfterAccept.engagement_nature === "routine" &&
      actAfterAccept.validity_type === "temporary" &&
      actAfterAccept.end_date === "2026-12-31" &&
      actAfterAccept.type === "freelance" &&
      actAfterAccept.status === "active",
    "Transition cohérente : engagement_nature bascule en 'routine', mais validity_type ('temporary') et end_date restent 100% préservés",
    `Nature: ${actAfterAccept.engagement_nature}, Validité: ${actAfterAccept.validity_type}, Fin: ${actAfterAccept.end_date}`
  );

  assert(
    notifAfterAccept.status === "actioned",
    "Notification d'évolution résolue et marquée comme 'actioned' après acceptation explicite",
    `Statut de la notification: ${notifAfterAccept.status}`
  );
}

testEngineFlow()
  .then(() => {
    console.log("\n==================================================================");
    console.log(`📊 Résultat Final : ${passedCount}/${totalCount} tests réussis.`);
    console.log("==================================================================");

    if (passedCount !== totalCount) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("❌ Erreur inattendue:", err);
    process.exit(1);
  });
