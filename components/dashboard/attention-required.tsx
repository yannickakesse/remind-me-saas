"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, AlertCircle, Wallet, Clock, Check, ArrowRight } from "lucide-react";
import type { Notification } from "@/types/database";

interface AttentionRequiredProps {
  notifications: Notification[];
}

export function AttentionRequired({ notifications }: AttentionRequiredProps) {
  const router = useRouter();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const urgentItems = notifications.filter(
    (n) => n.status === "unread" || n.priority === "critical" || n.priority === "high"
  );

  if (urgentItems.length === 0) {
    return null;
  }

  async function handleQuickAction(action: string, id: string, entityId: string) {
    setResolvingId(id);
    try {
      const res = await fetch("/api/notifications/quick-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notificationId: id, entityId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-warning/30 bg-warning-soft/10 p-4 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-danger" />
          </span>
          <h2 className="text-base font-bold text-ink-950">
            Nécessite votre attention ({urgentItems.length})
          </h2>
        </div>
        <Link
          href="/notifications"
          className="text-xs font-semibold text-signal hover:underline flex items-center gap-1"
        >
          Tout gérer <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {urgentItems.slice(0, 4).map((item) => {
          const isOverdue = item.kind.includes("overdue");
          const isPayment = item.category === "payment" || item.entity_type === "income";
          const isExpense = item.category === "expense" || item.entity_type === "expense";
          const isBusy = resolvingId === item.id;

          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-ink-200 bg-canvas-raised shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5">
                  {isOverdue ? (
                    <AlertCircle className="w-4 h-4 text-danger" />
                  ) : isPayment ? (
                    <Wallet className="w-4 h-4 text-gold-dark" />
                  ) : isExpense ? (
                    <Clock className="w-4 h-4 text-warning" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-ink-950 truncate">
                      {item.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.priority === "critical"
                          ? "bg-danger text-white"
                          : item.priority === "high"
                          ? "bg-warning-soft text-warning"
                          : "bg-signal-soft text-signal"
                      }`}
                    >
                      {item.priority === "critical" ? "Critique" : "Urgent"}
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 mt-0.5 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>

              {/* Inline Instant Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100/60">
                {isPayment && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleQuickAction("mark_received", item.id, item.entity_id)}
                    className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 transition-all disabled:opacity-50 tap-active shadow-xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> {isBusy ? "Mise à jour..." : "Marquer comme reçu"}
                  </button>
                )}

                {isExpense && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleQuickAction("mark_paid", item.id, item.entity_id)}
                    className="px-3 py-1.5 rounded-lg bg-signal text-white text-xs font-semibold hover:bg-signal/90 transition-all disabled:opacity-50 tap-active shadow-xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> {isBusy ? "Mise à jour..." : "Marquer comme payé"}
                  </button>
                )}

                <Link
                  href={item.link || "/notifications"}
                  className="px-2.5 py-1.5 rounded-lg border border-ink-200 text-xs font-medium text-ink-700 hover:bg-ink-100 hover:text-ink-950 transition-colors"
                >
                  Détails
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
