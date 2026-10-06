"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  AlertCircle,
  Briefcase,
  Calendar,
  CheckSquare,
  Wallet,
  AlertTriangle,
  Sun,
  Moon,
  Loader2,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { playVoiceReminder, stopVoiceReminder, getLocalVoiceSettings } from "@/lib/voice";
import type { Notification, NotificationPriority } from "@/types/database";
import {
  markNotificationRead,
  markAllNotificationsRead,
  markAllNotificationsResolved,
  resolveNotification,
  snoozeNotification,
  deleteNotification,
} from "@/app/(app)/notifications/actions";
import { useLanguage } from "@/components/i18n/language-provider";
import { useToast } from "@/components/ui/toast";

interface NotificationsCenterProps {
  initialNotifications: Notification[];
  timezone: string;
}

type TabKey = "active" | "unread" | "tasks" | "finances" | "history" | "all";

function isDayTime(isoString?: string | null, tz: string = "UTC"): boolean {
  if (!isoString) return true;
  try {
    const dt = DateTime.fromISO(isoString, { zone: tz });
    if (!dt.isValid) return true;
    return dt.hour >= 6 && dt.hour < 18;
  } catch {
    return true;
  }
}

export function NotificationsCenter({ initialNotifications, timezone }: NotificationsCenterProps) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const { push: showToast } = useToast();
  const [, startTransition] = useTransition();

  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isCompletingAll, setIsCompletingAll] = useState(false);
  const [isReadingAll, setIsReadingAll] = useState(false);

  const activeCount = notifications.filter(
    (n) => n.status !== "resolved" && n.status !== "dismissed" && n.status !== "actioned"
  ).length;

  const unreadCount = notifications.filter(
    (n) =>
      !n.read_at &&
      n.status !== "read" &&
      n.status !== "resolved" &&
      n.status !== "dismissed" &&
      n.status !== "actioned"
  ).length;

  const resolvedCount = notifications.filter(
    (n) => n.status === "resolved" || n.status === "dismissed" || n.status === "actioned"
  ).length;

  const filtered = notifications.filter((n) => {
    const isResolved = n.status === "resolved" || n.status === "dismissed" || n.status === "actioned";
    const isUnread = !n.read_at && n.status !== "read" && !isResolved;
    const isTask = n.category === "task" || n.category === "activity" || n.entity_type === "task";
    const isFinance =
      n.category === "payment" ||
      n.category === "expense" ||
      n.entity_type === "income" ||
      n.entity_type === "expense" ||
      n.entity_type === "scheduled_expense";

    if (activeTab === "active") {
      if (isResolved) return false;
    } else if (activeTab === "unread") {
      if (!isUnread) return false;
    } else if (activeTab === "tasks") {
      if (!isTask || isResolved) return false;
    } else if (activeTab === "finances") {
      if (!isFinance || isResolved) return false;
    } else if (activeTab === "history") {
      if (!isResolved) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchBody = n.body.toLowerCase().includes(q);
      return matchTitle || matchBody;
    }

    return true;
  });

  const handleCompleteAll = async () => {
    if (isCompletingAll || activeCount === 0) return;
    setIsCompletingAll(true);

    const nowIso = new Date().toISOString();
    const previous = [...notifications];

    // Mise à jour optimiste locale instantanée
    setNotifications((prev) =>
      prev.map((n) =>
        n.status !== "resolved" && n.status !== "dismissed" && n.status !== "actioned"
          ? { ...n, read_at: n.read_at || nowIso, status: "resolved", resolved_at: nowIso }
          : n
      )
    );

    try {
      const res = await markAllNotificationsResolved();
      if (res && !res.success) {
        setNotifications(previous);
        showToast("Impossible de compléter les alertes. Veuillez réessayer.", "error");
      } else {
        showToast("Toutes les notifications actives ont été complétées.", "success");
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setNotifications(previous);
      showToast("Erreur de connexion. Modifications annulées.", "error");
    } finally {
      setIsCompletingAll(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (isReadingAll || unreadCount === 0) return;
    setIsReadingAll(true);

    const nowIso = new Date().toISOString();
    const previous = [...notifications];

    // Mise à jour optimiste locale instantanée
    setNotifications((prev) =>
      prev.map((n) =>
        !n.read_at && n.status === "unread"
          ? { ...n, read_at: nowIso, status: "read" }
          : n
      )
    );

    try {
      const res = await markAllNotificationsRead();
      if (res && !res.success) {
        setNotifications(previous);
        showToast("Impossible de marquer comme lu. Veuillez réessayer.", "error");
      } else {
        showToast("Toutes les notifications ont été marquées comme lues.", "success");
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setNotifications(previous);
      showToast("Erreur de connexion. Modifications annulées.", "error");
    } finally {
      setIsReadingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);
    const previous = [...notifications];

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString(), status: "read" } : n
      )
    );

    try {
      const res = await markNotificationRead(id);
      if (res && !res.success) {
        setNotifications(previous);
      } else {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setNotifications(previous);
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolve = async (id: string, entityType?: string, entityId?: string) => {
    if (processingId) return;
    setProcessingId(id);
    const previous = [...notifications];
    const nowIso = new Date().toISOString();

    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id || (entityId && n.entity_id === entityId)) {
          return { ...n, status: "resolved", resolved_at: nowIso, read_at: nowIso };
        }
        return n;
      })
    );

    try {
      const res = await resolveNotification(id, entityType, entityId);
      if (res && !res.success) {
        setNotifications(previous);
        showToast("Erreur lors de la validation.", "error");
      } else {
        showToast("Élément validé avec succès.", "success");
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setNotifications(previous);
      showToast("Erreur réseau.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSnooze = async (id: string, hours: number = 24) => {
    if (processingId) return;
    setProcessingId(id);
    const previous = [...notifications];
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "snoozed", snoozed_until: snoozedUntil } : n))
    );

    try {
      const res = await snoozeNotification(id, hours);
      if (res && !res.success) {
        setNotifications(previous);
      } else {
        showToast(`Rappel reporté de ${hours}h.`, "info");
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setNotifications(previous);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);
    const previous = [...notifications];
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      const res = await deleteNotification(id);
      if (res && !res.success) {
        setNotifications(previous);
        showToast("Erreur lors de la suppression.", "error");
      } else {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setNotifications(previous);
    } finally {
      setProcessingId(null);
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case "critical":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger text-white shrink-0">{t("attention.critical")}</span>;
      case "high":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-soft text-warning shrink-0">{t("attention.urgent")}</span>;
      case "normal":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-signal-soft text-signal shrink-0">{t("attention.info")}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-ink-100 text-ink-600 shrink-0">Info</span>;
    }
  };

  const getCategoryIcon = (category: string, kind: string) => {
    if (kind === "morning_briefing") return <Sun className="w-5 h-5 text-amber-500 animate-pulse" />;
    if (kind === "midday_checkin") return <Sun className="w-5 h-5 text-amber-600" />;
    if (kind === "evening_checkin") return <Moon className="w-5 h-5 text-indigo-500" />;
    if (kind.includes("overdue")) return <AlertCircle className="w-5 h-5 text-danger" />;
    if (category === "payment") return <Wallet className="w-5 h-5 text-gold-dark" />;
    if (category === "expense") return <Clock className="w-5 h-5 text-warning" />;
    if (category === "task") return <CheckSquare className="w-5 h-5 text-signal" />;
    if (category === "activity") return <Briefcase className="w-5 h-5 text-signal" />;
    if (category === "calendar") return <Calendar className="w-5 h-5 text-signal" />;
    if (category === "conflict") return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <Bell className="w-5 h-5 text-ink-500" />;
  };

  const isAnyActionPending = isCompletingAll || isReadingAll;

  return (
    <div className="relative isolate min-h-full w-full space-y-5 min-w-0 max-w-full">
      {/* Fond d'écran global de la page Notifications */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none -z-10"
        style={{ backgroundImage: "url('/images/backgrounds/notifications-bg.jpg')" }}
      />

      {/* Header with Title and Global Actions Côte à Côte */}
      <div className="relative overflow-hidden rounded-2xl bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md border border-ink-200/90 dark:border-ink-800/90 p-4 sm:p-6 shadow-xs">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-950 dark:text-white truncate">
                  {t("nav.notifications")}
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-danger text-white text-[11px] font-bold animate-pulse shrink-0">
                    {unreadCount} {t("actions.filter_unread")}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-ink-500 mt-1">
                {activeCount > 0
                  ? `${activeCount} élément${activeCount > 1 ? "s" : ""} nécessite${activeCount > 1 ? "nt" : ""} votre validation ou une action rapide`
                  : "Votre centre de rappels et de notifications est à jour."}
              </p>
            </div>
          </div>

          {/* Boutons d'Action Globale CÔTE À CÔTE (sur Mobile et Desktop) */}
          <div className="grid grid-cols-2 gap-2.5 w-full sm:max-w-md">
            {/* Bouton Tout compléter */}
            <button
              type="button"
              disabled={isAnyActionPending || activeCount === 0}
              onClick={handleCompleteAll}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-signal text-white text-xs font-bold hover:bg-signal-dark active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none tap-active cursor-pointer min-h-[42px]"
              title="Marquer toutes les notifications actives comme traitées"
            >
              {isCompletingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">Traitement...</span>
                </>
              ) : (
                <>
                  <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Tout compléter</span>
                </>
              )}
            </button>

            {/* Bouton Tout marquer comme lu */}
            <button
              type="button"
              disabled={isAnyActionPending || unreadCount === 0}
              onClick={handleMarkAllRead}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-canvas-raised dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:pointer-events-none tap-active cursor-pointer min-h-[42px]"
              title="Marquer toutes les notifications comme lues"
            >
              {isReadingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">Traitement...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline truncate">{t("actions.mark_all_read")}</span>
                  <span className="sm:hidden truncate">Tout lire</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full min-w-0">
        <div className="w-full sm:w-auto overflow-x-auto no-scrollbar pb-0.5">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-ink-100/70 dark:bg-ink-900/70 border border-ink-200/60 dark:border-ink-800/60 min-w-max">
            {[
              { key: "active", label: t("actions.filter_active"), count: activeCount },
              { key: "unread", label: t("actions.filter_unread"), count: unreadCount },
              {
                key: "tasks",
                label: t("actions.filter_tasks"),
                count: notifications.filter(
                  (n) =>
                    (n.category === "task" || n.category === "activity" || n.entity_type === "task") &&
                    n.status !== "resolved" &&
                    n.status !== "dismissed" &&
                    n.status !== "actioned"
                ).length,
              },
              {
                key: "finances",
                label: t("actions.filter_finances"),
                count: notifications.filter(
                  (n) =>
                    (n.category === "payment" ||
                      n.category === "expense" ||
                      n.entity_type === "income" ||
                      n.entity_type === "expense" ||
                      n.entity_type === "scheduled_expense") &&
                    n.status !== "resolved" &&
                    n.status !== "dismissed" &&
                    n.status !== "actioned"
                ).length,
              },
              { key: "history", label: t("actions.filter_history"), count: resolvedCount },
              { key: "all", label: t("actions.filter_all"), count: notifications.length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 tap-active cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-canvas-raised dark:bg-ink-800 text-ink-950 dark:text-white shadow-xs"
                    : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === tab.key ? "bg-signal text-white" : "bg-ink-200 dark:bg-ink-700 text-ink-700 dark:text-ink-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative w-full sm:w-64 min-w-0">
          <input
            type="text"
            placeholder={t("actions.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-canvas-raised dark:bg-ink-900 border border-ink-200 dark:border-ink-700 text-ink-950 dark:text-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-signal min-h-[38px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-xs text-ink-400 hover:text-ink-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-ink-200 dark:border-ink-800 p-12 text-center bg-canvas-raised/50 dark:bg-ink-900/50">
          <div
            className="absolute inset-0 bg-contain bg-no-repeat bg-center opacity-10 pointer-events-none filter blur-[0.5px]"
            style={{ backgroundImage: `url('/images/backgrounds/notifications-bg.jpg')` }}
          />
          <div className="relative z-10">
            <CheckCircle2 className="w-10 h-10 text-positive mx-auto mb-2" />
            <h3 className="text-sm font-bold text-ink-950 dark:text-white">
              {t("actions.empty_title")}
            </h3>
            <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1">
              {t("actions.empty_desc")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isResolved = item.status === "resolved" || item.status === "dismissed" || item.status === "actioned";
            const isUnread = !item.read_at && item.status !== "read" && !isResolved;
            const isSnoozed = item.status === "snoozed";
            const isThisBusy = processingId === item.id;
            const isIncome = item.category === "payment" || item.entity_type === "income";
            const isExpense = item.category === "expense" || item.entity_type === "expense";
            const isTask = item.category === "task" || item.entity_type === "task";
            const isActivityOrEvent =
              item.category === "activity" ||
              item.entity_type === "activity" ||
              item.kind.includes("activity");
            const isScheduledExpense = item.entity_type === "scheduled_expense";
            const isDay = isDayTime(item.scheduled_at || item.created_at, timezone);

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-150 w-full min-w-0 ${
                  isResolved
                    ? "border-ink-100 dark:border-ink-800/60 bg-canvas-raised/50 dark:bg-ink-900/30 opacity-60"
                    : isUnread
                    ? item.priority === "critical"
                      ? "border-danger/40 bg-danger-soft/10 shadow-xs ring-1 ring-danger/20"
                      : "border-signal/30 bg-signal-soft/10 shadow-xs"
                    : "border-ink-200 dark:border-ink-800 bg-canvas-raised dark:bg-ink-900"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                  {/* Left: Icon & Content */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="shrink-0 mt-0.5">
                      {getCategoryIcon(item.category, item.kind)}
                    </span>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Indicateur Jour / Nuit basé sur la timezone utilisateur */}
                        <span 
                          className="inline-flex items-center text-xs text-ink-400 shrink-0" 
                          title={isDay ? "Jour (06:00 - 17:59)" : "Nuit (18:00 - 05:59)"}
                        >
                          {isDay ? "☀️" : "🌙"}
                        </span>

                        {getPriorityBadge(item.priority)}

                        <h4
                          className={`text-xs sm:text-sm font-bold break-words ${
                            isResolved ? "line-through text-ink-500" : "text-ink-950 dark:text-white"
                          }`}
                        >
                          {item.title}
                        </h4>

                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-signal shrink-0" />
                        )}
                        {isResolved && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-positive-soft text-positive inline-flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" /> {t("actions.mark_completed")}
                          </span>
                        )}
                        {isSnoozed && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-warning-soft text-warning inline-flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" /> {t("actions.snooze")}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed break-words">
                        {item.body}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-400 pt-1">
                        <span>
                          {DateTime.fromISO(item.created_at, { zone: timezone })
                            .setLocale(locale)
                            .toRelative()}
                        </span>
                        {item.link && (
                          <>
                            <span>•</span>
                            <Link
                              href={item.link}
                              className="font-medium text-signal hover:underline inline-flex items-center gap-1"
                            >
                              {t("actions.view_item")} <ArrowRight className="w-3 h-3" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-ink-100 dark:border-ink-800 flex-wrap">
                    {/* Primary Entity Resolution Buttons */}
                    {!isResolved && isTask && item.entity_id && (
                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={() => handleResolve(item.id, "task", item.entity_id)}
                        className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 shadow-xs tap-active flex items-center gap-1 cursor-pointer"
                        title={t("actions.mark_done")}
                      >
                        {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>{t("actions.mark_done")}</span>
                      </button>
                    )}

                    {!isResolved && isIncome && item.entity_id && (
                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={() => handleResolve(item.id, "income", item.entity_id)}
                        className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 shadow-xs tap-active flex items-center gap-1 cursor-pointer"
                        title={t("actions.mark_received")}
                      >
                        {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>{t("actions.mark_received")}</span>
                      </button>
                    )}

                    {!isResolved && (isExpense || isScheduledExpense) && item.entity_id && (
                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={() =>
                          handleResolve(
                            item.id,
                            isScheduledExpense ? "scheduled_expense" : "expense",
                            item.entity_id
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-signal text-white text-xs font-semibold hover:bg-signal/90 active:scale-95 transition-all disabled:opacity-50 shadow-xs tap-active flex items-center gap-1 cursor-pointer"
                        title={t("actions.mark_paid")}
                      >
                        {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>{t("actions.mark_paid")}</span>
                      </button>
                    )}

                    {!isResolved && isActivityOrEvent && item.entity_id && (
                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={() => handleResolve(item.id, "activity", item.entity_id)}
                        className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 shadow-xs tap-active flex items-center gap-1 cursor-pointer"
                        title={t("actions.mark_completed")}
                      >
                        {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>{t("actions.mark_completed")}</span>
                      </button>
                    )}

                    {!isResolved && !isTask && !isIncome && !isExpense && !isScheduledExpense && !isActivityOrEvent && (
                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={() => handleResolve(item.id, item.entity_type ?? undefined, item.entity_id ?? undefined)}
                        className="px-3 py-1.5 rounded-lg bg-signal text-white text-xs font-semibold hover:bg-signal/90 active:scale-95 transition-all disabled:opacity-50 shadow-xs tap-active flex items-center gap-1 cursor-pointer"
                      >
                        {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>{t("actions.mark_completed")}</span>
                      </button>
                    )}

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-1">
                      {isUnread && (
                        <button
                          type="button"
                          disabled={isThisBusy}
                          onClick={() => handleMarkRead(item.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all tap-active cursor-pointer"
                          title="Marquer comme lu"
                        >
                          {locale === "fr" ? "Lu" : "Read"}
                        </button>
                      )}

                      {!isResolved && !isSnoozed && (
                        <button
                          type="button"
                          disabled={isThisBusy}
                          onClick={() => handleSnooze(item.id, 24)}
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all tap-active flex items-center gap-1 cursor-pointer"
                          title="Reporter de 24 heures"
                        >
                          <Clock className="w-3 h-3" /> +24h
                        </button>
                      )}

                      {/* Bouton de lecture vocale instantanée */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (playingId === item.id) {
                            stopVoiceReminder();
                            setPlayingId(null);
                            return;
                          }
                          setPlayingId(item.id);
                          const prefs = getLocalVoiceSettings();
                          const textToSpeak = (item as any).metadata?.voice_text || `${item.title}. ${item.body}`;
                          await playVoiceReminder({
                            text: textToSpeak,
                            language: prefs.voice_language,
                            voiceType: prefs.voice_type,
                            repeat: 0,
                            onEnd: () => setPlayingId(null),
                            onError: () => setPlayingId(null),
                          });
                        }}
                        className={`p-1.5 rounded-lg active:scale-95 transition-all cursor-pointer ${
                          playingId === item.id
                            ? "bg-signal text-white animate-pulse"
                            : "text-ink-600 dark:text-ink-400 hover:text-signal dark:hover:text-signal hover:bg-signal-soft/30"
                        }`}
                        title={playingId === item.id ? "Arrêter la lecture" : "Écouter ce rappel à voix haute"}
                      >
                        {playingId === item.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-xs font-medium text-ink-400 hover:text-danger hover:bg-danger-soft/20 active:scale-95 transition-all tap-active inline-flex items-center justify-center cursor-pointer"
                        title={t("actions.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
