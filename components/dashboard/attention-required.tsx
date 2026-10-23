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

  // STRICTEMENT les alertes financières / paiements requis NON RÉSOLUES, NON ÉCARTÉES, NON LUES et NON DISMISSED
  const urgentItems = notifications.filter((n) => {
    if (n.status !== "unread" || n.read_at || dismissedIds.has(n.id)) {
      return false;
    }
    const isPayment = n.category === "payment" || n.entity_type === "income";
    const isExpense =
      n.category === "expense" ||
      n.entity_type === "expense" ||
      n.category === "scheduled_expense" ||
      n.entity_type === "scheduled_expense";
    const isFinance =
      n.category === "finance" ||
      n.category === "financial" ||
      n.kind?.startsWith("payment_") ||
      n.kind?.startsWith("expense_");

    return isPayment || isExpense || isFinance;
  });

  if (urgentItems.length === 0) {
    return null;
  }

  async function handleQuickAction(action: string, id: string, entityId?: string) {
    if (resolvingId) return;
    setResolvingId(id);
    // Optimistic instant UI dismissal (0ms)
    setDismissedIds((prev) => new Set([...prev, id]));

    try {
      const res = await fetch("/api/notifications/quick-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notificationId: id, entityId: entityId || id }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        // Rollback en cas de rejet serveur
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (e) {
      console.error("[AttentionRequired] quick-action error:", e);
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-400/40 dark:border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 dark:from-amber-950/40 dark:via-slate-900/60 dark:to-amber-950/30 backdrop-blur-xl p-4 sm:p-5 space-y-4 shadow-sm transition-all">
      {/* Halo discret */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 shadow-xs" />
          </span>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-ink-950 dark:text-white">
            {t("attention.title")} ({urgentItems.length})
          </h2>
          <span className="text-xs text-ink-500 dark:text-ink-400 hidden sm:inline">
            — {t("attention.subtitle")}
          </span>
        </div>
        <Link
          href="/notifications"
          className="text-xs font-semibold text-signal hover:underline flex items-center gap-1 group"
        >
          <span>{t("attention.manage_all")}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {urgentItems.slice(0, 4).map((item) => {
          const isYesterdayOverdue = !!item.metadata?.is_yesterday_overdue || (item.metadata?.daysAgo && item.metadata.daysAgo >= 1);
          const isOverdue = item.kind.includes("overdue") || isYesterdayOverdue;
          const isPayment = item.category === "payment" || item.entity_type === "income";
          const isExpense =
            item.category === "expense" ||
            item.entity_type === "expense" ||
            item.category === "scheduled_expense" ||
            item.entity_type === "scheduled_expense";
          const isBusy = resolvingId === item.id;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between space-y-3 transition-all duration-200 hover:-translate-y-0.5 ${
                isYesterdayOverdue
                  ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 hover:border-rose-400"
                  : "border-ink-200/80 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 hover:border-amber-400/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5">
                  {isYesterdayOverdue ? (
                    <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4 animate-pulse" />
                    </div>
                  ) : isOverdue ? (
                    <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  ) : isPayment ? (
                    <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <Wallet className="w-4 h-4" />
                    </div>
                  ) : isExpense ? (
                    <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <Clock className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-ink-950 dark:text-white truncate">
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {isYesterdayOverdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-2xs">
                          {t("actions.filter_overdue")}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          item.priority === "critical"
                            ? "bg-rose-500 text-white"
                            : item.priority === "high"
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                            : "bg-signal/15 text-signal border border-signal/20"
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
                  <p className="text-xs text-ink-600 dark:text-ink-400 mt-1 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>

              {/* Actions Paiement & Règlements */}
              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-ink-100/70 dark:border-white/5 flex-wrap">
                {/* Action Paiement Reçu */}
                {isPayment && item.entity_id && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleQuickAction("mark_received", item.id, item.entity_id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all duration-150 disabled:opacity-50 tap-active shadow-2xs hover:shadow-sm flex items-center gap-1.5 cursor-pointer"
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
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all duration-150 disabled:opacity-50 tap-active shadow-2xs hover:shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{t("actions.mark_paid")}</span>
                  </button>
                )}

                {/* Bouton Détails */}
                <Link
                  href={item.link || "/finances"}
                  className="px-3 py-1.5 rounded-xl border border-ink-200/80 dark:border-white/10 text-xs font-medium text-ink-700 dark:text-ink-300 hover:bg-ink-100/80 dark:hover:bg-white/5 transition-colors"
                >
                  {t("actions.view_item")}
                </Link>

                {/* Bouton Écarter / Dismiss */}
                <button
                  type="button"
                  title={t("attention.dismiss")}
                  onClick={() => handleQuickAction("dismiss", item.id, item.entity_id)}
                  className="p-1.5 rounded-xl text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 hover:bg-ink-100/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
