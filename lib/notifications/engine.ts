import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import type { Database, NotificationPriority, SupportedLocale } from "@/types/database";
import { t, formatCurrencyLocale, formatDateLocale } from "@/lib/i18n/format";
import { sendNotificationEmail } from "@/lib/email/service";

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

/**
 * Évalue l'ensemble des règles de rappels intelligents pour un utilisateur.
 * Le moteur est 100% déterministe et idempotent : aucun doublon n'est inséré
 * et aucun rappel n'est envoyé pour une entité déjà payée, terminée ou annulée.
 */
export async function evaluateSmartReminders(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone = "UTC"
): Promise<{ processed: number; inserted: number; emailCount: number }> {
  const now = DateTime.now().setZone(timezone);
  const todayISO = now.toISODate();
  if (!todayISO) return { processed: 0, inserted: 0, emailCount: 0 };

  // 1. Récupération des préférences utilisateur
  const { data: prefsData } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const locale: SupportedLocale = prefsData?.preferred_locale ?? "fr";
  const emailEnabled = prefsData?.email_enabled ?? true;

  const candidates: ReminderCandidate[] = [];

  // ==========================================================================
  // 2. RAPPELS DE PAIEMENTS / ENCAISSEMENTS (INCOME)
  // ==========================================================================
  if (prefsData?.payment_reminders !== false) {
    const { data: pendingIncome } = await supabase
      .from("income")
      .select("id, label, amount, currency, due_date, activity_id")
      .eq("user_id", userId)
      .eq("received", false)
      .not("due_date", "is", null);

    for (const inc of pendingIncome ?? []) {
      if (!inc.due_date) continue;
      const dueDT = DateTime.fromISO(inc.due_date, { zone: timezone }).startOf("day");
      const daysDiff = Math.floor(dueDT.diff(now.startOf("day"), "days").days);

      const clientName = inc.label.split("—")[0]?.trim() || "Client";
      const formattedAmount = formatCurrencyLocale(Number(inc.amount), inc.currency, locale);
      const formattedDate = formatDateLocale(inc.due_date, locale, timezone);

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
          scheduled_at: now.toISO()!,
          idempotency_key: `income:${inc.id}:upcoming_7d`,
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
          scheduled_at: now.toISO()!,
          idempotency_key: `income:${inc.id}:upcoming_3d`,
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
          scheduled_at: now.toISO()!,
          idempotency_key: `income:${inc.id}:due_today_${todayISO}`,
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
          title: t("notif.payment_overdue.title", locale),
          body: t("notif.payment_overdue.body", locale, {
            amount: inc.amount,
            currency: inc.currency,
            client: clientName,
            days: overdueDays,
          }),
          title_key: "notif.payment_overdue.title",
          body_key: "notif.payment_overdue.body",
          metadata: { amount: inc.amount, currency: inc.currency, label: inc.label, days: overdueDays },
          link: `/finances`,
          scheduled_at: now.toISO()!,
          idempotency_key: `income:${inc.id}:overdue_${overdueDays}d`,
          email_template: "payment_overdue",
        });
      }
    }
  }

  // ==========================================================================
  // 3. RAPPELS DE DÉPENSES PROGRAMMÉES & DÉPENSES DUES
  // ==========================================================================
  if (prefsData?.expense_reminders !== false) {
    const { data: pendingExpenses } = await supabase
      .from("expenses")
      .select("id, label, amount, currency, due_date")
      .eq("user_id", userId)
      .eq("paid", false)
      .not("due_date", "is", null);

    for (const exp of pendingExpenses ?? []) {
      if (!exp.due_date) continue;
      const dueDT = DateTime.fromISO(exp.due_date, { zone: timezone }).startOf("day");
      const daysDiff = Math.floor(dueDT.diff(now.startOf("day"), "days").days);

      if (daysDiff === 0) {
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
          scheduled_at: now.toISO()!,
          idempotency_key: `expense:${exp.id}:due_today_${todayISO}`,
          email_template: "expense_due",
        });
      } else if (daysDiff < 0) {
        candidates.push({
          user_id: userId,
          category: "expense",
          kind: "expense_overdue",
          priority: "high",
          status: "unread",
          entity_type: "expense",
          entity_id: exp.id,
          title: t("notif.expense_overdue.title", locale),
          body: t("notif.expense_overdue.body", locale, {
            amount: exp.amount,
            currency: exp.currency,
            label: exp.label,
          }),
          title_key: "notif.expense_overdue.title",
          body_key: "notif.expense_overdue.body",
          metadata: { amount: exp.amount, currency: exp.currency, label: exp.label },
          link: `/finances?tab=expenses`,
          scheduled_at: now.toISO()!,
          idempotency_key: `expense:${exp.id}:overdue`,
        });
      }
    }
  }

  // ==========================================================================
  // 4. RAPPELS DE TÂCHES
  // ==========================================================================
  if (prefsData?.task_reminders !== false) {
    const { data: pendingTasks } = await supabase
      .from("tasks")
      .select("id, title, due_date, due_time, priority")
      .eq("user_id", userId)
      .in("status", ["todo", "in_progress"])
      .not("due_date", "is", null);

    for (const tsk of pendingTasks ?? []) {
      if (!tsk.due_date) continue;
      const dueDT = DateTime.fromISO(
        tsk.due_time ? `${tsk.due_date}T${tsk.due_time}` : `${tsk.due_date}T23:59:59`,
        { zone: timezone }
      );
      if (!dueDT.isValid) continue;

      if (dueDT < now) {
        candidates.push({
          user_id: userId,
          category: "task",
          kind: "task_overdue",
          priority: tsk.priority === "urgent" ? "critical" : "high",
          status: "unread",
          entity_type: "task",
          entity_id: tsk.id,
          title: t("notif.task_overdue.title", locale),
          body: t("notif.task_overdue.body", locale, {
            title: tsk.title,
            date: formatDateLocale(tsk.due_date, locale, timezone),
          }),
          title_key: "notif.task_overdue.title",
          body_key: "notif.task_overdue.body",
          metadata: { title: tsk.title, priority: tsk.priority },
          link: `/tasks/${tsk.id}/edit`,
          scheduled_at: now.toISO()!,
          idempotency_key: `task:${tsk.id}:overdue`,
        });
      } else if (dueDT.hasSame(now, "day")) {
        candidates.push({
          user_id: userId,
          category: "task",
          kind: "task_due_today",
          priority: "normal",
          status: "unread",
          entity_type: "task",
          entity_id: tsk.id,
          title: t("notif.task_due_today.title", locale),
          body: t("notif.task_due_today.body", locale, { title: tsk.title }),
          title_key: "notif.task_due_today.title",
          body_key: "notif.task_due_today.body",
          metadata: { title: tsk.title },
          link: `/tasks/${tsk.id}/edit`,
          scheduled_at: now.toISO()!,
          idempotency_key: `task:${tsk.id}:due_today_${todayISO}`,
        });
      }
    }
  }

  // ==========================================================================
  // 5. ENREGISTREMENT IDEMPOTENT EN BASE DE DONNÉES
  // ==========================================================================
  if (candidates.length === 0) {
    return { processed: 0, inserted: 0, emailCount: 0 };
  }

  // Récupérer les clés d'idempotence déjà existantes
  const candidateKeys = candidates.map((c) => c.idempotency_key);
  const { data: existingRows } = await supabase
    .from("notifications")
    .select("idempotency_key")
    .eq("user_id", userId)
    .in("idempotency_key", candidateKeys);

  const existingKeySet = new Set((existingRows ?? []).map((r) => r.idempotency_key));
  const newCandidates = candidates.filter((c) => !existingKeySet.has(c.idempotency_key));

  if (newCandidates.length === 0) {
    return { processed: candidates.length, inserted: 0, emailCount: 0 };
  }

  // Insertion en base
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
    console.error("[evaluateSmartReminders] Insertion error:", error);
    return { processed: candidates.length, inserted: 0, emailCount: 0 };
  }

  // ==========================================================================
  // 6. DÉPÊCHE DES E-MAILS TRANSACTIONNELS (SI ÉLIGIBLE & ACTIVÉ)
  // ==========================================================================
  let emailCount = 0;
  if (emailEnabled) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userEmail = user?.email;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    if (userEmail) {
      for (const cand of newCandidates) {
        if (cand.email_template) {
          const sent = await sendNotificationEmail({
            userId,
            recipientEmail: userEmail,
            recipientName: profile?.full_name?.split(" ")[0] || "Bonjour",
            template: cand.email_template,
            title: cand.title,
            body: cand.body,
            link: cand.link,
            locale,
            idempotencyKey: `email:${cand.idempotency_key}`,
            metadata: cand.metadata,
          }, supabase);
          if (sent) emailCount++;
        }
      }
    }
  }

  return {
    processed: candidates.length,
    inserted: insertedRows?.length ?? 0,
    emailCount,
  };
}
