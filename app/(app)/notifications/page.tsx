import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ensureNotifications } from "@/lib/notifications/sync";
import { notificationKindLabel, NOTIFICATION_KIND_STYLES } from "@/lib/validation/notifications";
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from "./actions";

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user!.id).single();
  const timezone = profile?.timezone ?? "UTC";

  await ensureNotifications(supabase, user!.id, timezone);

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .eq("user_id", user!.id)
    .order("read_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(100);

  const all = notifications ?? [];
  const unreadCount = all.filter((n) => !n.read_at).length;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Notifications</h1>
          <p className="text-ink-500">Rappels de tâches et échéances financières en retard.</p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-sm font-medium text-signal hover:underline">
              Tout marquer comme lu
            </button>
          </form>
        ) : null}
      </div>

      {all.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-300 px-6 py-12 text-center">
          <p className="mb-1 font-medium text-ink-950">Rien à signaler</p>
          <p className="text-sm text-ink-500">
            Vous serez notifié ici pour les rappels de tâches et les échéances financières en retard.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {all.map((n) => (
            <li
              key={n.id}
              className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 ${
                n.read_at ? "border-ink-100 bg-canvas-raised opacity-70" : "border-signal/30 bg-canvas-raised"
              }`}
            >
              <Link href={n.link} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${NOTIFICATION_KIND_STYLES[n.kind]}`}
                  >
                    {notificationKindLabel(n.kind)}
                  </span>
                  <p className="font-medium text-ink-950">{n.title}</p>
                </div>
                <p className="mt-0.5 text-sm text-ink-500">{n.body}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {DateTime.fromISO(n.created_at, { zone: timezone }).setLocale("fr").toRelative()}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                {!n.read_at ? (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <button type="submit" className="text-sm font-medium text-signal hover:underline">
                      Marquer comme lu
                    </button>
                  </form>
                ) : null}
                <form action={deleteNotification.bind(null, n.id)}>
                  <button type="submit" className="text-sm text-ink-500 hover:text-danger hover:underline">
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
