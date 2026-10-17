"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, AlertCircle, Wallet, Clock, Pin, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled, testChimeSound } from "@/lib/notifications/sound";
import { useLanguage } from "@/components/i18n/language-provider";
import type { Notification } from "@/types/database";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
}

export function NotificationBell({ notifications: initialNotifications, unreadCount: initialCount }: NotificationBellProps) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [soundActive, setSoundActive] = useState(true);
  const [items, setItems] = useState<Notification[]>(initialNotifications);
  const [count, setCount] = useState<number>(initialCount);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialNotifications);
    setCount(initialCount);
  }, [initialNotifications, initialCount]);

  useEffect(() => {
    setSoundActive(isSoundEnabled());
    function handlePrefChange(e: any) {
      setSoundActive(e.detail?.enabled ?? true);
    }
    window.addEventListener("remindme_sound_pref_changed", handlePrefChange);
    return () => window.removeEventListener("remindme_sound_pref_changed", handlePrefChange);
  }, []);

  // Polling automatique toutes les 25 secondes pour rafraîchir les alertes en direct
  useEffect(() => {
    let isMounted = true;
    async function fetchLatest() {
      try {
        const res = await fetch("/api/notifications/poll");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setItems(data.unread || []);
            setCount(data.count || 0);
          }
        }
      } catch (_) {}
    }

    const interval = setInterval(fetchLatest, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  function toggleSound() {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) {
      testChimeSound();
    }
  }

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
      setCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      router.refresh();
    } catch (e) {
      // Ignoré
    }
  }

  const soundTooltip = soundActive
    ? (locale === "fr" ? "Sonnerie activée (cliquer pour couper)" : locale === "es" ? "Sonido activado (clic para silenciar)" : locale === "de" ? "Ton aktiv (klicken zum Stummschalten)" : locale === "pt" ? "Som ativado (clique para silenciar)" : "Sound on (click to mute)")
    : (locale === "fr" ? "Sonnerie coupée (cliquer pour activer)" : locale === "es" ? "Silenciado (clic para activar sonido)" : locale === "de" ? "Stummgeschaltet (klicken zum Aktivieren)" : locale === "pt" ? "Som desativado (clique para ativar)" : "Sound off (click to unmute)");
  const soundLabel = soundActive
    ? (locale === "fr" ? "Sonnerie" : locale === "es" ? "Sonido" : locale === "de" ? "Ton" : locale === "pt" ? "Som" : "Sound")
    : (locale === "fr" ? "Muet" : locale === "es" ? "Silencio" : locale === "de" ? "Stumm" : locale === "pt" ? "Mudo" : "Mute");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-ink-700 hover:text-ink-950 hover:bg-ink-100 transition-colors focus:outline-none focus:ring-2 focus:ring-signal"
        aria-label={t("nav.notifications")}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" strokeWidth={1.8} />

        {count > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-canvas-raised animate-pulse">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-canvas-raised border border-ink-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3.5 border-b border-ink-100 flex items-center justify-between bg-canvas">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink-950">{t("nav.notifications")}</span>
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger-soft text-danger">
                  {count} {locale === "fr" ? (count > 1 ? "non lues" : "non lue") : t("actions.filter_unread").toLowerCase()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSound}
                title={soundTooltip}
                className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  soundActive
                    ? "bg-signal-soft/60 text-signal hover:bg-signal-soft"
                    : "bg-ink-100 text-ink-400 hover:text-ink-700"
                }`}
              >
                {soundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-medium hidden sm:inline">{soundLabel}</span>
              </button>

              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-[11px] text-signal font-semibold hover:underline flex items-center gap-1"
              >
                {t("attention.manage_all")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="divide-y divide-ink-100 max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-500">
                <CheckCircle2 className="w-6 h-6 text-positive mx-auto mb-1.5" />
                {t("attention.all_clear")}
              </div>
            ) : (
              items.slice(0, 5).map((n) => {
                const isUnread = !n.read_at && n.status !== "read";
                const isOverdue = n.kind.includes("overdue");
                return (
                  <Link
                    key={n.id}
                    href={n.link || "/notifications"}
                    onClick={() => {
                      setOpen(false);
                      if (isUnread) {
                        setCount((prev) => Math.max(0, prev - 1));
                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === n.id
                              ? { ...item, read_at: new Date().toISOString(), status: "read" }
                              : item
                          )
                        );
                        fetch("/api/notifications/quick-action", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "mark_read", notificationId: n.id }),
                        }).catch(() => {});
                      }
                    }}
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
              {locale === "fr"
                ? "Voir toutes les notifications"
                : locale === "es"
                ? "Ver todas las notificaciones"
                : locale === "de"
                ? "Alle Benachrichtigungen anzeigen"
                : locale === "pt"
                ? "Ver todas as notificações"
                : "View all notifications"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
