/**
 * Rappels — étape 2 (réglages) : délai propre à chaque activité, compatibilité avant migration,
 * formulaire, préférences vocales (objectifs, volume).
 * Lancer : npx tsx scripts/test-reminders-step2.ts
 */
import { DateTime } from "luxon";
import { resolveActivityLeads } from "../lib/notifications/reminder-rules";
import { evaluateSmartReminders } from "../lib/notifications/engine";
import { activityFormSchema, buildActivityPayload } from "../lib/validation/activities";
import { notifPrefsSchema } from "../lib/validation/settings";
import { createMock, type Row } from "./helpers/mock-supabase";

let ok = 0;
let total = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? "✅" : "❌"} ${label}${cond || detail === undefined ? "" : "  → " + JSON.stringify(detail)}`);
}

// ---------------------------------------------------------------- Règle des délais
const same = (a: { first: number; second: number }, b: { first: number; second: number }) => a.first === b.first && a.second === b.second;
check("Sans réglage : 30 min puis 10 min", same(resolveActivityLeads(null, null, null), { first: 30, second: 10 }));
check("Délai général 60 min : 60 puis 10", same(resolveActivityLeads(null, 60, 10), { first: 60, second: 10 }));
check("Délai de l'activité prioritaire (90 min) sur le général (30)", same(resolveActivityLeads(90, 30, 10), { first: 90, second: 10 }));
check("Activité à 15 min avec second rappel à 10 : un seul rappel, à 15 min", same(resolveActivityLeads(15, 30, 10), { first: 0, second: 15 }));
check("Activité à 30 min avec second rappel à 20 : deux rappels, 30 puis 20", same(resolveActivityLeads(30, 60, 20), { first: 30, second: 20 }));
check("Activité à 45 min, second à 10 : 45 puis 10", same(resolveActivityLeads(45, 30, 10), { first: 45, second: 10 }));

// ---------------------------------------------------------------- Formulaire et enregistrement
const baseForm = {
  info: { name: "Coaching", color: "#1F7A55", type: "coaching" },
  organization: {},
  schedule: { startDate: "2026-11-01", schedules: [] },
  compensation: { amount: 100, currency: "XOF", frequency: "per_session" },
};
const parse = (lead: unknown) => activityFormSchema.safeParse({ ...baseForm, info: { ...baseForm.info, reminderLeadMinutes: lead } });
const p45 = parse("45");
check("Formulaire : « 45 » → 45 minutes", p45.success && p45.data.info.reminderLeadMinutes === 45, p45.success ? p45.data.info : p45.error.issues);
const pEmpty = parse("");
check("Formulaire : vide → délai général (null)", pEmpty.success && pEmpty.data.info.reminderLeadMinutes === null);
check("Formulaire : 999 minutes refusé", !parse("999").success);
if (p45.success) {
  const payload = buildActivityPayload(p45.data, { userId: "u1" });
  check("Enregistrement : reminder_lead_minutes transmis", payload.reminder_lead_minutes === 45);
}

// ---------------------------------------------------------------- Préférences vocales
const prefs = notifPrefsSchema.safeParse({ voice_category_goals: false, voice_volume: 0.4 });
check("Paramètres : voix des objectifs et volume acceptés", prefs.success && prefs.data.voice_category_goals === false && prefs.data.voice_volume === 0.4);
check("Paramètres : volume hors limites refusé", !notifPrefsSchema.safeParse({ voice_volume: 3 }).success);
const defaults = notifPrefsSchema.safeParse({});
check("Paramètres par défaut : objectifs activés, volume fort", defaults.success && defaults.data.voice_category_goals === true && defaults.data.voice_volume === 1);

// ---------------------------------------------------------------- Moteur
async function main() {
  const USER = "usr-step2";
  const TZ = "UTC";
  const now = DateTime.now().setZone(TZ);
  const iso = (d: DateTime) => d.toUTC().toISO()!;
  if (now.hour >= 21) {
    console.log("ℹ️  Scénarios moteur ignorés après 21 h UTC (les séances déborderaient sur le lendemain).");
  } else {
    const basePrefs = { user_id: USER, email_enabled: false, push_enabled: true, activity_reminders: true, task_reminders: false, payment_reminders: false, expense_reminders: false };
    const profile = { id: USER, full_name: "Awa", timezone: TZ, locale: "fr", created_at: now.minus({ days: 30 }).toISO() };
    const event = (id: string, start: DateTime, lead: number | null) => ({
      id, user_id: USER, activity_id: `act-${id}`, title: "Séance", status: "planned",
      starts_at: iso(start), ends_at: iso(start.plus({ hours: 1 })),
      activities: { id: `act-${id}`, name: "Séance", status: "active", voice_reminder_enabled: true, reminder_preference: "recommended", reminder_lead_minutes: lead },
    });
    const kinds = (db: any) => db._state.notifications.filter((n: Row) => n.kind?.startsWith("activity_reminder_")).map((n: Row) => n.kind);

    // Activité réglée à 60 min : rappel à 60 min alors que le délai général est 30
    const db1 = createMock({ notification_preferences: [basePrefs], profiles: [profile], calendar_events: [event("e60", now.plus({ minutes: 60 }), 60)] });
    await evaluateSmartReminders(db1, USER, TZ);
    check("Activité à 60 min : rappel « 60 min avant »", kinds(db1).join() === "activity_reminder_60m", kinds(db1));

    // Activité sans réglage, séance dans 60 min : pas encore de rappel (délai général 30)
    const db2 = createMock({ notification_preferences: [basePrefs], profiles: [profile], calendar_events: [event("eg", now.plus({ minutes: 60 }), null)] });
    await evaluateSmartReminders(db2, USER, TZ);
    check("Activité sans réglage, séance dans 60 min : rien encore (délai général 30)", kinds(db2).length === 0, kinds(db2));

    // Activité réglée à 15 min : un seul rappel, à 15 min (pas de rappel parasite à 20 min)
    const db3 = createMock({ notification_preferences: [basePrefs], profiles: [profile], calendar_events: [event("e20", now.plus({ minutes: 20 }), 15)] });
    await evaluateSmartReminders(db3, USER, TZ);
    check("Activité à 15 min, séance dans 20 min : aucun rappel parasite", kinds(db3).length === 0, kinds(db3));
    const db4 = createMock({ notification_preferences: [basePrefs], profiles: [profile], calendar_events: [event("e15", now.plus({ minutes: 15 }), 15)] });
    await evaluateSmartReminders(db4, USER, TZ);
    check("Activité à 15 min, séance dans 15 min : le rappel « 15 min avant » part", kinds(db4).join() === "activity_reminder_15m", kinds(db4));

    // Avant la migration 0030 : la colonne n'existe pas → les rappels fonctionnent quand même (délai général)
    const db5 = createMock({ notification_preferences: [basePrefs], profiles: [profile], calendar_events: [event("eold", now.plus({ minutes: 30 }), null)] });
    const origFrom = db5.from.bind(db5);
    let refusedOnce = false;
    db5.from = (table: string) => {
      const chain = origFrom(table);
      if (table !== "calendar_events") return chain;
      let withLead = false;
      const origSelect = chain.select;
      chain.select = (cols?: string) => ((withLead = Boolean(cols?.includes("reminder_lead_minutes"))), origSelect(cols));
      const origThen = chain.then;
      chain.then = (res: any, rej: any) => {
        if (withLead) {
          refusedOnce = true;
          return Promise.resolve({ data: null, error: { code: "42703", message: "column activities_1.reminder_lead_minutes does not exist" } }).then(res, rej);
        }
        return origThen.call(chain, res, rej);
      };
      return chain;
    };
    await evaluateSmartReminders(db5, USER, TZ);
    check("Avant la migration 0030 : la requête est relancée sans la colonne et le rappel part", refusedOnce && kinds(db5).join() === "activity_reminder_30m", { refusedOnce, kinds: kinds(db5) });
  }

  console.log(`\n${ok}/${total} tests réussis`);
  if (ok !== total) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
