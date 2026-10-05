import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import type { Database, NotificationPriority, SupportedLocale } from "@/types/database";
import { t, formatCurrencyLocale, formatDateLocale } from "@/lib/i18n/format";
import { sendNotificationEmail } from "@/lib/email/service";
import { sendNotificationPush } from "@/lib/push/service";
import { ensureCalendarEvents } from "@/lib/calendar/sync";
import {
  generateVoiceMessage,
  generateMorningBriefingVoiceText,
  generateMiddayCheckinVoiceText,
  generateEveningSummaryVoiceText,
  type DailyActivityItem,
} from "@/lib/voice";

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
 * Auto-Stop & Résolution immédiate des alertes associées à une entité donnée.
 * Appelé instantanément dès qu'une tâche est terminée/annulée, un paiement encaissé,
 * une dépense payée ou une activité archivée.
 */
export async function resolveEntityNotifications(
  supabase: SupabaseClient<Database>,
  entityId: string,
  userId?: string
): Promise<number> {
  const nowIso = DateTime.now().toISO()!;
  let query = supabase
    .from("notifications")
    .update({
      status: "resolved",
      resolved_at: nowIso,
      read_at: nowIso,
    })
    .or(`entity_id.eq.${entityId},id.eq.${entityId}`)
    .neq("status", "resolved");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.select("id");
  if (error) {
    console.warn("[resolveEntityNotifications] Error resolving notifications:", error);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Invalide les anciens rappels actifs lors du report (postpone/reschedule) d'une entité
 * pour garantir que les rappels passés cessent et que la nouvelle date prenne le relais.
 */
export async function invalidateOutdatedEntityReminders(
  supabase: SupabaseClient<Database>,
  entityId: string,
  userId?: string
): Promise<number> {
  const nowIso = DateTime.now().toISO()!;
  let query = supabase
    .from("notifications")
    .update({
      status: "resolved",
      resolved_at: nowIso,
      read_at: nowIso,
    })
    .eq("entity_id", entityId)
    .in("status", ["unread", "read", "snoozed"]);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.select("id");
  if (error) {
    console.warn("[invalidateOutdatedEntityReminders] Error invalidating reminders:", error);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Déclenchement proactif asynchrone et non-bloquant de l'évaluation des rappels.
 * Ne bloque JAMAIS la réponse de la Server Action ou du rendu à l'utilisateur.
 * L'évaluation se poursuit en arrière-plan en toute sécurité avec confinement total des erreurs.
 */
export function triggerProactiveReminders(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone = "UTC"
): Promise<ReminderEngineResult> {
  // Lancer l'évaluation en tâche de fond isolée
  const backgroundTask = (async (): Promise<ReminderEngineResult> => {
    try {
      return await evaluateSmartReminders(supabase, userId, timezone);
    } catch (err) {
      console.error("[triggerProactiveReminders background error]:", err);
      return { processed: 0, inserted: 0, emailCount: 0, pushCount: 0, resolvedCleanups: 0 };
    }
  })();

  // Support runtime Vercel / Edge waitUntil si disponible
  if (typeof (globalThis as any).waitUntil === "function") {
    try {
      (globalThis as any).waitUntil(backgroundTask);
    } catch (_) {}
  }

  // Fallback sécurisé : capturer toute rejection non gérée
  backgroundTask.catch((err) => {
    console.error("[triggerProactiveReminders unhandled background]:", err);
  });

  // Retourner immédiatement un résultat résolu pour libérer instantanément la Server Action (0 ms)
  return Promise.resolve({
    processed: 0,
    inserted: 0,
    emailCount: 0,
    pushCount: 0,
    resolvedCleanups: 0,
  });
}

/**
 * Moteur de Rappels Automatiques & Centre de Notifications Remind Me.
 *
 * Évalue de manière 100% déterministe et idempotente :
 * 1. Paiements / Encaissements (J-7, J-3, J-2, J-1, Jour J, Overdue quotidien J+1, J+2, J+3...)
 * 2. Dépenses & Dépenses programmées (J-7, J-3, J-2, J-1, Jour J, Overdue quotidien)
 * 3. Activités & Séances du calendrier (J-1, Jour J, H-1, M-30, M-15, séances passées non confirmées)
 * 4. Tâches (J-3, J-2, J-1, Échéances imminentes, tâches du jour, alertes Overdue quotidien)
 * 5. Expiration des contrats & activités (J-7, J-3, J-2, J-1, Terme atteint)
 * 6. Rappel du début de mois & Résumé hebdomadaire
 * 7. Règle d'auto-arrêt (Auto-stop) : Si un paiement est encaissé, une dépense payée, une tâche
 *    ou activité terminée/annulée, aucun nouveau rappel n'est généré et les alertes existantes sont auto-résolues.
 * 8. Respect des préférences, fuseaux horaires, heures silencieuses et distribution Push/Email fiable.
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
  const pushEnabled = prefsData?.push_enabled ?? true;
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
  const [
    { data: receivedIncomes },
    { data: paidExpenses },
    { data: completedTasks },
    { data: resolvedScheduled },
    { data: resolvedEvents },
    { data: archivedActivities },
    { data: snoozedNotifs },
  ] = await Promise.all([
    supabase.from("income").select("id").eq("user_id", userId).eq("received", true),
    supabase.from("expenses").select("id").eq("user_id", userId).eq("paid", true),
    supabase.from("tasks").select("id").eq("user_id", userId).in("status", ["done", "cancelled"]),
    supabase.from("scheduled_expenses").select("id").eq("user_id", userId).in("status", ["paid", "cancelled"]),
    supabase.from("calendar_events").select("id, activity_id").eq("user_id", userId).in("status", ["completed", "cancelled", "missed", "postponed"]),
    supabase.from("activities").select("id").eq("user_id", userId).in("status", ["archived", "suspended", "expired"]),
    supabase.from("notifications").select("id, entity_id, snoozed_until").eq("user_id", userId).eq("status", "snoozed"),
  ]);

  // Set des entités actuellement snoozées
  const activeSnoozeEntityIds = new Set<string>();
  for (const sn of snoozedNotifs ?? []) {
    if (sn.snoozed_until && DateTime.fromISO(sn.snoozed_until) > userNow) {
      if (sn.entity_id) activeSnoozeEntityIds.add(sn.entity_id);
    }
  }

  // Nettoyage immédiat (Auto-Stop) : marquer comme résolues toutes les notifications d'entités closes
  const resolvedEntityIds = [
    ...(receivedIncomes ?? []).map((i) => i.id),
    ...(paidExpenses ?? []).map((e) => e.id),
    ...(completedTasks ?? []).map((t) => t.id),
    ...(resolvedScheduled ?? []).map((s) => s.id),
    ...(resolvedEvents ?? []).map((ev) => ev.id),
    ...(archivedActivities ?? []).map((a) => a.id),
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
  // J-7, J-3, J-2, J-1, Jour J, Overdue quotidien J+1, J+2, J+3...
  // ==========================================================================
  if (prefsData?.payment_reminders !== false) {
    const { data: pendingIncome } = await supabase
      .from("income")
      .select("id, label, amount, currency, due_date, received, activity_id")
      .eq("user_id", userId)
      .eq("received", false)
      .not("due_date", "is", null);

    for (const inc of pendingIncome ?? []) {
      if (inc.received || !inc.due_date || activeSnoozeEntityIds.has(inc.id)) continue;

      const dueDT = DateTime.fromISO(inc.due_date, { zone: userTimezone }).startOf("day");
      const daysDiff = Math.floor(dueDT.diff(userNow.startOf("day"), "days").days);

      const formattedAmount = formatCurrencyLocale(Number(inc.amount), inc.currency, locale);
      const formattedDate = formatDateLocale(inc.due_date, locale, userTimezone);

      if (daysDiff === 7 || daysDiff === 3 || daysDiff === 2) {
        candidates.push({
          user_id: userId,
          category: "payment",
          kind: "payment_upcoming",
          priority: "normal",
          status: "unread",
          entity_type: "income",
          entity_id: inc.id,
          title: `Paiement prévu dans ${daysDiff} jours : ${inc.label}`,
          body: `Un paiement de ${formattedAmount} pour « ${inc.label} » est attendu le ${formattedDate}.`,
          title_key: "notif.payment_upcoming.title",
          body_key: "notif.payment_upcoming.body",
          metadata: { amount: inc.amount, currency: inc.currency, label: inc.label, days: daysDiff },
          link: `/finances`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `payment:${inc.id}:minus_${daysDiff}_days`,
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
          body: `Un paiement de ${formattedAmount} pour « ${inc.label} » est attendu pour demain (${formattedDate}).`,
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
        const overdueTitle = overdueDays === 1
          ? `Paiement en retard (1 jour) : ${inc.label}`
          : `Paiement toujours en retard (${overdueDays}j) : ${inc.label}`;
        const overdueBody = overdueDays === 1
          ? `Le paiement de ${formattedAmount} pour « ${inc.label} » devait être reçu hier (${formattedDate}).`
          : `Le paiement de ${formattedAmount} pour « ${inc.label} » est toujours en attente depuis le ${formattedDate}.`;

        candidates.push({
          user_id: userId,
          category: "payment",
          kind: "payment_overdue",
          priority,
          status: "unread",
          entity_type: "income",
          entity_id: inc.id,
          title: overdueTitle,
          body: overdueBody,
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
  // 4. CYCLE DE VIE DES DÉPENSES (EXPENSES & SCHEDULED EXPENSES)
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
      const formattedDate = formatDateLocale(exp.due_date, locale, userTimezone);

      if (daysDiff === 7 || daysDiff === 3 || daysDiff === 2 || daysDiff === 1) {
        candidates.push({
          user_id: userId,
          category: "expense",
          kind: "expense_upcoming",
          priority: daysDiff === 1 ? "high" : "normal",
          status: "unread",
          entity_type: "expense",
          entity_id: exp.id,
          title: daysDiff === 1
            ? `Facture à régler demain : ${exp.label}`
            : `Facture à régler dans ${daysDiff} jours : ${exp.label}`,
          body: `Une dépense de ${formattedAmount} pour « ${exp.label} » arrive à échéance le ${formattedDate}.`,
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
          title: overdueDays === 1
            ? `Dépense en retard (1 jour) : ${exp.label}`
            : `Dépense en retard (${overdueDays}j) : ${exp.label}`,
          body: `La dépense « ${exp.label} » (${formattedAmount}) a dépassé son échéance du ${formattedDate}.`,
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

      if (daysDiff === 7 || daysDiff === 3 || daysDiff === 2 || daysDiff === 1) {
        candidates.push({
          user_id: userId,
          category: "scheduled_expense",
          kind: "expense_upcoming",
          priority: daysDiff === 1 ? "high" : "normal",
          status: "unread",
          entity_type: "scheduled_expense",
          entity_id: sch.id,
          title: daysDiff === 1
            ? `Facture programmée pour demain : ${sch.name}`
            : `Facture programmée dans ${daysDiff} jours : ${sch.name}`,
          body: `L'échéance de ${formattedAmount} pour « ${sch.name} » est prévue le ${formatDateLocale(sch.next_due_date, locale, userTimezone)}.`,
          metadata: { amount: sch.amount, currency: sch.currency, label: sch.name, frequency: sch.frequency },
          link: `/finances?tab=scheduled`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `scheduled_expense:${sch.id}:${sch.next_due_date}:minus_${daysDiff}_days`,
        });
      } else if (daysDiff === 0) {
        candidates.push({
          user_id: userId,
          category: "scheduled_expense",
          kind: "expense_due_today",
          priority: "high",
          status: "unread",
          entity_type: "scheduled_expense",
          entity_id: sch.id,
          title: `Facture à régler aujourd'hui : ${sch.name}`,
          body: `Facture programmée de ${formattedAmount} pour « ${sch.name} ».`,
          metadata: { amount: sch.amount, currency: sch.currency, label: sch.name },
          link: `/finances?tab=scheduled`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `scheduled_expense:${sch.id}:${sch.next_due_date}:due_today_${todayISO}`,
        });
      } else if (daysDiff < 0) {
        const overdueDays = Math.abs(daysDiff);
        candidates.push({
          user_id: userId,
          category: "scheduled_expense",
          kind: "expense_overdue",
          priority: "high",
          status: "unread",
          entity_type: "scheduled_expense",
          entity_id: sch.id,
          title: `Facture programmée en retard (${overdueDays}j) : ${sch.name}`,
          body: `Facture programmée de ${formattedAmount} pour « ${sch.name} » en attente de règlement.`,
          metadata: { amount: sch.amount, currency: sch.currency, label: sch.name, overdueDays },
          link: `/finances?tab=scheduled`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `scheduled_expense:${sch.id}:${sch.next_due_date}:overdue_${todayISO}`,
        });
      }
    }
  }

  // ==========================================================================
  // 5. CYCLE DE VIE DES ACTIVITÉS & CRÉNEAUX (CALENDAR EVENTS) — Horizon Max 3 Jours
  // ==========================================================================
  if (prefsData?.activity_reminders !== false) {
    const past7daysIso = userNow.minus({ days: 7 }).toUTC().toISO()!;
    // Horizon strict de 3 jours max pour les activités futures (règle standard 3 jours)
    const next3daysIso = userNow.plus({ days: 3 }).endOf("day").toUTC().toISO()!;
    const { data: eventList } = await supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, status, activity_id, activities(id, name)")
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .gte("starts_at", past7daysIso)
      .lte("starts_at", next3daysIso)
      .order("starts_at", { ascending: true });

    for (const evt of eventList ?? []) {
      if (evt.status === "cancelled" || evt.status === "completed" || activeSnoozeEntityIds.has(evt.id)) continue;

      const eventStart = DateTime.fromISO(evt.starts_at, { zone: userTimezone });
      const eventEnd = DateTime.fromISO(evt.ends_at, { zone: userTimezone });
      const minutesUntil = Math.floor(eventStart.diff(userNow, "minutes").minutes);
      const isPast = eventEnd < userNow || eventStart < userNow.minus({ hours: 1 });
      const daysDiff = Math.floor(eventStart.startOf("day").diff(userNow.startOf("day"), "days").days);

      const voiceReminderEnabled = (evt as any).activities?.voice_reminder_enabled !== false;
      const voiceText = generateVoiceMessage({
        userName: profileData?.full_name,
        activityTitle: evt.title,
        timeStr: eventStart.toFormat("HH:mm"),
        category: "activity",
        language: (locale as any) || "fr",
      });

      if (isPast && evt.status === "planned") {
        const daysAgo = Math.max(0, Math.floor(userNow.diff(eventStart, "days").days));
        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_overdue",
          priority: daysAgo >= 1 ? "critical" : "high",
          status: "unread",
          entity_type: "activity",
          entity_id: evt.id,
          title: daysAgo >= 1
            ? `⚠️ Séance non confirmée (${daysAgo}j de retard) : ${evt.title}`
            : `Séance passée : ${evt.title}`,
          body: `Votre séance « ${evt.title} » du ${formatDateLocale(eventStart.toISODate()!, locale, userTimezone)} est terminée. Confirmez sa réalisation.`,
          metadata: {
            title: evt.title,
            starts_at: evt.starts_at,
            daysAgo,
            is_yesterday_overdue: daysAgo >= 1,
            overdue_badge: daysAgo >= 1 ? "danger" : "warning",
            voice_reminder_enabled: voiceReminderEnabled,
            voice_text: voiceText,
          },
          link: `/calendar/${evt.id}`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${evt.id}:passed_${eventStart.toISODate()}`,
        });
      } else if (eventStart.hasSame(userNow, "day") && !isPast) {
        if (minutesUntil <= 35 && minutesUntil >= 20) {
          // Rappel 30 minutes avant
          candidates.push({
            user_id: userId,
            category: "activity",
            kind: "activity_reminder_30m",
            priority: "high",
            status: "unread",
            entity_type: "activity",
            entity_id: evt.id,
            title: `⏰ Dans 30 min : ${evt.title}`,
            body: `Votre activité « ${evt.title} » commence à ${eventStart.toFormat("HH:mm")}. Préparez-vous !`,
            metadata: { title: evt.title, starts_at: evt.starts_at, minutes: minutesUntil, voice_reminder_enabled: voiceReminderEnabled, voice_text: voiceText },
            link: `/calendar/${evt.id}`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: `activity:${evt.id}:m30_${eventStart.toISODate()}`,
          });
        } else if (minutesUntil < 20 && minutesUntil >= 5) {
          // Rappel 15 minutes avant
          candidates.push({
            user_id: userId,
            category: "activity",
            kind: "activity_reminder_15m",
            priority: "critical",
            status: "unread",
            entity_type: "activity",
            entity_id: evt.id,
            title: `⚡ Dans 15 min : ${evt.title}`,
            body: `Votre activité « ${evt.title} » débute dans 15 minutes (à ${eventStart.toFormat("HH:mm")}).`,
            metadata: { title: evt.title, starts_at: evt.starts_at, minutes: minutesUntil, voice_reminder_enabled: voiceReminderEnabled, voice_text: voiceText },
            link: `/calendar/${evt.id}`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: `activity:${evt.id}:m15_${eventStart.toISODate()}`,
          });
        } else if (minutesUntil < 5 && minutesUntil >= -15) {
          // Rappel à l'heure exacte
          candidates.push({
            user_id: userId,
            category: "activity",
            kind: "activity_reminder_now",
            priority: "critical",
            status: "unread",
            entity_type: "activity",
            entity_id: evt.id,
            title: `🎯 C'est l'heure : ${evt.title}`,
            body: `Votre activité « ${evt.title} » commence maintenant (de ${eventStart.toFormat("HH:mm")} à ${eventEnd.toFormat("HH:mm")}).`,
            metadata: { title: evt.title, starts_at: evt.starts_at, minutes: minutesUntil, voice_reminder_enabled: voiceReminderEnabled, voice_text: voiceText },
            link: `/calendar/${evt.id}`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: `activity:${evt.id}:now_${eventStart.toISODate()}`,
          });
        } else if (minutesUntil > 35) {
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
            metadata: { title: evt.title, starts_at: evt.starts_at, voice_reminder_enabled: voiceReminderEnabled, voice_text: voiceText },
            link: `/calendar/${evt.id}`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: `activity:${evt.id}:today_${eventStart.toISODate()}`,
          });
        }
      } else if (daysDiff === 1) {
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
          metadata: { title: evt.title, starts_at: evt.starts_at, days: 1, voice_reminder_enabled: voiceReminderEnabled, voice_text: voiceText },
          link: `/calendar/${evt.id}`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${evt.id}:tomorrow_${eventStart.toISODate()}`,
        });
      } else if (daysDiff === 2 || daysDiff === 3) {
        // Rappel standard 3 jours / 2 jours avant l'activité
        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_upcoming",
          priority: "normal",
          status: "unread",
          entity_type: "activity",
          entity_id: evt.id,
          title: `Séance dans ${daysDiff} jours : ${evt.title}`,
          body: `Votre séance « ${evt.title} » aura lieu le ${formatDateLocale(eventStart.toISODate()!, locale, userTimezone)} à ${eventStart.toFormat("HH:mm")}.`,
          metadata: { title: evt.title, starts_at: evt.starts_at, days: daysDiff, voice_reminder_enabled: voiceReminderEnabled, voice_text: voiceText },
          link: `/calendar/${evt.id}`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${evt.id}:minus_${daysDiff}_days`,
        });
      }
    }
  }

  // ==========================================================================
  // 5.5 EXPIRATION & RENOUVELLEMENT DE CONTRAT D'ACTIVITÉ
  // ==========================================================================
  if (prefsData?.activity_reminders !== false) {
    const { data: userActivities } = await supabase
      .from("activities")
      .select("id, name, end_date, status, activity_compensation(amount, currency)")
      .eq("user_id", userId)
      .eq("status", "active")
      .not("end_date", "is", null);

    for (const act of userActivities ?? []) {
      if (!act.end_date || activeSnoozeEntityIds.has(act.id)) continue;

      const endDT = DateTime.fromISO(act.end_date, { zone: userTimezone }).startOf("day");
      const daysDiff = Math.floor(endDT.diff(userNow.startOf("day"), "days").days);

      if (daysDiff === 7 || daysDiff === 3 || daysDiff === 2 || daysDiff === 1) {
        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_expiring_soon",
          priority: daysDiff === 1 ? "high" : "normal",
          status: "unread",
          entity_type: "activity",
          entity_id: act.id,
          title: `Activité arrivant à terme : ${act.name}`,
          body: `L'activité « ${act.name} » arrive à échéance dans ${daysDiff} jour(s) (le ${formatDateLocale(act.end_date, locale, userTimezone)}).`,
          metadata: { activityId: act.id, name: act.name, endDate: act.end_date, days: daysDiff },
          link: `/activities`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${act.id}:expiring_in_${daysDiff}_days`,
          email_template: "activity_expiring",
        });
      } else if (daysDiff <= 0 && daysDiff >= -14) {
        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_expired",
          priority: "high",
          status: "unread",
          entity_type: "activity",
          entity_id: act.id,
          title: `Activité expirée : ${act.name}`,
          body: `L'activité « ${act.name} » est arrivée à expiration le ${formatDateLocale(act.end_date, locale, userTimezone)}.`,
          metadata: { activityId: act.id, name: act.name, endDate: act.end_date },
          link: `/activities`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${act.id}:expired_${act.end_date}`,
          email_template: "activity_expired",
        });
      }
    }
  }

  // ==========================================================================
  // 6. CYCLE DE VIE DES TÂCHES (TASKS & RAPPELS PROGRAMMÉS)
  // J-3, J-2, J-1, Jour J, Overdue quotidien J+1, J+2...
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
      const daysDiff = Math.floor(dueDT.startOf("day").diff(userNow.startOf("day"), "days").days);

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
          title: overdueDays === 1
            ? `Tâche en retard (1 jour) : ${tsk.title}`
            : `Tâche toujours en retard (${overdueDays}j) : ${tsk.title}`,
          body: `La tâche « ${tsk.title} » est en retard depuis le ${formatDateLocale(tsk.due_date, locale, userTimezone)}.`,
          metadata: { title: tsk.title, priority: tsk.priority, overdueDays },
          link: `/tasks/${tsk.id}/edit`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `task:${tsk.id}:overdue_${todayISO}`,
          email_template: "task_overdue",
        });
      } else if (userNow >= reminderTriggerDT || dueDT.hasSame(userNow, "day")) {
        const minutesUntil = Math.floor(dueDT.diff(userNow, "minutes").minutes);

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
            idempotency_key: `task:${tsk.id}:due_soon_${todayISO}`,
            email_template: "task_reminder",
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
            email_template: "task_due_today",
          });
        }
      } else if (daysDiff === 3 || daysDiff === 2 || daysDiff === 1) {
        candidates.push({
          user_id: userId,
          category: "task",
          kind: "task_upcoming",
          priority: daysDiff === 1 ? "high" : "normal",
          status: "unread",
          entity_type: "task",
          entity_id: tsk.id,
          title: daysDiff === 1
            ? `Tâche pour demain : ${tsk.title}`
            : `Tâche dans ${daysDiff} jours : ${tsk.title}`,
          body: `La tâche « ${tsk.title} » est prévue pour le ${formatDateLocale(tsk.due_date, locale, userTimezone)}.`,
          metadata: { title: tsk.title, priority: tsk.priority, days: daysDiff },
          link: `/tasks/${tsk.id}/edit`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `task:${tsk.id}:minus_${daysDiff}_days`,
          email_template: "task_reminder",
        });
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
  // 8.5 ROUTINE QUOTIDIENNE : BRIEFING DU MATIN (5h-11h), CHECK-IN MIDI (12h-16h) & BILAN DU SOIR (19h-23h59)
  // ==========================================================================

  // 1. Briefing du Matin (05h00 - 11h00) : Récapitulatif proactif du programme du jour
  if (userNow.hour >= 5 && userNow.hour < 11 && prefsData?.daily_summary_enabled !== false) {
    const yesterdayISO = userNow.minus({ days: 1 }).toISODate()!;
    const [
      { data: todayTasks },
      { data: todayEvents },
      { data: todayExpenses },
      { data: todayIncomes },
      { data: yesterdayEvents },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, priority, due_time, status")
        .eq("user_id", userId)
        .eq("due_date", todayISO),
      supabase
        .from("calendar_events")
        .select("id, title, starts_at, status")
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .gte("starts_at", userNow.startOf("day").toISO()!)
        .lte("starts_at", userNow.endOf("day").toISO()!),
      supabase
        .from("scheduled_expenses")
        .select("id, name, amount, currency, status")
        .eq("user_id", userId)
        .eq("next_due_date", todayISO),
      supabase
        .from("income")
        .select("id, label, amount, currency, received")
        .eq("user_id", userId)
        .eq("due_date", todayISO),
      supabase
        .from("calendar_events")
        .select("id, title")
        .eq("user_id", userId)
        .eq("status", "planned")
        .gte("starts_at", userNow.minus({ days: 1 }).startOf("day").toISO()!)
        .lte("starts_at", userNow.minus({ days: 1 }).endOf("day").toISO()!),
    ]);

    const dailyItems: DailyActivityItem[] = [];

    // Calendar events
    for (const ev of todayEvents ?? []) {
      const startDT = DateTime.fromISO(ev.starts_at, { zone: userTimezone });
      dailyItems.push({
        id: ev.id,
        title: ev.title,
        timeStr: startDT.toFormat("HH:mm"),
        status: ev.status === "completed" ? "completed" : "pending",
        category: "activity",
      });
    }

    // Tasks
    for (const tsk of todayTasks ?? []) {
      dailyItems.push({
        id: tsk.id,
        title: `Tâche « ${tsk.title} »`,
        timeStr: tsk.due_time ? tsk.due_time.slice(0, 5) : null,
        status: tsk.status === "done" ? "completed" : "pending",
        category: "task",
      });
    }

    // Scheduled Expenses
    for (const exp of todayExpenses ?? []) {
      dailyItems.push({
        id: exp.id,
        title: `Dépense « ${exp.name} »`,
        status: exp.status === "paid" ? "completed" : "pending",
        category: "expense",
      });
    }

    // Income
    for (const inc of todayIncomes ?? []) {
      dailyItems.push({
        id: inc.id,
        title: `Paiement « ${inc.label} »`,
        status: inc.received ? "completed" : "pending",
        category: "payment",
      });
    }

    // Tri chronologique
    dailyItems.sort((a, b) => {
      if (a.timeStr && b.timeStr) return a.timeStr.localeCompare(b.timeStr);
      if (a.timeStr) return -1;
      if (b.timeStr) return 1;
      return a.title.localeCompare(b.title);
    });

    const pendingCount = dailyItems.filter((i) => i.status !== "completed").length;
    const completedCount = dailyItems.filter((i) => i.status === "completed").length;
    const yesterdayUnconfirmed = yesterdayEvents?.length || 0;

    const voiceLanguage = (locale === "fr" || locale === "en" || locale === "es") ? locale : "fr";
    const morningVoiceScript = generateMorningBriefingVoiceText({
      userName: profileData?.full_name,
      activities: dailyItems,
      language: voiceLanguage,
    });

    const totalCount = dailyItems.length;
    const titleText = totalCount > 0
      ? `🌅 Programme du matin : ${totalCount} activité(s) aujourd'hui`
      : `🌅 Bonjour ${profileData?.full_name?.split(" ")[0] || ""} ! Aucune activité prévue aujourd'hui`;

    const bodyText = totalCount > 0
      ? `Bonjour ! Vous avez ${pendingCount} activité(s) à réaliser${completedCount > 0 ? ` (${completedCount} déjà complétée(s))` : ""}${yesterdayUnconfirmed > 0 ? ` et ⚠️ ${yesterdayUnconfirmed} séance(s) d'hier à confirmer` : ""}. Excellente journée !`
      : `Bonjour ! Vous n'avez aucune activité prévue aujourd'hui. Profitez-en pour organiser votre journée ou vous reposer.`;

    candidates.push({
      user_id: userId,
      category: "summary",
      kind: "morning_briefing",
      priority: yesterdayUnconfirmed > 0 ? "critical" : "high",
      status: "unread",
      entity_type: "summary",
      entity_id: `briefing_${todayISO}`,
      title: titleText,
      body: bodyText,
      metadata: {
        date: todayISO,
        totalCount,
        pendingCount,
        completedCount,
        yesterdayUnconfirmed,
        is_yesterday_overdue: yesterdayUnconfirmed > 0,
        voice_text: morningVoiceScript,
        voice_reminder_enabled: true,
      },
      link: "/dashboard",
      scheduled_at: userNow.toISO()!,
      idempotency_key: `routine:morning_briefing:${todayISO}`,
      email_template: "daily_briefing",
    });
  }

  // 2. Point d'étape & Check-in de Midi (12h00 - 16h00) : Suivi des réalisations et réajustement
  if (userNow.hour >= 12 && userNow.hour < 16 && prefsData?.daily_summary_enabled !== false) {
    const [
      { data: todayTasks },
      { data: todayEvents },
      { data: todayExpenses },
      { data: todayIncomes },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, priority, due_time, status")
        .eq("user_id", userId)
        .eq("due_date", todayISO),
      supabase
        .from("calendar_events")
        .select("id, title, starts_at, status")
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .gte("starts_at", userNow.startOf("day").toISO()!)
        .lte("starts_at", userNow.endOf("day").toISO()!),
      supabase
        .from("scheduled_expenses")
        .select("id, name, amount, currency, status")
        .eq("user_id", userId)
        .eq("next_due_date", todayISO),
      supabase
        .from("income")
        .select("id, label, amount, currency, received")
        .eq("user_id", userId)
        .eq("due_date", todayISO),
    ]);

    const completedItems: DailyActivityItem[] = [];
    const upcomingItems: DailyActivityItem[] = [];
    const overdueItems: DailyActivityItem[] = [];
    const currentHourStr = userNow.toFormat("HH:mm");

    // Events
    for (const ev of todayEvents ?? []) {
      const startDT = DateTime.fromISO(ev.starts_at, { zone: userTimezone });
      const timeStr = startDT.toFormat("HH:mm");
      const item: DailyActivityItem = {
        id: ev.id,
        title: ev.title,
        timeStr,
        category: "activity",
      };
      if (ev.status === "completed") {
        completedItems.push({ ...item, status: "completed" });
      } else if (timeStr < currentHourStr) {
        overdueItems.push({ ...item, status: "overdue" });
      } else {
        upcomingItems.push({ ...item, status: "pending" });
      }
    }

    // Tasks
    for (const tsk of todayTasks ?? []) {
      const timeStr = tsk.due_time ? tsk.due_time.slice(0, 5) : null;
      const item: DailyActivityItem = {
        id: tsk.id,
        title: `Tâche « ${tsk.title} »`,
        timeStr,
        category: "task",
      };
      if (tsk.status === "done") {
        completedItems.push({ ...item, status: "completed" });
      } else if (timeStr && timeStr < currentHourStr) {
        overdueItems.push({ ...item, status: "overdue" });
      } else {
        upcomingItems.push({ ...item, status: "pending" });
      }
    }

    // Expenses
    for (const exp of todayExpenses ?? []) {
      const item: DailyActivityItem = {
        id: exp.id,
        title: `Dépense « ${exp.name} »`,
        category: "expense",
      };
      if (exp.status === "paid") {
        completedItems.push({ ...item, status: "completed" });
      } else {
        upcomingItems.push({ ...item, status: "pending" });
      }
    }

    // Income
    for (const inc of todayIncomes ?? []) {
      const item: DailyActivityItem = {
        id: inc.id,
        title: `Paiement « ${inc.label} »`,
        category: "payment",
      };
      if (inc.received) {
        completedItems.push({ ...item, status: "completed" });
      } else {
        upcomingItems.push({ ...item, status: "pending" });
      }
    }

    const totalCount = completedItems.length + upcomingItems.length + overdueItems.length;
    const voiceLanguage = (locale === "fr" || locale === "en" || locale === "es") ? locale : "fr";
    const middayVoiceScript = generateMiddayCheckinVoiceText({
      userName: profileData?.full_name,
      completedActivities: completedItems,
      upcomingActivities: upcomingItems,
      overdueActivities: overdueItems,
      language: voiceLanguage,
    });

    const titleText = totalCount > 0
      ? `☀️ Point de mi-journée : ${completedItems.length}/${totalCount} activité(s) complétée(s)`
      : `☀️ Point de mi-journée : Bonne continuation !`;

    const bodyText = totalCount > 0
      ? `Bravo pour votre progression ! ${completedItems.length} terminée(s), ${upcomingItems.length} à venir.${overdueItems.length > 0 ? ` ⚠️ ${overdueItems.length} en attente de vérification.` : ""}`
      : `Tout est calme à mi-journée. Passez un excellent après-midi !`;

    candidates.push({
      user_id: userId,
      category: "summary",
      kind: "midday_checkin",
      priority: overdueItems.length > 0 ? "high" : "normal",
      status: "unread",
      entity_type: "summary",
      entity_id: `midday_${todayISO}`,
      title: titleText,
      body: bodyText,
      metadata: {
        date: todayISO,
        totalCount,
        completedCount: completedItems.length,
        upcomingCount: upcomingItems.length,
        overdueCount: overdueItems.length,
        voice_text: middayVoiceScript,
        voice_reminder_enabled: true,
      },
      link: "/dashboard",
      scheduled_at: userNow.toISO()!,
      idempotency_key: `routine:midday_checkin:${todayISO}`,
      email_template: "midday_checkin",
    });
  }

  // 3. Bilan & Débriefing du Soir (19h00 - 23h59) : Clôture de journée et félicitations
  if (userNow.hour >= 19 && prefsData?.daily_summary_enabled !== false) {
    const [
      { data: todayTasks },
      { data: todayEvents },
      { data: todayExpenses },
      { data: todayIncomes },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, status")
        .eq("user_id", userId)
        .eq("due_date", todayISO),
      supabase
        .from("calendar_events")
        .select("id, title, starts_at, status")
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .gte("starts_at", userNow.startOf("day").toISO()!)
        .lte("starts_at", userNow.endOf("day").toISO()!),
      supabase
        .from("scheduled_expenses")
        .select("id, name, status")
        .eq("user_id", userId)
        .eq("next_due_date", todayISO),
      supabase
        .from("income")
        .select("id, label, received")
        .eq("user_id", userId)
        .eq("due_date", todayISO),
    ]);

    const completedItems: DailyActivityItem[] = [];
    const uncompletedItems: DailyActivityItem[] = [];

    // Events
    for (const ev of todayEvents ?? []) {
      const item: DailyActivityItem = { id: ev.id, title: ev.title, category: "activity" };
      if (ev.status === "completed") {
        completedItems.push({ ...item, status: "completed" });
      } else {
        uncompletedItems.push({ ...item, status: "pending" });
      }
    }

    // Tasks
    for (const tsk of todayTasks ?? []) {
      const item: DailyActivityItem = { id: tsk.id, title: `Tâche « ${tsk.title} »`, category: "task" };
      if (tsk.status === "done") {
        completedItems.push({ ...item, status: "completed" });
      } else {
        uncompletedItems.push({ ...item, status: "pending" });
      }
    }

    // Expenses
    for (const exp of todayExpenses ?? []) {
      const item: DailyActivityItem = { id: exp.id, title: `Dépense « ${exp.name} »`, category: "expense" };
      if (exp.status === "paid") {
        completedItems.push({ ...item, status: "completed" });
      } else {
        uncompletedItems.push({ ...item, status: "pending" });
      }
    }

    // Income
    for (const inc of todayIncomes ?? []) {
      const item: DailyActivityItem = { id: inc.id, title: `Paiement « ${inc.label} »`, category: "payment" };
      if (inc.received) {
        completedItems.push({ ...item, status: "completed" });
      } else {
        uncompletedItems.push({ ...item, status: "pending" });
      }
    }

    const totalCount = completedItems.length + uncompletedItems.length;
    const voiceLanguage = (locale === "fr" || locale === "en" || locale === "es") ? locale : "fr";
    const eveningVoiceScript = generateEveningSummaryVoiceText({
      userName: profileData?.full_name,
      completedActivities: completedItems,
      uncompletedActivities: uncompletedItems,
      language: voiceLanguage,
    });

    const titleText = totalCount > 0
      ? `🌙 Bilan du soir : ${completedItems.length} accomplie(s), ${uncompletedItems.length} en attente`
      : `🌙 Bilan du soir : Excellente soirée !`;

    const bodyText = uncompletedItems.length === 0 && completedItems.length > 0
      ? `Félicitations ! Toutes vos activités prévues aujourd'hui sont terminées avec succès. Reposez-vous bien !`
      : uncompletedItems.length > 0
      ? `Il vous reste ${uncompletedItems.length} élément(s) en attente. Marquez-les comme faits si réalisés pour clore sereinement votre journée.`
      : `Aucune activité particulière aujourd'hui. Passez une excellente soirée !`;

    candidates.push({
      user_id: userId,
      category: "summary",
      kind: "evening_checkin",
      priority: uncompletedItems.length > 0 ? "high" : "normal",
      status: "unread",
      entity_type: "summary",
      entity_id: `checkin_${todayISO}`,
      title: titleText,
      body: bodyText,
      metadata: {
        date: todayISO,
        totalCount,
        completedCount: completedItems.length,
        uncompletedCount: uncompletedItems.length,
        voice_text: eveningVoiceScript,
        voice_reminder_enabled: true,
      },
      link: "/dashboard",
      scheduled_at: userNow.toISO()!,
      idempotency_key: `routine:evening_checkin:${todayISO}`,
      email_template: "evening_checkin",
    });
  }

  // ==========================================================================
  // 9. ENREGISTREMENT IDEMPOTENT DANS LA TABLE NOTIFICATIONS
  // ==========================================================================
  let insertedCount = 0;

  if (candidates.length > 0) {
    const candidateKeys = candidates.map((c) => c.idempotency_key);
    const { data: existingRows } = await supabase
      .from("notifications")
      .select("idempotency_key")
      .eq("user_id", userId)
      .in("idempotency_key", candidateKeys);

    const existingKeySet = new Set((existingRows ?? []).map((r) => r.idempotency_key));
    const newCandidates = candidates.filter((c) => !existingKeySet.has(c.idempotency_key));

    if (newCandidates.length > 0) {
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
      } else {
        insertedCount = insertedRows?.length ?? 0;
      }
    }
  }

  // ==========================================================================
  // 10. DISPATCH MULTI-CANAUX (EMAIL & PUSH) AVEC VÉRIFICATION D'IDEMPOTENCE
  // ==========================================================================
  let emailCount = 0;
  let pushCount = 0;

  if (candidates.length > 0) {
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

    for (const cand of candidates) {
      const allowImmediateExternal = !quietHoursActive || cand.priority === "critical";

      // 1. Envoi E-mail (avec idempotence via notification_logs)
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

      // 2. Envoi Web Push réel (avec idempotence via notification_logs)
      if (pushEnabled && allowImmediateExternal) {
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
  }

  return {
    processed: candidates.length,
    inserted: insertedCount,
    emailCount,
    pushCount,
    resolvedCleanups,
  };
}

/**
 * Traitement en lot pour le Cron Scheduler d'arrière-plan.
 * Parcourt tous les profils actifs et déclenche l'évaluation des rappels.
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
