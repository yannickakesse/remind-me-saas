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
import { PwaRegistrar } from "@/components/pwa/pwa-registrar";
import { BackgroundPreloader } from "@/components/pwa/background-preloader";
import { DailyWelcomeBanner } from "@/components/notifications/daily-welcome-banner";
import { LanguageSelector } from "@/components/ui/language-selector";
import type { Notification } from "@/types/database";

import { SidebarNav } from "@/components/navigation/sidebar-nav";

import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { getUserTimezone } from "@/lib/time/timezones";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();
  const supabase = createClient();
  const profile = await getCurrentProfile();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const [{ count: unreadCount }, { data: latestNotifications }, { data: userSettings }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)
      .neq("status", "resolved")
      .neq("status", "dismissed"),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .is("read_at", null)
      .neq("status", "resolved")
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("user_settings")
      .select("ui_prefs")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const tourState = (userSettings?.ui_prefs as any)?.tour_state;
  const tourCompleted = Boolean(tourState?.completed || tourState?.skipped);

  return (
    <div className="flex min-h-screen md:h-screen w-full overflow-hidden bg-canvas text-ink-950 dark:text-white flex-col md:flex-row">
      {/* Service Worker PWA, push registration & instant background precaching */}
      <PwaRegistrar />
      <BackgroundPreloader />
      <DailyWelcomeBanner userName={profile?.full_name} timezone={getUserTimezone(profile)} />
      <NotificationSyncTrigger />
      <TaskSoundWatcher userId={user.id} />
      <InteractiveProductTour initialCompleted={tourCompleted} />

      {/* Header & Bottom Nav Mobile (< 768px) */}
      <MobileNav unreadCount={unreadCount} />

      {/* Sidebar Desktop (>= 768px) — Toujours fixe, propre et jamais coupée */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md px-4 py-6 h-screen z-30 shadow-xs print:hidden">
        <div className="space-y-6 flex-1 min-h-0 flex flex-col">
          {/* Logo & Titre */}
          <div className="flex items-center justify-between px-2 gap-2 shrink-0">
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
          <div className="px-1 shrink-0">
            <CommandPalette />
          </div>

          {/* Navigation Réactive & Multilingue */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <SidebarNav />
          </div>
        </div>

        {/* Profil utilisateur & Sélecteur de Langue en bas */}
        <div className="border-t border-ink-200/80 dark:border-ink-800/80 pt-3 px-2 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-medium text-ink-500">Langue</span>
            <LanguageSelector variant="pill" />
          </div>
          <Link
            href="/settings"
            className="group flex items-center gap-3 rounded-2xl p-2.5 hover:bg-ink-100/70 dark:hover:bg-ink-800/60 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "Avatar"}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-signal/30 group-hover:ring-signal transition-all shadow-xs"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-signal to-signal-dark text-white font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink-950 dark:text-ink-50 group-hover:text-signal transition-colors truncate">
                {profile.full_name || "Mon Compte"}
              </p>
              <p className="text-[10px] text-ink-500 dark:text-ink-400 truncate">{user.email}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Contenu principal défilable avec scroll indépendant */}
      <main className="flex-1 min-h-screen md:min-h-0 md:h-screen overflow-y-auto overflow-x-hidden min-w-0 p-3.5 sm:p-6 md:p-8 pb-24 md:pb-8 relative isolate">
        <div className="max-w-7xl mx-auto w-full min-w-0 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

