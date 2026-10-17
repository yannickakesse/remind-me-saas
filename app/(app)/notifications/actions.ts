"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function markNotificationRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({
        read_at: nowIso,
        status: "read",
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.warn("[markNotificationRead] Update error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({
        read_at: nowIso,
        status: "read",
      })
      .eq("user_id", user.id)
      .neq("status", "resolved")
      .neq("status", "dismissed")
      .neq("status", "actioned");

    if (error) {
      console.warn("[markAllNotificationsRead] Update error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function markAllNotificationsResolved(): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();

    // 1. Tenter la mise à jour complète (statut resolved + horodatages)
    const { error } = await supabase
      .from("notifications")
      .update({
        status: "resolved",
        resolved_at: nowIso,
        actioned_at: nowIso,
        read_at: nowIso,
      })
      .eq("user_id", user.id)
      .neq("status", "resolved")
      .neq("status", "dismissed");

    if (error) {
      // Fallback si la contrainte ou colonne SQL n'a pas encore été migrée
      console.warn("[markAllNotificationsResolved] Standard update error, trying fallback:", error);
      const fallback = await supabase
        .from("notifications")
        .update({
          status: "dismissed",
          read_at: nowIso,
        })
        .eq("user_id", user.id)
        .neq("status", "dismissed");

      if (fallback.error) {
        return { success: false, error: fallback.error.message };
      }
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    revalidatePath("/finances");
    revalidatePath("/calendar");
    revalidatePath("/messages");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function resolveNotification(
  notificationId: string,
  entityType?: string,
  entityId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();
    const today: string = nowIso.split("T")[0] || "";

    // Anti-double-clic : si la notification est déjà résolue ou actionnée, retour immédiat
    if (notificationId) {
      const { data: curNotif } = await supabase
        .from("notifications")
        .select("status")
        .eq("id", notificationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (curNotif && (curNotif.status === "resolved" || curNotif.status === "actioned")) {
        return { success: true };
      }
    }

    // 1. REVENU / PAIEMENT
    if ((entityType === "income" || entityType === "payment") && entityId) {
      const { data: inc, error: getErr } = await supabase
        .from("income")
        .select("id, received")
        .eq("id", entityId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (getErr || !inc) {
        return { success: false, error: "Revenu introuvable" };
      }

      if (!inc.received) {
        const { error: incErr } = await supabase
          .from("income")
          .update({ received: true, received_at: today })
          .eq("id", entityId)
          .eq("user_id", user.id);

        if (incErr) return { success: false, error: incErr.message };
      }
    }
    // 2. DÉPENSE PONCTUELLE
    else if (entityType === "expense" && entityId) {
      const { data: exp, error: getErr } = await supabase
        .from("expenses")
        .select("id, paid")
        .eq("id", entityId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (getErr || !exp) {
        return { success: false, error: "Dépense introuvable" };
      }

      if (!exp.paid) {
        const { error: expErr } = await supabase
          .from("expenses")
          .update({ paid: true, paid_at: today })
          .eq("id", entityId)
          .eq("user_id", user.id);

        if (expErr) return { success: false, error: expErr.message };
      }
    }
    // 3. TÂCHE
    else if (entityType === "task" && entityId) {
      const { data: task, error: getErr } = await supabase
        .from("tasks")
        .select("id, status")
        .eq("id", entityId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (getErr || !task) {
        return { success: false, error: "Tâche introuvable" };
      }

      if (task.status !== "done") {
        const { error: taskErr } = await supabase
          .from("tasks")
          .update({ status: "done", completed_at: nowIso })
          .eq("id", entityId)
          .eq("user_id", user.id);

        if (taskErr) return { success: false, error: taskErr.message };
      }
    }
    // 4. SÉANCE DU CALENDRIER / ACTIVITÉ
    else if ((entityType === "activity" || entityType === "calendar_event") && entityId) {
      const { data: evt } = await supabase
        .from("calendar_events")
        .select("id, status")
        .or(`id.eq.${entityId},activity_id.eq.${entityId}`)
        .eq("user_id", user.id)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!evt) {
        return { success: false, error: "Séance introuvable." };
      }

      if (evt.status !== "completed") {
        const { error: calErr } = await supabase
          .from("calendar_events")
          .update({ status: "completed", updated_at: nowIso })
          .eq("id", evt.id)
          .eq("user_id", user.id);

        if (calErr) return { success: false, error: calErr.message };
      }
    }
    // 5. DÉPENSE PROGRAMMÉE (SCHEDULED EXPENSE)
    else if (entityType === "scheduled_expense" && entityId) {
      const { data: sch, error: getErr } = await supabase
        .from("scheduled_expenses")
        .select("*")
        .eq("id", entityId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (getErr || !sch) {
        return { success: false, error: "Dépense programmée introuvable" };
      }

      const effectiveDueDate: string = sch.next_due_date || today;

      // Idempotence & anti-double-clic
      if (sch.frequency === "once" && sch.status === "paid") {
        // Déjà réglée
      } else {
        // Anti-double-clic temporel : vérifier si une dépense identique a été créée il y a moins de 15s
        const { data: recentExp } = await supabase
          .from("expenses")
          .select("id, created_at")
          .eq("user_id", user.id)
          .eq("label", sch.name || "Dépense programmée")
          .eq("amount", Number(sch.amount) || 0)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentExp && recentExp.created_at) {
          const diffSec = (Date.now() - new Date(recentExp.created_at).getTime()) / 1000;
          if (diffSec < 15) {
            // Ignorer la duplication
            return { success: true };
          }
        }

        const { data: existingExp } = await supabase
          .from("expenses")
          .select("id")
          .eq("user_id", user.id)
          .eq("due_date", effectiveDueDate)
          .eq("amount", Number(sch.amount) || 0)
          .eq("label", sch.name || "Dépense programmée")
          .maybeSingle();

        if (!existingExp) {
          const { error: insErr } = await supabase.from("expenses").insert({
            user_id: user.id,
            label: sch.name || "Dépense programmée",
            category: sch.category || "other",
            amount: Number(sch.amount) || 0,
            currency: sch.currency || "XOF",
            due_date: effectiveDueDate,
            paid: true,
            activity_id: sch.activity_id || null,
            notes: "Règlement effectué depuis le centre de notifications",
          });

          if (insErr) return { success: false, error: insErr.message };
        }

        if (sch.frequency === "once") {
          const { error: updErr } = await supabase
            .from("scheduled_expenses")
            .update({ status: "paid" })
            .eq("id", entityId)
            .eq("user_id", user.id);

          if (updErr) return { success: false, error: updErr.message };
        } else {
          const curDate = new Date(effectiveDueDate);
          const nextDate = new Date(curDate);
          if (sch.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
          else if (sch.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
          else if (sch.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
          else if (sch.frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
          else if (sch.frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
          else nextDate.setMonth(nextDate.getMonth() + 1);

          const { error: updErr } = await supabase
            .from("scheduled_expenses")
            .update({
              next_due_date: nextDate.toISOString().split("T")[0],
              status: "planned",
            })
            .eq("id", entityId)
            .eq("user_id", user.id);

          if (updErr) return { success: false, error: updErr.message };
        }
      }
    }

    // Résoudre toutes les notifications liées à cette entité UNIQUEMENT après succès métier
    if (entityId) {
      const { error: entityUpdateError } = await supabase
        .from("notifications")
        .update({
          status: "resolved",
          resolved_at: nowIso,
          actioned_at: nowIso,
          read_at: nowIso,
        })
        .eq("user_id", user.id)
        .eq("entity_id", entityId);

      if (entityUpdateError) {
        await supabase
          .from("notifications")
          .update({
            status: "dismissed",
            read_at: nowIso,
          })
          .eq("user_id", user.id)
          .eq("entity_id", entityId);
      }
    }

    // Résoudre la notification spécifique par son ID
    const { error } = await supabase
      .from("notifications")
      .update({
        status: "resolved",
        resolved_at: nowIso,
        actioned_at: nowIso,
        read_at: nowIso,
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.warn("[resolveNotification] Update error, trying fallback:", error);
      await supabase
        .from("notifications")
        .update({
          status: "dismissed",
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    revalidatePath("/finances");
    revalidatePath("/calendar");
    revalidatePath("/messages");
    return { success: true };
  } catch (err: any) {
    console.error("[resolveNotification] Unexpected error:", err);
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function markEventMissedAction(
  notificationId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();

    const { data: evt } = await supabase
      .from("calendar_events")
      .select("id, status")
      .or(`id.eq.${eventId},activity_id.eq.${eventId}`)
      .eq("user_id", user.id)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!evt) {
      return { success: false, error: "Séance introuvable." };
    }

    if (evt.status !== "missed") {
      const { error: calErr } = await supabase
        .from("calendar_events")
        .update({ status: "missed", updated_at: nowIso })
        .eq("id", evt.id)
        .eq("user_id", user.id);

      if (calErr) return { success: false, error: calErr.message };
    }

    // Résoudre les notifications
    await supabase
      .from("notifications")
      .update({
        status: "resolved",
        resolved_at: nowIso,
        actioned_at: nowIso,
        read_at: nowIso,
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (eventId) {
      await supabase
        .from("notifications")
        .update({
          status: "resolved",
          resolved_at: nowIso,
          actioned_at: nowIso,
          read_at: nowIso,
        })
        .eq("entity_id", eventId)
        .eq("user_id", user.id);
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function postponeEventAction(
  notificationId: string,
  eventId: string,
  hours: number = 2
): Promise<{ success: boolean; error?: string; newStart?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const { data: evt } = await supabase
      .from("calendar_events")
      .select("id, starts_at, ends_at, original_starts_at")
      .or(`id.eq.${eventId},activity_id.eq.${eventId}`)
      .eq("user_id", user.id)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!evt) {
      return { success: false, error: "Séance introuvable pour le report." };
    }

    const curStart = new Date(evt.starts_at);
    const curEnd = new Date(evt.ends_at);
    const durationMs = Math.max(1800000, curEnd.getTime() - curStart.getTime());

    const baseStartMs = curStart.getTime() < nowMs ? nowMs : curStart.getTime();
    const newStart = new Date(baseStartMs + hours * 3600 * 1000);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const { error: calErr } = await supabase
      .from("calendar_events")
      .update({
        status: "postponed",
        starts_at: newStart.toISOString(),
        ends_at: newEnd.toISOString(),
        is_exception: true,
        original_starts_at: evt.original_starts_at || evt.starts_at,
        updated_at: nowIso,
      })
      .eq("id", evt.id)
      .eq("user_id", user.id);

    if (calErr) return { success: false, error: calErr.message };

    const snoozedUntil = newStart.toISOString();

    // Snooze notification
    await supabase
      .from("notifications")
      .update({
        status: "snoozed",
        snoozed_until: snoozedUntil,
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (eventId) {
      await supabase
        .from("notifications")
        .update({
          status: "snoozed",
          snoozed_until: snoozedUntil,
        })
        .eq("entity_id", eventId)
        .eq("user_id", user.id);
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { success: true, newStart: snoozedUntil };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function postponeTaskAction(
  notificationId: string,
  taskId: string,
  days: number = 1
): Promise<{ success: boolean; newDueDate?: string; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const today = new Date().toISOString().split("T")[0]!;

    const { data: task, error: getErr } = await supabase
      .from("tasks")
      .select("id, due_date")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (getErr || !task) {
      return { success: false, error: "Tâche introuvable" };
    }

    const curDateStr = task.due_date && task.due_date >= today ? task.due_date : today;
    const curDue = new Date(curDateStr);
    const nextDue = new Date(curDue.getTime() + days * 24 * 3600 * 1000);
    const nextDueStr = nextDue.toISOString().split("T")[0];

    const { error: updErr } = await supabase
      .from("tasks")
      .update({ due_date: nextDueStr, status: "todo" })
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    const snoozedUntil = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
    if (notificationId) {
      await supabase
        .from("notifications")
        .update({ status: "snoozed", snoozed_until: snoozedUntil })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    }
    if (taskId) {
      await supabase
        .from("notifications")
        .update({ status: "snoozed", snoozed_until: snoozedUntil })
        .eq("entity_id", taskId)
        .eq("user_id", user.id);
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    return { success: true, newDueDate: nextDueStr };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function acceptEvolutionAction(
  activityId: string,
  notificationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();

    const { data: act, error: fetchErr } = await supabase
      .from("activities")
      .select("id, status")
      .eq("id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !act) {
      return { success: false, error: "Activité introuvable." };
    }

    const { error: updErr } = await supabase
      .from("activities")
      .update({
        engagement_nature: "routine",
        updated_at: nowIso,
      })
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (updErr) {
      return { success: false, error: "Impossible de passer en routine: " + updErr.message };
    }

    if (notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "resolved",
          resolved_at: nowIso,
          actioned_at: nowIso,
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    }

    await supabase
      .from("notifications")
      .update({
        status: "resolved",
        resolved_at: nowIso,
        actioned_at: nowIso,
        read_at: nowIso,
      })
      .eq("entity_id", activityId)
      .eq("kind", "activity_routine_suggestion")
      .eq("user_id", user.id);

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    revalidatePath("/activities");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function declineEvolutionAction(
  activityId: string,
  notificationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();
    const snoozedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "dismissed",
          snoozed_until: snoozedUntil,
          actioned_at: nowIso,
          resolved_at: nowIso,
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    }

    await supabase
      .from("notifications")
      .update({
        status: "dismissed",
        snoozed_until: snoozedUntil,
        actioned_at: nowIso,
        resolved_at: nowIso,
        read_at: nowIso,
      })
      .eq("entity_id", activityId)
      .eq("kind", "activity_routine_suggestion")
      .eq("user_id", user.id);

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function keepExpiredAction(
  activityId: string,
  notificationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();

    const { data: act, error: fetchErr } = await supabase
      .from("activities")
      .select("id, status")
      .eq("id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !act) {
      return { success: false, error: "Activité introuvable." };
    }

    const { error: updErr } = await supabase
      .from("activities")
      .update({ status: "expired", updated_at: nowIso })
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (updErr) {
      return { success: false, error: "Impossible de clore l'activité: " + updErr.message };
    }

    if (notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "resolved",
          resolved_at: nowIso,
          actioned_at: nowIso,
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    }

    await supabase
      .from("notifications")
      .update({
        status: "resolved",
        resolved_at: nowIso,
        actioned_at: nowIso,
        read_at: nowIso,
      })
      .eq("entity_id", activityId)
      .eq("user_id", user.id);

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    revalidatePath("/activities");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function quickRenewActivityAction(
  activityId: string,
  newEndDate: string,
  notificationId?: string,
  amount?: number,
  currency?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();
    const today = nowIso.split("T")[0]!;

    if (!newEndDate) {
      return { success: false, error: "La nouvelle date de fin est obligatoire." };
    }

    const { data: act, error: fetchErr } = await supabase
      .from("activities")
      .select("id, name, start_date, end_date, status, validity_type")
      .eq("id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !act) {
      return { success: false, error: "Activité introuvable." };
    }

    const effectiveStart = act.start_date || today;
    if (newEndDate < effectiveStart) {
      return {
        success: false,
        error: `La nouvelle date de fin (${newEndDate}) ne peut pas précéder la date de début (${effectiveStart}).`,
      };
    }

    const { error: updErr } = await supabase
      .from("activities")
      .update({
        status: "active",
        validity_type: "temporary",
        end_date: newEndDate,
        updated_at: nowIso,
      })
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (updErr) {
      return { success: false, error: "Échec du renouvellement: " + updErr.message };
    }

    if (amount !== undefined && amount > 0) {
      const compPayload: Record<string, any> = {
        amount,
        updated_at: nowIso,
      };
      if (currency) compPayload.currency = currency;
      await supabase
        .from("activity_compensation")
        .update(compPayload)
        .eq("activity_id", activityId)
        .eq("user_id", user.id);
    }

    // Résoudre les notifications liées à cette activité
    await supabase
      .from("notifications")
      .update({
        status: "resolved",
        resolved_at: nowIso,
        actioned_at: nowIso,
        read_at: nowIso,
      })
      .eq("user_id", user.id)
      .eq("entity_id", activityId);

    if (notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "resolved",
          resolved_at: nowIso,
          actioned_at: nowIso,
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    revalidatePath("/activities");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}


export async function snoozeNotification(
  notificationId: string,
  hours: number = 24
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({
        status: "snoozed",
        snoozed_until: snoozedUntil,
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.warn("[snoozeNotification] Update error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

export async function deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.warn("[deleteNotification] Delete error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur" };
  }
}

/**
 * Valide le bilan de la journée de manière globale et enregistre la validation dans
 * daily_summary_validations SANS modifier ni marquer arbitrairement les activités
 * individuelles sous-jacentes comme terminées.
 */
export async function validateDailySummaryAction(
  summaryDate: string,
  notificationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const nowIso = new Date().toISOString();

    // 1. Enregistrement distinct dans la table daily_summary_validations
    const { error: valError } = await supabase
      .from("daily_summary_validations")
      .upsert(
        {
          user_id: user.id,
          summary_date: summaryDate,
          validated_at: nowIso,
        },
        { onConflict: "user_id, summary_date" }
      );

    if (valError) {
      console.warn("[validateDailySummaryAction] Validation upsert error:", valError);
    }

    // 2. Clôture de la notification du bilan quotidien
    if (notificationId) {
      await supabase
        .from("notifications")
        .update({
          status: "resolved",
          resolved_at: nowIso,
          actioned_at: nowIso,
          read_at: nowIso,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[validateDailySummaryAction] Unexpected error:", err);
    return { success: false, error: err?.message || "Erreur lors de la validation du bilan." };
  }
}

