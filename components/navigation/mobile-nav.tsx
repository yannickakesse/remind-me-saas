"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileNavProps {
  unreadCount?: number | null;
}

export function MobileNav({ unreadCount }: MobileNavProps) {
  const pathname = usePathname();
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
    { href: "/dashboard", label: "Tableau de bord", icon: "📊" },
    { href: "/calendar", label: "Calendrier", icon: "📅" },
    { href: "/activities", label: "Activités", icon: "🎯" },
    { href: "/tasks", label: "Tâches", icon: "📝" },
  ];

  const financeSubLinks = [
    { href: "/finances", label: "Vue globale", icon: "💰" },
    { href: "/finances?tab=income", label: "Revenus", icon: "📈" },
    { href: "/finances?tab=expenses", label: "Dépenses payées", icon: "📉" },
    { href: "/finances?tab=scheduled", label: "Dépenses programmées", icon: "⏰" },
    { href: "/finances?tab=savings", label: "Épargne & Objectifs", icon: "🐷" },
    { href: "/finances?tab=budgets", label: "Budgets mensuels", icon: "🎯" },
  ];

  const secondaryLinks = [
    { href: "/clients", label: "Clients & Contacts", icon: "👥" },
    { href: "/reports", label: "Rapports & Rentabilité", icon: "📈" },
    { href: "/notifications", label: "Notifications", icon: "🔔", badge: unreadCount },
    { href: "/settings", label: "Paramètres", icon: "⚙️" },
  ];

  return (
    <>
      {/* Top Mobile Bar (< 768px) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-ink-200 bg-canvas-raised/95 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Ouvrir le menu principal"
            aria-expanded={isOpen}
            className="flex items-center justify-center h-10 w-10 rounded-xl text-ink-700 hover:bg-ink-100 active:scale-95 transition-all focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 tap-active">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal font-bold text-white text-xs shadow-xs">
              M
            </span>
            <span className="font-bold text-sm text-ink-950 tracking-tight">
              Multi-Activity
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex items-center justify-center h-10 w-10 rounded-xl text-ink-700 hover:bg-ink-100 active:scale-95 transition-all"
          >
            <span className="text-lg">🔔</span>
            {unreadCount ? (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white animate-pulse">
                {unreadCount}
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
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal font-bold text-white text-sm">
                  M
                </span>
                <div>
                  <div className="font-bold text-sm text-ink-950">Multi-Activity</div>
                  <div className="text-[11px] text-ink-500">Navigation rapide</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer le menu"
                className="flex items-center justify-center h-9 w-9 rounded-lg text-ink-500 hover:bg-ink-100 active:scale-90 transition-transform"
              >
                ✕
              </button>
            </div>

            {/* Navigation links list */}
            <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all min-h-[44px] ${
                      isActive
                        ? "bg-signal text-white font-semibold shadow-xs"
                        : "text-ink-700 hover:bg-ink-100 active:bg-ink-200"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
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
                    <span>💰</span> FINANCES
                  </span>
                  <span>{financesOpen ? "▾" : "▸"}</span>
                </button>

                {financesOpen && (
                  <div className="pl-3 mt-1 space-y-1 border-l-2 border-ink-200 ml-3">
                    {financeSubLinks.map((sub) => {
                      const isActive = pathname === "/finances" && (
                        sub.href === "/finances" ? !window?.location?.search : false
                      );
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-ink-700 hover:bg-ink-100 active:bg-ink-200 transition-colors min-h-[40px]"
                        >
                          <span className="text-base">{sub.icon}</span>
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
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all min-h-[44px] ${
                        isActive
                          ? "bg-signal text-white font-semibold shadow-xs"
                          : "text-ink-700 hover:bg-ink-100 active:bg-ink-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
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
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-signal text-white text-xs font-semibold shadow-xs active:scale-98 transition-transform"
              >
                <span>+</span> Nouvelle Tâche
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Navigation mobile principale"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-ink-200 bg-canvas-raised/95 backdrop-blur-md px-1 py-1 shadow-lg safe-area-bottom"
      >
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[48px] tap-active ${
            pathname === "/dashboard"
              ? "text-signal font-bold"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <span className="text-xl leading-none mb-0.5">📊</span>
          <span className="text-[10px] leading-tight">Accueil</span>
        </Link>

        <Link
          href="/calendar"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[48px] tap-active ${
            pathname.startsWith("/calendar")
              ? "text-signal font-bold"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <span className="text-xl leading-none mb-0.5">📅</span>
          <span className="text-[10px] leading-tight">Calendrier</span>
        </Link>

        <Link
          href="/tasks"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[48px] tap-active ${
            pathname.startsWith("/tasks")
              ? "text-signal font-bold"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <span className="text-xl leading-none mb-0.5">📝</span>
          <span className="text-[10px] leading-tight">Tâches</span>
        </Link>

        <Link
          href="/finances"
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[48px] tap-active ${
            pathname.startsWith("/finances")
              ? "text-signal font-bold"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <span className="text-xl leading-none mb-0.5">💰</span>
          <span className="text-[10px] leading-tight">Finances</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] min-h-[48px] text-ink-500 hover:text-ink-800 font-medium tap-active focus:outline-none"
        >
          <span className="text-xl leading-none mb-0.5">☰</span>
          <span className="text-[10px] leading-tight">Menu</span>
        </button>
      </nav>
    </>
  );
}
