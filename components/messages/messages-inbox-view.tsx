"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  MailOpen,
  Clock,
  Search,
  ArrowLeft,
  Inbox,
  ShieldCheck,
  CheckCheck,
} from "lucide-react";
import type { InternalMessageRow } from "@/lib/messages/service";
import { formatMessageDate } from "@/lib/messages/service";

interface MessagesInboxViewProps {
  initialMessages: InternalMessageRow[];
  timezone?: string;
  locale?: string;
}

export function MessagesInboxView({
  initialMessages,
  timezone = "UTC",
  locale = "fr",
}: MessagesInboxViewProps) {
  const [messages, setMessages] = useState<InternalMessageRow[]>(initialMessages);
  const [selectedMessage, setSelectedMessage] = useState<InternalMessageRow | null>(null);
  const [search, setSearch] = useState("");

  // À l'ouverture de la page : synchronisation avec les badges globaux
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("remindme:messages-read"));
    }
  }, []);

  // Tri déterministe stable : created_at desc, id desc
  const sortedMessages = [...messages].sort((a, b) => {
    const tA = new Date(a.created_at).getTime();
    const tB = new Date(b.created_at).getTime();
    if (tB !== tA) return tB - tA;
    return String(b.id).localeCompare(String(a.id));
  });

  const filteredMessages = sortedMessages.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.subject.toLowerCase().includes(q) ||
      m.body.toLowerCase().includes(q) ||
      m.sender.toLowerCase().includes(q)
    );
  });

  function getCategoryBadge(cat: string) {
    switch (cat) {
      case "financial":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Finance
          </span>
        );
      case "summary":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Bilan
          </span>
        );
      case "activity":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Séance
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
            Système
          </span>
        );
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-ink-950 dark:text-white">
              Messagerie officielle
            </h1>
            <p className="text-xs text-ink-500">
              Boîte de réception des alertes financières, bilans et communications officielles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tous les messages sont à jour</span>
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedMessage ? (
        /* DETAIL VIEW : Consultation individuelle d'un message */
        <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised dark:bg-ink-900 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800/80 pb-4">
            <button
              type="button"
              onClick={() => setSelectedMessage(null)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-ink-200 dark:border-ink-700 bg-canvas hover:bg-canvas-subtle text-xs font-semibold text-ink-700 dark:text-ink-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la liste</span>
            </button>

            <div className="flex items-center gap-2">
              {getCategoryBadge(selectedMessage.category)}
              <span className="text-xs text-ink-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatMessageDate(selectedMessage.created_at, timezone, locale)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {selectedMessage.sender}
              </span>
              <span className="text-xs text-ink-400">
                • Reçu le {new Date(selectedMessage.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-ink-950 dark:text-white leading-tight">
              {selectedMessage.subject}
            </h2>
          </div>

          {/* Corps complet du message */}
          <div className="p-5 sm:p-6 rounded-2xl border border-ink-100 dark:border-ink-800 bg-canvas dark:bg-ink-950 text-sm sm:text-base text-ink-800 dark:text-ink-100 whitespace-pre-line leading-relaxed shadow-2xs">
            {selectedMessage.body}
          </div>

          {/* Footer d'information */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-signal" />
              <span>Communication officielle certifiée Remind Me</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMessage(null)}
              className="text-signal hover:underline font-semibold"
            >
              ← Revenir à tous les messages ({messages.length})
            </button>
          </div>
        </div>
      ) : (
        /* LIST VIEW : Boîte de réception complète */
        <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised dark:bg-ink-900 overflow-hidden shadow-sm flex flex-col">
          {/* Barre de recherche */}
          <div className="p-4 border-b border-ink-100 dark:border-ink-800/80 bg-canvas/60 dark:bg-ink-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-bold text-ink-600 dark:text-ink-400">
              Boîte de réception ({messages.length} message{messages.length > 1 ? "s" : ""})
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-400" />
              <input
                type="text"
                placeholder="Rechercher par mot-clé..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200 dark:border-ink-800 text-ink-950 dark:text-white placeholder:text-ink-400 focus:outline-none focus:border-signal"
              />
            </div>
          </div>

          {/* Liste des messages ordonnée chronologiquement */}
          <div className="divide-y divide-ink-100 dark:divide-ink-800/60">
            {filteredMessages.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Mail className="w-10 h-10 text-ink-400 mx-auto" />
                <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">
                  {search.trim() ? "Aucun message correspondant à votre recherche" : "Votre boîte de réception est vide"}
                </p>
                <p className="text-xs text-ink-500 max-w-sm mx-auto">
                  Vos alertes de paiements, dépenses programmées et bilans financiers apparaîtront ici.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className="p-4 sm:p-5 hover:bg-signal-soft/10 dark:hover:bg-ink-800/40 transition-colors cursor-pointer flex items-start gap-4 group"
                >
                  <div className="mt-1 shrink-0 p-2 rounded-xl bg-ink-100 dark:bg-ink-800 text-ink-500 group-hover:text-signal transition-colors">
                    <MailOpen className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs font-bold text-ink-950 dark:text-white">
                          {msg.sender}
                        </span>
                        {getCategoryBadge(msg.category)}
                      </div>
                      <span className="text-[11px] text-ink-400 whitespace-nowrap shrink-0">
                        {formatMessageDate(msg.created_at, timezone, locale)}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100 truncate group-hover:text-signal transition-colors">
                      {msg.subject}
                    </h3>

                    <p className="text-xs text-ink-500 line-clamp-2 leading-relaxed">
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
  );
}
