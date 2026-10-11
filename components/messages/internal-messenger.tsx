"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  MailOpen,
  ArrowLeft,
  X,
  CheckCheck,
  Clock,
  Sparkles,
  Inbox,
  Calendar,
  Wallet,
  Bell,
  Search,
} from "lucide-react";
import type { InternalMessageRow } from "@/lib/messages/service";
import { formatMessageDate } from "@/lib/messages/service";

interface InternalMessengerProps {
  isOpen: boolean;
  onClose: () => void;
  timezone?: string;
  locale?: string;
  onUnreadChange?: (count: number) => void;
}

export function InternalMessenger({
  isOpen,
  onClose,
  timezone = "UTC",
  locale = "fr",
  onUnreadChange,
}: InternalMessengerProps) {
  const [messages, setMessages] = useState<InternalMessageRow[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<InternalMessageRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen]);

  async function fetchMessages() {
    setLoading(true);
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
        if (onUnreadChange) {
          onUnreadChange(data.unreadCount ?? 0);
        }
      }
    } catch (err) {
      console.warn("[InternalMessenger] Error fetching:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenMessage(msg: InternalMessageRow) {
    setSelectedMessage(msg);
    if (!msg.is_read) {
      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: true, read_at: new Date().toISOString() } : m))
      );
      if (onUnreadChange) {
        const remaining = messages.filter((m) => !m.is_read && m.id !== msg.id).length;
        onUnreadChange(remaining);
      }

      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_read", messageId: msg.id }),
        });
      } catch {}
    }
  }

  async function handleMarkAllRead() {
    setMessages((prev) =>
      prev.map((m) => ({ ...m, is_read: true, read_at: new Date().toISOString() }))
    );
    if (onUnreadChange) onUnreadChange(0);

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
    } catch {}
  }

  if (!isOpen) return null;

  const unreadCount = messages.filter((m) => !m.is_read).length;

  const filteredMessages = messages.filter((m) => {
    if (filter === "unread" && m.is_read) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q);
    }
    return true;
  });

  function getCategoryBadge(cat: string) {
    switch (cat) {
      case "activity":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Séance</span>;
      case "financial":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Finance</span>;
      case "summary":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">Bilan</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Système</span>;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[750px]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#131F37] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {selectedMessage ? (
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Boîte de réception</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Messagerie Remind Me</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black">
                        {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">Vos communications et bilans officiels conservés</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!selectedMessage && unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                title="Tout marquer comme lu"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tout marquer lu</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {selectedMessage ? (
          /* MESSAGE DETAIL VIEW */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#0B1120]">
            <div className="border-b border-slate-800/80 pb-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    {selectedMessage.sender}
                  </span>
                  {getCategoryBadge(selectedMessage.category)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatMessageDate(selectedMessage.created_at, timezone, locale)}</span>
                </div>
              </div>

              <h2 className="text-base sm:text-xl font-extrabold text-white leading-snug">
                {selectedMessage.subject}
              </h2>
            </div>

            {/* Message Body Content */}
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line bg-[#131F37]/50 p-5 rounded-2xl border border-slate-800">
              {selectedMessage.body}
            </div>

            <div className="pt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Message officiel Remind Me</span>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="text-amber-400 hover:underline font-semibold"
              >
                ← Revenir à la liste
              </button>
            </div>
          </div>
        ) : (
          /* INBOX LIST VIEW */
          <div className="flex-1 flex flex-col min-h-0 bg-[#0B1120]">
            {/* Filter Tabs & Search */}
            <div className="p-3 border-b border-slate-800/60 bg-[#0F172A] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filter === "all" ? "bg-amber-500 text-black font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Tous ({messages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filter === "unread" ? "bg-amber-500 text-black font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Non lus ({unreadCount})
                </button>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher un message..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
              {loading && messages.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-400">
                  Chargement de vos messages...
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Mail className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">
                    {filter === "unread" ? "Aucun message non lu" : "Votre boîte de réception est vide"}
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Vos rappels d'activités importants, alertes financières et bilans quotidiens seront archivés ici.
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => handleOpenMessage(msg)}
                    className={`p-4 hover:bg-[#131F37]/80 transition-all cursor-pointer flex items-start gap-3.5 ${
                      !msg.is_read ? "bg-[#131F37]/40 border-l-4 border-l-amber-500" : "opacity-85"
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      {!msg.is_read ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50 animate-pulse" />
                      ) : (
                        <MailOpen className="w-4 h-4 text-slate-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-xs ${!msg.is_read ? "font-black text-amber-400" : "font-medium text-slate-400"}`}>
                            {msg.sender}
                          </span>
                          {getCategoryBadge(msg.category)}
                        </div>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                          {formatMessageDate(msg.created_at, timezone, locale)}
                        </span>
                      </div>

                      <h4 className={`text-sm truncate ${!msg.is_read ? "font-bold text-white" : "font-medium text-slate-300"}`}>
                        {msg.subject}
                      </h4>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {msg.body}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
