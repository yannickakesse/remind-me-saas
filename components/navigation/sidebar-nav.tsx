"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/i18n/language-provider";
import type { TranslationKey } from "@/lib/i18n/types";
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

interface NavItemDef {
  href: string;
  labelKey: TranslationKey;
  icon: any;
  tourKey: string;
}

const NAV_ITEMS: NavItemDef[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, tourKey: "nav-dashboard" },
  { href: "/activities", labelKey: "nav.activities", icon: Briefcase, tourKey: "nav-activities" },
  { href: "/calendar", labelKey: "nav.calendar", icon: Calendar, tourKey: "nav-calendar" },
  { href: "/tasks", labelKey: "nav.tasks", icon: CheckSquare, tourKey: "nav-tasks" },
  { href: "/finances", labelKey: "nav.finances", icon: Wallet, tourKey: "nav-finances" },
  { href: "/clients", labelKey: "nav.clients", icon: Users, tourKey: "nav-clients" },
  { href: "/reports", labelKey: "nav.reports", icon: BarChart3, tourKey: "nav-reports" },
  { href: "/settings", labelKey: "nav.settings", icon: Settings, tourKey: "nav-settings" },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="flex flex-col gap-1.5" aria-label="Navigation principale">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            data-tour={item.tourKey}
            className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ease-out transform ${
              isActive
                ? "bg-signal text-white font-semibold shadow-sm shadow-signal/25 scale-[1.01]"
                : "text-ink-700 dark:text-ink-300 hover:bg-signal-soft/30 dark:hover:bg-ink-800/60 hover:text-signal hover:translate-x-1 hover:shadow-xs active:scale-[0.98]"
            }`}
          >
            {/* Active Indicator Bar */}
            {isActive && (
              <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white/80" />
            )}

            <Icon
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ease-out ${
                isActive
                  ? "text-white scale-105"
                  : "text-ink-500 group-hover:text-signal group-hover:scale-110 group-hover:rotate-3"
              }`}
              strokeWidth={isActive ? 2.2 : 1.8}
            />
            <span className="truncate">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

