import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import type { Database, NotificationPriority, SupportedLocale } from "@/types/database";
import { t, formatCurrencyLocale, formatDateLocale } from "@/lib/i18n/format";
import { getTrFor } from "@/lib/i18n/catalog";
import { sendNotificationEmail } from "@/lib/email/service";
import { sendNotificationPush } from "@/lib/push/service";
import { ensureCalendarEvents } from "@/lib/calendar/sync";
import { getUserTimezone } from "@/lib/time/timezones";
import {
  generateVoiceMessage,
  generateMorningBriefingVoiceText,
  generateMiddayCheckinVoiceText,
  generateEveningSummaryVoiceText,
  type DailyActivityItem,
} from "@/lib/voice";
import { createInternalMessage } from "@/lib/messages/service";
import { evaluateActivityEvolutionSuggestions } from "@/lib/activities/evolution";
import { activityContextPhrase, activitySectorKey } from "@/lib/activities/classification";
import {
  isInQuietHours,
  activitySlotKey,
  legacyActivitySlotKey,
  isTaskDueSoon,
  shouldDeferPush,
  isDeferredPushStillRelevant,
  pushTagFor,
  resolveActivityLeads,
  LEAD_LATE_TOLERANCE_MINUTES,
} from "@/lib/notifications/reminder-rules";

export { isInQuietHours };

export interface ReminderCandidate {
  user_id: string;
  category: "activity" | "task" | "payment" | "expense" | "scheduled_expense" | "finance" | "security" | "summary" | "system" | "goal";
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
  /** Anciennes formes de la même clé : si l'une existe déjà, le rappel est considéré comme envoyé. */
  legacy_keys?: string[];
  email_template?: string;
}

export interface ReminderEngineResult {
  processed: number;
  inserted: number;
  emailCount: number;
  pushCount: number;
  /** Rappels dont le push n'a atteint aucun appareil (relancés au cycle suivant). */
  pushFailedCount?: number;
  resolvedCleanups: number;
  errors?: string[];
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
      actioned_at: nowIso,
      read_at: nowIso,
    })
    .or(`entity_id.eq.${entityId},id.eq.${entityId}`)
    .neq("status", "resolved");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  let { data, error } = await query.select("id");
  if (error) {
    console.warn("[resolveEntityNotifications] Standard update error, trying fallback:", error);
    let fallbackQuery = supabase
      .from("notifications")
      .update({
        status: "dismissed",
        read_at: nowIso,
      })
      .or(`entity_id.eq.${entityId},id.eq.${entityId}`)
      .neq("status", "dismissed");

    if (userId) fallbackQuery = fallbackQuery.eq("user_id", userId);
    const fbRes = await fallbackQuery.select("id");
    return fbRes.data?.length ?? 0;
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
      actioned_at: nowIso,
      read_at: nowIso,
    })
    .eq("entity_id", entityId)
    .in("status", ["unread", "read", "snoozed"]);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  let { data, error } = await query.select("id");
  if (error) {
    console.warn("[invalidateOutdatedEntityReminders] Standard update error, trying fallback:", error);
    let fallbackQuery = supabase
      .from("notifications")
      .update({
        status: "dismissed",
        read_at: nowIso,
      })
      .eq("entity_id", entityId)
      .in("status", ["unread", "read", "snoozed"]);

    if (userId) fallbackQuery = fallbackQuery.eq("user_id", userId);
    const fbRes = await fallbackQuery.select("id");
    return fbRes.data?.length ?? 0;
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
 * Envoie, à la fin des heures silencieuses, les push qui avaient été reportés.
 * - Seuls les rappels encore utiles partent (pas un « dans 10 minutes » dont l'heure est passée).
 * - Au plus 2 push individuels ; au-delà, un seul récapitulatif pour ne pas réveiller le téléphone en rafale.
 * - Chaque rappel n'est traité qu'une fois (indicateur retiré, idempotence des push conservée).
 */
async function flushDeferredPushes(
  supabase: SupabaseClient<Database>,
  userId: string,
  userNow: DateTime,
  tr: (s: string, p?: Record<string, string | number>) => string,
  actionLabels: { read: string; listen: string; open: string }
): Promise<number> {
  const since = userNow.minus({ hours: 14 }).toUTC().toISO()!;
  const { data: deferred } = await supabase
    .from("notifications")
    .select("id, kind, category, title, body, link, metadata, created_at, idempotency_key, status")
    .eq("user_id", userId)
    .gte("created_at", since)
    .contains("metadata", { push_deferred: true } as any)
    .order("created_at", { ascending: true })
    .limit(50);
  if (!deferred || deferred.length === 0) return 0;

  const useful = deferred.filter(
    (n: any) => (n.status === "unread" || n.status === "read") && isDeferredPushStillRelevant(n, userNow)
  );
  let sent = 0;
  if (useful.length > 0 && useful.length <= 2) {
    for (const n of useful as any[]) {
      const res = await sendNotificationPush(
        {
          userId,
          title: n.title,
          body: n.body,
          link: n.link,
          category: n.category,
          idempotencyKey: `push:${n.idempotency_key}`,
          metadata: { ...(n.metadata ?? {}), kind: n.kind, notificationId: n.id },
          tag: pushTagFor(n.idempotency_key, n.category),
          actionLabels,
        },
        supabase
      );
      if (res.success) sent += res.deliveredCount;
    }
  } else if (useful.length > 2) {
    const res = await sendNotificationPush(
      {
        userId,
        title: tr("{count} rappels pendant vos heures silencieuses", { count: useful.length }),
        body: tr("Touchez pour les consulter."),
        link: "/notifications",
        category: "summary",
        idempotencyKey: `push:quiet_digest:${userId}:${userNow.toISODate()}:${useful.length}:${(useful[useful.length - 1] as any).id}`,
        metadata: { kind: "quiet_hours_digest", voice_reminder_enabled: false },
        tag: `quiet_digest_${userNow.toISODate()}`,
        actionLabels,
      },
      supabase
    );
    if (res.success) sent += res.deliveredCount;
  }

  // Indicateur retiré pour tous (envoyés, récapitulés ou devenus inutiles) : jamais traités deux fois
  for (const n of deferred as any[]) {
    const { push_deferred: _drop, ...rest } = (n.metadata ?? {}) as Record<string, any>;
    await supabase.from("notifications").update({ metadata: rest } as any).eq("id", n.id).eq("user_id", userId);
  }
  return sent;
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
  // 1. Récupération des préférences utilisateur & profil
  const [{ data: prefsData }, { data: profileData }] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, default_currency, timezone, country_code, locale, created_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const userTimezone = profileData?.timezone || (timezone !== "UTC" ? timezone : getUserTimezone(profileData));
  const userNow = DateTime.now().setZone(userTimezone);
  const todayISO = userNow.toISODate();
  if (!todayISO) {
    return { processed: 0, inserted: 0, emailCount: 0, pushCount: 0, resolvedCleanups: 0 };
  }
  const locale: SupportedLocale = prefsData?.preferred_locale ?? (profileData?.locale as SupportedLocale) ?? "fr";
  // Rappels rédigés dans la langue choisie par l'utilisateur (titres, textes, e-mails, push)
  const tr = await getTrFor(locale);
  const voiceLang: "fr" | "en" | "es" = (locale === "fr" || locale === "en" || locale === "es") ? locale : "fr";
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
    supabase.from("scheduled_expenses").select("id, status, end_date, next_due_date").eq("user_id", userId),
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

  // Événements d'activités archivées, suspendues ou expirées : à auto-résoudre immédiatement
  const inactiveActivityIds = (archivedActivities ?? []).map((a) => a.id);
  let inactiveEventIds: string[] = [];
  if (inactiveActivityIds.length > 0) {
    const { data: inactEvents } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("user_id", userId)
      .in("activity_id", inactiveActivityIds);
    inactiveEventIds = (inactEvents ?? []).map((ev) => ev.id);
  }

  // Dépenses programmées closes ou dont le contrat est expiré
  const resolvedScheduledIds = (resolvedScheduled ?? [])
    .filter((s: any) => s.status === "paid" || s.status === "cancelled" || (s.end_date && s.next_due_date > s.end_date))
    .map((s: any) => s.id);

  // Nettoyage immédiat (Auto-Stop) : marquer comme résolues toutes les notifications d'entités closes
  const resolvedEntityIds = [
    ...(receivedIncomes ?? []).map((i) => i.id),
    ...(paidExpenses ?? []).map((e) => e.id),
    ...(completedTasks ?? []).map((t) => t.id),
    ...resolvedScheduledIds,
    ...(resolvedEvents ?? []).map((ev) => ev.id),
    ...inactiveEventIds,
    ...inactiveActivityIds,
  ];

  if (resolvedEntityIds.length > 0) {
    const { data: cleaned, error: cleanErr } = await supabase
      .from("notifications")
      .update({
        status: "resolved",
        resolved_at: userNow.toISO()!,
        actioned_at: userNow.toISO()!,
        read_at: userNow.toISO()!,
      })
      .eq("user_id", userId)
      .in("entity_id", resolvedEntityIds)
      .neq("status", "resolved")
      .select("id");

    if (cleanErr) {
      const fbClean = await supabase
        .from("notifications")
        .update({
          status: "dismissed",
          read_at: userNow.toISO()!,
        })
        .eq("user_id", userId)
        .in("entity_id", resolvedEntityIds)
        .neq("status", "dismissed")
        .select("id");
      resolvedCleanups += fbClean.data?.length ?? 0;
    } else {
      resolvedCleanups += cleaned?.length ?? 0;
    }
  }

  // ==========================================================================
  // 3. CYCLE DE VIE DES PAIEMENTS / ENCAISSEMENTS (INCOME)
  // J-7, J-3, J-2, J-1, Jour J, Overdue quotidien J+1, J+2, J+3...
  // ==========================================================================
  if (prefsData?.payment_reminders !== false) {
    const { data: pendingIncome } = await supabase
      .from("income")
      .select("id, label, amount, currency, due_date, received, activity_id, activities(id, name)")
      .eq("user_id", userId)
      .eq("received", false)
      .not("due_date", "is", null);

    for (const inc of pendingIncome ?? []) {
      if (inc.received || !inc.due_date || activeSnoozeEntityIds.has(inc.id)) continue;

      const dueDT = DateTime.fromISO(inc.due_date, { zone: userTimezone }).startOf("day");
      const daysDiff = Math.floor(dueDT.diff(userNow.startOf("day"), "days").days);

      const formattedAmount = formatCurrencyLocale(Number(inc.amount), inc.currency, locale);
      const formattedDate = formatDateLocale(inc.due_date, locale, userTimezone);
      const activityName = (inc as any).activities?.name || inc.label;

      if (daysDiff === 7 || daysDiff === 3 || daysDiff === 2) {
        const voiceScript = generateVoiceMessage({
          userName: profileData?.full_name,
          activityTitle: activityName,
          category: "payment",
          amount: Number(inc.amount),
          currency: inc.currency,
          daysDiff,
          language: voiceLang,
          hideAmount: (prefsData as any)?.voice_hide_financial_amounts ?? false,
          includeUserName: (prefsData as any)?.voice_include_user_name ?? true,
        });

        const bodyText = daysDiff === 3
          ? tr("Bonjour, vous devez recevoir {formattedAmount} de votre activité « {activityName} » dans trois jours.", { formattedAmount, activityName })
          : tr("Un paiement de {formattedAmount} pour « {label} » est attendu le {formattedDate}.", { formattedAmount, label: inc.label, formattedDate });

        candidates.push({
          user_id: userId,
          category: "payment",
          kind: "payment_upcoming",
          priority: "normal",
          status: "unread",
          entity_type: "income",
          entity_id: inc.id,
          title: tr("Paiement prévu dans {daysDiff} jours : {label}", { daysDiff, label: inc.label }),
          body: bodyText,
          title_key: "notif.payment_upcoming.title",
          body_key: "notif.payment_upcoming.body",
          metadata: {
            amount: inc.amount,
            currency: inc.currency,
            label: inc.label,
            activityName,
            days: daysDiff,
            is_financial: true,
            is_informative: true,
            voice_reminder_enabled: true,
            voice_text: voiceScript,
          },
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
          title: tr("Paiement prévu demain : {label}", { label: inc.label }),
          body: tr("Un paiement de {formattedAmount} pour « {label} » est attendu pour demain ({formattedDate}).", { formattedAmount, label: inc.label, formattedDate }),
          title_key: "notif.payment_upcoming.title",
          body_key: "notif.payment_upcoming.body",
          metadata: {
            amount: inc.amount,
            currency: inc.currency,
            label: inc.label,
            activityName,
            days: 1,
            is_financial: true,
            is_informative: true,
          },
          link: `/finances`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `payment:${inc.id}:minus_1_day`,
          email_template: "payment_upcoming",
        });
      } else if (daysDiff === 0) {
        const voiceScript = generateVoiceMessage({
          userName: profileData?.full_name,
          activityTitle: activityName,
          category: "payment",
          amount: Number(inc.amount),
          currency: inc.currency,
          daysDiff: 0,
          language: voiceLang,
          hideAmount: (prefsData as any)?.voice_hide_financial_amounts ?? false,
          includeUserName: (prefsData as any)?.voice_include_user_name ?? true,
        });

        candidates.push({
          user_id: userId,
          category: "payment",
          kind: "payment_due_today",
          priority: "high",
          status: "unread",
          entity_type: "income",
          entity_id: inc.id,
          title: tr("Paiement attendu aujourd'hui : {label}", { label: inc.label }),
          body: tr("Bonjour, aujourd'hui est la date prévue pour recevoir {formattedAmount} de votre activité « {activityName} ».", { formattedAmount, activityName }),
          title_key: "notif.payment_due_today.title",
          body_key: "notif.payment_due_today.body",
          metadata: {
            amount: inc.amount,
            currency: inc.currency,
            label: inc.label,
            activityName,
            days: 0,
            is_financial: true,
            is_informative: true,
            voice_reminder_enabled: true,
            voice_text: voiceScript,
          },
          link: `/finances`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `payment:${inc.id}:due_today_${todayISO}`,
          email_template: "payment_due_today",
        });
      } else if (daysDiff < 0) {
        const overdueDays = Math.abs(daysDiff);
        const priority: NotificationPriority = overdueDays >= 7 ? "critical" : "high";
        const overdueTitle = overdueDays === 1
          ? tr("Paiement en retard (1 jour) : {label}", { label: inc.label })
          : tr("Paiement toujours en retard ({overdueDays}j) : {label}", { overdueDays, label: inc.label });
        const overdueBody = overdueDays === 1
          ? tr("Le paiement de {formattedAmount} pour « {label} » devait être reçu hier ({formattedDate}).", { formattedAmount, label: inc.label, formattedDate })
          : tr("Le paiement de {formattedAmount} pour « {label} » est toujours en attente depuis le {formattedDate}.", { formattedAmount, label: inc.label, formattedDate });

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
            ? tr("Facture à régler demain : {label}", { label: exp.label })
            : tr("Facture à régler dans {daysDiff} jours : {label}", { daysDiff, label: exp.label }),
          body: tr("Une dépense de {formattedAmount} pour « {label} » arrive à échéance le {formattedDate}.", { formattedAmount, label: exp.label, formattedDate }),
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
          title: tr("Dépense à régler aujourd'hui : {label}", { label: exp.label }),
          body: tr("La facture « {label} » ({formattedAmount}) doit être réglée aujourd'hui.", { label: exp.label, formattedAmount }),
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
            ? tr("Dépense en retard (1 jour) : {label}", { label: exp.label })
            : tr("Dépense en retard ({overdueDays}j) : {label}", { overdueDays, label: exp.label }),
          body: tr("La dépense « {label} » ({formattedAmount}) a dépassé son échéance du {formattedDate}.", { label: exp.label, formattedAmount, formattedDate }),
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
      .select("id, name, amount, currency, next_due_date, end_date, status, frequency")
      .eq("user_id", userId)
      .in("status", ["planned", "due"])
      .not("next_due_date", "is", null);

    for (const sch of scheduledList ?? []) {
      if (!sch.next_due_date || activeSnoozeEntityIds.has(sch.id)) continue;

      // Respect strict des dates de contrat et d'expiration des dépenses récurrentes
      if (sch.end_date && sch.next_due_date > sch.end_date) {
        continue;
      }

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
            ? tr("Facture programmée pour demain : {name}", { name: sch.name })
            : tr("Facture programmée dans {daysDiff} jours : {name}", { daysDiff, name: sch.name }),
          body: tr("L'échéance de {formattedAmount} pour « {name} » est prévue le {v2}.", { formattedAmount, name: sch.name, v2: formatDateLocale(sch.next_due_date, locale, userTimezone) }),
          metadata: { amount: sch.amount, currency: sch.currency, label: sch.name, frequency: sch.frequency, days: daysDiff },
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
          title: tr("Facture à régler aujourd'hui : {name}", { name: sch.name }),
          body: tr("Facture programmée de {formattedAmount} pour « {name} ».", { formattedAmount, name: sch.name }),
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
          title: tr("Facture programmée en retard ({overdueDays}j) : {name}", { overdueDays, name: sch.name }),
          body: tr("Facture programmée de {formattedAmount} pour « {name} » en attente de règlement.", { formattedAmount, name: sch.name }),
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
    // Délai propre à l'activité (colonne de la migration 0030) : si elle n'existe pas encore, requête sans elle
    const eventQuery = (withLead: boolean) =>
      supabase
        .from("calendar_events")
        .select(
          `id, title, starts_at, ends_at, status, activity_id, activities(id, name, category, voice_reminder_enabled, reminder_preference, engagement_nature, validity_type, start_date, end_date, status${withLead ? ", reminder_lead_minutes" : ""})`
        )
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .gte("starts_at", past7daysIso)
        .lte("starts_at", next3daysIso)
        .order("starts_at", { ascending: true });
    let { data: eventList, error: eventErr } = await eventQuery(true);
    if (eventErr) ({ data: eventList } = await eventQuery(false));

    for (const evt of eventList ?? []) {
      if (
        evt.status === "cancelled" ||
        evt.status === "completed" ||
        evt.status === "missed" ||
        evt.status === "postponed" ||
        activeSnoozeEntityIds.has(evt.id)
      ) continue;

      const actData = evt.activities as {
        id?: string;
        name?: string;
        voice_reminder_enabled?: boolean;
        reminder_preference?: string;
        engagement_nature?: string;
        validity_type?: string;
        start_date?: string | null;
        end_date?: string | null;
        status?: string;
        reminder_lead_minutes?: number | null;
        category?: string | null;
      } | null;
      // Domaine de l'activité (classification) : phrase vocale et texte du rappel contextuels
      const activityContext = actData?.category ?? null;
      const contextLabel = activityContextPhrase(activityContext);
      const activityDomain = activitySectorKey(activityContext);
      const isFrench = !locale || String(locale).startsWith("fr");

      // 1. Activité parente inactive, expirée ou archivée -> stopper les rappels de séance
      if (actData?.status && actData.status !== "active") {
        continue;
      }

      // 2. Activité temporaire : aucun rappel au-delà de sa période de validité
      if (actData?.validity_type === "temporary" && actData?.end_date) {
        const actEndDT = DateTime.fromISO(actData.end_date, { zone: userTimezone }).endOf("day");
        const evtStartDT = DateTime.fromISO(evt.starts_at, { zone: userTimezone });
        if (evtStartDT > actEndDT) {
          continue;
        }
      }

      // 2b. Respect strict de la date de début de l'activité (aucun rappel avant début officiel)
      if (actData?.start_date) {
        const actStartDT = DateTime.fromISO(actData.start_date, { zone: userTimezone }).startOf("day");
        const evtStartDT = DateTime.fromISO(evt.starts_at, { zone: userTimezone });
        if (evtStartDT < actStartDT) {
          continue;
        }
      }

      // 3. Préférence de rappel 'disabled' : blocage strict des séances
      if (actData?.reminder_preference === "disabled") {
        continue;
      }

      const eventStart = DateTime.fromISO(evt.starts_at, { zone: userTimezone });
      const eventEnd = DateTime.fromISO(evt.ends_at, { zone: userTimezone });
      const minutesUntil = Math.floor(eventStart.diff(userNow, "minutes").minutes);
      const isPast = eventEnd < userNow || eventStart < userNow.minus({ hours: 1 });
      const daysDiff = Math.floor(eventStart.startOf("day").diff(userNow.startOf("day"), "days").days);

      const isImportant = actData?.engagement_nature === "important";
      const isRoutine = actData?.engagement_nature === "routine";
      const isRecommended = actData?.reminder_preference === "recommended";

      // Délai de l'activité, sinon délai général ; un seul rappel si les deux seraient presque simultanés
      const { first: firstLead, second: secondLead } = resolveActivityLeads(
        actData?.reminder_lead_minutes,
        (prefsData as any)?.first_reminder_minutes,
        (prefsData as any)?.second_reminder_minutes
      );

      const voiceReminderEnabled = (evt as any).activities?.voice_reminder_enabled !== false;
      const voiceText = generateVoiceMessage({
        userName: profileData?.full_name,
        activityTitle: evt.title,
        timeStr: eventStart.toFormat("HH:mm"),
        category: "activity",
        language: (locale as any) || "fr",
        includeUserName: (prefsData as any)?.voice_include_user_name ?? true,
      });

      if (isPast && evt.status === "planned") {
        const daysAgo = Math.max(0, Math.floor(userNow.diff(eventStart, "days").days));
        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_overdue",
          priority: daysAgo >= 1 || isImportant ? "critical" : "high",
          status: "unread",
          entity_type: "activity",
          entity_id: evt.id,
          title: daysAgo >= 1
            ? tr("⚠️ Séance non confirmée ({daysAgo}j de retard) : {title}", { daysAgo, title: evt.title })
            : tr("Séance passée : {title}", { title: evt.title }),
          body: tr("Votre séance « {title} » du {v1} est terminée. Confirmez sa réalisation.", { title: evt.title, v1: formatDateLocale(eventStart.toISODate()!, locale, userTimezone) }),
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
        // Fenêtre : à partir de N minutes avant (jamais en avance), rattrapage possible pendant 10 minutes
        if (firstLead > 0 && minutesUntil <= firstLead && minutesUntil >= Math.max(secondLead + 1, firstLead - LEAD_LATE_TOLERANCE_MINUTES)) {
          // 1er rappel vocal (par défaut 30 min avant)
          const voiceText1 = generateVoiceMessage({
            userName: profileData?.full_name,
            activityTitle: evt.title,
            timeStr: eventStart.toFormat("HH:mm"),
            category: "activity",
            leadMinutes: firstLead,
            activityContext,
            language: (locale as any) || "fr",
            includeUserName: (prefsData as any)?.voice_include_user_name ?? true,
          });
          candidates.push({
            user_id: userId,
            category: "activity",
            kind: `activity_reminder_${firstLead}m`,
            priority: isImportant ? "critical" : "high",
            status: "unread",
            entity_type: "activity",
            entity_id: evt.id,
            title: tr("⏰ Dans {firstLead} min : {title}", { firstLead, title: evt.title }),
            body: contextLabel && isFrench
              ? `${contextLabel} « ${evt.title} » commence à ${eventStart.toFormat("HH:mm")}. Pensez à vous préparer.`
              : tr("Votre activité « {title} » commence à {v1}. Préparez-vous tranquillement, votre session approche.", { title: evt.title, v1: eventStart.toFormat("HH:mm") }),
            metadata: {
              title: evt.title,
              starts_at: evt.starts_at,
              minutes: minutesUntil,
              leadMinutes: firstLead,
              activity_domain: activityDomain,
              voice_reminder_enabled: voiceReminderEnabled,
              voice_text: voiceText1,
              is_informative: true,
            },
            link: `/calendar/${evt.id}`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: activitySlotKey(evt.id, `m${firstLead}`, eventStart),
            legacy_keys: [legacyActivitySlotKey(evt.id, `m${firstLead}`, eventStart)],
          });
        } else if (minutesUntil <= secondLead && minutesUntil >= 3) {
          // 2nd rappel vocal (par défaut 10 min avant)
          const voiceText2 = generateVoiceMessage({
            userName: profileData?.full_name,
            activityTitle: evt.title,
            timeStr: eventStart.toFormat("HH:mm"),
            category: "activity",
            leadMinutes: secondLead,
            activityContext,
            language: (locale as any) || "fr",
            includeUserName: (prefsData as any)?.voice_include_user_name ?? true,
          });
          candidates.push({
            user_id: userId,
            category: "activity",
            kind: `activity_reminder_${secondLead}m`,
            priority: "critical",
            status: "unread",
            entity_type: "activity",
            entity_id: evt.id,
            title: tr("⚡ Dans {secondLead} min : {title}", { secondLead, title: evt.title }),
            body: contextLabel && isFrench
              ? `${contextLabel} « ${evt.title} » commence dans ${secondLead} minutes (à ${eventStart.toFormat("HH:mm")}).`
              : tr("Votre séance « {title} » débute dans {secondLead} minutes (à {v2}).", { title: evt.title, secondLead, v2: eventStart.toFormat("HH:mm") }),
            metadata: {
              title: evt.title,
              starts_at: evt.starts_at,
              minutes: minutesUntil,
              leadMinutes: secondLead,
              activity_domain: activityDomain,
              voice_reminder_enabled: voiceReminderEnabled,
              voice_text: voiceText2,
              is_informative: true,
            },
            link: `/calendar/${evt.id}`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: activitySlotKey(evt.id, `m${secondLead}`, eventStart),
            legacy_keys: [legacyActivitySlotKey(evt.id, `m${secondLead}`, eventStart)],
          });
        } else if (minutesUntil < 3 && minutesUntil >= -15) {
          // Rappel à l'heure exacte (T - 0 min)
          const voiceTextNow = generateVoiceMessage({
            userName: profileData?.full_name,
            activityTitle: evt.title,
            timeStr: eventStart.toFormat("HH:mm"),
            category: "activity",
            leadMinutes: 0,
            activityContext,
            language: (locale as any) || "fr",
            includeUserName: (prefsData as any)?.voice_include_user_name ?? true,
          });
          candidates.push({
            user_id: userId,
            category: "activity",
            kind: "activity_reminder_now",
            priority: "critical",
            status: "unread",
            entity_type: "activity",
            entity_id: evt.id,
            title: tr("🎯 C'est l'heure : {title}", { title: evt.title }),
            body: contextLabel && isFrench
              ? `${contextLabel} « ${evt.title} » commence maintenant (de ${eventStart.toFormat("HH:mm")} à ${eventEnd.toFormat("HH:mm")}).`
              : tr("Votre activité « {title} » commence maintenant (de {v1} à {v2}).", { title: evt.title, v1: eventStart.toFormat("HH:mm"), v2: eventEnd.toFormat("HH:mm") }),
            metadata: {
              title: evt.title,
              starts_at: evt.starts_at,
              minutes: minutesUntil,
              leadMinutes: 0,
              voice_reminder_enabled: voiceReminderEnabled,
              voice_text: voiceTextNow,
              is_informative: true,
            },
            link: `/calendar/${evt.id}`,
            scheduled_at: userNow.toISO()!,
            idempotency_key: activitySlotKey(evt.id, "now", eventStart),
            legacy_keys: [legacyActivitySlotKey(evt.id, "now", eventStart)],
          });
        } else if (minutesUntil > Math.max(firstLead, secondLead)) {
          candidates.push({
            user_id: userId,
            category: "activity",
            kind: "activity_today",
            priority: isImportant ? "high" : "normal",
            status: "unread",
            entity_type: "activity",
            entity_id: evt.id,
            title: tr("Séance aujourd'hui : {title}", { title: evt.title }),
            body: tr("Vous avez « {title} » prévue aujourd'hui de {v1} à {v2}.", { title: evt.title, v1: eventStart.toFormat("HH:mm"), v2: eventEnd.toFormat("HH:mm") }),
            metadata: {
              title: evt.title,
              starts_at: evt.starts_at,
              voice_reminder_enabled: voiceReminderEnabled,
              voice_text: voiceText,
              is_informative: true,
            },
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
          priority: isImportant ? "high" : "normal",
          status: "unread",
          entity_type: "activity",
          entity_id: evt.id,
          title: tr("Séance demain : {title}", { title: evt.title }),
          body: tr("N'oubliez pas votre séance « {title} » demain à {v1}.", { title: evt.title, v1: eventStart.toFormat("HH:mm") }),
          metadata: { title: evt.title, starts_at: evt.starts_at, days: 1, voice_reminder_enabled: voiceReminderEnabled, voice_text: voiceText },
          link: `/calendar/${evt.id}`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${evt.id}:tomorrow_${eventStart.toISODate()}`,
        });
      } else if (daysDiff === 2 || daysDiff === 3) {
        // En mode 'recommended', les routines ne reçoivent pas d'alerte J-3 / J-2 pour éviter la surcharge d'alertes
        if (isRecommended && isRoutine) {
          continue;
        }

        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_upcoming",
          priority: isImportant ? "high" : "normal",
          status: "unread",
          entity_type: "activity",
          entity_id: evt.id,
          title: tr("Séance dans {daysDiff} jours : {title}", { daysDiff, title: evt.title }),
          body: tr("Votre séance « {title} » aura lieu le {v1} à {v2}.", { title: evt.title, v1: formatDateLocale(eventStart.toISODate()!, locale, userTimezone), v2: eventStart.toFormat("HH:mm") }),
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
      .select("id, name, start_date, end_date, status, reminder_preference, engagement_nature, validity_type, activity_compensation(amount, currency)")
      .eq("user_id", userId)
      .eq("status", "active")
      .not("end_date", "is", null);

    for (const act of userActivities ?? []) {
      if (!act.end_date || activeSnoozeEntityIds.has(act.id)) continue;
      // Les activités permanentes n'expirent pas
      if (act.validity_type === "permanent") continue;
      // Blocage strict si reminder_preference = 'disabled'
      if (act.reminder_preference === "disabled") continue;

      // Si l'activité n'a pas encore débuté (start_date dans le futur), aucun rappel d'expiration prématuré
      if (act.start_date) {
        const startDT = DateTime.fromISO(act.start_date, { zone: userTimezone }).startOf("day");
        if (userNow.startOf("day") < startDT) continue;
      }

      const endDT = DateTime.fromISO(act.end_date, { zone: userTimezone }).startOf("day");
      const daysDiff = Math.floor(endDT.diff(userNow.startOf("day"), "days").days);

      const isRoutine = act.engagement_nature === "routine";
      const isImportant = act.engagement_nature === "important";
      const isTempEngagement = act.engagement_nature === "temporary_engagement";
      const isRecommended = act.reminder_preference === "recommended";

      // enabled : tous les rappels d'échéance autorisés (J-7, J-3, J-2, J-1)
      // recommended + routine : allégé (J-3, J-1) pour éviter la surcharge d'alertes
      // recommended + temporary_engagement / important / autre : cycle complet (J-7, J-3, J-2, J-1)
      const isCandidateDay = (isRecommended && isRoutine)
        ? (daysDiff === 3 || daysDiff === 1)
        : (daysDiff === 7 || daysDiff === 3 || daysDiff === 2 || daysDiff === 1);

      if (isCandidateDay) {
        const title = isTempEngagement
          ? tr("Engagement arrivant à terme : {name}", { name: act.name })
          : isImportant
          ? tr("⚠️ Échéance importante proche : {name}", { name: act.name })
          : tr("Activité arrivant à terme : {name}", { name: act.name });

        const body = isTempEngagement
          ? tr("Votre engagement temporaire « {name} » arrive à échéance dans {daysDiff} jour(s) (le {v2}). Vous pouvez le prolonger ou le renouveler.", { name: act.name, daysDiff, v2: formatDateLocale(act.end_date, locale, userTimezone) })
          : tr("L'activité « {name} » arrive à échéance dans {daysDiff} jour(s) (le {v2}).", { name: act.name, daysDiff, v2: formatDateLocale(act.end_date, locale, userTimezone) });

        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_expiring_soon",
          priority: isImportant || daysDiff === 1 ? "high" : "normal",
          status: "unread",
          entity_type: "activity",
          entity_id: act.id,
          title,
          body,
          metadata: {
            activityId: act.id,
            name: act.name,
            endDate: act.end_date,
            days: daysDiff,
            engagementNature: act.engagement_nature,
            can_renew: true,
          },
          link: `/activities`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${act.id}:expiring_in_${daysDiff}_days`,
          email_template: "activity_expiring",
        });
      } else if (daysDiff <= 0 && daysDiff >= -14) {
        // Activité temporaire arrivée à terme : Proposition de prolongation sans prolongation automatique
        candidates.push({
          user_id: userId,
          category: "activity",
          kind: "activity_expired",
          priority: "high",
          status: "unread",
          entity_type: "activity",
          entity_id: act.id,
          title: tr("Activité arrivée à expiration : {name}", { name: act.name }),
          body: tr("L'activité « {name} » est arrivée à expiration le {v1}. Vous pouvez la prolonger ou l'archiver.", { name: act.name, v1: formatDateLocale(act.end_date, locale, userTimezone) }),
          metadata: {
            activityId: act.id,
            name: act.name,
            endDate: act.end_date,
            can_renew: true,
          },
          link: `/activities`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `activity:${act.id}:expired_${act.end_date}`,
          email_template: "activity_expired",
        });
      }
    }
  }

  // ==========================================================================
  // 5.6 CLASSIFICATION & SUGGESTIONS D'ÉVOLUTION VERS UNE ROUTINE
  // ==========================================================================
  if (prefsData?.activity_reminders !== false) {
    try {
      await evaluateActivityEvolutionSuggestions(supabase, userId, userNow, userTimezone);
    } catch (evoErr) {
      console.warn("[evaluateSmartReminders] evaluateActivityEvolutionSuggestions fallback:", evoErr);
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
            ? tr("Tâche en retard (1 jour) : {title}", { title: tsk.title })
            : tr("Tâche toujours en retard ({overdueDays}j) : {title}", { overdueDays, title: tsk.title }),
          body: tr("La tâche « {title} » est en retard depuis le {v1}.", { title: tsk.title, v1: formatDateLocale(tsk.due_date, locale, userTimezone) }),
          metadata: { title: tsk.title, priority: tsk.priority, overdueDays },
          link: `/tasks/${tsk.id}/edit`,
          scheduled_at: userNow.toISO()!,
          idempotency_key: `task:${tsk.id}:overdue_${todayISO}`,
          email_template: "task_overdue",
        });
      } else if (userNow >= reminderTriggerDT || dueDT.hasSame(userNow, "day")) {
        const minutesUntil = Math.floor(dueDT.diff(userNow, "minutes").minutes);

        if (isTaskDueSoon(minutesUntil, tsk.reminder_minutes_before, Boolean(tsk.due_time))) {
          candidates.push({
            user_id: userId,
            category: "task",
            kind: "task_due_soon",
            priority: tsk.priority === "urgent" ? "critical" : "high",
            status: "unread",
            entity_type: "task",
            entity_id: tsk.id,
            title: tr("Rappel tâche : {title}", { title: tsk.title }),
            body: tsk.due_time
              ? tr("Échéance prévue aujourd'hui à {due_time} pour « {title} »", { due_time: tsk.due_time, title: tsk.title })
              : tr("La tâche « {title} » arrive à échéance aujourd'hui.", { title: tsk.title }),
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
            title: tr("Tâche du jour : {title}", { title: tsk.title }),
            body: tr("La tâche « {title} » est programmée pour aujourd'hui.", { title: tsk.title }),
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
            ? tr("Tâche pour demain : {title}", { title: tsk.title })
            : tr("Tâche dans {daysDiff} jours : {title}", { daysDiff, title: tsk.title }),
          body: tr("La tâche « {title} » est prévue pour le {v1}.", { title: tsk.title, v1: formatDateLocale(tsk.due_date, locale, userTimezone) }),
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
  // 6.5 MES OBJECTIFS (étapes du jour, retards, échéances, inactivité, rappel planifié)
  //     Encouragements sobres : au plus un rappel par type et par période, jamais pour un objectif en pause.
  // ==========================================================================
  try {
    const goalsDb = supabase as any;
    const { data: goalRows, error: goalsErr } = await goalsDb
      .from("goals")
      .select("id, title, motivation, due_date, status, created_at, last_progress_at, reminder_frequency, reminder_time, reminder_weekday")
      .eq("user_id", userId)
      .eq("status", "active");

    if (!goalsErr && goalRows?.length) {
      const goalIds = goalRows.map((g: any) => g.id);
      const { data: openSteps } = await goalsDb
        .from("goal_steps")
        .select("id, goal_id, title, due_date, status")
        .eq("user_id", userId)
        .in("goal_id", goalIds)
        .in("status", ["todo", "in_progress"])
        .not("due_date", "is", null);

      const goalTitle = (id: string) => goalRows.find((g: any) => g.id === id)?.title ?? "";

      // Étapes du jour et étapes en retard (une notification par étape et par jour maximum)
      for (const st of openSteps ?? []) {
        const stepDue = DateTime.fromISO(st.due_date, { zone: userTimezone });
        const diff = Math.floor(stepDue.startOf("day").diff(userNow.startOf("day"), "days").days);
        if (diff === 0 && userNow.hour >= 8) {
          candidates.push({
            user_id: userId, category: "goal", kind: "goal_step_due_today", priority: "normal", status: "unread",
            entity_type: "goal_step", entity_id: st.id,
            title: tr("Étape du jour : {title}", { title: st.title }),
            body: tr("Une étape de votre objectif « {goal} » est prévue aujourd'hui.", { goal: goalTitle(st.goal_id) }),
            metadata: { goal_id: st.goal_id, step_id: st.id },
            link: `/goals/${st.goal_id}`, scheduled_at: userNow.toISO()!,
            idempotency_key: `goal_step:${st.id}:due_today`,
          });
        } else if (diff < 0 && diff >= -14) {
          candidates.push({
            user_id: userId, category: "goal", kind: "goal_step_overdue", priority: "normal", status: "unread",
            entity_type: "goal_step", entity_id: st.id,
            title: tr("Étape en retard : {title}", { title: st.title }),
            body: tr("Cette étape de « {goal} » était prévue le {date}. Vous pouvez la terminer, la décaler ou réorganiser votre programme.", {
              goal: goalTitle(st.goal_id),
              date: formatDateLocale(st.due_date, locale, userTimezone),
            }),
            metadata: { goal_id: st.goal_id, step_id: st.id },
            link: `/goals/${st.goal_id}`, scheduled_at: userNow.toISO()!,
            idempotency_key: `goal_step:${st.id}:overdue`,
          });
        }
      }

      for (const g of goalRows) {
        // Échéance de l'objectif proche (J-7, J-1)
        if (g.due_date) {
          const daysLeft = Math.floor(DateTime.fromISO(g.due_date, { zone: userTimezone }).startOf("day").diff(userNow.startOf("day"), "days").days);
          if (daysLeft === 7 || daysLeft === 1) {
            candidates.push({
              user_id: userId, category: "goal", kind: "goal_deadline_soon", priority: daysLeft === 1 ? "high" : "normal", status: "unread",
              entity_type: "goal", entity_id: g.id,
              title: daysLeft === 1
                ? tr("Objectif à atteindre demain : {title}", { title: g.title })
                : tr("Plus qu'une semaine pour votre objectif : {title}", { title: g.title }),
              body: tr("Faites le point sur votre progression et, si besoin, réorganisez vos étapes."),
              metadata: { goal_id: g.id, days: daysLeft },
              link: `/goals/${g.id}`, scheduled_at: userNow.toISO()!,
              idempotency_key: `goal:${g.id}:deadline_minus_${daysLeft}`,
            });
          }
        }

        // Inactivité : aucune progression depuis 7 jours → rappel de la motivation (au plus une fois par semaine)
        const lastMove = DateTime.fromISO(g.last_progress_at || g.created_at).setZone(userTimezone);
        const idleDays = Math.floor(userNow.diff(lastMove, "days").days);
        if (idleDays >= 7 && userNow.hour >= 9 && userNow.hour < 21) {
          candidates.push({
            user_id: userId, category: "goal", kind: "goal_inactive", priority: "low", status: "unread",
            entity_type: "goal", entity_id: g.id,
            title: tr("Votre objectif vous attend : {title}", { title: g.title }),
            body: g.motivation
              ? tr("Aucune progression depuis {n} jours. Souvenez-vous : « {motivation} »", { n: idleDays, motivation: String(g.motivation).slice(0, 160) })
              : tr("Aucune progression depuis {n} jours. Une petite étape aujourd'hui suffit pour repartir.", { n: idleDays }),
            metadata: { goal_id: g.id, idle_days: idleDays },
            link: `/goals/${g.id}`, scheduled_at: userNow.toISO()!,
            idempotency_key: `goal:${g.id}:inactive_${userNow.toFormat("kkkk-'W'WW")}`,
          });
        }

        // Rappel planifié par l'utilisateur (quotidien, hebdomadaire, mensuel), à partir de l'heure choisie
        if (g.reminder_frequency && g.reminder_time) {
          const [hh, mm] = String(g.reminder_time).split(":").map(Number);
          const at = userNow.set({ hour: hh || 0, minute: mm || 0, second: 0, millisecond: 0 });
          const dayMatches =
            g.reminder_frequency === "daily" ||
            (g.reminder_frequency === "weekly" && userNow.weekday % 7 === Number(g.reminder_weekday ?? 1)) ||
            (g.reminder_frequency === "monthly" && userNow.day === DateTime.fromISO(g.created_at).setZone(userTimezone).day);
          if (dayMatches && userNow >= at && userNow.diff(at, "minutes").minutes <= 60) {
            candidates.push({
              user_id: userId, category: "goal", kind: "goal_reminder", priority: "normal", status: "unread",
              entity_type: "goal", entity_id: g.id,
              title: tr("Rappel : {title}", { title: g.title }),
              body: g.motivation
                ? tr("C'est le moment d'avancer sur votre objectif. Votre motivation : « {motivation} »", { motivation: String(g.motivation).slice(0, 160) })
                : tr("C'est le moment d'avancer sur votre objectif."),
              metadata: { goal_id: g.id },
              link: `/goals/${g.id}`, scheduled_at: userNow.toISO()!,
              idempotency_key: `goal:${g.id}:reminder_${todayISO}`,
            });
          }
        }
      }
    }
  } catch (goalErr) {
    console.warn("[evaluateSmartReminders] Section objectifs ignorée :", (goalErr as any)?.message);
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
      const monthName = userNow.setLocale(locale).toFormat("MMMM yyyy");

      candidates.push({
        user_id: userId,
        category: "summary",
        kind: "month_start_summary",
        priority: "normal",
        status: "unread",
        entity_type: "summary",
        entity_id: `month_${currentMonthKey}`,
        title: tr("Bienvenue en {monthName} — Vos perspectives du mois", { monthName }),
        body: tr("Votre nouveau mois commence : {incomeCount} paiement(s) attendu(s) pour un total de {formattedTotal}{v2}.", { incomeCount, formattedTotal, v2: expenseCount > 0 ? ` et ${expenseCount} dépense(s) programmée(s)` : "" }),
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
        title: tr("Votre résumé de la semaine ({weekKey})", { weekKey }),
        body: tr("Cette semaine : {incomeCount} paiement(s) à surveiller, {eventCount} séance(s) au planning et {taskCount} tâche(s) à accomplir.", { incomeCount, eventCount, taskCount }),
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
        title: tr("Tâche « {title} »", { title: tsk.title }),
        timeStr: tsk.due_time ? tsk.due_time.slice(0, 5) : null,
        status: tsk.status === "done" ? "completed" : "pending",
        category: "task",
      });
    }

    // Scheduled Expenses
    for (const exp of todayExpenses ?? []) {
      dailyItems.push({
        id: exp.id,
        title: tr("Dépense « {name} »", { name: exp.name }),
        status: exp.status === "paid" ? "completed" : "pending",
        category: "expense",
      });
    }

    // Income
    for (const inc of todayIncomes ?? []) {
      dailyItems.push({
        id: inc.id,
        title: tr("Paiement « {label} »", { label: inc.label }),
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
      ? tr("🌅 Programme du jour : {totalCount} activité(s)", { totalCount })
      : tr("🌅 Programme du jour : Aucune activité");

    const bodyText = totalCount > 0
      ? tr("Vous avez {pendingCount} activité(s) au planning aujourd'hui{v1}{v2}. Excellente journée !", { pendingCount, v1: completedCount > 0 ? ` (${completedCount} déjà complétée(s))` : "", v2: yesterdayUnconfirmed > 0 ? ` et ⚠️ ${yesterdayUnconfirmed} séance(s) d'hier à confirmer` : "" })
      : tr("Votre journée est libre. Profitez-en pour vous reposer ou planifier vos prochaines sessions.");

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
      // N'envoyer d'email le matin que s'il y a un réel programme à communiquer
      email_template: totalCount > 0 ? "daily_briefing" : undefined,
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
        title: tr("Tâche « {title} »", { title: tsk.title }),
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
        title: tr("Dépense « {name} »", { name: exp.name }),
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
        title: tr("Paiement « {label} »", { label: inc.label }),
        category: "payment",
      };
      if (inc.received) {
        completedItems.push({ ...item, status: "completed" });
      } else {
        upcomingItems.push({ ...item, status: "pending" });
      }
    }

    const totalCount = completedItems.length + upcomingItems.length + overdueItems.length;
    // Si aucune activité dans la journée, ne pas créer de point d'étape à midi
    if (totalCount > 0) {
      const voiceLanguage = (locale === "fr" || locale === "en" || locale === "es") ? locale : "fr";
      const middayVoiceScript = generateMiddayCheckinVoiceText({
        userName: profileData?.full_name,
        completedActivities: completedItems,
        upcomingActivities: upcomingItems,
        overdueActivities: overdueItems,
        language: voiceLanguage,
      });

      const titleText = tr("☀️ Point de mi-journée : {length}/{totalCount} terminée(s)", { length: completedItems.length, totalCount });
      const bodyText = tr("{length} activité(s) terminée(s), {length2} à venir cet après-midi.{v2}", { length: completedItems.length, length2: upcomingItems.length, v2: overdueItems.length > 0 ? ` ⚠️ ${overdueItems.length} en attente de vérification.` : "" });

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
        email_template: overdueItems.length > 0 ? "midday_checkin" : undefined,
      });
    }
  }

  // 3. Bilan & Débriefing du Soir (Heure configurable, par défaut 20h00 - 23h59) : Clôture de journée et félicitations
  const [sumHStr, sumMStr] = ((prefsData as any)?.daily_summary_time || "20:00").split(":");
  const sumTargetMinutes = (Number(sumHStr) || 20) * 60 + (Number(sumMStr) || 0);
  const currentDayMinutes = userNow.hour * 60 + userNow.minute;

  if (currentDayMinutes >= sumTargetMinutes && prefsData?.daily_summary_enabled !== false) {
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
    const postponedItems: DailyActivityItem[] = [];

    // Events (une séance reportée n'est ni faite ni « en retard » : elle est comptée à part)
    for (const ev of todayEvents ?? []) {
      const item: DailyActivityItem = { id: ev.id, title: ev.title, category: "activity" };
      if (ev.status === "completed") {
        completedItems.push({ ...item, status: "completed" });
      } else if (ev.status === "postponed") {
        postponedItems.push({ ...item, status: "pending" });
      } else {
        uncompletedItems.push({ ...item, status: "pending" });
      }
    }

    // Échéances de demain (activités, tâches, paiements attendus, dépenses programmées)
    const tomorrowStart = userNow.plus({ days: 1 }).startOf("day");
    const tomorrowISO = tomorrowStart.toISODate()!;
    const [{ data: tmrEvents }, { data: tmrTasks }, { data: tmrIncomes }, { data: tmrExpenses }] = await Promise.all([
      supabase
        .from("calendar_events")
        .select("id, title, starts_at")
        .eq("user_id", userId)
        .eq("status", "planned")
        .gte("starts_at", tomorrowStart.toISO()!)
        .lte("starts_at", tomorrowStart.endOf("day").toISO()!)
        .order("starts_at", { ascending: true }),
      supabase.from("tasks").select("id, title").eq("user_id", userId).eq("due_date", tomorrowISO).in("status", ["todo", "in_progress"]),
      supabase.from("income").select("id, label").eq("user_id", userId).eq("due_date", tomorrowISO).eq("received", false),
      supabase.from("scheduled_expenses").select("id, name").eq("user_id", userId).eq("next_due_date", tomorrowISO).in("status", ["planned", "due"]),
    ]);
    const tomorrowItems: DailyActivityItem[] = [
      ...(tmrEvents ?? []).map((e) => ({ id: e.id, title: e.title, category: "activity" as const, timeStr: DateTime.fromISO(e.starts_at, { zone: userTimezone }).toFormat("HH:mm") })),
      ...(tmrTasks ?? []).map((t) => ({ id: t.id, title: t.title, category: "task" as const })),
      ...(tmrIncomes ?? []).map((i) => ({ id: i.id, title: i.label, category: "payment" as const })),
      ...(tmrExpenses ?? []).map((x) => ({ id: x.id, title: x.name, category: "expense" as const })),
    ];

    // Tasks
    for (const tsk of todayTasks ?? []) {
      const item: DailyActivityItem = { id: tsk.id, title: tr("Tâche « {title} »", { title: tsk.title }), category: "task" };
      if (tsk.status === "done") {
        completedItems.push({ ...item, status: "completed" });
      } else {
        uncompletedItems.push({ ...item, status: "pending" });
      }
    }

    // Expenses
    for (const exp of todayExpenses ?? []) {
      const item: DailyActivityItem = { id: exp.id, title: tr("Dépense « {name} »", { name: exp.name }), category: "expense" };
      if (exp.status === "paid") {
        completedItems.push({ ...item, status: "completed" });
      } else {
        uncompletedItems.push({ ...item, status: "pending" });
      }
    }

    // Income
    for (const inc of todayIncomes ?? []) {
      const item: DailyActivityItem = { id: inc.id, title: tr("Paiement « {label} »", { label: inc.label }), category: "payment" };
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
      postponedActivities: postponedItems,
      tomorrowItems,
      language: voiceLanguage,
      includeUserName: (prefsData as any)?.voice_include_user_name ?? true,
    });

    const titleText = totalCount > 0
      ? tr("🌙 Bilan du soir : {length}/{totalCount} accomplie(s)", { length: completedItems.length, totalCount })
      : tr("🌙 Bilan du soir : Clôture de votre journée");

    const baseBody = totalCount === 0
      ? tr("Aucune activité n'était programmée aujourd'hui. Reposez-vous bien et préparez sereinement votre journée de demain.")
      : uncompletedItems.length === 0
      ? tr("Toutes vos activités prévues aujourd'hui sont accomplies avec succès. Vous pouvez clore sereinement votre journée.")
      : tr("Il vous reste {length} élément(s) en attente. Prenez un instant pour valider votre bilan de journée.", { length: uncompletedItems.length });
    // Bilan écrit complet en français (reportés, demain, bonne nuit) ; autres langues : texte habituel
    const isFrenchSummary = !locale || String(locale).startsWith("fr");
    const tomorrowActs = tomorrowItems.filter((i) => i.category === "activity").length;
    const tomorrowOther = tomorrowItems.length - tomorrowActs;
    const bodyText = isFrenchSummary
      ? [
          totalCount === 0 && postponedItems.length === 0
            ? "Aucune activité ni tâche n'était prévue aujourd'hui."
            : `Fait : ${completedItems.length} · Reste à faire : ${uncompletedItems.length}${postponedItems.length ? ` · Reporté : ${postponedItems.length}` : ""}.`,
          tomorrowItems.length
            ? `Demain : ${tomorrowActs ? `${tomorrowActs} activité(s)` : ""}${tomorrowActs && tomorrowOther ? " et " : ""}${tomorrowOther ? `${tomorrowOther} échéance(s)` : ""}.`
            : "Rien de prévu demain pour l'instant.",
          "Bonne nuit et à demain !",
        ].join(" ")
      : baseBody;

    candidates.push({
      user_id: userId,
      category: "summary",
      kind: "evening_checkin",
      priority: uncompletedItems.length > 0 ? "high" : "normal",
      status: "unread",
      entity_type: "daily_summary",
      entity_id: `summary_${todayISO}`,
      title: titleText,
      body: bodyText,
      metadata: {
        date: todayISO,
        totalCount,
        completedCount: completedItems.length,
        uncompletedCount: uncompletedItems.length,
        postponedCount: postponedItems.length,
        tomorrowCount: tomorrowItems.length,
        voice_text: eveningVoiceScript,
        voice_reminder_enabled: true,
        is_daily_summary: true,
      },
      link: "/dashboard",
      scheduled_at: userNow.toISO()!,
      idempotency_key: `routine:evening_checkin:${todayISO}`,
      // N'envoyer d'e-mail le soir que s'il y avait des activités à récapituler
      email_template: totalCount > 0 ? "evening_checkin" : undefined,
    });
  }

  // ==========================================================================
  // 8.9 PAS DE BILANS NI DE BRIEFINGS POUR UN COMPTE TOUT JUSTE CRÉÉ
  //     (le jour de l'inscription, ou tant qu'aucune activité n'existe : rien à résumer)
  // ==========================================================================
  {
    const DIGEST_KINDS = new Set(["morning_briefing", "midday_checkin", "evening_checkin", "evening_summary", "weekly_summary", "month_start_summary"]);
    if (candidates.some((c) => DIGEST_KINDS.has(c.kind))) {
      const createdAt = (profileData as any)?.created_at ? DateTime.fromISO((profileData as any).created_at).setZone(userTimezone) : null;
      const signedUpToday = createdAt ? createdAt.hasSame(userNow, "day") || userNow.diff(createdAt, "hours").hours < 12 : false;
      const { count: activityCount } = await supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (signedUpToday || !activityCount) {
        for (let i = candidates.length - 1; i >= 0; i--) {
          if (DIGEST_KINDS.has(candidates[i]!.kind)) candidates.splice(i, 1);
        }
      }
    }
  }

  // ==========================================================================
  // 9. ENREGISTREMENT IDEMPOTENT DANS LA TABLE NOTIFICATIONS
  // ==========================================================================
  let insertedCount = 0;
  let newCandidates: ReminderCandidate[] = [];
  const insertedIdByKey = new Map<string, string>();

  if (candidates.length > 0) {
    const candidateKeys = candidates.flatMap((c) => [c.idempotency_key, ...(c.legacy_keys ?? [])]);
    const { data: existingRows } = await supabase
      .from("notifications")
      .select("idempotency_key")
      .eq("user_id", userId)
      .in("idempotency_key", candidateKeys);

    const existingKeySet = new Set((existingRows ?? []).map((r) => r.idempotency_key));
    newCandidates = candidates.filter(
      (c) => !existingKeySet.has(c.idempotency_key) && !(c.legacy_keys ?? []).some((k) => existingKeySet.has(k))
    );

    if (newCandidates.length > 0) {
      const rows = newCandidates.map((c) => ({
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
            metadata: shouldDeferPush(quietHoursActive, c.priority) && pushEnabled ? { ...c.metadata, push_deferred: true } : c.metadata,
            link: c.link,
            scheduled_at: c.scheduled_at,
            idempotency_key: c.idempotency_key,
          }));

      // Clé (user_id, idempotency_key) unique depuis la migration 0025 : si deux exécutions
      // (cron + application ouverte) traitent le même rappel, une seule l'enregistre.
      let { data: insertedRows, error } = await supabase
        .from("notifications")
        .upsert(rows as any, { onConflict: "user_id,idempotency_key", ignoreDuplicates: true })
        .select("id, kind, idempotency_key");

      // Avant la migration 0025 (pas d'index unique) : insertion classique
      if (error && (error as any).code === "42P10") {
        ({ data: insertedRows, error } = await supabase.from("notifications").insert(rows as any).select("id, kind, idempotency_key"));
      }

      // Conflit sur un autre index unique (ex. ancien index (user_id, kind, entity_id) de la migration 0006) :
      // un seul rappel en conflit ne doit pas faire perdre tout le lot → insertion ligne par ligne.
      if (error && (error as any).code === "23505") {
        const kept: { id: string; kind: string; idempotency_key: string | null }[] = [];
        for (const row of rows) {
          const { data: one, error: oneErr } = await supabase.from("notifications").insert(row as any).select("id, kind, idempotency_key");
          if (!oneErr && one?.length) kept.push(...(one as any));
        }
        insertedRows = kept as any;
        error = null;
      }

      if (error) {
        console.error("[evaluateSmartReminders] Notification insertion error:", error.message);
        newCandidates = []; // rien d'enregistré : rien à envoyer
      } else {
        const insertedKeys = new Set((insertedRows ?? []).map((r) => r.idempotency_key));
        newCandidates = newCandidates.filter((c) => insertedKeys.has(c.idempotency_key));
        for (const r of insertedRows ?? []) insertedIdByKey.set(r.idempotency_key as string, r.id as string);
        insertedCount = insertedRows?.length ?? 0;

        // Archiver les résumés et notifications financières importantes dans la messagerie interne
        for (const cand of newCandidates) {
          if (cand.kind === "evening_checkin" || cand.category === "summary") {
            try {
              await createInternalMessage(supabase, {
                userId: cand.user_id,
                subject: cand.title,
                body: cand.body,
                category: "summary",
                idempotencyKey: `msg:${cand.idempotency_key}`,
              });
            } catch (mErr) {
              console.warn("[engine] Internal message archive summary error:", mErr);
            }
          } else if (cand.kind === "payment_upcoming" || cand.kind === "payment_due_today") {
            try {
              await createInternalMessage(supabase, {
                userId: cand.user_id,
                subject: cand.title,
                body: cand.body,
                category: "financial",
                idempotencyKey: `msg:${cand.idempotency_key}`,
              });
            } catch (mErr) {
              console.warn("[engine] Internal message archive finance error:", mErr);
            }
          }
        }
      }
    }
  }

  // ==========================================================================
  // 10. DISPATCH MULTI-CANAUX (EMAIL & PUSH) AVEC VÉRIFICATION D'IDEMPOTENCE
  // ==========================================================================
  let emailCount = 0;
  let pushCount = 0;
  let pushFailedCount = 0;
  const pushActionLabels = { read: tr("Lu"), listen: tr("Écouter"), open: tr("Ouvrir") };

  // Fin des heures silencieuses : envoi des push reportés encore utiles (au plus 2, sinon un seul récapitulatif)
  if (pushEnabled && !quietHoursActive) {
    try {
      pushCount += await flushDeferredPushes(supabase, userId, userNow, tr, pushActionLabels);
    } catch (err) {
      console.warn("[evaluateSmartReminders] Push reportés : envoi impossible", err);
    }
  }

  if (newCandidates.length > 0) {
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
      const allowImmediateExternal = !shouldDeferPush(quietHoursActive, cand.priority);

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
            timezone: userTimezone,
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
            metadata: { ...cand.metadata, kind: cand.kind, notificationId: insertedIdByKey.get(cand.idempotency_key) },
            tag: pushTagFor(cand.idempotency_key, cand.category),
            actionLabels: pushActionLabels,
          },
          supabase
        );
        if (pushRes.success && pushRes.deliveredCount > 0) {
          pushCount += pushRes.deliveredCount;
        }
        if (pushRes.failed) pushFailedCount++;
      }
    }
  }

  return {
    processed: candidates.length,
    inserted: insertedCount,
    emailCount,
    pushCount,
    pushFailedCount,
    resolvedCleanups,
  };
}

export interface ProcessAllOptions {
  /** Heure limite (ms epoch) : on s'arrête avant pour laisser la place à l'exécution suivante. */
  deadlineMs?: number;
  /** Reprendre après cet utilisateur (curseur de l'exécution précédente interrompue). */
  startAfterUserId?: string | null;
  /** Utilisateurs traités en parallèle. */
  concurrency?: number;
}

export interface ProcessAllResult {
  totalUsers: number;
  processedUsers: number;
  totalInserted: number;
  totalEmails: number;
  totalPushes: number;
  totalPushFailures: number;
  /** Dernier utilisateur traité si l'exécution a été interrompue par la limite de temps, sinon null. */
  nextCursor: string | null;
}

/**
 * Traitement en lot pour le Cron Scheduler d'arrière-plan.
 * Parcourt les profils actifs (fuseau horaire de chacun respecté), par lots parallèles.
 * Si la limite de temps approche, s'arrête proprement et renvoie un curseur : la minute
 * suivante reprend là où celle-ci s'est arrêtée, sans retraiter (ni renvoyer) les autres.
 */
export async function processAllUsersReminders(
  supabaseAdmin: SupabaseClient<Database>,
  { deadlineMs = Date.now() + 45_000, startAfterUserId = null, concurrency = 5 }: ProcessAllOptions = {}
): Promise<ProcessAllResult> {
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, timezone")
    .eq("onboarding_completed", true)
    .order("id", { ascending: true });

  const empty: ProcessAllResult = {
    totalUsers: 0, processedUsers: 0, totalInserted: 0, totalEmails: 0, totalPushes: 0, totalPushFailures: 0, nextCursor: null,
  };
  if (error || !profiles) {
    console.error("[processAllUsersReminders] Erreur récupération des profils:", error?.message);
    return empty;
  }

  // Reprise : d'abord les utilisateurs après le curseur, puis ceux d'avant (ordre circulaire)
  const pivot = startAfterUserId ? profiles.findIndex((p) => p.id > startAfterUserId) : 0;
  const ordered = pivot > 0 ? [...profiles.slice(pivot), ...profiles.slice(0, pivot)] : profiles;

  const result: ProcessAllResult = { ...empty, totalUsers: profiles.length };
  for (let i = 0; i < ordered.length; i += concurrency) {
    if (Date.now() > deadlineMs) {
      result.nextCursor = ordered[i - 1]?.id ?? null;
      break;
    }
    const batch = ordered.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((profile) => evaluateSmartReminders(supabaseAdmin, profile.id, profile.timezone || "UTC"))
    );
    settled.forEach((r, k) => {
      result.processedUsers++;
      if (r.status === "fulfilled") {
        result.totalInserted += r.value.inserted;
        result.totalEmails += r.value.emailCount;
        result.totalPushes += r.value.pushCount;
        result.totalPushFailures += r.value.pushFailedCount ?? 0;
      } else {
        console.error(`[processAllUsersReminders] Erreur pour l'utilisateur ${batch[k]?.id}:`, r.reason?.message ?? r.reason);
      }
    });
  }
  return result;
}
