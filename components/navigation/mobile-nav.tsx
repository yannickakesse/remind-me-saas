"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { RemindMeLogo } from "@/components/landing/remindme-logo";
import { HelpCenterButton } from "@/components/help/help-center-modal";

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
} from "lucide-react";

interface MobileNavProps {
  unreadCount?: number | null;
}

export function MobileNav({ unreadCount }: MobileNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const navLinks = [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/calendar", label: "Calendrier", icon: Calendar },
    { href: "/activities", label: "Activités", icon: Briefcase },
    { href: "/tasks", label: "Tâches", icon: CheckSquare },
  ];

  const financeSubLinks = [
    { href: "/finances", label: "Vue globale", icon: Wallet },
    { href: "/finances?tab=income", label: "Revenus", icon: TrendingUp },
    { href: "/finances?tab=expenses", label: "Dépenses payées", icon: TrendingDown },
    { href: "/finances?tab=scheduled", label: "Dépenses programmées", icon: Clock },
    { href: "/finances?tab=savings", label: "Épargne & Objectifs", icon: PiggyBank },
    { href: "/finances?tab=budgets", label: "Budgets mensuels", icon: Target },
  ];

  const secondaryLinks = [
    { href: "/clients", label: "Clients & Contacts", icon: Users },
    { href: "/reports", label: "Rapports & Rentabilité", icon: BarChart3 },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { href: "/settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <>
      {/* Top Mobile Bar (< 768px) — Header Mobile Moderne & Épuré */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-ink-200 bg-canvas-raised/95 backdrop-blur-md px-4 py-2.5 shadow-xs w-full max-w-full">
        <Link href="/dashboard" className="flex items-center tap-active py-0.5">
          <RemindMeLogo size="sm" showText={true} />
        </Link>

        <div className="flex items-center gap-1.5">
          <HelpCenterButton />
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex items-center justify-center h-10 w-10 rounded-xl text-ink-700 hover:bg-ink-100 active:scale-95 transition-all tap-active"
            data-tour="mobile-notification-bell"
          >
            <Bell className="w-5 h-5 text-ink-700" strokeWidth={1.8} />
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
            className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative flex flex-col w-[85%] max-w-[320px] bg-canvas-raised h-full shadow-2xl z-10 border-r border-ink-200 overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-ink-200 bg-canvas">
              <RemindMeLogo size="sm" showText={true} />

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer le menu"
                className="flex items-center justify-center h-9 w-9 rounded-lg text-ink-500 hover:bg-ink-100 active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation links list */}
            <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all min-h-[44px] ${
                      isActive
                        ? "bg-signal text-white font-semibold shadow-xs"
                        : "text-ink-700 hover:bg-ink-100 active:bg-ink-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-ink-500"}`} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Collapsible Finances Section */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setFinancesOpen(!financesOpen)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink-500 hover:text-ink-800"
                >
                  <span className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-gold-dark" /> FINANCES
                  </span>
                  <span>
                    {financesOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {financesOpen && (
                  <div className="pl-3 mt-1 space-y-1 border-l-2 border-gold/30 ml-3">
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
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px] ${
                            isActive
                              ? "bg-gold-soft/40 text-gold-dark font-bold"
                              : "text-ink-700 hover:bg-ink-100 active:bg-ink-200"
                          }`}
                        >
                          <SubIcon className="w-3.5 h-3.5 text-gold-dark shrink-0" strokeWidth={1.8} />
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-ink-200">
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
                  GÉNÉRAL
                </div>
                {secondaryLinks.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all min-h-[44px] ${
                        isActive
                          ? "bg-signal text-white font-semibold shadow-xs"
                          : "text-ink-700 hover:bg-ink-100 active:bg-ink-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-ink-500"}`} strokeWidth={1.8} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Quick action bar in drawer footer */}
            <div className="p-3 border-t border-ink-200 bg-canvas space-y-2">
              <Link
                href="/tasks/new"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-signal text-white text-xs font-semibold shadow-xs active:scale-98 transition-transform"
              >
                <Plus className="w-4 h-4" /> Nouvelle Tâche
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Navigation mobile principale"
        data-tour="mobile-nav-bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-ink-200 bg-canvas-raised/95 backdrop-blur-md px-1 py-1 shadow-lg safe-area-bottom"
      >
        <Link
          href="/dashboard"
          prefetch={true}
          data-tour="nav-dashboard"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[48px] tap-active ${
            pathname === "/dashboard"
              ? "text-signal font-bold"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5 shrink-0" strokeWidth={pathname === "/dashboard" ? 2.2 : 1.8} />
          <span className="text-[10px] leading-tight">Accueil</span>
        </Link>

        <Link
          href="/calendar"
          prefetch={true}
          data-tour="nav-calendar"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[48px] tap-active ${
            pathname.startsWith("/calendar")
              ? "text-signal font-bold"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5 shrink-0" strokeWidth={pathname.startsWith("/calendar") ? 2.2 : 1.8} />
          <span className="text-[10px] leading-tight">Calendrier</span>
        </Link>

        <Link
          href="/tasks"
          prefetch={true}
          data-tour="nav-tasks"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[48px] tap-active ${
            pathname.startsWith("/tasks")
              ? "text-signal font-bold"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <CheckSquare className="w-5 h-5 mb-0.5 shrink-0" strokeWidth={pathname.startsWith("/tasks") ? 2.2 : 1.8} />
          <span className="text-[10px] leading-tight">Tâches</span>
        </Link>

        <Link
          href="/finances"
          prefetch={true}
          data-tour="nav-finances"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[48px] tap-active ${
            pathname.startsWith("/finances")
              ? "text-signal font-bold"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5 shrink-0" strokeWidth={pathname.startsWith("/finances") ? 2.2 : 1.8} />
          <span className="text-[10px] leading-tight">Finances</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          data-tour="nav-menu"
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[48px] text-ink-500 hover:text-ink-800 font-medium tap-active focus:outline-none"
        >
          <Menu className="w-5 h-5 mb-0.5 shrink-0" strokeWidth={1.8} />
          <span className="text-[10px] leading-tight">Menu</span>
        </button>
      </nav>
    </>
  );
}
