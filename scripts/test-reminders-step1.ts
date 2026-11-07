/**
 * Rappels — étape 1 (fiabilité) : règles pures + scénarios réels du moteur sur une base simulée.
 * Lancer : npx tsx scripts/test-reminders-step1.ts
 */
import { DateTime } from "luxon";
import {
  isInQuietHours,
  activitySlotKey,
  legacyActivitySlotKey,
  isTaskDueSoon,
  shouldDeferPush,
  isDeferredPushStillRelevant,
  pushTagFor,
  DEFAULT_FIRST_LEAD_MINUTES,
} from "../lib/notifications/reminder-rules";
import { evaluateSmartReminders } from "../lib/notifications/engine";
import { createMock, type Row } from "./helpers/mock-supabase";

let ok = 0;
let total = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? "✅" : "❌"} ${label}${cond || detail === undefined ? "" : "  → " + JSON.stringify(detail)}`);
}

// ---------------------------------------------------------------- Règles pures
const at = (h: number, m = 0) => DateTime.fromObject({ year: 2026, month: 11, day: 7, hour: h, minute: m }, { zone: "UTC" });
check("Heures silencieuses 22:00→07:00 : 23 h est silencieux", isInQuietHours(at(23), true, "22:00", "07:00"));
check("Heures silencieuses 22:00→07:00 : 6 h 59 est silencieux", isInQuietHours(at(6, 59), true, "22:00", "07:00"));
check("Heures silencieuses 22:00→07:00 : 7 h ne l'est plus", !isInQuietHours(at(7), true, "22:00", "07:00"));
check("Heures silencieuses désactivées : jamais silencieux", !isInQuietHours(at(23), false));
check("Plage dans la journée 13:00→14:00", isInQuietHours(at(13, 30), true, "13:00", "14:00") && !isInQuietHours(at(14), true, "13:00", "14:00"));

const start10 = DateTime.fromISO("2026-11-07T10:00:00", { zone: "Africa/Abidjan" });
const start15 = DateTime.fromISO("2026-11-07T15:00:00", { zone: "Africa/Abidjan" });
check("Clé de rappel liée à l'heure : 10 h ≠ 15 h le même jour", activitySlotKey("e1", "m30", start10) !== activitySlotKey("e1", "m30", start15));
check("Clé stable pour la même séance à la même heure", activitySlotKey("e1", "m30", start10) === activitySlotKey("e1", "m30", start10));
check("Ancienne clé (date seule) conservée pour la transition", legacyActivitySlotKey("e1", "m30", start10) === "activity:e1:m30_2026-11-07");

check("Délai par défaut : 30 minutes", DEFAULT_FIRST_LEAD_MINUTES === 30);
check("Tâche « 30 min avant » : rien à 60 min de l'échéance", !isTaskDueSoon(60, 30, true));
check("Tâche « 30 min avant » : rappel à 30 min", isTaskDueSoon(30, 30, true));
check("Tâche « 30 min avant » : rappel à 5 min", isTaskDueSoon(5, 30, true));
check("Tâche sans délai : comportement habituel (2 h avant)", isTaskDueSoon(110, null, true) && !isTaskDueSoon(130, null, true));
check("Tâche sans heure : le délai ne s'applique pas (2 h)", isTaskDueSoon(110, 30, false));
check("Tâche : plus de rappel « bientôt » 15 min après l'échéance", !isTaskDueSoon(-16, 30, true));

check("Heures silencieuses : rappel normal reporté", shouldDeferPush(true, "high"));
check("Heures silencieuses : rappel critique envoyé", !shouldDeferPush(true, "critical"));
check("Hors heures silencieuses : rien n'est reporté", !shouldDeferPush(false, "normal"));

const morning = DateTime.fromISO("2026-11-07T07:05:00Z");
check(
  "Report : « séance dans 10 min » passée → abandonné",
  !isDeferredPushStillRelevant({ kind: "activity_reminder_10m", created_at: "2026-11-06T23:00:00Z", metadata: { starts_at: "2026-11-06T23:10:00Z" } }, morning)
);
check(
  "Report : paiement attendu → envoyé au réveil",
  isDeferredPushStillRelevant({ kind: "payment_upcoming", created_at: "2026-11-06T23:00:00Z", metadata: {} }, morning)
);
check(
  "Report : rappel de plus de 14 h → abandonné",
  !isDeferredPushStillRelevant({ kind: "payment_upcoming", created_at: "2026-11-06T15:00:00Z", metadata: {} }, morning)
);
check("Étiquette système propre à chaque rappel", pushTagFor("push:activity:e1:m30_2026-11-07T1000", "activity") === "activity:e1:m30_2026-11-07T1000");
check("Étiquette de secours : la catégorie", pushTagFor(null, "task") === "task");

// ---------------------------------------------------------------- Base simulée (moteur complet)

async function main() {
  const USER = "usr-step1";
  const TZ = "UTC";
  const now = DateTime.now().setZone(TZ);
  const iso = (d: DateTime) => d.toUTC().toISO()!;
  // Séance qui commence dans 30 minutes (même jour, pour rester dans la fenêtre « aujourd'hui »)
  const baseStart = now.hour >= 22 ? null : now.plus({ minutes: 30 });
  if (!baseStart) {
    console.log("ℹ️  Scénarios moteur ignorés entre 22 h et minuit UTC (la séance déborderait sur le lendemain).");
  } else {
    const prefs = { user_id: USER, email_enabled: false, push_enabled: true, activity_reminders: true, task_reminders: true, payment_reminders: false, expense_reminders: false };
    const db = createMock({
      notification_preferences: [prefs],
      profiles: [{ id: USER, full_name: "Awa", timezone: TZ, locale: "fr", created_at: now.minus({ days: 30 }).toISO() }],
      activities: [{ id: "act1", user_id: USER, name: "Coaching", status: "active", voice_reminder_enabled: true, reminder_preference: "recommended" }],
      calendar_events: [
        { id: "evt1", user_id: USER, activity_id: "act1", title: "Coaching", status: "planned", starts_at: iso(baseStart), ends_at: iso(baseStart.plus({ hours: 1 })), activities: { id: "act1", name: "Coaching", status: "active", voice_reminder_enabled: true, reminder_preference: "recommended" } },
      ],
    });
    const reminders = () => db._state.notifications.filter((n: Row) => n.kind?.startsWith("activity_reminder_"));

    await evaluateSmartReminders(db, USER, TZ);
    const first = reminders();
    check("Séance dans 30 min : un rappel « 30 min avant » (délai par défaut)", first.length === 1 && first[0].kind === "activity_reminder_30m", first.map((n: Row) => n.kind));
    check("Sa clé contient l'heure de la séance", first[0]?.idempotency_key === activitySlotKey("evt1", "m30", baseStart.setZone(TZ)), first[0]?.idempotency_key);

    await evaluateSmartReminders(db, USER, TZ);
    check("Deuxième passage : aucun doublon", reminders().length === 1, reminders().length);

    // Changement d'heure le même jour : l'ancien rappel est clôturé (comme le fait l'application), la séance décalée
    first[0].status = "resolved";
    const moved = baseStart.minus({ minutes: 3 });
    Object.assign(db._state.calendar_events[0], { starts_at: iso(moved), ends_at: iso(moved.plus({ hours: 1 })) });
    await evaluateSmartReminders(db, USER, TZ);
    const afterMove = reminders().filter((n: Row) => n.status !== "resolved");
    check("Heure changée le même jour : un nouveau rappel part pour le nouvel horaire", afterMove.length === 1 && afterMove[0].idempotency_key === activitySlotKey("evt1", "m30", moved.setZone(TZ)), reminders().map((n: Row) => n.idempotency_key));

    // Transition : un rappel déjà envoyé avec l'ancienne clé (date seule) n'est pas renvoyé
    const db2 = createMock({
      notification_preferences: [prefs],
      profiles: [{ id: USER, full_name: "Awa", timezone: TZ, locale: "fr", created_at: now.minus({ days: 30 }).toISO() }],
      calendar_events: [{ ...db._state.calendar_events[0], starts_at: iso(baseStart), ends_at: iso(baseStart.plus({ hours: 1 })) }],
      notifications: [{ id: "old", user_id: USER, kind: "activity_reminder_30m", status: "unread", entity_id: "evt1", idempotency_key: legacyActivitySlotKey("evt1", "m30", baseStart.setZone(TZ)), created_at: now.minus({ minutes: 1 }).toISO(), metadata: {} }],
    });
    await evaluateSmartReminders(db2, USER, TZ);
    check("Rappel déjà parti avant la mise à jour (ancienne clé) : pas renvoyé", db2._state.notifications.filter((n: Row) => n.kind === "activity_reminder_30m").length === 1);

    // Heures silencieuses : tâche (non critique) reportée, marquée ; puis envoyée/libérée à la fin de la plage
    const quietPrefs = { ...prefs, quiet_hours_enabled: true, quiet_hours_start: now.minus({ hours: 1 }).toFormat("HH:mm"), quiet_hours_end: now.plus({ hours: 1 }).toFormat("HH:mm") };
    const dueIn20 = now.plus({ minutes: 20 });
    const db3 = createMock({
      notification_preferences: [quietPrefs],
      profiles: [{ id: USER, full_name: "Awa", timezone: TZ, locale: "fr", created_at: now.minus({ days: 30 }).toISO() }],
      tasks: [{ id: "tsk1", user_id: USER, title: "Envoyer le devis", status: "todo", priority: "medium", due_date: dueIn20.toISODate(), due_time: dueIn20.toFormat("HH:mm:ss"), reminder_minutes_before: 30 }],
    });
    if (now.plus({ hours: 1 }).hasSame(now.minus({ hours: 1 }), "day") && dueIn20.hasSame(now, "day")) {
      await evaluateSmartReminders(db3, USER, TZ);
      const t = db3._state.notifications.find((n: Row) => n.kind === "task_due_soon");
      check("Heures silencieuses : le rappel de tâche est créé mais son push est reporté", Boolean(t?.metadata?.push_deferred), t?.metadata);
      db3._state.notification_preferences[0].quiet_hours_enabled = false;
      await evaluateSmartReminders(db3, USER, TZ);
      check("Fin des heures silencieuses : le push reporté est traité une seule fois (indicateur retiré)", t && !t.metadata?.push_deferred, t?.metadata);
    } else {
      console.log("ℹ️  Scénario heures silencieuses ignoré autour de minuit.");
    }

    // Délai propre à une tâche : « 30 min avant » ne part pas à 60 min de l'échéance
    const dueIn60 = now.plus({ minutes: 60 });
    if (dueIn60.hasSame(now, "day")) {
      const db4 = createMock({
        notification_preferences: [prefs],
        profiles: [{ id: USER, full_name: "Awa", timezone: TZ, locale: "fr", created_at: now.minus({ days: 30 }).toISO() }],
        tasks: [{ id: "tsk2", user_id: USER, title: "Appeler le client", status: "todo", priority: "medium", due_date: dueIn60.toISODate(), due_time: dueIn60.toFormat("HH:mm:ss"), reminder_minutes_before: 30 }],
      });
      await evaluateSmartReminders(db4, USER, TZ);
      check("Tâche « 30 min avant » échéance dans 60 min : pas encore de rappel « bientôt »", !db4._state.notifications.some((n: Row) => n.kind === "task_due_soon"), db4._state.notifications.map((n: Row) => n.kind));
    }
  }

  console.log(`\n${ok}/${total} tests réussis`);
  if (ok !== total) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
