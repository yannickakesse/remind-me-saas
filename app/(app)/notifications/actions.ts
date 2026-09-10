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

export async function markNotificationRead(notificationId: string) {
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

  if (error) throw new Error("Impossible de marquer la notification comme lue.");

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser();
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("notifications")
    .update({
      read_at: nowIso,
      status: "read",
    })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) throw new Error("Impossible de marquer les notifications comme lues.");

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function resolveNotification(notificationId: string, entityType?: string, entityId?: string) {
  const { supabase, user } = await requireUser();
  const nowIso = new Date().toISOString();

  if (entityType === "income" && entityId) {
    await supabase
      .from("income")
      .update({ received: true, received_date: nowIso.split("T")[0] })
      .eq("id", entityId)
      .eq("user_id", user.id);
  } else if (entityType === "expense" && entityId) {
    await supabase
      .from("expenses")
      .update({ paid: true, paid_date: nowIso.split("T")[0] })
      .eq("id", entityId)
      .eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("notifications")
    .update({
      status: "resolved",
      resolved_at: nowIso,
      read_at: nowIso,
    })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de résoudre la notification.");

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/finances");
}

export async function snoozeNotification(notificationId: string, hours: number = 24) {
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

  if (error) throw new Error("Impossible de reporter la notification.");

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function deleteNotification(notificationId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de supprimer la notification.");

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
