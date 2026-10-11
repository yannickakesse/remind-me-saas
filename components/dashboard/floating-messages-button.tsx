"use client";

import { useState, useEffect } from "react";
import { Mail, Sparkles } from "lucide-react";
import { InternalMessenger } from "@/components/messages/internal-messenger";

interface FloatingMessagesButtonProps {
  initialUnreadCount?: number;
  timezone?: string;
  locale?: string;
}

export function FloatingMessagesButton({
  initialUnreadCount = 0,
  timezone = "UTC",
  locale = "fr",
}: FloatingMessagesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  // Vérification périodique du compteur non lu (toutes les 60 secondes)
  useEffect(() => {
    async function checkCount() {
      try {
        const res = await fetch("/api/messages", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch {}
    }

    checkCount();
    const interval = setInterval(checkCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Floating Action Button — Accessible, attractif et ergonomique sur mobile & desktop */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-bold shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-amber-300/40"
          aria-label="Ouvrir la messagerie Remind Me"
        >
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-950 transition-transform group-hover:rotate-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[11px] font-black shadow-md ring-2 ring-slate-950 animate-bounce">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          <span className="text-xs sm:text-sm font-extrabold tracking-tight hidden sm:inline">
            Messagerie
          </span>

          {unreadCount > 0 && (
            <span className="sm:hidden text-xs font-black bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Modal / Boîte de réception complète */}
      <InternalMessenger
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        timezone={timezone}
        locale={locale}
        onUnreadChange={(cnt) => setUnreadCount(cnt)}
      />
    </>
  );
}
