"use client";


import { useLanguage } from "@/components/i18n/language-provider";
import { useState, useEffect } from "react";
import {
  Mail,
  MailOpen,
  ArrowLeft,
  X,
  Clock,
  Inbox,
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
  const { tr } = useLanguage();
  const [messages, setMessages] = useState<InternalMessageRow[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<InternalMessageRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");

  // À l'ouverture : chargement des messages ET marquage automatique persistant comme lu dans la DB
  useEffect(() => {
    if (isOpen) {
      fetchMessagesAndMarkRead();
    }
  }, [isOpen]);

  async function fetchMessagesAndMarkRead() {
    setLoading(true);
    // Optimistic reset : les messages passent immédiatement au statut lu et le badge passe à 0
    if (onUnreadChange) {
      onUnreadChange(0);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("remindme:messages-read"));
    }

    try {
      // Appel avec autoMarkRead=true pour persister le statut 'Lu' dans Supabase
      const res = await fetch("/api/messages?autoMarkRead=true", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        // Tri déterministe stable : created_at desc, puis id desc
        const sorted = [...data.messages].sort((a, b) => {
          const tA = new Date(a.created_at).getTime();
          const tB = new Date(b.created_at).getTime();
          if (tB !== tA) return tB - tA;
          return String(b.id).localeCompare(String(a.id));
        });
        setMessages(sorted);
        if (onUnreadChange) {
          onUnreadChange(0);
        }
      }
    } catch (err) {
      console.warn("[InternalMessenger] Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenMessage(msg: InternalMessageRow) {
    setSelectedMessage(msg);
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
    const isEn = locale === "en";
    const isEs = locale === "es";
    const isDe = locale === "de";
    const isPt = locale === "pt";
    switch (cat) {
      case "financial": {
        const label = isEn ? "Finance" : isEs ? "Finanzas" : isDe ? "Finanzen" : isPt ? "Finanças" : "Finance";
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{label}</span>;
      }
      case "summary": {
        const label = isEn ? "Summary" : isEs ? "Resumen" : isDe ? "Übersicht" : isPt ? "Resumo" : "Bilan";
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{label}</span>;
      }
      case "activity": {
        const label = isEn ? "Session" : isEs ? "Sesión" : isDe ? "Sitzung" : isPt ? "Sessão" : "Séance";
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{label}</span>;
      }
      default: {
        const label = isEn ? "System" : isEs ? "Sistema" : isDe ? "System" : isPt ? "Sistema" : "Système";
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{label}</span>;
      }
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
                <span>
                  {locale === "en"
                    ? "Inbox"
                    : locale === "es"
                    ? tr("Buzón de entrada")
                    : locale === "de"
                    ? "Posteingang"
                    : locale === "pt"
                    ? tr("Caixa de entrada")
                    : tr("Boîte de réception")}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>{tr("Inbox Remind Me")}</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black">
                        {unreadCount}{" "}
                        {locale === "en"
                          ? "unread"
                          : locale === "es"
                          ? unreadCount > 1
                            ? tr("no leídos")
                            : tr("no leído")
                          : locale === "de"
                          ? "ungelesen"
                          : locale === "pt"
                          ? unreadCount > 1
                            ? tr("não lidos")
                            : tr("não lido")
                          : unreadCount > 1
                          ? tr("non lus")
                          : tr("non lu")}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {locale === "en"
                      ? tr("Your financial alerts, daily summaries and official notices")
                      : locale === "es"
                      ? tr("Sus alertas financieras, balances y comunicaciones oficiales")
                      : locale === "de"
                      ? tr("Ihre Finanzwarnungen, Tagesübersichten und Mitteilungen")
                      : locale === "pt"
                      ? tr("Seus alertas financeiros, relatórios diários e comunicados oficiais")
                      : tr("Vos alertes financières, bilans et communications officielles")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
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
              <span>
                {locale === "en"
                  ? tr("Official Remind Me notice")
                  : locale === "es"
                  ? tr("Mensaje oficial de Remind Me")
                  : locale === "de"
                  ? tr("Offizielle Remind Me Mitteilung")
                  : locale === "pt"
                  ? tr("Mensagem oficial do Remind Me")
                  : tr("Message officiel Remind Me")}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="text-amber-400 hover:underline font-semibold"
              >
                {locale === "en"
                  ? tr("← Back to list")
                  : locale === "es"
                  ? tr("← Volver a la lista")
                  : locale === "de"
                  ? tr("← Zurück zur Liste")
                  : locale === "pt"
                  ? tr("← Voltar à lista")
                  : tr("← Revenir à la liste")}
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
                  {locale === "en"
                    ? "All"
                    : locale === "es"
                    ? "Todos"
                    : locale === "de"
                    ? "Alle"
                    : locale === "pt"
                    ? "Todos"
                    : "Tous"}{" "}
                  ({messages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filter === "unread" ? "bg-amber-500 text-black font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {locale === "en"
                    ? "Unread"
                    : locale === "es"
                    ? tr("No leídos")
                    : locale === "de"
                    ? "Ungelesen"
                    : locale === "pt"
                    ? tr("Não lidos")
                    : tr("Non lus")}{" "}
                  ({unreadCount})
                </button>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder={
                    locale === "en"
                      ? tr("Search messages...")
                      : locale === "es"
                      ? tr("Buscar mensajes...")
                      : locale === "de"
                      ? tr("Nachrichten suchen...")
                      : locale === "pt"
                      ? tr("Pesquisar mensagens...")
                      : tr("Rechercher un message...")
                  }
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
                  {locale === "en"
                    ? tr("Loading your messages...")
                    : locale === "es"
                    ? tr("Cargando sus mensajes...")
                    : locale === "de"
                    ? tr("Ihre Nachrichten werden geladen...")
                    : locale === "pt"
                    ? tr("Carregando suas mensagens...")
                    : tr("Chargement de vos messages...")}
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Mail className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">
                    {filter === "unread"
                      ? locale === "en"
                        ? tr("No unread messages")
                        : locale === "es"
                        ? tr("No hay mensajes sin leer")
                        : locale === "de"
                        ? tr("Keine ungelesenen Nachrichten")
                        : locale === "pt"
                        ? tr("Nenhuma mensagem não lida")
                        : tr("Aucun message non lu")
                      : locale === "en"
                      ? tr("Your inbox is empty")
                      : locale === "es"
                      ? tr("Su buzón de entrada está vacío")
                      : locale === "de"
                      ? tr("Ihr Posteingang ist leer")
                      : locale === "pt"
                      ? tr("Sua caixa de entrada está vazia")
                      : tr("Votre boîte de réception est vide")}
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {locale === "en"
                      ? tr("Your important activity reminders, financial alerts and daily summaries will appear here.")
                      : locale === "es"
                      ? tr("Sus recordatorios de actividades, alertas financieras y balances diarios se archivarán aquí.")
                      : locale === "de"
                      ? tr("Ihre Aktivitätserinnerungen, Finanzwarnungen und Tagesbilanzen werden hier archiviert.")
                      : locale === "pt"
                      ? tr("Seus lembretes de atividades, alertas financeiros e relatórios diários serão arquivados aqui.")
                      : tr("Vos rappels d'activités importants, alertes financières et bilans quotidiens seront archivés ici.")}
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
