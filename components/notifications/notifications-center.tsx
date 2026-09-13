"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import type { Notification, NotificationPriority } from "@/types/database";
import {
  markNotificationRead,
  markAllNotificationsRead,
  resolveNotification,
  snoozeNotification,
  deleteNotification,
} from "@/app/(app)/notifications/actions";

interface NotificationsCenterProps {
  initialNotifications: Notification[];
  timezone: string;
}

type TabKey = "all" | "unread" | "payment" | "expense" | "task";

export function NotificationsCenter({ initialNotifications, timezone }: NotificationsCenterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const unreadCount = initialNotifications.filter((n) => !n.read_at && n.status !== "read" && n.status !== "resolved").length;

  const filtered = initialNotifications.filter((n) => {
    // Tab filter
    if (activeTab === "unread") {
      if (n.read_at || n.status === "read" || n.status === "resolved") return false;
    } else if (activeTab === "payment") {
      if (n.category !== "payment" && n.entity_type !== "income") return false;
    } else if (activeTab === "expense") {
      if (n.category !== "expense" && n.entity_type !== "expense") return false;
    } else if (activeTab === "task") {
      if (n.category !== "task" && n.category !== "activity" && n.category !== "conflict") return false;
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
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  };

  const handleMarkRead = (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      await markNotificationRead(id);
      setProcessingId(null);
      router.refresh();
    });
  };

  const handleResolve = (id: string, entityType?: string, entityId?: string) => {
    setProcessingId(id);
    startTransition(async () => {
      await resolveNotification(id, entityType, entityId);
      setProcessingId(null);
      router.refresh();
    });
  };

  const handleSnooze = (id: string, hours: number = 24) => {
    setProcessingId(id);
    startTransition(async () => {
      await snoozeNotification(id, hours);
      setProcessingId(null);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      await deleteNotification(id);
      setProcessingId(null);
      router.refresh();
    });
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case "critical":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger text-white">Critique</span>;
      case "high":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-soft text-warning">Urgent</span>;
      case "normal":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-signal-soft text-signal">Normal</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-ink-100 text-ink-600">Info</span>;
    }
  };

  const getCategoryIcon = (category: string, kind: string) => {
    if (kind.includes("overdue")) return "🔴";
    if (category === "payment") return "💰";
    if (category === "expense") return "⏰";
    if (category === "task") return "📝";
    if (category === "activity") return "🎯";
    if (category === "conflict") return "⚠️";
    return "🔔";
  };

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full">
      {/* Header with Title and Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-950 truncate">
              Centre de notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-danger text-white text-[11px] font-bold animate-pulse shrink-0">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Rappels d'activités, factures clients, échéances et tâches.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleMarkAllRead}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-canvas-raised border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-ink-100 active:scale-95 transition-all disabled:opacity-50 shadow-xs shrink-0 tap-active"
          >
            ✓ Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full min-w-0">
        <div className="w-full sm:w-auto overflow-x-auto no-scrollbar pb-0.5">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-ink-100/70 border border-ink-200/60 min-w-max">
            {[
              { key: "all", label: "Toutes", count: initialNotifications.length },
              { key: "unread", label: "Non lues", count: unreadCount },
              { key: "payment", label: "Paiements", count: initialNotifications.filter((n) => n.category === "payment").length },
              { key: "expense", label: "Dépenses", count: initialNotifications.filter((n) => n.category === "expense").length },
              { key: "task", label: "Tâches", count: initialNotifications.filter((n) => n.category === "task" || n.category === "activity").length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 tap-active ${
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
            placeholder="Rechercher une alerte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-canvas-raised border border-ink-200 text-ink-950 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-signal min-h-[38px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-xs text-ink-400 hover:text-ink-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 p-12 text-center bg-canvas-raised/50">
          <span className="text-4xl block mb-2">🎉</span>
          <h3 className="text-sm font-bold text-ink-950">Aucune notification à afficher</h3>
          <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? "Aucune notification ne correspond à votre recherche."
              : activeTab === "unread"
              ? "Vous êtes complètement à jour ! Aucune action urgente en attente."
              : "Les alertes et rappels automatiques apparaîtront ici dès qu'une échéance approche."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isUnread = !item.read_at && item.status !== "read" && item.status !== "resolved";
            const isResolved = item.status === "resolved";
            const isSnoozed = item.status === "snoozed";
            const isBusy = processingId === item.id || isPending;
            const isIncome = item.category === "payment" || item.entity_type === "income";
            const isExpense = item.category === "expense" || item.entity_type === "expense";

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
                    <span className="text-xl shrink-0 mt-0.5">
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
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-positive-soft text-positive">
                            ✓ Résolu
                          </span>
                        )}
                        {isSnoozed && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-warning-soft text-warning">
                            ⏰ Reporté
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
                              Consulter &rarr;
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-ink-100 flex-wrap">
                    {/* Primary Entity Resolution */}
                    {!isResolved && isIncome && item.entity_id && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleResolve(item.id, "income", item.entity_id)}
                        className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 transition-all disabled:opacity-50 shadow-xs tap-active"
                      >
                        ✓ Reçu
                      </button>
                    )}

                    {!isResolved && isExpense && item.entity_id && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleResolve(item.id, "expense", item.entity_id)}
                        className="px-3 py-1.5 rounded-lg bg-signal text-white text-xs font-semibold hover:bg-signal/90 active:scale-95 transition-all disabled:opacity-50 shadow-xs tap-active"
                      >
                        ✓ Payé
                      </button>
                    )}

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-1">
                      {isUnread && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleMarkRead(item.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-ink-600 hover:text-ink-950 hover:bg-ink-100 active:scale-95 transition-all tap-active"
                        >
                          Lu
                        </button>
                      )}

                      {!isResolved && !isSnoozed && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSnooze(item.id, 24)}
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold text-ink-600 hover:text-ink-950 hover:bg-ink-100 active:scale-95 transition-all tap-active"
                          title="Reporter de 24 heures"
                        >
                          ⏰ +24h
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDelete(item.id)}
                        className="px-2 py-1.5 rounded-lg text-xs font-medium text-ink-400 hover:text-danger hover:bg-danger-soft/20 active:scale-95 transition-all tap-active"
                        title="Supprimer la notification"
                      >
                        🗑️
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
