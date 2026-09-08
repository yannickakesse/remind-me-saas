import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureNotifications } from "@/lib/notifications/sync";
import { CommandPalette } from "@/components/navigation/command-palette";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { NetworkStatus } from "@/components/ui/network-status";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: "🏠" },
  { href: "/activities", label: "Activités", icon: "📁" },
  { href: "/calendar", label: "Calendrier", icon: "📅" },
  { href: "/tasks", label: "Tâches", icon: "📝" },
  { href: "/finances", label: "Finances", icon: "💰" },
  { href: "/clients", label: "Clients", icon: "👥" },
  { href: "/reports", label: "Rapports", icon: "📊" },
  { href: "/settings", label: "Paramètres", icon: "⚙️" },
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
    .select("onboarding_completed, timezone, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  // Synchronisation des notifications
  await ensureNotifications(supabase, user.id, profile.timezone ?? "UTC");
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <div className="flex min-h-screen bg-canvas flex-col md:flex-row">
      {/* Moniteur d'état réseau */}
      <NetworkStatus />

      {/* Header & Bottom Nav Mobile (< 768px) */}
      <MobileNav unreadCount={unreadCount} />

      {/* Sidebar Desktop (>= 768px) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-ink-200 bg-canvas-raised px-4 py-6">
        <div className="space-y-6">
          {/* Logo & Titre */}
          <div className="flex items-center justify-between px-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal font-bold text-white text-sm">
                M
              </span>
              <span className="font-bold text-base text-ink-950">Multi-Activity</span>
            </Link>

            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative p-1.5 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-signal transition-colors"
            >
              🔔
              {unreadCount ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white animate-pulse">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
          </div>

          {/* Recherche Globale / Command Palette */}
          <div className="px-1">
            <CommandPalette />
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-signal-soft hover:text-signal transition-colors"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Profil utilisateur en bas */}
        <div className="border-t border-ink-100 pt-4 px-2">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg p-2 hover:bg-ink-50 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-soft text-signal font-bold text-xs">
              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink-950 truncate">
                {profile.full_name || "Mon Compte"}
              </p>
              <p className="text-[10px] text-ink-500 truncate">{user.email}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Contenu principal avec padding adapté pour la bottom nav mobile */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto overflow-y-auto pb-20 md:pb-8">
        {children}
      </main>
    </div>
  );
}
