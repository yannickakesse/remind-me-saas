"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, AlertCircle, Wallet, Clock, Pin, ArrowRight } from "lucide-react";
import type { Notification } from "@/types/database";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
}

export function NotificationBell({ notifications, unreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      router.refresh();
    } catch (e) {
      // Ignoré
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-ink-700 hover:text-ink-950 hover:bg-ink-100 transition-colors focus:outline-none focus:ring-2 focus:ring-signal"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" strokeWidth={1.8} />

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-canvas-raised animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-canvas-raised border border-ink-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3.5 border-b border-ink-100 flex items-center justify-between bg-canvas">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink-950">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger-soft text-danger">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] text-signal font-semibold hover:underline flex items-center gap-1"
            >
              Centre complet <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-ink-100 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-500">
                <CheckCircle2 className="w-6 h-6 text-positive mx-auto mb-1.5" />
                Tout est à jour ! Aucune alerte en attente.
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => {
                const isUnread = !n.read_at && n.status !== "read";
                const isOverdue = n.kind.includes("overdue");
                return (
                  <Link
                    key={n.id}
                    href={n.link || "/notifications"}
                    onClick={() => setOpen(false)}
                    className={`block p-3 hover:bg-ink-100/60 transition-colors ${
                      isUnread ? "bg-signal-soft/15" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 mt-0.5">
                        {isOverdue ? (
                          <AlertCircle className="w-4 h-4 text-danger" />
                        ) : n.category === "payment" ? (
                          <Wallet className="w-4 h-4 text-gold-dark" />
                        ) : n.category === "expense" ? (
                          <Clock className="w-4 h-4 text-warning" />
                        ) : (
                          <Pin className="w-4 h-4 text-signal" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-ink-950 truncate">
                            {n.title}
                          </span>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-signal shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-ink-700 line-clamp-2 mt-0.5">
                          {n.body}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-ink-100 bg-canvas text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block w-full py-1.5 rounded-lg text-xs font-medium text-ink-700 hover:bg-ink-100 hover:text-ink-950 transition-colors"
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
