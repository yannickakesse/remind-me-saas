import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import type { Database } from "@/types/database";
import { isNotificationEnabled } from "@/lib/validation/settings";

/**
 * Génère paresseusement les notifications dues au moment de la
 * consultation (rappels de tâches, tâches en retard, échéances
 * financières en retard) — même principe que ensureCalendarEvents et
 * ensureIncomeEntries : on ne stocke jamais un état qui deviendrait faux
 * tout seul avec le temps qui passe, on matérialise ce qui est dû
 * maintenant. L'index unique (user_id, kind, entity_id) en base garantit
 * qu'une même tâche/un même revenu ne génère jamais deux fois la même
 * notification, même appelée à chaque navigation.
 *
 * Ne gère pas la réapparition d'une notification déjà lue/supprimée si sa
 * cause (ex. échéance repoussée puis re-dépassée) se reproduit : l'index
 * unique bloquerait la régénération. Comportement volontairement simple
 * pour le MVP (notifications in-app uniquement, décision produit).
 */
export async function ensureNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone: string
): Promise<void> {
  const now = DateTime.now().setZone(timezone);
  const todayISO = now.toISODate();
  if (!todayISO) return;

  // §59/§70 du prompt maître — préférences de notification par type,
  // réglables dans Paramètres > Notifications (Phase 4). Une clé absente
  // équivaut à "activée" pour ne rien changer au comportement des comptes
  // créés avant l'existence de ce réglage.
  const { data: settings } = await supabase
    .from("user_settings")
    .select("notif_prefs")
    .eq("user_id", userId)
    .maybeSingle();
  const notifPrefs = settings?.notif_prefs ?? null;

  type CandidateRow = Database["public"]["Tables"]["notifications"]["Insert"];
  const candidates: CandidateRow[] = [];

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, due_time, reminder_minutes_before")
    .eq("user_id", userId)
    .in("status", ["todo", "in_progress"])
    .not("due_date", "is", null);

  for (const t of tasks ?? []) {
    if (!t.due_date) continue;

    const dueDateTime = DateTime.fromISO(t.due_time ? `${t.due_date}T${t.due_time}` : `${t.due_date}T23:59:59`, {
      zone: timezone,
    });
    if (!dueDateTime.isValid) continue;

    if (dueDateTime < now) {
      if (isNotificationEnabled(notifPrefs, "task_overdue")) {
        candidates.push({
          user_id: userId,
          kind: "task_overdue",
          entity_type: "task",
          entity_id: t.id,
          title: "Tâche en retard",
          body: t.title,
          link: `/tasks/${t.id}/edit`,
        });
      }
    } else if (t.reminder_minutes_before !== null && isNotificationEnabled(notifPrefs, "task_reminder")) {
      const reminderAt = dueDateTime.minus({ minutes: t.reminder_minutes_before });
      if (reminderAt <= now) {
        candidates.push({
          user_id: userId,
          kind: "task_reminder",
          entity_type: "task",
          entity_id: t.id,
          title: "Rappel de tâche",
          body: t.title,
          link: `/tasks/${t.id}/edit`,
        });
      }
    }
  }

  const financeOverdueEnabled = isNotificationEnabled(notifPrefs, "finance_overdue");

  const [{ data: lateIncome }, { data: lateExpenses }] = financeOverdueEnabled
    ? await Promise.all([
        supabase
          .from("income")
          .select("id, label, amount, currency, due_date")
          .eq("user_id", userId)
          .eq("received", false)
          .lt("due_date", todayISO),
        supabase
          .from("expenses")
          .select("id, label, amount, currency, due_date")
          .eq("user_id", userId)
          .eq("paid", false)
          .lt("due_date", todayISO),
      ])
    : [{ data: null }, { data: null }];

  for (const i of lateIncome ?? []) {
    candidates.push({
      user_id: userId,
      kind: "finance_overdue",
      entity_type: "income",
      entity_id: i.id,
      title: "Revenu en retard",
      body: `${i.label} — ${i.amount} ${i.currency}`,
      link: `/finances/income/${i.id}/edit`,
    });
  }

  for (const e of lateExpenses ?? []) {
    candidates.push({
      user_id: userId,
      kind: "finance_overdue",
      entity_type: "expense",
      entity_id: e.id,
      title: "Dépense en retard",
      body: `${e.label} — ${e.amount} ${e.currency}`,
      link: `/finances/expenses/${e.id}/edit`,
    });
  }

  if (candidates.length === 0) return;

  const { data: existing } = await supabase.from("notifications").select("kind, entity_id").eq("user_id", userId);

  const covered = new Set((existing ?? []).map((n) => `${n.kind}|${n.entity_id}`));
  const toInsert = candidates.filter((c) => !covered.has(`${c.kind}|${c.entity_id}`));
  if (toInsert.length === 0) return;

  // onConflict en filet de sécurité supplémentaire, en plus du filtrage
  // ci-dessus (même stratégie que ensureIncomeEntries).
  await supabase
    .from("notifications")
    .upsert(toInsert, { onConflict: "user_id,kind,entity_id", ignoreDuplicates: true });
}
