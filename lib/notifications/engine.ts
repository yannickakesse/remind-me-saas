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
 * Moteur de Rappels Automatiques & Centre de Notifications (Phase 3).
 *
 * Évalue de manière 100% déterministe et idempotente l'ensemble des règles :
 * 1. Paiements / Encaissements (J-7, J-3, J-1, Jour J, +1j, +3j, +7j)
 * 2. Dépenses & Dépenses programmées (J-7, J-3, J-1, Jour J, +1j, +3j, +7j)
 * 3. Activités & Séances (J-1, H-3, H-1, 30m, 15m)
 * 4. Tâches (Échéance du jour, imminente H-2, en retard +1j, +3j)
 * 5. Gestion stricte du Snooze (report) et auto-résolution des notifications pour les entités déjà payées/reçues/terminées.
 * 6. Respect des préférences, fuseaux horaires et heures silencieuses.
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
  const inAppEnabled = prefsData?.in_app_enabled ?? true;
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
  // 2. SNOOZE CHECK & AUTO-RÉSOLUTION DES NOTIFICATIONS PÉRIMÉES
  // ==========================================================================
  // Récupérer les entités déjà traitées pour nettoyer d'éventuelles notifications orphelines
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
          title: t("notif.payment_upcoming.title", locale),
          body: t("notif.payment_upcoming.body", locale, {
            amount: inc.amount,
            currency: inc.currency,
            client: clientName,
            date: formattedDate,
          }),
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
          title: t("notif.payment_upcoming.title", locale),
          body: t("notif.payment_upcoming.body", locale, {
            amount: inc.amount,
            currency: inc.currency,
            client: clientName,
            date: formattedDate,
          }),
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
          title: t("notif.payment_upcoming.title", locale),
          body: t("notif.payment_upcoming.body", locale, {
            amount: inc.amount,
            currency: inc.currency,
            client: clientName,
            date: formattedDate,
          }),
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
          title: t("notif.payment_due_today.title", locale),
          body: t("notif.payment_due_today.body", locale, {
            amount: inc.amount,
            currency: inc.currency,
            client: clientName,
          }),
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
          title: t("notif.payment_overdue.title", locale) || `Paiement en retard : ${inc.label}`,
          body: t("notif.payment_overdue.body", locale, {
            amount: inc.amount,
            currency: inc.currency,
            client: clientName,
            days: overdueDays,
          }) || `Paiement attendu de ${inc.amount} ${inc.currency} en retard de ${overdueDays} jour(s).`,
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
  // J-7, J-3, J-1, Jour J, +1j, +3j, +7j
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

      if (daysDiff === 7 || daysDiff === 3 || daysDiff === 1) {
        candidates.push({
          user_id: userId,
          category: "expense",
          kind: "expense_upcoming",
          priority: daysDiff === 1 ? "high" : "normal",
          status: "unread",
          entity_type: "expense",
          entity_id: exp.id,
          title: t("notif.expense_upcoming.title", locale),
          body: t("notif.expense_upcoming.body", locale, {
            amount: exp.amount,
            currency: exp.currency,
            label: exp.label,
            date: formatDateLocale(exp.due_date, locale, userTimezone),
          }),
          title_key: "notif.expense_upcoming.title",
          body_key: "notif.expense_upcoming.body",
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
          title: t("notif.expense_due_today.title", locale),
          body: t("notif.expense_due_today.body", locale, {
            amount: exp.amount,
            currency: exp.currency,
            label: exp.label,
          }),
          title_key: "notif.expense_due_today.title",
          body_key: "notif.expense_due_today.body",
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
          title: t("notif.expense_overdue.title", locale) || `Dépense en retard : ${exp.label}`,
          body: t("notif.expense_overdue.body", locale, {
            amount: exp.amount,
            currency: exp.currency,
            label: exp.label,
          }) || `La dépense « ${exp.label} » (${exp.amount} ${exp.currency}) est en retard d'échéance.`,
          title_key: "notif.expense_overdue.title",
          body_key: "notif.expense_overdue.body",
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

      if (daysDiff === 3 || daysDiff === 1) {
        candidates.push({
          user_id: userId,
          category: "scheduled_expense",
          kind: "expense_upcoming",
          priority: "normal",
          status: "unread",
          entity_type: "scheduled_expense",
          entity_id: sch.id,
          title: t("notif.expense_upcoming.title", locale),
          body: t("notif.expense_upcoming.body", locale, {
            amount: sch.amount,
            currency: sch.currency,
            label: sch.name,
            date: formatDateLocale(sch.next_due_date, locale, userTimezone),
          }),
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
          title: daysDiff === 0 ? t("notif.expense_due_today.title", locale) : `Facture à échéance : ${sch.name}`,
          body: `Facture programmée de ${sch.amount} ${sch.currency} pour « ${sch.name} ».`,
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
  // Séances passées/dépassées, séances du jour, rappels imminents et J-1
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

      // 5.1 Séances passées / dépassées non confirmées (hier ou plus tôt)
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
          title_key: "notif.activity_overdue.title",
          body_key: "notif.activity_overdue.body",
          metadata: { title: evt.title, starts_at: evt.starts_at, daysAgo },
          link: `/calendar/${evt.id}`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${evt.id}:passed_${eventStart.toISODate()}`,
        });
      }
      // 5.2 Séances aujourd'hui (imminentes ou prévues dans la journée)
      else if (eventStart.hasSame(userNow, "day") && !isPast) {
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
      }
      // 5.3 Séances demain (J-1)
      else if (eventStart.hasSame(userNow.plus({ days: 1 }), "day")) {
        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_upcoming",
          priority: "normal",
          status: "unread",
          entity_type: "activity",
          entity_id: evt.id,
          title: t("notif.activity_upcoming.title", locale) || `Séance demain : ${evt.title}`,
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
  // Échéance du jour, imminente H-2, en retard
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
          title: t("notif.task_overdue.title", locale) || `Tâche en retard : ${tsk.title}`,
          body: t("notif.task_overdue.body", locale, {
            title: tsk.title,
            date: formatDateLocale(tsk.due_date, locale, userTimezone),
          }) || `La tâche « ${tsk.title} » est en retard depuis le ${tsk.due_date}.`,
          title_key: "notif.task_overdue.title",
          body_key: "notif.task_overdue.body",
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
            title: t("notif.task_due_soon.title", locale) || `Rappel tâche : ${tsk.title}`,
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
            title: t("notif.task_due_today.title", locale) || `Tâche du jour : ${tsk.title}`,
            body: t("notif.task_due_today.body", locale, { title: tsk.title }) || `La tâche « ${tsk.title} » est programmée pour aujourd'hui.`,
            title_key: "notif.task_due_today.title",
            body_key: "notif.task_due_today.body",
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
  // 7. ENREGISTREMENT IDEMPOTENT DANS LA TABLE NOTIFICATIONS
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
  // 8. DISPATCH MULTI-CANAUX (EMAIL & PUSH) AVEC RESPECT DES HEURES SILENCIEUSES
  // ==========================================================================
  let emailCount = 0;
  let pushCount = 0;

  // Récupérer l'e-mail de l'utilisateur
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = user?.email;

  for (const cand of newCandidates) {
    // Si heures calmes actives et notification non critique, on évite le dérangement sonore/email immédiat
    const allowImmediateExternal = !quietHoursActive || cand.priority === "critical";

    // Envoi E-mail
    if (emailEnabled && allowImmediateExternal && cand.email_template && userEmail) {
      const sent = await sendNotificationEmail(
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
      if (sent) emailCount++;
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
  // Récupérer tous les profils ayant complété l'onboarding
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
