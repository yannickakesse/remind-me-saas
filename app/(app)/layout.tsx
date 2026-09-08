import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureNotifications } from "@/lib/notifications/sync";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/activities", label: "Activités" },
  { href: "/calendar", label: "Calendrier" },
  { href: "/tasks", label: "Tâches" },
  { href: "/finances", label: "Finances" },
  { href: "/clients", label: "Clients" },
  { href: "/reports", label: "Rapports" },
  { href: "/settings", label: "Paramètres" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, timezone")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  // Génération paresseuse à chaque navigation dans l'app, comme le
  // calendrier/les revenus — voir lib/notifications/sync.ts. L'index
  // unique en base rend cet appel répété sans coût de duplication.
  await ensureNotifications(supabase, user.id, profile.timezone ?? "UTC");
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-ink-100 bg-canvas-raised px-4 py-6">
        <div className="mb-6 flex items-center justify-between px-2">
          <p className="text-sm font-semibold text-ink-950">Mon activité</p>
          <Link href="/notifications" aria-label="Notifications" className="relative text-ink-500 hover:text-signal">
            🔔
            {unreadCount ? (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            ) : null}
          </Link>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-sm text-ink-700 hover:bg-signal-soft hover:text-signal"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
