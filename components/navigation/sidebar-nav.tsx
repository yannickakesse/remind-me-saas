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
    <nav className="flex flex-col gap-1">
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
            className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all min-h-[40px] ${
              isActive
                ? "bg-signal text-white font-semibold shadow-xs"
                : "text-ink-700 dark:text-ink-300 hover:bg-signal-soft/40 hover:text-signal"
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 transition-colors ${
                isActive ? "text-white" : "text-ink-500 group-hover:text-signal"
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
