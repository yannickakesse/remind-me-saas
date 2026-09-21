import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommandPalette } from "@/components/navigation/command-palette";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { NotificationSyncTrigger } from "@/components/notifications/notification-sync-trigger";
import { TaskSoundWatcher } from "@/components/notifications/task-sound-watcher";
import { InteractiveProductTour } from "@/components/onboarding/interactive-product-tour";
import { HelpCenterButton } from "@/components/help/help-center-modal";
import { RemindMeLogo } from "@/components/landing/remindme-logo";
import { NetworkStatus } from "@/components/ui/network-status";
import type { Notification } from "@/types/database";

import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  CheckSquare,
  Wallet,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, tourKey: "nav-dashboard" },
  { href: "/activities", label: "Activités", icon: Briefcase, tourKey: "nav-activities" },
  { href: "/calendar", label: "Calendrier", icon: Calendar, tourKey: "nav-calendar" },
  { href: "/tasks", label: "Tâches", icon: CheckSquare, tourKey: "nav-tasks" },
  { href: "/finances", label: "Finances", icon: Wallet, tourKey: "nav-finances" },
  { href: "/clients", label: "Clients", icon: Users, tourKey: "nav-clients" },
  { href: "/reports", label: "Rapports", icon: BarChart3, tourKey: "nav-reports" },
  { href: "/settings", label: "Paramètres", icon: Settings, tourKey: "nav-settings" },
];

import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();
  const supabase = createClient();

  const [profile, { count: unreadCount }, { data: latestNotifications }, { data: userSettings }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("user_settings")
      .select("ui_prefs")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const tourState = (userSettings?.ui_prefs as any)?.tour_state;
  const tourCompleted = Boolean(tourState?.completed || tourState?.skipped);

  return (
    <div className="flex min-h-screen bg-canvas flex-col md:flex-row w-full max-w-full overflow-x-hidden">
      {/* Moniteur d'état réseau & synchronisation asynchrone & sonneries de rappels */}
      <NetworkStatus />
      <NotificationSyncTrigger />
      <TaskSoundWatcher userId={user.id} />
      <InteractiveProductTour initialCompleted={tourCompleted} />

      {/* Header & Bottom Nav Mobile (< 768px) */}
      <MobileNav unreadCount={unreadCount} />

      {/* Sidebar Desktop (>= 768px) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-ink-200 bg-canvas-raised px-4 py-6">
        <div className="space-y-6">
          {/* Logo & Titre */}
          <div className="flex items-center justify-between px-2 gap-2">
            <Link href="/dashboard" className="flex items-center group">
              <RemindMeLogo size="sm" showText={true} />
            </Link>

            <div className="flex items-center gap-1.5">
              <HelpCenterButton />
              <div data-tour="notification-bell" className="inline-flex">
                <NotificationBell
                  notifications={(latestNotifications as Notification[]) ?? []}
                  unreadCount={unreadCount ?? 0}
                />
              </div>
            </div>
          </div>

          {/* Recherche Globale / Command Palette */}
          <div className="px-1">
            <CommandPalette />
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  data-tour={item.tourKey}
                  className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-signal-soft hover:text-signal transition-colors"
                >
                  <Icon className="w-4 h-4 text-ink-500 group-hover:text-signal transition-colors shrink-0" strokeWidth={1.8} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
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
      <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full min-w-0 max-w-full overflow-y-auto pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}

