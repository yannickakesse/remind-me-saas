"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Wallet,
  Clock,
  CheckSquare,
  Briefcase,
  Check,
  Trash2,
  X,
  ArrowRight,
  Calendar,
  Sun,
  Moon,
  Loader2,
} from "lucide-react";
import type { Notification, NotificationPriority } from "@/types/database";
import {
  markNotificationRead,
  markAllNotificationsRead,
  resolveNotification,
  snoozeNotification,
  deleteNotification,
} from "@/app/(app)/notifications/actions";
import { useLanguage } from "@/components/i18n/language-provider";

interface NotificationsCenterProps {
  initialNotifications: Notification[];
  timezone: string;
}

type TabKey = "active" | "unread" | "tasks" | "finances" | "history" | "all";

export function NotificationsCenter({ initialNotifications, timezone }: NotificationsCenterProps) {
  const router = useRouter();
  const { locale } = useLanguage();
  const [, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Sync state if initialNotifications changes
  const activeCount = notifications.filter(
    (n) => n.status !== "resolved" && n.status !== "dismissed"
  ).length;

  const unreadCount = notifications.filter(
    (n) => !n.read_at && n.status !== "read" && n.status !== "resolved" && n.status !== "dismissed"
  ).length;

  const resolvedCount = notifications.filter(
    (n) => n.status === "resolved" || n.status === "dismissed"
  ).length;

  const filtered = notifications.filter((n) => {
    const isResolved = n.status === "resolved" || n.status === "dismissed";
    const isUnread = !n.read_at && n.status !== "read" && !isResolved;
    const isTask = n.category === "task" || n.category === "activity" || n.entity_type === "task";
    const isFinance =
      n.category === "payment" ||
      n.category === "expense" ||
      n.entity_type === "income" ||
      n.entity_type === "expense" ||
      n.entity_type === "scheduled_expense";

    // Tab filter
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

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchBody = n.body.toLowerCase().includes(q);
      return matchTitle || matchBody;
    }

    return true;
  });

  const handleMarkAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
        status: n.status === "unread" ? "read" : n.status,
      }))
    );
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  };

  const handleMarkRead = (id: string) => {
    setProcessingId(id);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString(), status: "read" } : n
      )
    );
    startTransition(async () => {
      await markNotificationRead(id);
      setProcessingId(null);
      router.refresh();
    });
  };

  const handleResolve = (id: string, entityType?: string, entityId?: string) => {
    setProcessingId(id);
    const nowIso = new Date().toISOString();

    // Optimistic local resolution
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id || (entityId && n.entity_id === entityId)) {
          return { ...n, status: "resolved", resolved_at: nowIso, read_at: nowIso };
        }
        return n;
      })
    );

    startTransition(async () => {
      await resolveNotification(id, entityType, entityId);
      setProcessingId(null);
      router.refresh();
    });
  };

  const handleSnooze = (id: string, hours: number = 24) => {
    setProcessingId(id);
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "snoozed", snoozed_until: snoozedUntil } : n))
    );

    startTransition(async () => {
      await snoozeNotification(id, hours);
      setProcessingId(null);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    setProcessingId(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    startTransition(async () => {
      await deleteNotification(id);
      setProcessingId(null);
      router.refresh();
    });
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case "critical":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger text-white">{locale === "fr" ? "Critique" : "Critical"}</span>;
      case "high":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-soft text-warning">{locale === "fr" ? "Urgent" : "Urgent"}</span>;
      case "normal":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-signal-soft text-signal">Normal</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-ink-100 text-ink-600">Info</span>;
    }
  };

  const getCategoryIcon = (category: string, kind: string) => {
    if (kind === "morning_briefing") return <Sun className="w-5 h-5 text-amber-500 animate-pulse" />;
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

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full">
      {/* Header with Title and Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-950 truncate">
              {locale === "fr" ? "Centre de rappels & notifications" : "Reminders & Notifications Center"}
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-danger text-white text-[11px] font-bold animate-pulse shrink-0">
                {unreadCount} {locale === "fr" ? "non lu" : "unread"}{unreadCount > 1 && locale === "fr" ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            {locale === "fr"
              ? "Rappels proactifs d'échéances, tâches à accomplir, dépenses et factures en attente."
              : "Proactive reminders for deadlines, tasks to complete, pending expenses and invoices."}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-canvas-raised border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-ink-100 active:scale-95 transition-all shadow-xs shrink-0 tap-active cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> {locale === "fr" ? "Tout marquer comme lu" : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full min-w-0">
        <div className="w-full sm:w-auto overflow-x-auto no-scrollbar pb-0.5">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-ink-100/70 border border-ink-200/60 min-w-max">
            {[
              { key: "active", label: locale === "fr" ? "Rappels actifs" : "Active reminders", count: activeCount },
              { key: "unread", label: locale === "fr" ? "Non lus" : "Unread", count: unreadCount },
              {
                key: "tasks",
                label: locale === "fr" ? "Tâches" : "Tasks",
                count: notifications.filter(
                  (n) =>
                    (n.category === "task" || n.category === "activity" || n.entity_type === "task") &&
                    n.status !== "resolved" &&
                    n.status !== "dismissed"
                ).length,
              },
              {
                key: "finances",
                label: locale === "fr" ? "Finances" : "Finances",
                count: notifications.filter(
                  (n) =>
                    (n.category === "payment" ||
                      n.category === "expense" ||
                      n.entity_type === "income" ||
                      n.entity_type === "expense" ||
                      n.entity_type === "scheduled_expense") &&
                    n.status !== "resolved" &&
                    n.status !== "dismissed"
                ).length,
              },
              { key: "history", label: locale === "fr" ? "Historique / Résolus" : "History / Resolved", count: resolvedCount },
              { key: "all", label: locale === "fr" ? "Toutes" : "All", count: notifications.length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 tap-active cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-canvas-raised text-ink-950 shadow-xs"
                    : "text-ink-600 hover:text-ink-950"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === tab.key ? "bg-signal text-white" : "bg-ink-200 text-ink-700"
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
            placeholder={locale === "fr" ? "Rechercher un rappel..." : "Search reminder..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-canvas-raised border border-ink-200 text-ink-950 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-signal min-h-[38px]"
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
        <div className="rounded-2xl border border-dashed border-ink-200 p-12 text-center bg-canvas-raised/50">
          <CheckCircle2 className="w-10 h-10 text-positive mx-auto mb-2" />
          <h3 className="text-sm font-bold text-ink-950">
            {activeTab === "history"
              ? locale === "fr"
                ? "Aucun historique résolu"
                : "No resolved history"
              : activeTab === "unread"
              ? locale === "fr"
                ? "Tous les rappels ont été consultés"
                : "All reminders have been viewed"
              : locale === "fr"
              ? "Aucun rappel en attente"
              : "No pending reminders"}
          </h3>
          <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? locale === "fr"
                ? "Aucun rappel ne correspond à votre recherche."
                : "No reminders match your search query."
              : activeTab === "active"
              ? locale === "fr"
                ? "Tout est à jour ! Remind Me vous alertera automatiquement dès qu'une tâche ou un paiement approchera de son échéance."
                : "Everything is up to date! Remind Me will proactively alert you as deadlines approach."
              : activeTab === "history"
              ? locale === "fr"
                ? "Vos rappels terminés ou archivés s'afficheront ici."
                : "Your completed or archived reminders will appear here."
              : locale === "fr"
              ? "Les alertes et rappels automatiques apparaîtront ici dès qu'une échéance approche."
              : "Automatic reminders will appear here as soon as an upcoming deadline arrives."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isResolved = item.status === "resolved" || item.status === "dismissed";
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

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-150 w-full min-w-0 ${
                  isResolved
                    ? "border-ink-100 bg-canvas-raised/50 opacity-60"
                    : isUnread
                    ? item.priority === "critical"
                      ? "border-danger/40 bg-danger-soft/10 shadow-xs ring-1 ring-danger/20"
                      : "border-signal/30 bg-signal-soft/10 shadow-xs"
                    : "border-ink-200 bg-canvas-raised"
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
                        {getPriorityBadge(item.priority)}
                        <h4
                          className={`text-xs sm:text-sm font-bold break-words ${
                            isResolved ? "line-through text-ink-500" : "text-ink-950"
                          }`}
                        >
                          {item.title}
                        </h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-signal shrink-0" />
                        )}
                        {isResolved && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-positive-soft text-positive inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> {locale === "fr" ? "Résolu" : "Resolved"}
                          </span>
                        )}
                        {isSnoozed && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-warning-soft text-warning inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {locale === "fr" ? "Reporté" : "Snoozed"}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-ink-700 leading-relaxed break-words">
                        {item.body}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-400 pt-1">
                        <span>
                          {DateTime.fromISO(item.created_at, { zone: timezone })
                            .setLocale("fr")
                            .toRelative()}
                        </span>
                        {item.link && (
                          <>
                            <span>•</span>
                            <Link
                              href={item.link}
                              className="font-medium text-signal hover:underline inline-flex items-center gap-1"
                            >
                              {locale === "fr" ? "Consulter" : "View"} <ArrowRight className="w-3 h-3" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-ink-100 flex-wrap">
                    {/* Primary Entity Resolution Buttons */}
                    {!isResolved && isTask && item.entity_id && (
                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={() => handleResolve(item.id, "task", item.entity_id)}
                        className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 shadow-xs tap-active flex items-center gap-1 cursor-pointer"
                        title="Marquer la tâche comme terminée"
                      >
                        {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>{locale === "fr" ? "Fait" : "Done"}</span>
                      </button>
                    )}

                    {!isResolved && isIncome && item.entity_id && (
                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={() => handleResolve(item.id, "income", item.entity_id)}
                        className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 shadow-xs tap-active flex items-center gap-1 cursor-pointer"
                        title="Marquer le paiement client comme reçu"
                      >
                        {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>{locale === "fr" ? "Encaissé" : "Received"}</span>
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
                        title="Marquer la dépense comme payée"
                      >
                        {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>{locale === "fr" ? "Payé" : "Paid"}</span>
                      </button>
                    )}

                    {!isResolved && isActivityOrEvent && item.entity_id && (
                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={() => handleResolve(item.id, "activity", item.entity_id)}
                        className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 shadow-xs tap-active flex items-center gap-1 cursor-pointer"
                        title="Confirmer la séance comme effectuée"
                      >
                        {isThisBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>{locale === "fr" ? "Effectuée" : "Completed"}</span>
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
                        <span>{locale === "fr" ? "Résoudre" : "Resolve"}</span>
                      </button>
                    )}

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-1">
                      {isUnread && (
                        <button
                          type="button"
                          disabled={isThisBusy}
                          onClick={() => handleMarkRead(item.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-ink-600 hover:text-ink-950 hover:bg-ink-100 active:scale-95 transition-all tap-active cursor-pointer"
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
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold text-ink-600 hover:text-ink-950 hover:bg-ink-100 active:scale-95 transition-all tap-active flex items-center gap-1 cursor-pointer"
                          title="Reporter de 24 heures"
                        >
                          <Clock className="w-3 h-3" /> +24h
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isThisBusy}
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-xs font-medium text-ink-400 hover:text-danger hover:bg-danger-soft/20 active:scale-95 transition-all tap-active inline-flex items-center justify-center cursor-pointer"
                        title="Supprimer la notification"
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
