"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  AlertCircle,
  Wallet,
  Clock,
  Check,
  CheckSquare,
  Calendar,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";
import type { Notification } from "@/types/database";
import { useLanguage } from "@/components/i18n/language-provider";

interface AttentionRequiredProps {
  notifications: Notification[];
}

export function AttentionRequired({ notifications }: AttentionRequiredProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Uniquement les alertes NON RÉSOLUES, NON ÉCARTÉES, NON LUES et NON DISMISSED LOCALEMENT
  const urgentItems = notifications.filter(
    (n) => n.status === "unread" && !n.read_at && !dismissedIds.has(n.id)
  );

  if (urgentItems.length === 0) {
    return null;
  }

  async function handleQuickAction(action: string, id: string, entityId?: string) {
    setResolvingId(id);
    // Optimistic instant UI dismissal
    setDismissedIds((prev) => new Set([...prev, id]));

    try {
      const res = await fetch("/api/notifications/quick-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notificationId: id, entityId: entityId || id }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error("[AttentionRequired] quick-action error:", e);
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-warning/30 bg-warning-soft/10 p-4 sm:p-6 space-y-4 shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-danger" />
          </span>
          <h2 className="text-base font-bold text-ink-950 dark:text-white">
            {t("attention.title")} ({urgentItems.length})
          </h2>
        </div>
        <Link
          href="/notifications"
          className="text-xs font-semibold text-signal hover:underline flex items-center gap-1"
        >
          {t("attention.manage_all")} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {urgentItems.slice(0, 4).map((item) => {
          const isYesterdayOverdue = !!item.metadata?.is_yesterday_overdue || (item.metadata?.daysAgo && item.metadata.daysAgo >= 1);
          const isOverdue = item.kind.includes("overdue") || isYesterdayOverdue;
          const isPayment = item.category === "payment" || item.entity_type === "income";
          const isExpense =
            item.category === "expense" ||
            item.entity_type === "expense" ||
            item.category === "scheduled_expense" ||
            item.entity_type === "scheduled_expense";
          const isTask = item.category === "task" || item.entity_type === "task";
          const isActivityOrEvent =
            item.category === "activity" ||
            item.entity_type === "activity" ||
            item.kind.includes("activity");
          const isBusy = resolvingId === item.id;

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between space-y-3 transition-all ${
                isYesterdayOverdue
                  ? "border-danger/50 dark:border-danger/60 bg-danger-soft/15 dark:bg-danger/10 hover:border-danger"
                  : "border-ink-200 dark:border-ink-800 bg-canvas-raised dark:bg-ink-900 hover:border-ink-300 dark:hover:border-ink-700"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5">
                  {isYesterdayOverdue ? (
                    <AlertCircle className="w-4 h-4 text-danger animate-pulse" />
                  ) : isOverdue ? (
                    <AlertCircle className="w-4 h-4 text-danger" />
                  ) : isPayment ? (
                    <Wallet className="w-4 h-4 text-gold-dark" />
                  ) : isExpense ? (
                    <Clock className="w-4 h-4 text-warning" />
                  ) : isTask ? (
                    <CheckSquare className="w-4 h-4 text-signal" />
                  ) : isActivityOrEvent ? (
                    <Calendar className="w-4 h-4 text-signal" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-ink-950 dark:text-white truncate">
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {isYesterdayOverdue && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white">
                          En retard
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          item.priority === "critical"
                            ? "bg-danger text-white"
                            : item.priority === "high"
                            ? "bg-warning-soft text-warning"
                            : "bg-signal-soft text-signal"
                        }`}
                      >
                        {item.priority === "critical"
                          ? t("attention.critical")
                          : item.priority === "high"
                          ? t("attention.urgent")
                          : t("attention.info")}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-ink-700 dark:text-ink-300 mt-0.5 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>

              {/* Inline Instant Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100/60 dark:border-ink-800 flex-wrap">
                {/* Action Paiement Reçu */}
                {isPayment && item.entity_id && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleQuickAction("mark_received", item.id, item.entity_id)}
                    className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 transition-all disabled:opacity-50 tap-active shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{t("actions.mark_received")}</span>
                  </button>
                )}

                {/* Action Facture Payée */}
                {isExpense && item.entity_id && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleQuickAction("mark_paid", item.id, item.entity_id)}
                    className="px-3 py-1.5 rounded-lg bg-signal text-white text-xs font-semibold hover:bg-signal/90 transition-all disabled:opacity-50 tap-active shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{t("actions.mark_paid")}</span>
                  </button>
                )}

                {/* Action Tâche Terminée */}
                {isTask && item.entity_id && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleQuickAction("mark_task_done", item.id, item.entity_id)}
                    className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 transition-all disabled:opacity-50 tap-active shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{t("actions.mark_done")}</span>
                  </button>
                )}

                {/* Action Séances passées / Activités : Confirmer la réalisation */}
                {isActivityOrEvent && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleQuickAction("mark_event_done", item.id, item.entity_id)}
                    className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 transition-all disabled:opacity-50 tap-active shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{t("attention.confirm_session")}</span>
                  </button>
                )}

                {/* Bouton Détails */}
                <Link
                  href={item.link || "/notifications"}
                  className="px-2.5 py-1.5 rounded-lg border border-ink-200 dark:border-ink-700 text-xs font-medium text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                >
                  {t("actions.view_item")}
                </Link>

                {/* Bouton Écarter / Dismiss */}
                <button
                  type="button"
                  title={t("attention.dismiss")}
                  onClick={() => handleQuickAction("dismiss", item.id, item.entity_id)}
                  className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
