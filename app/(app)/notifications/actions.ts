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

    // 1. REVENU / PAIEMENT
    if ((entityType === "income" || entityType === "payment") && entityId) {
      await supabase
        .from("income")
        .update({ received: true, received_at: today })
        .eq("id", entityId)
        .eq("user_id", user.id);
    }
    // 2. DÉPENSE PONCTUELLE
    else if (entityType === "expense" && entityId) {
      await supabase
        .from("expenses")
        .update({ paid: true, paid_at: today })
        .eq("id", entityId)
        .eq("user_id", user.id);
    }
    // 3. TÂCHE
    else if (entityType === "task" && entityId) {
      await supabase
        .from("tasks")
        .update({ status: "done", completed_at: nowIso })
        .eq("id", entityId)
        .eq("user_id", user.id);
    }
    // 4. SÉANCE DU CALENDRIER / ACTIVITÉ
    else if ((entityType === "activity" || entityType === "calendar_event") && entityId) {
      await supabase
        .from("calendar_events")
        .update({ status: "completed" })
        .or(`id.eq.${entityId},activity_id.eq.${entityId}`)
        .eq("user_id", user.id);
    }
    // 5. DÉPENSE PROGRAMMÉE (SCHEDULED EXPENSE)
    else if (entityType === "scheduled_expense" && entityId) {
      const { data: sch } = await supabase
        .from("scheduled_expenses")
        .select("*")
        .eq("id", entityId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (sch) {
        const effectiveDueDate: string = sch.next_due_date || today;
        await supabase.from("expenses").insert({
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

        if (sch.frequency === "once") {
          await supabase
            .from("scheduled_expenses")
            .update({ status: "paid" })
            .eq("id", entityId)
            .eq("user_id", user.id);
        } else {
          const curDate = new Date(effectiveDueDate);
          const nextDate = new Date(curDate);
          if (sch.frequency === "daily") nextDate.setDate(nextDate.getDate() + 1);
          else if (sch.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
          else if (sch.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
          else if (sch.frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
          else if (sch.frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
          else nextDate.setMonth(nextDate.getMonth() + 1);

          await supabase
            .from("scheduled_expenses")
            .update({
              next_due_date: nextDate.toISOString().split("T")[0],
              status: "planned",
            })
            .eq("id", entityId)
            .eq("user_id", user.id);
        }
      }
    }

    // Résoudre toutes les notifications liées à cette entité
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
    return { success: true };
  } catch (err: any) {
    console.error("[resolveNotification] Unexpected error:", err);
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
