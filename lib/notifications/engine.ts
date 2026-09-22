import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import type { Database, NotificationPriority, SupportedLocale } from "@/types/database";
import { t, formatCurrencyLocale, formatDateLocale } from "@/lib/i18n/format";
import { sendNotificationEmail } from "@/lib/email/service";
import { sendNotificationPush } from "@/lib/push/service";
import { ensureCalendarEvents } from "@/lib/calendar/sync";

export interface ReminderCandidate {
  user_id: string;
  category: "activity" | "task" | "payment" | "expense" | "scheduled_expense" | "finance" | "security" | "summary" | "system";
  kind: string;
  priority: NotificationPriority;
  status: "unread";
  entity_type: string;
  entity_id: string;
  title: string;
  body: string;
  title_key?: string;
  body_key?: string;
  metadata: Record<string, any>;
  link: string;
  scheduled_at: string;
  idempotency_key: string;
  email_template?: string;
}

export interface ReminderEngineResult {
  processed: number;
  inserted: number;
  emailCount: number;
  pushCount: number;
  resolvedCleanups: number;
  errors?: string[];
}

/**
 * Vérifie si l'heure actuelle dans le fuseau horaire de l'utilisateur
 * se situe dans sa plage d'heures silencieuses (Quiet Hours).
 */
export function isInQuietHours(
  now: DateTime,
  enabled: boolean,
  startStr = "22:00",
  endStr = "07:00"
): boolean {
  if (!enabled) return false;

  const currentMinutes = now.hour * 60 + now.minute;
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);

  const startMinutes = (startH || 22) * 60 + (startM || 0);
  const endMinutes = (endH || 7) * 60 + (endM || 0);

  if (startMinutes > endMinutes) {
    // Traverse minuit (ex: 22:00 -> 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Plage dans la même journée (ex: 13:00 -> 14:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

/**
 * Moteur de Rappels Automatiques & Centre de Notifications Remind Me.
 *
 * Évalue de manière 100% déterministe et idempotente :
 * 1. Paiements / Encaissements (J-7, J-3, J-1, Jour J, +1j, +3j, +7j en retard)
 * 2. Dépenses & Dépenses programmées (J-7, J-3, J-1, Jour J, +1j, +3j)
 * 3. Activités & Séances du calendrier (J-1, H-3, H-1, 30m, 15m, séances passées non confirmées)
 * 4. Tâches (Échéances imminentes, tâches du jour, alertes de retard)
 * 5. Rappel du début de mois (Jours 1 à 3 du mois avec bilan des encaissements prévus)
 * 6. Résumé hebdomadaire (Le lundi)
 * 7. Règle d'auto-arrêt (Auto-stop) : Si un paiement est encaissé, une dépense payée ou une tâche terminée,
 *    aucun nouveau rappel n'est généré et les alertes existantes sont auto-résolues.
 * 8. Respect des préférences, fuseaux horaires et heures silencieuses.
 */
export async function evaluateSmartReminders(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone = "UTC"
): Promise<ReminderEngineResult> {
  const now = DateTime.now().setZone(timezone);
  const todayISO = now.toISODate();
  if (!todayISO) {
    return { processed: 0, inserted: 0, emailCount: 0, pushCount: 0, resolvedCleanups: 0 };
  }

  // 1. Récupération des préférences utilisateur & profil
  const [{ data: prefsData }, { data: profileData }] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, default_currency, timezone, locale")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const userTimezone = profileData?.timezone || timezone || "UTC";
  const userNow = DateTime.now().setZone(userTimezone);
  const locale: SupportedLocale = prefsData?.preferred_locale ?? (profileData?.locale as SupportedLocale) ?? "fr";
  const emailEnabled = prefsData?.email_enabled ?? true;
  const quietHoursActive = isInQuietHours(
    userNow,
    prefsData?.quiet_hours_enabled ?? false,
    prefsData?.quiet_hours_start ?? "22:00",
    prefsData?.quiet_hours_end ?? "07:00"
  );

  // S'assurer que les séances d'activités et événements du calendrier sont générés (-7j à +30j)
  try {
    const calStart = userNow.minus({ days: 7 }).toISODate()!;
    const calEnd = userNow.plus({ days: 30 }).toISODate()!;
    await ensureCalendarEvents(supabase, userId, calStart, calEnd, userTimezone);
  } catch (err) {
    console.warn("[evaluateSmartReminders] ensureCalendarEvents silent fallback:", err);
  }

  let resolvedCleanups = 0;
  const candidates: ReminderCandidate[] = [];

  // ==========================================================================
  // 2. SNOOZE CHECK & AUTO-RÉSOLUTION DES NOTIFICATIONS PÉRIMÉES (AUTO-STOP)
  // ==========================================================================
  const [{ data: receivedIncomes }, { data: paidExpenses }, { data: completedTasks }, { data: snoozedNotifs }] = await Promise.all([
    supabase.from("income").select("id").eq("user_id", userId).eq("received", true),
    supabase.from("expenses").select("id").eq("user_id", userId).eq("paid", true),
    supabase.from("tasks").select("id").eq("user_id", userId).in("status", ["done", "cancelled"]),
    supabase.from("notifications").select("id, entity_id, snoozed_until").eq("user_id", userId).eq("status", "snoozed"),
  ]);

  // Set des entités actuellement snoozées
  const activeSnoozeEntityIds = new Set<string>();
  for (const sn of snoozedNotifs ?? []) {
    if (sn.snoozed_until && DateTime.fromISO(sn.snoozed_until) > userNow) {
      if (sn.entity_id) activeSnoozeEntityIds.add(sn.entity_id);
    }
  }

  // Nettoyage immédiat : si un revenu/dépense/tâche est résolu, marquer ses alertes comme résolues
  const resolvedEntityIds = [
    ...(receivedIncomes ?? []).map((i) => i.id),
    ...(paidExpenses ?? []).map((e) => e.id),
    ...(completedTasks ?? []).map((t) => t.id),
  ];

  if (resolvedEntityIds.length > 0) {
    const { data: cleaned } = await supabase
      .from("notifications")
      .update({
        status: "resolved",
        resolved_at: userNow.toISO()!,
        read_at: userNow.toISO()!,
      })
      .eq("user_id", userId)
      .in("entity_id", resolvedEntityIds)
      .neq("status", "resolved")
      .select("id");

    resolvedCleanups += cleaned?.length ?? 0;
  }

  // ==========================================================================
  // 3. CYCLE DE VIE DES PAIEMENTS / ENCAISSEMENTS (INCOME)
  // J-7, J-3, J-1, Jour J, +1j, +3j, +7j
  // ==========================================================================
  if (prefsData?.payment_reminders !== false) {
    const { data: pendingIncome } = await supabase
      .from("income")
      .select("id, label, amount, currency, due_date, received, activity_id")
      .eq("user_id", userId)
      .eq("received", false)
      .not("due_date", "is", null);

    for (const inc of pendingIncome ?? []) {
      // VÉRIFICATION DE SÉCURITÉ : Entité toujours en attente et non snoozée
      if (inc.received || !inc.due_date || activeSnoozeEntityIds.has(inc.id)) continue;

      const dueDT = DateTime.fromISO(inc.due_date, { zone: userTimezone }).startOf("day");
      const daysDiff = Math.floor(dueDT.diff(userNow.startOf("day"), "days").days);

      const clientName = inc.label.split("—")[0]?.trim() || "Client";
      const formattedAmount = formatCurrencyLocale(Number(inc.amount), inc.currency, locale);
      const formattedDate = formatDateLocale(inc.due_date, locale, userTimezone);

      if (daysDiff === 7) {
        candidates.push({
          user_id: userId,
          category: "payment",
          kind: "payment_upcoming",
          priority: "normal",
          status: "unread",
          entity_type: "income",
          entity_id: inc.id,
          title: t("notif.payment_upcoming.title", locale) || `Paiement prévu dans 7 jours : ${inc.label}`,
          body: `Un paiement de ${formattedAmount} pour « ${inc.label} » est prévu le ${formattedDate}.`,
          title_key: "notif.payment_upcoming.title",
          body_key: "notif.payment_upcoming.body",
          metadata: { amount: inc.amount, currency: inc.currency, label: inc.label, days: 7 },
          link: `/finances`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `payment:${inc.id}:minus_7_days`,
          email_template: "payment_upcoming",
        });
      } else if (daysDiff === 3) {
        candidates.push({
          user_id: userId,
          category: "payment",
          kind: "payment_upcoming",
          priority: "normal",
          status: "unread",
          entity_type: "income",
          entity_id: inc.id,
          title: t("notif.payment_upcoming.title", locale) || `Paiement prévu dans 3 jours : ${inc.label}`,
          body: `Un paiement de ${formattedAmount} pour « ${inc.label} » est attendu le ${formattedDate}.`,
          title_key: "notif.payment_upcoming.title",
          body_key: "notif.payment_upcoming.body",
          metadata: { amount: inc.amount, currency: inc.currency, label: inc.label, days: 3 },
          link: `/finances`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `payment:${inc.id}:minus_3_days`,
          email_template: "payment_upcoming",
        });
      } else if (daysDiff === 1) {
        candidates.push({
          user_id: userId,
          category: "payment",
          kind: "payment_upcoming",
          priority: "high",
          status: "unread",
          entity_type: "income",
          entity_id: inc.id,
          title: `Paiement prévu demain : ${inc.label}`,
          body: `Un paiement de ${formattedAmount} associé à votre activité « ${inc.label} » est prévu pour demain. Pensez à vérifier sa réception.`,
          title_key: "notif.payment_upcoming.title",
          body_key: "notif.payment_upcoming.body",
          metadata: { amount: inc.amount, currency: inc.currency, label: inc.label, days: 1 },
          link: `/finances`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `payment:${inc.id}:minus_1_day`,
          email_template: "payment_upcoming",
        });
      } else if (daysDiff === 0) {
        candidates.push({
          user_id: userId,
          category: "payment",
          kind: "payment_due_today",
          priority: "high",
          status: "unread",
          entity_type: "income",
          entity_id: inc.id,
          title: `Paiement attendu aujourd'hui : ${inc.label}`,
          body: `Le paiement de ${formattedAmount} pour « ${inc.label} » arrive à échéance aujourd'hui. Marquez-le comme reçu dès encaissement.`,
          title_key: "notif.payment_due_today.title",
          body_key: "notif.payment_due_today.body",
          metadata: { amount: inc.amount, currency: inc.currency, label: inc.label },
          link: `/finances`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `payment:${inc.id}:due_today_${todayISO}`,
          email_template: "payment_due_today",
        });
      } else if (daysDiff < 0) {
        const overdueDays = Math.abs(daysDiff);
        const priority: NotificationPriority = overdueDays >= 7 ? "critical" : "high";
        candidates.push({
          user_id: userId,
          category: "payment",
          kind: "payment_overdue",
          priority,
          status: "unread",
          entity_type: "income",
          entity_id: inc.id,
          title: `Paiement en retard (${overdueDays}j) : ${inc.label}`,
          body: `Le paiement de ${formattedAmount} pour « ${inc.label} » est en retard depuis le ${formattedDate}. Cliquez pour relancer le client ou valider la réception.`,
          title_key: "notif.payment_overdue.title",
          body_key: "notif.payment_overdue.body",
          metadata: { amount: inc.amount, currency: inc.currency, label: inc.label, days: overdueDays },
          link: `/finances`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `payment:${inc.id}:overdue_${todayISO}`,
          email_template: "payment_overdue",
        });
      }
    }
  }

  // ==========================================================================
  // 4. CYCLE DE VIE DES DÉPENSES & CHARGES (EXPENSES & SCHEDULED EXPENSES)
  // J-7, J-3, J-1, Jour J, +1j, +3j
  // ==========================================================================
  if (prefsData?.expense_reminders !== false) {
    // 4.1 Dépenses directes
    const { data: pendingExpenses } = await supabase
      .from("expenses")
      .select("id, label, amount, currency, due_date, paid")
      .eq("user_id", userId)
      .eq("paid", false)
      .not("due_date", "is", null);

    for (const exp of pendingExpenses ?? []) {
      if (exp.paid || !exp.due_date || activeSnoozeEntityIds.has(exp.id)) continue;

      const dueDT = DateTime.fromISO(exp.due_date, { zone: userTimezone }).startOf("day");
      const daysDiff = Math.floor(dueDT.diff(userNow.startOf("day"), "days").days);
      const formattedAmount = formatCurrencyLocale(Number(exp.amount), exp.currency, locale);

      if (daysDiff === 7 || daysDiff === 3 || daysDiff === 1) {
        candidates.push({
          user_id: userId,
          category: "expense",
          kind: "expense_upcoming",
          priority: daysDiff === 1 ? "high" : "normal",
          status: "unread",
          entity_type: "expense",
          entity_id: exp.id,
          title: `Facture à régler dans ${daysDiff} jour(s) : ${exp.label}`,
          body: `Une dépense de ${formattedAmount} pour « ${exp.label} » arrive à échéance le ${formatDateLocale(exp.due_date, locale, userTimezone)}.`,
          metadata: { amount: exp.amount, currency: exp.currency, label: exp.label, days: daysDiff },
          link: `/finances?tab=expenses`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `expense:${exp.id}:minus_${daysDiff}_days`,
          email_template: "expense_due",
        });
      } else if (daysDiff === 0) {
        candidates.push({
          user_id: userId,
          category: "expense",
          kind: "expense_due_today",
          priority: "high",
          status: "unread",
          entity_type: "expense",
          entity_id: exp.id,
          title: `Dépense à régler aujourd'hui : ${exp.label}`,
          body: `La facture « ${exp.label} » (${formattedAmount}) doit être réglée aujourd'hui.`,
          metadata: { amount: exp.amount, currency: exp.currency, label: exp.label },
          link: `/finances?tab=expenses`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `expense:${exp.id}:due_today_${todayISO}`,
          email_template: "expense_due",
        });
      } else if (daysDiff < 0) {
        const overdueDays = Math.abs(daysDiff);
        candidates.push({
          user_id: userId,
          category: "expense",
          kind: "expense_overdue",
          priority: "high",
          status: "unread",
          entity_type: "expense",
          entity_id: exp.id,
          title: `Dépense en retard : ${exp.label}`,
          body: `La dépense « ${exp.label} » (${formattedAmount}) a dépassé sa date d'échéance.`,
          metadata: { amount: exp.amount, currency: exp.currency, label: exp.label, days: overdueDays },
          link: `/finances?tab=expenses`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `expense:${exp.id}:overdue_${todayISO}`,
        });
      }
    }

    // 4.2 Dépenses programmées récurrentes (scheduled_expenses)
    const { data: scheduledList } = await supabase
      .from("scheduled_expenses")
      .select("id, name, amount, currency, next_due_date, status, frequency")
      .eq("user_id", userId)
      .in("status", ["planned", "due"])
      .not("next_due_date", "is", null);

    for (const sch of scheduledList ?? []) {
      if (!sch.next_due_date || activeSnoozeEntityIds.has(sch.id)) continue;

      const dueDT = DateTime.fromISO(sch.next_due_date, { zone: userTimezone }).startOf("day");
      const daysDiff = Math.floor(dueDT.diff(userNow.startOf("day"), "days").days);
      const formattedAmount = formatCurrencyLocale(Number(sch.amount), sch.currency, locale);

      if (daysDiff === 3 || daysDiff === 1) {
        candidates.push({
          user_id: userId,
          category: "scheduled_expense",
          kind: "expense_upcoming",
          priority: "normal",
          status: "unread",
          entity_type: "scheduled_expense",
          entity_id: sch.id,
          title: `Facture programmée dans ${daysDiff} jour(s) : ${sch.name}`,
          body: `L'échéance de ${formattedAmount} pour « ${sch.name} » est prévue le ${formatDateLocale(sch.next_due_date, locale, userTimezone)}.`,
          metadata: { amount: sch.amount, currency: sch.currency, label: sch.name, frequency: sch.frequency },
          link: `/finances?tab=scheduled`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `scheduled_expense:${sch.id}:${sch.next_due_date}:minus_${daysDiff}_days`,
        });
      } else if (daysDiff <= 0) {
        candidates.push({
          user_id: userId,
          category: "scheduled_expense",
          kind: daysDiff === 0 ? "expense_due_today" : "expense_overdue",
          priority: "high",
          status: "unread",
          entity_type: "scheduled_expense",
          entity_id: sch.id,
          title: daysDiff === 0 ? `Facture à régler aujourd'hui : ${sch.name}` : `Facture en attente : ${sch.name}`,
          body: `Facture programmée de ${formattedAmount} pour « ${sch.name} ».`,
          metadata: { amount: sch.amount, currency: sch.currency, label: sch.name },
          link: `/finances?tab=scheduled`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `scheduled_expense:${sch.id}:${sch.next_due_date}:${todayISO}`,
        });
      }
    }
  }

  // ==========================================================================
  // 5. CYCLE DE VIE DES ACTIVITÉS & CRÉNEAUX (CALENDAR EVENTS)
  // ==========================================================================
  if (prefsData?.activity_reminders !== false) {
    const past7daysIso = userNow.minus({ days: 7 }).toUTC().toISO()!;
    const next48hIso = userNow.plus({ hours: 48 }).toUTC().toISO()!;
    const { data: eventList } = await supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, status, activity_id")
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .gte("starts_at", past7daysIso)
      .lte("starts_at", next48hIso)
      .order("starts_at", { ascending: true });

    for (const evt of eventList ?? []) {
      if (evt.status === "cancelled" || evt.status === "completed" || activeSnoozeEntityIds.has(evt.id)) continue;

      const eventStart = DateTime.fromISO(evt.starts_at, { zone: userTimezone });
      const eventEnd = DateTime.fromISO(evt.ends_at, { zone: userTimezone });
      const minutesUntil = Math.floor(eventStart.diff(userNow, "minutes").minutes);
      const isPast = eventEnd < userNow || eventStart < userNow.minus({ hours: 1 });

      if (isPast && evt.status === "planned") {
        const daysAgo = Math.max(0, Math.floor(userNow.diff(eventStart, "days").days));
        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_overdue",
          priority: "high",
          status: "unread",
          entity_type: "activity",
          entity_id: evt.id,
          title: `Séance passée : ${evt.title}`,
          body: `Votre séance « ${evt.title} » du ${formatDateLocale(eventStart.toISODate()!, locale, userTimezone)} est terminée. Cliquez pour confirmer sa réalisation.`,
          metadata: { title: evt.title, starts_at: evt.starts_at, daysAgo },
          link: `/calendar/${evt.id}`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${evt.id}:passed_${eventStart.toISODate()}`,
        });
      } else if (eventStart.hasSame(userNow, "day") && !isPast) {
        if (minutesUntil <= 45 && minutesUntil >= -15) {
          candidates.push({
            user_id: userId,
            category: "activity",
            kind: "activity_reminder",
            priority: "critical",
            status: "unread",
            entity_type: "activity",
            entity_id: evt.id,
            title: `Rappel imminent : ${evt.title}`,
            body: minutesUntil > 0
              ? `Votre séance « ${evt.title} » commence dans ${minutesUntil} minutes (à ${eventStart.toFormat("HH:mm")}).`
              : `Votre séance « ${evt.title} » a commencé à ${eventStart.toFormat("HH:mm")}.`,
            metadata: { title: evt.title, starts_at: evt.starts_at, minutes: minutesUntil },
            link: `/calendar/${evt.id}`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: `activity:${evt.id}:imminent_${eventStart.toISODate()}`,
          });
        } else if (minutesUntil > 45) {
          candidates.push({
            user_id: userId,
            category: "activity",
            kind: "activity_today",
            priority: "normal",
            status: "unread",
            entity_type: "activity",
            entity_id: evt.id,
            title: `Séance aujourd'hui : ${evt.title}`,
            body: `Vous avez « ${evt.title} » prévue aujourd'hui de ${eventStart.toFormat("HH:mm")} à ${eventEnd.toFormat("HH:mm")}.`,
            metadata: { title: evt.title, starts_at: evt.starts_at },
            link: `/calendar/${evt.id}`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: `activity:${evt.id}:today_${eventStart.toISODate()}`,
          });
        }
      } else if (eventStart.hasSame(userNow.plus({ days: 1 }), "day")) {
        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_upcoming",
          priority: "normal",
          status: "unread",
          entity_type: "activity",
          entity_id: evt.id,
          title: `Séance demain : ${evt.title}`,
          body: `N'oubliez pas votre séance « ${evt.title} » demain à ${eventStart.toFormat("HH:mm")}.`,
          metadata: { title: evt.title, starts_at: evt.starts_at },
          link: `/calendar/${evt.id}`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${evt.id}:tomorrow_${eventStart.toISODate()}`,
        });
      }
    }
  }

  // ==========================================================================
  // 6. CYCLE DE VIE DES TÂCHES (TASKS)
  // ==========================================================================
  if (prefsData?.task_reminders !== false) {
    const { data: pendingTasks } = await supabase
      .from("tasks")
      .select("id, title, due_date, due_time, priority, status, reminder_minutes_before")
      .eq("user_id", userId)
      .in("status", ["todo", "in_progress"])
      .not("due_date", "is", null);

    for (const tsk of pendingTasks ?? []) {
      if (tsk.status === "done" || tsk.status === "cancelled" || !tsk.due_date || activeSnoozeEntityIds.has(tsk.id)) {
        continue;
      }

      const dueDT = DateTime.fromISO(
        tsk.due_time ? `${tsk.due_date}T${tsk.due_time}` : `${tsk.due_date}T23:59:59`,
        { zone: userTimezone }
      );
      if (!dueDT.isValid) continue;

      const reminderMinutes = typeof tsk.reminder_minutes_before === "number" ? tsk.reminder_minutes_before : 0;
      const reminderTriggerDT = dueDT.minus({ minutes: reminderMinutes });

      if (dueDT < userNow) {
        const overdueDays = Math.max(1, Math.floor(userNow.diff(dueDT, "days").days));
        candidates.push({
          user_id: userId,
          category: "task",
          kind: "task_overdue",
          priority: tsk.priority === "urgent" ? "critical" : "high",
          status: "unread",
          entity_type: "task",
          entity_id: tsk.id,
          title: `Tâche en retard : ${tsk.title}`,
          body: `La tâche « ${tsk.title} » est en retard depuis le ${formatDateLocale(tsk.due_date, locale, userTimezone)}.`,
          metadata: { title: tsk.title, priority: tsk.priority, overdueDays },
          link: `/tasks/${tsk.id}/edit`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `task:${tsk.id}:overdue_${todayISO}`,
        });
      } else if (userNow >= reminderTriggerDT || dueDT.hasSame(userNow, "day")) {
        const minutesUntil = dueDT.diff(userNow, "minutes").minutes;

        if (minutesUntil <= 120 && minutesUntil >= -15) {
          candidates.push({
            user_id: userId,
            category: "task",
            kind: "task_due_soon",
            priority: tsk.priority === "urgent" ? "critical" : "high",
            status: "unread",
            entity_type: "task",
            entity_id: tsk.id,
            title: `Rappel tâche : ${tsk.title}`,
            body: tsk.due_time
              ? `Échéance prévue aujourd'hui à ${tsk.due_time} pour « ${tsk.title} »`
              : `La tâche « ${tsk.title} » arrive à échéance aujourd'hui.`,
            metadata: { title: tsk.title, priority: tsk.priority },
            link: `/tasks/${tsk.id}/edit`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: `task:${tsk.id}:reminder_${todayISO}`,
          });
        } else {
          candidates.push({
            user_id: userId,
            category: "task",
            kind: "task_due_today",
            priority: "normal",
            status: "unread",
            entity_type: "task",
            entity_id: tsk.id,
            title: `Tâche du jour : ${tsk.title}`,
            body: `La tâche « ${tsk.title} » est programmée pour aujourd'hui.`,
            metadata: { title: tsk.title },
            link: `/tasks/${tsk.id}/edit`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: `task:${tsk.id}:due_today_${todayISO}`,
          });
        }
      }
    }
  }

  // ==========================================================================
  // 7. RAPPEL DU DÉBUT DE MOIS (Le 1er, 2e ou 3e jour du mois)
  // ==========================================================================
  if (userNow.day >= 1 && userNow.day <= 3) {
    const currentMonthKey = userNow.toFormat("yyyy-MM");
    const monthStartIso = userNow.startOf("month").toISODate()!;
    const monthEndIso = userNow.endOf("month").toISODate()!;

    const [{ data: monthIncomes }, { data: monthExpenses }] = await Promise.all([
      supabase
        .from("income")
        .select("id, amount, currency, label, due_date, received")
        .eq("user_id", userId)
        .eq("received", false)
        .gte("due_date", monthStartIso)
        .lte("due_date", monthEndIso),
      supabase
        .from("scheduled_expenses")
        .select("id, amount, currency, name, next_due_date")
        .eq("user_id", userId)
        .in("status", ["planned", "due"])
        .gte("next_due_date", monthStartIso)
        .lte("next_due_date", monthEndIso),
    ]);

    const incomeCount = monthIncomes?.length || 0;
    const expenseCount = monthExpenses?.length || 0;

    if (incomeCount > 0 || expenseCount > 0) {
      const totalIncome = (monthIncomes || []).reduce((acc, inc) => acc + Number(inc.amount || 0), 0);
      const currency = monthIncomes?.[0]?.currency || profileData?.default_currency || "XOF";
      const formattedTotal = formatCurrencyLocale(totalIncome, currency, locale);
      const monthName = userNow.setLocale("fr").toFormat("MMMM yyyy");

      candidates.push({
        user_id: userId,
        category: "summary",
        kind: "month_start_summary",
        priority: "normal",
        status: "unread",
        entity_type: "summary",
        entity_id: `month_${currentMonthKey}`,
        title: `Bienvenue en ${monthName} — Vos perspectives du mois`,
        body: `Votre nouveau mois commence : ${incomeCount} paiement(s) attendu(s) pour un total de ${formattedTotal}${expenseCount > 0 ? ` et ${expenseCount} dépense(s) programmée(s)` : ""}.`,
        title_key: "notif.month_start.title",
        body_key: "notif.month_start.body",
        metadata: {
          month: currentMonthKey,
          incomeCount,
          totalExpected: totalIncome,
          expenseCount,
          currency,
        },
        link: "/finances",
        scheduled_at: userNow.toISO()!,
        idempotency_key: `summary:month_start:${currentMonthKey}`,
        email_template: "month_start_summary",
      });
    }
  }

  // ==========================================================================
  // 8. RÉSUMÉ HEBDOMADAIRE (Le lundi)
  // ==========================================================================
  if (userNow.weekday === 1 && prefsData?.weekly_summary_enabled !== false) {
    const weekNumber = userNow.weekNumber;
    const weekYear = userNow.weekYear;
    const weekKey = `${weekYear}-W${weekNumber}`;
    const weekStartIso = userNow.startOf("week").toISODate()!;
    const weekEndIso = userNow.endOf("week").toISODate()!;

    const [{ data: weekIncomes }, { data: weekTasks }, { data: weekEvents }] = await Promise.all([
      supabase
        .from("income")
        .select("id, amount, currency, received")
        .eq("user_id", userId)
        .eq("received", false)
        .gte("due_date", weekStartIso)
        .lte("due_date", weekEndIso),
      supabase
        .from("tasks")
        .select("id, status")
        .eq("user_id", userId)
        .in("status", ["todo", "in_progress"])
        .gte("due_date", weekStartIso)
        .lte("due_date", weekEndIso),
      supabase
        .from("calendar_events")
        .select("id")
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .gte("starts_at", userNow.startOf("week").toISO()!)
        .lte("starts_at", userNow.endOf("week").toISO()!),
    ]);

    const incomeCount = weekIncomes?.length || 0;
    const taskCount = weekTasks?.length || 0;
    const eventCount = weekEvents?.length || 0;

    if (incomeCount > 0 || taskCount > 0 || eventCount > 0) {
      candidates.push({
        user_id: userId,
        category: "summary",
        kind: "weekly_summary",
        priority: "normal",
        status: "unread",
        entity_type: "summary",
        entity_id: `week_${weekKey}`,
        title: `Votre résumé de la semaine (${weekKey})`,
        body: `Cette semaine : ${incomeCount} paiement(s) à surveiller, ${eventCount} séance(s) au planning et ${taskCount} tâche(s) à accomplir.`,
        metadata: { week: weekKey, incomeCount, taskCount, eventCount },
        link: "/dashboard",
        scheduled_at: userNow.toISO()!,
        idempotency_key: `summary:week:${weekKey}`,
        email_template: "weekly_summary",
      });
    }
  }

  // ==========================================================================
  // 9. ENREGISTREMENT IDEMPOTENT DANS LA TABLE NOTIFICATIONS
  // ==========================================================================
  if (candidates.length === 0) {
    return { processed: 0, inserted: 0, emailCount: 0, pushCount: 0, resolvedCleanups };
  }

  const candidateKeys = candidates.map((c) => c.idempotency_key);
  const { data: existingRows } = await supabase
    .from("notifications")
    .select("idempotency_key")
    .eq("user_id", userId)
    .in("idempotency_key", candidateKeys);

  const existingKeySet = new Set((existingRows ?? []).map((r) => r.idempotency_key));
  const newCandidates = candidates.filter((c) => !existingKeySet.has(c.idempotency_key));

  if (newCandidates.length === 0) {
    return { processed: candidates.length, inserted: 0, emailCount: 0, pushCount: 0, resolvedCleanups };
  }

  // Insertion en base dans la table `notifications`
  const { data: insertedRows, error } = await supabase
    .from("notifications")
    .insert(
      newCandidates.map((c) => ({
        user_id: c.user_id,
        category: c.category,
        kind: c.kind,
        priority: c.priority,
        status: c.status,
        entity_type: c.entity_type,
        entity_id: c.entity_id,
        title: c.title,
        body: c.body,
        title_key: c.title_key,
        body_key: c.body_key,
        metadata: c.metadata,
        link: c.link,
        scheduled_at: c.scheduled_at,
        idempotency_key: c.idempotency_key,
      }))
    )
    .select("id, kind, idempotency_key");

  if (error) {
    console.error("[evaluateSmartReminders] Notification insertion error:", error);
    return { processed: candidates.length, inserted: 0, emailCount: 0, pushCount: 0, resolvedCleanups };
  }

  // ==========================================================================
  // 10. DISPATCH MULTI-CANAUX (EMAIL & PUSH) AVEC RESPECT DES HEURES SILENCIEUSES
  // ==========================================================================
  let emailCount = 0;
  let pushCount = 0;

  // Récupérer l'e-mail de l'utilisateur (avec fallback admin pour les jobs Cron)
  let userEmail: string | undefined;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userEmail = userData.user?.email;
  } catch {}

  if (!userEmail) {
    try {
      const { data: adminUser } = await (supabase as any).auth.admin.getUserById(userId);
      userEmail = adminUser.user?.email;
    } catch {}
  }

  for (const cand of newCandidates) {
    const allowImmediateExternal = !quietHoursActive || cand.priority === "critical";

    // Envoi E-mail
    if (emailEnabled && allowImmediateExternal && cand.email_template && userEmail) {
      const emailRes = await sendNotificationEmail(
        {
          userId,
          recipientEmail: userEmail,
          recipientName: profileData?.full_name?.split(" ")[0] || "Bonjour",
          template: cand.email_template,
          title: cand.title,
          body: cand.body,
          link: cand.link,
          locale,
          idempotencyKey: `email:${cand.idempotency_key}`,
          metadata: cand.metadata,
        },
        supabase
      );
      if (emailRes.success) emailCount++;
    }

    // Envoi Push
    if (allowImmediateExternal) {
      const pushRes = await sendNotificationPush(
        {
          userId,
          title: cand.title,
          body: cand.body,
          link: cand.link,
          category: cand.category,
          idempotencyKey: `push:${cand.idempotency_key}`,
          metadata: cand.metadata,
        },
        supabase
      );
      if (pushRes.success && pushRes.deliveredCount > 0) {
        pushCount += pushRes.deliveredCount;
      }
    }
  }

  return {
    processed: candidates.length,
    inserted: insertedRows?.length ?? 0,
    emailCount,
    pushCount,
    resolvedCleanups,
  };
}

/**
 * Traitement en lot pour le Cron Scheduler d'arrière-plan.
 * Parcourt les utilisateurs actifs et déclenche l'évaluation des rappels.
 */
export async function processAllUsersReminders(
  supabaseAdmin: SupabaseClient<Database>
): Promise<{ totalUsers: number; totalInserted: number; totalEmails: number; totalPushes: number }> {
  const { data: activeProfiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, timezone")
    .eq("onboarding_completed", true);

  if (error || !activeProfiles) {
    console.error("[processAllUsersReminders] Erreur récupération des profils:", error);
    return { totalUsers: 0, totalInserted: 0, totalEmails: 0, totalPushes: 0 };
  }

  let totalInserted = 0;
  let totalEmails = 0;
  let totalPushes = 0;

  for (const profile of activeProfiles) {
    try {
      const res = await evaluateSmartReminders(
        supabaseAdmin,
        profile.id,
        profile.timezone || "UTC"
      );
      totalInserted += res.inserted;
      totalEmails += res.emailCount;
      totalPushes += res.pushCount;
    } catch (userErr) {
      console.error(`[processAllUsersReminders] Erreur pour l'utilisateur ${profile.id}:`, userErr);
    }
  }

  return {
    totalUsers: activeProfiles.length,
    totalInserted,
    totalEmails,
    totalPushes,
  };
}
