import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureNotifications } from "@/lib/notifications/sync";
import { NotificationsCenter } from "@/components/notifications/notifications-center";
import { getUserTimezone } from "@/lib/time/timezones";
import type { Notification } from "@/types/database";

export default async function NotificationsPage() {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  const timezone = getUserTimezone(profile);

  const supabase = createClient();

  // Run the smart reminders engine
  await ensureNotifications(supabase, user!.id, timezone);

  const [
    { data: activeNotifications },
    { data: historyNotifications },
    { data: activities },
  ] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user!.id)
      .in("status", ["unread", "read", "snoozed"])
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user!.id)
      .in("status", ["resolved", "dismissed", "actioned"])
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("activities")
      .select("id, name")
      .eq("user_id", user!.id)
      .order("name", { ascending: true }),
  ]);

  const notifications = [
    ...((activeNotifications as Notification[]) ?? []),
    ...((historyNotifications as Notification[]) ?? []),
  ];

  return (
    <div className="max-w-5xl mx-auto py-2">
      <NotificationsCenter
        initialNotifications={notifications}
        timezone={timezone}
        activities={(activities as Array<{ id: string; name: string }>) ?? []}
      />
    </div>
  );
}
