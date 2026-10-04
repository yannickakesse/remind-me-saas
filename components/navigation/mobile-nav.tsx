"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { RemindMeLogo } from "@/components/landing/remindme-logo";
import { HelpCenterButton } from "@/components/help/help-center-modal";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useLanguage } from "@/components/i18n/language-provider";
import type { TranslationKey } from "@/lib/i18n/types";

import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  CheckSquare,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  PiggyBank,
  Target,
  Users,
  BarChart3,
  Bell,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MobileNavProps {
  unreadCount?: number | null;
}

export function MobileNav({ unreadCount }: MobileNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [financesOpen, setFinancesOpen] = useState(true);

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const navLinks: { href: string; labelKey: TranslationKey; icon: any; tourKey: string }[] = [
    { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, tourKey: "nav-dashboard-mobile" },
    { href: "/calendar", labelKey: "nav.calendar", icon: Calendar, tourKey: "nav-calendar-mobile" },
    { href: "/activities", labelKey: "nav.activities", icon: Briefcase, tourKey: "nav-activities" },
    { href: "/tasks", labelKey: "nav.tasks", icon: CheckSquare, tourKey: "nav-tasks-mobile" },
  ];

  const financeSubLinks: { href: string; labelKey: TranslationKey; icon: any }[] = [
    { href: "/finances", labelKey: "nav.overview", icon: Wallet },
    { href: "/finances?tab=income", labelKey: "nav.income", icon: TrendingUp },
    { href: "/finances?tab=expenses", labelKey: "nav.expenses", icon: TrendingDown },
    { href: "/finances?tab=scheduled", labelKey: "nav.scheduled_expenses", icon: Clock },
    { href: "/finances?tab=savings", labelKey: "nav.savings", icon: PiggyBank },
    { href: "/finances?tab=budgets", labelKey: "nav.budgets", icon: Target },
  ];

  const secondaryLinks: { href: string; labelKey: TranslationKey; icon: any; badge?: number | null; tourKey: string }[] = [
    { href: "/clients", labelKey: "nav.clients", icon: Users, tourKey: "nav-clients-mobile" },
    { href: "/reports", labelKey: "nav.reports", icon: BarChart3, tourKey: "nav-reports-mobile" },
    { href: "/notifications", labelKey: "nav.notifications", icon: Bell, badge: unreadCount, tourKey: "nav-notifications-mobile" },
    { href: "/settings", labelKey: "nav.settings", icon: Settings, tourKey: "nav-settings-mobile" },
  ];

  return (
    <>
      {/* Top Mobile Bar (< 768px) — Header Mobile Moderne & Épuré */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-ink-200 dark:border-ink-800 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md px-4 py-2.5 safe-area-top shadow-xs w-full max-w-full print:hidden">
        <Link href="/dashboard" className="flex items-center tap-active py-0.5">
          <RemindMeLogo size="sm" showText={true} />
        </Link>

        <div className="flex items-center gap-1.5">
          <LanguageSelector variant="pill" />
          <HelpCenterButton />
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex items-center justify-center h-10 w-10 rounded-xl text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all tap-active"
            data-tour="mobile-notification-bell"
          >
            <Bell className="w-5 h-5 text-ink-700 dark:text-ink-300" strokeWidth={1.8} />
            {unreadCount ? (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </div>
      </header>

      {/* Hamburger Drawer Overlay & Panel */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content — Image de fond portefeuille avec billets (drawer-bg.jpg) 100% visible et sans voile */}
          <div 
            className="relative flex flex-col w-[85%] max-w-[320px] h-full shadow-2xl z-10 border-r border-zinc-300 dark:border-zinc-800 overflow-y-auto bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/images/backgrounds/drawer-bg.jpg')" }}
          >
            {/* Contenu du Drawer (Header, Liens, Footer) directement sur l'image avec cartes opaques ultra-lisibles */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-200/90 dark:border-zinc-800/90 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md safe-area-top shadow-2xs">
                <RemindMeLogo size="sm" showText={true} />

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Fermer le menu"
                  className="flex items-center justify-center h-9 w-9 rounded-xl text-black dark:text-white hover:bg-zinc-200/80 dark:hover:bg-zinc-800 active:scale-90 transition-transform cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Navigation links list — Typographie soignée, contrastée et élégante */}
              <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                {navLinks.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      data-tour={item.tourKey}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all min-h-[44px] shadow-2xs border ${
                        isActive
                          ? "bg-signal text-white font-bold border-signal shadow-sm"
                          : "bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 border-zinc-200/90 dark:border-zinc-700/90 hover:bg-white dark:hover:bg-zinc-800"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-signal"}`} strokeWidth={2.2} />
                      <span className={isActive ? "text-white font-bold" : "text-zinc-900 dark:text-zinc-100 font-semibold"}>
                        {t(item.labelKey)}
                      </span>
                    </Link>
                  );
                })}

                {/* Collapsible Finances Section */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setFinancesOpen(!financesOpen)}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 hover:text-signal bg-white/95 dark:bg-zinc-900/95 rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-signal" strokeWidth={2.2} /> {t("nav.finances")}
                    </span>
                    <span>
                      {financesOpen ? <ChevronDown className="w-4 h-4 stroke-[2.2]" /> : <ChevronRight className="w-4 h-4 stroke-[2.2]" />}
                    </span>
                  </button>

                  {financesOpen && (
                    <div className="pl-2.5 mt-1.5 space-y-1 border-l-2 border-signal ml-2">
                      {financeSubLinks.map((sub) => {
                        const tabParam = searchParams?.get("tab");
                        const isOverview = sub.href === "/finances" && !tabParam;
                        const isSubTab = tabParam && sub.href === `/finances?tab=${tabParam}`;
                        const isActive = pathname === "/finances" && (isOverview || isSubTab);
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            prefetch={true}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px] shadow-2xs border ${
                              isActive
                                ? "bg-signal/20 text-signal font-semibold border-signal/40"
                                : "bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800"
                            }`}
                          >
                            <SubIcon className="w-3.5 h-3.5 text-signal shrink-0" strokeWidth={2.2} />
                            <span className="text-zinc-900 dark:text-zinc-100">{t(sub.labelKey)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-300/80 dark:border-zinc-800">
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 bg-white/95 dark:bg-zinc-900/95 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs mb-1.5 inline-block w-full">
                    {t("nav.general")}
                  </div>
                  {secondaryLinks.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        data-tour={item.tourKey}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all min-h-[44px] shadow-2xs border mb-1.5 ${
                          isActive
                            ? "bg-signal text-white font-bold border-signal shadow-sm"
                            : "bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 border-zinc-200/90 dark:border-zinc-700/90 hover:bg-white dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-signal"}`} strokeWidth={2.2} />
                          <span className={isActive ? "text-white font-bold" : "text-zinc-900 dark:text-zinc-100 font-semibold"}>
                            {t(item.labelKey)}
                          </span>
                        </div>
                        {item.badge ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white shadow-xs">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>

                {/* Language Selector inside Drawer */}
                <div className="pt-2 border-t border-zinc-300/80 dark:border-zinc-800">
                  <LanguageSelector variant="drawer" />
                </div>
              </div>

              {/* Quick action bar & Bouton Se Déconnecter in drawer footer */}
              <div className="p-3 border-t border-zinc-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 space-y-2 backdrop-blur-md">
                <Link
                  href="/tasks/new"
                  prefetch={true}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-signal text-white text-xs font-bold shadow-sm active:scale-98 transition-transform"
                >
                  <Plus className="w-4 h-4 stroke-[2.2]" /> {t("nav.new_task")}
                </Link>

                {/* Bouton Se Déconnecter */}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const supabase = createClient();
                      await supabase.auth.signOut();
                    } catch (e) {
                      console.error(e);
                    }
                    window.location.href = "/login";
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/80 active:scale-98 transition-all cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-4 h-4 stroke-[2.2]" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (< 768px) — Centrée, équilibrée & ultra-réactive */}
      <nav
        aria-label="Navigation mobile principale"
        data-tour="mobile-nav-bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-ink-200/80 dark:border-ink-800/80 bg-canvas-raised/95 dark:bg-ink-950/95 backdrop-blur-xl safe-area-bottom shadow-xl print:hidden"
      >
        <div className="max-w-md mx-auto w-full flex items-center justify-around px-2 py-1.5">
          <Link
            href="/dashboard"
            prefetch={true}
            data-tour="nav-dashboard"
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl min-h-[50px] transition-all duration-150 select-none active:scale-90 active:opacity-75 ${
              pathname === "/dashboard"
                ? "text-signal font-bold bg-signal/10 dark:bg-signal/20"
                : "text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white font-medium"
            }`}
          >
            <LayoutDashboard
              className={`w-5 h-5 mb-1 shrink-0 transition-transform ${
                pathname === "/dashboard" ? "scale-110 text-signal" : ""
              }`}
              strokeWidth={pathname === "/dashboard" ? 2.3 : 1.8}
            />
            <span className="text-[10px] tracking-tight leading-none truncate">{t("nav.home")}</span>
          </Link>

          <Link
            href="/calendar"
            prefetch={true}
            data-tour="nav-calendar"
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl min-h-[50px] transition-all duration-150 select-none active:scale-90 active:opacity-75 ${
              pathname.startsWith("/calendar")
                ? "text-signal font-bold bg-signal/10 dark:bg-signal/20"
                : "text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white font-medium"
            }`}
          >
            <Calendar
              className={`w-5 h-5 mb-1 shrink-0 transition-transform ${
                pathname.startsWith("/calendar") ? "scale-110 text-signal" : ""
              }`}
              strokeWidth={pathname.startsWith("/calendar") ? 2.3 : 1.8}
            />
            <span className="text-[10px] tracking-tight leading-none truncate">{t("nav.calendar")}</span>
          </Link>

          <Link
            href="/tasks"
            prefetch={true}
            data-tour="nav-tasks"
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl min-h-[50px] transition-all duration-150 select-none active:scale-90 active:opacity-75 ${
              pathname.startsWith("/tasks")
                ? "text-signal font-bold bg-signal/10 dark:bg-signal/20"
                : "text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white font-medium"
            }`}
          >
            <CheckSquare
              className={`w-5 h-5 mb-1 shrink-0 transition-transform ${
                pathname.startsWith("/tasks") ? "scale-110 text-signal" : ""
              }`}
              strokeWidth={pathname.startsWith("/tasks") ? 2.3 : 1.8}
            />
            <span className="text-[10px] tracking-tight leading-none truncate">{t("nav.tasks")}</span>
          </Link>

          <Link
            href="/finances"
            prefetch={true}
            data-tour="nav-finances"
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl min-h-[50px] transition-all duration-150 select-none active:scale-90 active:opacity-75 ${
              pathname.startsWith("/finances")
                ? "text-signal font-bold bg-signal/10 dark:bg-signal/20"
                : "text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white font-medium"
            }`}
          >
            <Wallet
              className={`w-5 h-5 mb-1 shrink-0 transition-transform ${
                pathname.startsWith("/finances") ? "scale-110 text-signal" : ""
              }`}
              strokeWidth={pathname.startsWith("/finances") ? 2.3 : 1.8}
            />
            <span className="text-[10px] tracking-tight leading-none truncate">{t("nav.finances")}</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            data-tour="nav-menu"
            className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl min-h-[50px] text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white font-medium transition-all duration-150 select-none active:scale-90 active:opacity-75 focus:outline-none cursor-pointer"
          >
            <Menu className="w-5 h-5 mb-1 shrink-0" strokeWidth={1.8} />
            <span className="text-[10px] tracking-tight leading-none truncate">{t("nav.menu")}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
