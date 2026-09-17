import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureNotifications } from "@/lib/notifications/sync";
import { NotificationsCenter } from "@/components/notifications/notifications-center";
import type { Notification } from "@/types/database";

export default async function NotificationsPage() {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  const timezone = profile?.timezone ?? "UTC";
  const supabase = createClient();

  // Run the smart reminders engine
  await ensureNotifications(supabase, user!.id, timezone);

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user!.id)
    .order("status", { ascending: true }) // unread/pending first
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="max-w-5xl mx-auto py-2">
      <NotificationsCenter
        initialNotifications={(notifications as Notification[]) ?? []}
        timezone={timezone}
      />
    </div>
  );
}
