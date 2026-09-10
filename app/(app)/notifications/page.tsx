import { createClient } from "@/lib/supabase/server";
import { ensureNotifications } from "@/lib/notifications/sync";
import { NotificationsCenter } from "@/components/notifications/notifications-center";
import type { Notification } from "@/types/database";

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();
    
  const timezone = profile?.timezone ?? "UTC";

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
