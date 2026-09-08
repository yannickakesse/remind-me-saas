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

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de marquer la notification comme lue.");

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) throw new Error("Impossible de marquer les notifications comme lues.");

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function deleteNotification(notificationId: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("notifications").delete().eq("id", notificationId).eq("user_id", user.id);

  if (error) throw new Error("Impossible de supprimer la notification.");

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
