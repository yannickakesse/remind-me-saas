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
  Inbox,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { openQuickTransaction } from "@/components/finances/quick-transaction-modal";

interface MobileNavProps {
  unreadCount?: number | null;
}

const TAB =
  "relative z-10 flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 min-h-[52px] select-none transition-colors active:scale-95";
const TAB_ACTIVE = "text-ink-950 dark:text-white";
const TAB_IDLE = "text-ink-700 dark:text-ink-300";

export function MobileNav({ unreadCount }: MobileNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t , tr } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [financesOpen, setFinancesOpen] = useState(true);

  // Sur les pages d'impression (/print), ne pas afficher la navigation mobile
  if (pathname?.includes("/print")) {
    return null;
  }

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

  const secondaryLinks: { href: string; labelKey?: TranslationKey; label?: string; icon: any; badge?: number | null; tourKey: string }[] = [
    { href: "/messages", labelKey: "nav.inbox", icon: Inbox, tourKey: "nav-inbox-mobile" },
    { href: "/clients", labelKey: "nav.clients", icon: Users, tourKey: "nav-clients-mobile" },
    { href: "/reports", labelKey: "nav.reports", icon: BarChart3, tourKey: "nav-reports-mobile" },
    { href: "/notifications", labelKey: "nav.notifications", icon: Bell, badge: unreadCount, tourKey: "nav-notifications-mobile" },
    { href: "/settings", labelKey: "nav.settings", icon: Settings, tourKey: "nav-settings-mobile" },
  ];

  // Onglet actif de la barre du bas (0 Accueil · 1 Calendrier · 2 Ajouter · 3 Finances · 4 Menu)
  const activeTab = isOpen
    ? 4
    : pathname === "/dashboard"
    ? 0
    : pathname.startsWith("/calendar")
    ? 1
    : pathname.startsWith("/finances")
    ? 3
    : -1;

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
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label={unreadCount ? tr("Menu de navigation — {unreadCount} notification(s) non lue(s)", { unreadCount }) : tr("Menu de navigation")}
            data-tour="mobile-notification-bell"
            className="relative flex items-center justify-center h-10 w-10 rounded-xl text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all tap-active"
          >
            <Menu className="w-5 h-5 text-ink-700 dark:text-ink-300" strokeWidth={2} />
            {unreadCount ? (
              <span className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-canvas-raised dark:ring-ink-900">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>
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

          {/* Drawer content — Image de fond portefeuille (drawer-bg.jpg), liens sur cartes opaques */}
          <div
            className="relative flex flex-col w-[85%] max-w-[320px] h-full shadow-2xl z-10 border-r border-ink-200 dark:border-ink-800 overflow-y-auto bg-canvas-raised dark:bg-slate-900 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/images/backgrounds/drawer-bg.jpg')" }}
          >
            {/* Contenu du Drawer */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised dark:bg-slate-900 safe-area-top shadow-2xs">
                <RemindMeLogo size="sm" showText={true} />

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={tr("Fermer le menu")}
                  className="flex items-center justify-center h-9 w-9 rounded-xl text-black dark:text-white hover:bg-zinc-200/80 dark:hover:bg-zinc-800 active:scale-90 transition-transform cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Navigation links list — Typographie soignée, contrastée et élégante */}
              <div className="flex-1 m-3 p-2 space-y-0.5 overflow-y-auto rounded-2xl bg-canvas-raised/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm">
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium tracking-[-0.005em] transition-colors min-h-[44px] ${
                        isActive ? "bg-signal/10 text-signal" : "text-ink-700 dark:text-ink-300 hover:bg-ink-100/70 dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-signal" : "text-ink-400"}`} strokeWidth={1.8} />
                      <span className={isActive ? "font-semibold" : ""}>{t(item.labelKey)}</span>
                    </Link>
                  );
                })}

                {/* Collapsible Finances Section */}
                <div>
                  <button
                    type="button"
                    onClick={() => setFinancesOpen(!financesOpen)}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[14px] font-medium text-ink-700 dark:text-ink-300 hover:bg-ink-100/70 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Wallet className="w-[18px] h-[18px] text-ink-400" strokeWidth={1.8} /> {t("nav.finances")}
                    </span>
                    <span>
                      {financesOpen ? <ChevronDown className="w-4 h-4 text-ink-400" /> : <ChevronRight className="w-4 h-4 text-ink-400" />}
                    </span>
                  </button>

                  {financesOpen && (
                    <div className="ml-[21px] pl-3 my-0.5 space-y-0.5 border-l border-ink-200 dark:border-ink-800">
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
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors min-h-[38px] ${
                              isActive
                                ? "bg-signal/10 text-signal font-semibold"
                                : "text-ink-600 dark:text-ink-400 hover:bg-ink-100/70 dark:hover:bg-white/5"
                            }`}
                          >
                            <SubIcon className={`w-4 h-4 shrink-0 ${isActive ? "text-signal" : "text-ink-400"}`} strokeWidth={1.8} />
                            <span>{t(sub.labelKey)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2 mt-2 border-t border-ink-200/80 dark:border-ink-800">
                  <div className="px-3 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
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
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors min-h-[44px] ${
                          isActive ? "bg-signal/10 text-signal" : "text-ink-700 dark:text-ink-300 hover:bg-ink-100/70 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-signal" : "text-ink-400"}`} strokeWidth={1.8} />
                          <span className={isActive ? "font-semibold" : ""}>
                            {item.label ? item.label : item.labelKey ? t(item.labelKey) : ""}
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
                <div className="pt-2 mt-2 border-t border-ink-200/80 dark:border-ink-800">
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
                  <span>{tr("Se déconnecter")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speed Dial / Action Sheet Mobile (< 768px) */}
      {isSpeedDialOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsSpeedDialOpen(false)}
            aria-hidden="true"
          />

          {/* Feuille « Création rapide » : contenu centré, une couleur par type (palette Remind Me) */}
          <div className="relative z-10 w-full max-w-md mx-auto rounded-t-[28px] border-t border-x border-ink-200/80 dark:border-white/10 bg-canvas-raised dark:bg-slate-900 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-ink-200 dark:bg-ink-700" />

            <div className="relative text-center">
              <h3 className="text-base font-extrabold tracking-tight text-ink-950 dark:text-white">{tr("Création Rapide")}</h3>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{tr("Que souhaitez-vous enregistrer ?")}</p>
              <button
                type="button"
                onClick={() => setIsSpeedDialOpen(false)}
                aria-label={tr("Fermer")}
                className="absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-ink-100/80 dark:bg-white/5 text-ink-500 hover:text-ink-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSpeedDialOpen(false);
                  openQuickTransaction("expense");
                }}
                className="group flex flex-col items-center text-center gap-2 rounded-3xl border border-ink-200/80 dark:border-white/10 bg-canvas dark:bg-slate-950/50 px-3 py-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-95"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30 text-white shadow-md transition-transform group-hover:scale-105">
                  <TrendingDown className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <span className="text-[13px] font-bold text-ink-950 dark:text-white">{tr("Dépense")}</span>
                <span className="-mt-1 text-[11px] leading-snug text-ink-500 dark:text-ink-400">{tr("Ponctuelle ou comptant")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSpeedDialOpen(false);
                  openQuickTransaction("income");
                }}
                className="group flex flex-col items-center text-center gap-2 rounded-3xl border border-ink-200/80 dark:border-white/10 bg-canvas dark:bg-slate-950/50 px-3 py-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-95"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30 text-white shadow-md transition-transform group-hover:scale-105">
                  <TrendingUp className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <span className="text-[13px] font-bold text-ink-950 dark:text-white">{tr("Revenu")}</span>
                <span className="-mt-1 text-[11px] leading-snug text-ink-500 dark:text-ink-400">{tr("Facture ou paiement client")}</span>
              </button>
              <Link
                href="/tasks/new"
                onClick={() => setIsSpeedDialOpen(false)}
                className="group flex flex-col items-center text-center gap-2 rounded-3xl border border-ink-200/80 dark:border-white/10 bg-canvas dark:bg-slate-950/50 px-3 py-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-95"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-blue-500/30 text-white shadow-md transition-transform group-hover:scale-105">
                  <CheckSquare className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <span className="text-[13px] font-bold text-ink-950 dark:text-white">{tr("Tâche")}</span>
                <span className="-mt-1 text-[11px] leading-snug text-ink-500 dark:text-ink-400">{tr("To-do ou priorité du jour")}</span>
              </Link>
              <Link
                href="/activities/new"
                onClick={() => setIsSpeedDialOpen(false)}
                className="group flex flex-col items-center text-center gap-2 rounded-3xl border border-ink-200/80 dark:border-white/10 bg-canvas dark:bg-slate-950/50 px-3 py-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-95"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-signal shadow-amber-500/30 text-white shadow-md transition-transform group-hover:scale-105">
                  <Calendar className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <span className="text-[13px] font-bold text-ink-950 dark:text-white">{tr("Activité / Séance")}</span>
                <span className="-mt-1 text-[11px] leading-snug text-ink-500 dark:text-ink-400">{tr("Nouvelle mission ou planning")}</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSpeedDialOpen(false);
                openQuickTransaction("scheduled");
              }}
              className="mx-auto flex items-center justify-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-5 py-2.5 text-xs font-semibold text-signal transition-colors hover:bg-signal/15"
            >
              <Clock className="h-4 w-4" />
              <span>{tr("Programmer une dépense récurrente (loyer, abonnement)")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Barre du bas mobile : pilule flottante translucide (esprit iOS), indicateur qui glisse d'un onglet à l'autre */}
      <nav
        aria-label={tr("Navigation principale")}
        data-tour="mobile-nav-bar"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none print:hidden"
      >
        <div className="pointer-events-auto relative mx-auto flex max-w-md items-center rounded-full border border-white/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 p-1.5 shadow-[0_10px_35px_-8px_rgba(15,23,42,0.28)] backdrop-blur-2xl backdrop-saturate-150">
          {/* Fond gris de l'onglet actif, animé */}
          {activeTab >= 0 && (
            <span
              aria-hidden="true"
              className="absolute inset-y-1.5 left-1.5 rounded-full bg-ink-950/[0.07] dark:bg-white/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ width: "calc((100% - 0.75rem) / 5)", transform: `translateX(${activeTab * 100}%)` }}
            />
          )}

          <Link
            href="/dashboard"
            prefetch={true}
            data-tour="nav-dashboard"
            aria-current={pathname === "/dashboard" ? "page" : undefined}
            className={`${TAB} ${pathname === "/dashboard" ? TAB_ACTIVE : TAB_IDLE}`}
          >
            <span className="flex h-7 items-center"><LayoutDashboard className="h-[22px] w-[22px]" strokeWidth={pathname === "/dashboard" ? 2.2 : 1.8} /></span>
            <span className={`text-[11px] leading-none ${pathname === "/dashboard" ? "font-semibold" : "font-medium"}`}>{t("nav.home")}</span>
          </Link>

          <Link
            href="/calendar"
            prefetch={true}
            data-tour="nav-calendar"
            aria-current={pathname.startsWith("/calendar") ? "page" : undefined}
            className={`${TAB} ${pathname.startsWith("/calendar") ? TAB_ACTIVE : TAB_IDLE}`}
          >
            <span className="flex h-7 items-center"><Calendar className="h-[22px] w-[22px]" strokeWidth={pathname.startsWith("/calendar") ? 2.2 : 1.8} /></span>
            <span className={`text-[11px] leading-none ${pathname.startsWith("/calendar") ? "font-semibold" : "font-medium"}`}>{tr("Calendrier")}</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsSpeedDialOpen(true)}
            aria-label={tr("Action rapide")}
            data-tour="mobile-quick-action"
            className={`${TAB} ${TAB_IDLE}`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal text-white shadow-sm shadow-signal/40">
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.6} />
            </span>
            <span className="text-[11px] font-semibold leading-none text-signal">{tr("Ajouter")}</span>
          </button>

          <Link
            href="/finances"
            prefetch={true}
            data-tour="nav-finances"
            aria-current={pathname.startsWith("/finances") ? "page" : undefined}
            className={`${TAB} ${pathname.startsWith("/finances") ? TAB_ACTIVE : TAB_IDLE}`}
          >
            <span className="flex h-7 items-center"><Wallet className="h-[22px] w-[22px]" strokeWidth={pathname.startsWith("/finances") ? 2.2 : 1.8} /></span>
            <span className={`text-[11px] leading-none ${pathname.startsWith("/finances") ? "font-semibold" : "font-medium"}`}>{tr("Finances")}</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label={tr("Menu principal et autres sections")}
            data-tour="nav-menu-mobile"
            className={`${TAB} ${isOpen ? TAB_ACTIVE : TAB_IDLE}`}
          >
            <span className="relative flex h-7 items-center">
              <Menu className="h-[22px] w-[22px]" strokeWidth={1.8} />
              {unreadCount ? (
                <span className="absolute -top-2 -right-3.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-signal px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </span>
            <span className={`text-[11px] leading-none ${isOpen ? "font-semibold" : "font-medium"}`}>{tr("Menu")}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
