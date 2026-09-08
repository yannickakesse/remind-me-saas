"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: "🏠" },
  { href: "/calendar", label: "Calendrier", icon: "📅" },
  { href: "/tasks", label: "Tâches", icon: "📝" },
  { href: "/finances", label: "Finances", icon: "💰" },
  { href: "/settings", label: "Plus", icon: "⚙️" },
];

export function MobileNav({ unreadCount }: { unreadCount?: number | null }) {
  const pathname = usePathname();

  return (
    <>
      {/* Header Mobile compact (< 768px) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-ink-200 bg-canvas-raised/95 backdrop-blur-xs px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal font-bold text-white text-xs">
            M
          </span>
          <span className="font-bold text-sm text-ink-950">Multi-Activity</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative p-2 rounded-lg text-ink-600 hover:bg-ink-100 transition-colors"
          >
            🔔
            {unreadCount ? (
              <span className="absolute 1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </Link>
        </div>
      </header>

      {/* Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-ink-200 bg-canvas-raised/95 backdrop-blur-md px-2 py-1.5 shadow-lg safe-area-bottom"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[56px] min-h-[44px] transition-colors ${
                isActive
                  ? "text-signal font-bold"
                  : "text-ink-500 hover:text-ink-800 font-medium"
              }`}
            >
              <span className="text-lg leading-none mb-0.5">{item.icon}</span>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
