"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Inbox,
  TrendingUp,
  TrendingDown,
  Clock,
  Mail,
  Search,
  CheckCheck,
  AlertCircle,
  Calendar,
  ArrowRight,
  Filter,
  CheckCircle2,
  CalendarClock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  X,
  Loader2,
  Tag,
  Repeat,
  ChevronRight,
  Info,
} from "lucide-react";
import type { InboxItem, InboxTab, InboxItemKind, InboxStatus } from "./inbox-types";
import type { InternalMessageRow } from "@/lib/messages/service";
import { formatCurrencyLocale, formatDateLocale } from "@/lib/i18n/format";
import type { SupportedLocale } from "@/lib/i18n/types";
import {
  executeInboxIncomeReceived,
  executeInboxExpensePaid,
  executeInboxScheduledExpensePaid,
  executeInboxPostponeIncome,
  executeInboxPostponeScheduledExpense,
} from "@/app/(app)/messages/actions";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/language-provider";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";

interface MessagesInboxViewProps {
  initialItems?: InboxItem[];
  initialMessages?: InternalMessageRow[];
  timezone?: string;
  locale?: string;
}

export function MessagesInboxView({
  initialItems = [],
  initialMessages = [],
  timezone = "UTC",
  locale = "fr",
}: MessagesInboxViewProps) {
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<InboxTab>(() => {
    const hasTodo = initialItems.some((i) => i.tab === "todo");
    return hasTodo ? "todo" : "pending";
  });
  const [typeFilter, setTypeFilter] = useState<"all" | InboxItemKind>("all");
  const [search, setSearch] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<InboxItem | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const toast = useToast();
  const { t, locale: contextLocale } = useLanguage();
  const currentLocale = (contextLocale || locale || "fr") as SupportedLocale;

  // Synchronisation continue lorsque les props initialItems sont rafraîchies par le serveur
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Écoute des événements de synchronisation globale pour rafraîchir l'Inbox si un changement survient ailleurs
  useEffect(() => {
    const handleExternalSync = () => {
      startTransition(() => {
        router.refresh();
      });
    };
    window.addEventListener("remindme:finances-updated", handleExternalSync);
    window.addEventListener("remindme:notifications-updated", handleExternalSync);
    return () => {
      window.removeEventListener("remindme:finances-updated", handleExternalSync);
      window.removeEventListener("remindme:notifications-updated", handleExternalSync);
    };
  }, [router]);

  // Compteurs par onglet
  const todoCount = items.filter((i) => i.tab === "todo").length;
  const pendingCount = items.filter((i) => i.tab === "pending").length;
  const historyCount = items.filter((i) => i.tab === "history").length;

  // Filtrage selon onglet actif, type et texte de recherche
  const currentTabItems = items.filter((item) => {
    if (item.tab !== activeTab) return false;
    if (typeFilter !== "all" && item.kind !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q) || false;
      const matchActivity = item.activityName?.toLowerCase().includes(q) || false;
      const matchNotes = item.notes?.toLowerCase().includes(q) || false;
      const matchMerchant = item.merchant?.toLowerCase().includes(q) || false;
      const matchBody = item.body?.toLowerCase().includes(q) || false;
      const matchSender = item.sender?.toLowerCase().includes(q) || false;
      return (
        matchTitle ||
        matchDesc ||
        matchActivity ||
        matchNotes ||
        matchMerchant ||
        matchBody ||
        matchSender
      );
    }
    return true;
  });

  // Calcul des métriques financières pour l'onglet actif
  const activeCurrency = items.find((i) => i.currency)?.currency || "EUR";

  const totalIncomeTodo = items
    .filter((i) => i.tab === "todo" && i.kind === "income")
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalExpenseTodo = items
    .filter((i) => i.tab === "todo" && (i.kind === "expense" || i.kind === "scheduled_expense"))
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalOverdueCount = items.filter(
    (i) => i.tab === "todo" && i.status === "overdue"
  ).length;

  const totalIncomePending = items
    .filter((i) => i.tab === "pending" && i.kind === "income")
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalExpensePending = items
    .filter((i) => i.tab === "pending" && (i.kind === "expense" || i.kind === "scheduled_expense"))
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalIncomeHistory = items
    .filter((i) => i.tab === "history" && i.kind === "income")
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalExpenseHistory = items
    .filter((i) => i.tab === "history" && (i.kind === "expense" || i.kind === "scheduled_expense"))
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  // --- ACTIONS MÉTIER EN BASE DE DONNÉES ---

  async function handleReceiveIncome(id: string) {
    if (loadingActionId) return;
    setLoadingActionId(id);
    try {
      const res = await executeInboxIncomeReceived(id);
      if (res.success) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  tab: "history",
                  status: "completed",
                  statusLabel: "Encaissé",
                  resolvedDate: new Date().toISOString().slice(0, 10),
                }
              : it
          )
        );
        toast.push("Revenu marqué comme encaissé avec succès !", "success");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("remindme:finances-updated"));
          window.dispatchEvent(new CustomEvent("remindme:notifications-updated"));
        }
      } else {
        toast.push(res.error || "Erreur lors de l'encaissement.", "error");
      }
    } catch {
      toast.push("Une erreur inattendue est survenue.", "error");
    } finally {
      setLoadingActionId(null);
    }
  }

  async function handlePayExpense(id: string) {
    if (loadingActionId) return;
    setLoadingActionId(id);
    try {
      const res = await executeInboxExpensePaid(id);
      if (res.success) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  tab: "history",
                  status: "completed",
                  statusLabel: "Réglée",
                  resolvedDate: new Date().toISOString().slice(0, 10),
                }
              : it
          )
        );
        toast.push("Dépense marquée comme payée !", "success");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("remindme:finances-updated"));
          window.dispatchEvent(new CustomEvent("remindme:notifications-updated"));
        }
      } else {
        toast.push(res.error || "Erreur lors du règlement.", "error");
      }
    } catch {
      toast.push("Une erreur inattendue est survenue.", "error");
    } finally {
      setLoadingActionId(null);
    }
  }

  async function handlePayScheduledExpense(id: string) {
    if (loadingActionId) return;
    setLoadingActionId(id);
    try {
      const res = await executeInboxScheduledExpensePaid(id);
      if (res.success) {
        setItems((prev) =>
          prev.map((it) => {
            if (it.id === id) {
              if (it.frequency === "once") {
                return {
                  ...it,
                  tab: "history",
                  status: "completed",
                  statusLabel: "Payée",
                };
              }
              // Pour une récurrente, l'échéance suivante a été calculée sur le serveur
              const cur = new Date(it.dueDate || new Date());
              cur.setMonth(cur.getMonth() + 1);
              return {
                ...it,
                tab: "pending",
                dueDate: cur.toISOString().slice(0, 10),
                status: "pending",
                statusLabel: "Échéance programmée",
              };
            }
            return it;
          })
        );
        toast.push("Échéance programmée réglée et enregistrée !", "success");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("remindme:finances-updated"));
          window.dispatchEvent(new CustomEvent("remindme:notifications-updated"));
        }
      } else {
        toast.push(res.error || "Erreur lors du règlement.", "error");
      }
    } catch {
      toast.push("Une erreur inattendue est survenue.", "error");
    } finally {
      setLoadingActionId(null);
    }
  }

  async function handlePostponeIncome(id: string, days = 7) {
    if (loadingActionId) return;
    setLoadingActionId(id);
    try {
      const res = await executeInboxPostponeIncome(id, days);
      if (res.success) {
        setItems((prev) =>
          prev.map((it) => {
            if (it.id === id) {
              const cur = new Date(it.dueDate || new Date());
              cur.setDate(cur.getDate() + days);
              const newDate = cur.toISOString().slice(0, 10);
              return {
                ...it,
                dueDate: newDate,
                tab: "pending",
                status: "pending",
                statusLabel: "Revenu attendu",
              };
            }
            return it;
          })
        );
        toast.push(`Échéance reportée de ${days} jours.`, "info");
      } else {
        toast.push(res.error || "Erreur lors du report.", "error");
      }
    } catch {
      toast.push("Une erreur est survenue lors du report.", "error");
    } finally {
      setLoadingActionId(null);
    }
  }

  async function handlePostponeScheduledExpense(id: string, days = 7) {
    if (loadingActionId) return;
    setLoadingActionId(id);
    try {
      const res = await executeInboxPostponeScheduledExpense(id, days);
      if (res.success) {
        setItems((prev) =>
          prev.map((it) => {
            if (it.id === id) {
              const cur = new Date(it.dueDate || new Date());
              cur.setDate(cur.getDate() + days);
              const newDate = cur.toISOString().slice(0, 10);
              return {
                ...it,
                dueDate: newDate,
                tab: "pending",
                status: "pending",
                statusLabel: "Échéance programmée",
              };
            }
            return it;
          })
        );
        toast.push(`Dépense reportée de ${days} jours.`, "info");
      } else {
        toast.push(res.error || "Erreur lors du report.", "error");
      }
    } catch {
      toast.push("Une erreur est survenue lors du report.", "error");
    } finally {
      setLoadingActionId(null);
    }
  }

  // --- RENDU DES BADGES ET ICÔNES ---

  function getItemIcon(kind: InboxItemKind) {
    switch (kind) {
      case "income":
        return <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "expense":
        return <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case "scheduled_expense":
        return <Repeat className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "message":
        return <Mail className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    }
  }

  function getStatusBadge(status: InboxStatus, label: string) {
    switch (status) {
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case "due_today":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCheck className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
            <span>{label}</span>
          </span>
        );
      case "info":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </span>
        );
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full px-2 sm:px-0">
      {/* 1. HEADER INBOX HARMONIEUX */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md shadow-xs"
        data-tour="inbox-header"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-400/15 to-yellow-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-ink-950 dark:text-white tracking-tight">
                {t("inbox.title")}
              </h1>
              {todoCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {todoCount} action{todoCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
              {t("inbox.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SectionGuideTrigger section="messages" label="Guide de l'Inbox" />
          <Link
            href="/finances"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-200 dark:border-ink-700 bg-canvas dark:bg-ink-800 hover:bg-canvas-subtle dark:hover:bg-ink-700 text-xs font-semibold text-ink-700 dark:text-ink-200 transition-colors shadow-2xs"
          >
            <span>{t("inbox.finance_space_link")}</span>
            <ExternalLink className="w-3.5 h-3.5 text-ink-400" />
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t("inbox.sync_live")}</span>
          </span>
        </div>
      </div>

      {/* 2. ONGLETS DE NAVIGATION PRINCIPALE (À traiter / En attente / Historique) */}
      <div
        className="flex items-center gap-2 p-1.5 rounded-2xl bg-ink-100/80 dark:bg-ink-900/80 border border-ink-200/80 dark:border-ink-800/80 backdrop-blur-xs"
        data-tour="inbox-tabs"
      >
        <button
          type="button"
          onClick={() => setActiveTab("todo")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "todo"
              ? "bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-xs border border-ink-200/60 dark:border-ink-700"
              : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
          }`}
        >
          <AlertCircle className={`w-4 h-4 ${activeTab === "todo" ? "text-amber-500" : ""}`} />
          <span>{t("inbox.tab_todo")}</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              todoCount > 0
                ? "bg-rose-500 text-white"
                : "bg-ink-200 dark:bg-ink-700 text-ink-600 dark:text-ink-400"
            }`}
          >
            {todoCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "pending"
              ? "bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-xs border border-ink-200/60 dark:border-ink-700"
              : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
          }`}
        >
          <CalendarClock className={`w-4 h-4 ${activeTab === "pending" ? "text-signal" : ""}`} />
          <span>{t("inbox.tab_pending")}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-ink-200 dark:bg-ink-700 text-ink-600 dark:text-ink-400">
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-xs border border-ink-200/60 dark:border-ink-700"
              : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
          }`}
        >
          <CheckCheck className={`w-4 h-4 ${activeTab === "history" ? "text-emerald-500" : ""}`} />
          <span>{t("inbox.tab_history")}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-ink-200 dark:bg-ink-700 text-ink-600 dark:text-ink-400">
            {historyCount}
          </span>
        </button>
      </div>

      {/* 3. CARTES KPI RÉCAPITULATIVES DYNAMIQUES SELON L'ONGLET */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4" data-tour="inbox-kpis">
        {activeTab === "todo" && (
          <>
            <div className="p-4 rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                À encaisser (Revenus)
              </span>
              <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrencyLocale(totalIncomeTodo, activeCurrency, currentLocale)}
              </p>
              <p className="text-[11px] text-ink-400">
                {items.filter((i) => i.tab === "todo" && i.kind === "income").length} paiement(s) échu(s)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                À régler (Dépenses)
              </span>
              <p className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                {formatCurrencyLocale(totalExpenseTodo, activeCurrency, currentLocale)}
              </p>
              <p className="text-[11px] text-ink-400">
                {items.filter((i) => i.tab === "todo" && (i.kind === "expense" || i.kind === "scheduled_expense")).length} opération(s) à régler
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                Retards critiques
              </span>
              <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
                {totalOverdueCount} retard{totalOverdueCount > 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-ink-400">
                Nécessitent une action prioritaire
              </p>
            </div>
          </>
        )}

        {activeTab === "pending" && (
          <>
            <div className="p-4 rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                Revenus attendus
              </span>
              <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrencyLocale(totalIncomePending, activeCurrency, currentLocale)}
              </p>
              <p className="text-[11px] text-ink-400">
                Échéances futures confirmées
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                Dépenses prévues
              </span>
              <p className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                {formatCurrencyLocale(totalExpensePending, activeCurrency, currentLocale)}
              </p>
              <p className="text-[11px] text-ink-400">
                Charges et récurrences programmées
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                Volume en attente
              </span>
              <p className="text-lg sm:text-xl font-black text-signal">
                {pendingCount} échéance{pendingCount > 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-ink-400">
                Prêtes pour traitement anticipé
              </p>
            </div>
          </>
        )}

        {activeTab === "history" && (
          <>
            <div className="p-4 rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                Total encaissé
              </span>
              <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrencyLocale(totalIncomeHistory, activeCurrency, currentLocale)}
              </p>
              <p className="text-[11px] text-ink-400">
                Paiements reçus et validés
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                Total réglé
              </span>
              <p className="text-lg sm:text-xl font-black text-ink-800 dark:text-ink-200">
                {formatCurrencyLocale(totalExpenseHistory, activeCurrency, currentLocale)}
              </p>
              <p className="text-[11px] text-ink-400">
                Dépenses et échéances réglées
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                Opérations traitées
              </span>
              <p className="text-lg sm:text-xl font-black text-ink-900 dark:text-white">
                {historyCount}
              </p>
              <p className="text-[11px] text-ink-400">
                Historique hermétique et archivé
              </p>
            </div>
          </>
        )}
      </div>

      {/* 4. BARRE DE FILTRES ET RECHERCHE */}
      <div
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-canvas-raised dark:bg-ink-900 border border-ink-200/80 dark:border-ink-800 shadow-2xs"
        data-tour="inbox-filters"
      >
        {/* Filtres par type */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              typeFilter === "all"
                ? "bg-signal text-white"
                : "bg-canvas dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-canvas-subtle"
            }`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("income")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === "income"
                ? "bg-emerald-600 text-white"
                : "bg-canvas dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-canvas-subtle"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Revenus</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("expense")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === "expense"
                ? "bg-rose-600 text-white"
                : "bg-canvas dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-canvas-subtle"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Dépenses</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("scheduled_expense")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === "scheduled_expense"
                ? "bg-amber-600 text-white"
                : "bg-canvas dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-canvas-subtle"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Programmées</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("message")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === "message"
                ? "bg-sky-600 text-white"
                : "bg-canvas dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-canvas-subtle"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Messages & Bilans</span>
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-400" />
          <input
            type="text"
            placeholder="Rechercher par titre, libellé..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-canvas dark:bg-ink-950 border border-ink-200 dark:border-ink-800 text-ink-950 dark:text-white placeholder:text-ink-400 focus:outline-none focus:border-signal"
          />
        </div>
      </div>

      {/* 5. LISTE DES ÉLÉMENTS DE L'INBOX */}
      <div
        className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised dark:bg-ink-900 overflow-hidden shadow-sm divide-y divide-ink-100 dark:divide-ink-800/60"
        data-tour="inbox-list"
      >
        {currentTabItems.length === 0 ? (
          /* ÉTAT VIDE EXPLICITE ET VALORISANT */
          <div className="p-12 sm:p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-ink-900 dark:text-white">
              {search.trim()
                ? "Aucun élément ne correspond à votre recherche"
                : activeTab === "todo"
                ? "Tout est à jour dans votre Inbox !"
                : activeTab === "pending"
                ? "Aucune échéance future en attente"
                : "Votre historique est vide pour le moment"}
            </h3>
            <p className="text-xs text-ink-500 max-w-md mx-auto leading-relaxed">
              {activeTab === "todo"
                ? "Vous n'avez aucun paiement en retard, aucune dépense échue non réglée ni alerte urgente nécessitant votre intervention."
                : activeTab === "pending"
                ? "Les futurs revenus attendus et les prochaines échéances de dépenses apparaîtront ici."
                : "Toutes les opérations encaissées, dépenses réglées et communications archivées seront consultables ici."}
            </p>
          </div>
        ) : (
          currentTabItems.map((item) => {
            const isLoading = loadingActionId === item.id;
            const isAnyLoading = Boolean(loadingActionId);

            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="p-4 sm:p-5 hover:bg-canvas-subtle/50 dark:hover:bg-ink-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Côté gauche : Icône + Titre + Badges + Détails */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="mt-0.5 p-2 rounded-xl bg-ink-100 dark:bg-ink-800 border border-ink-200/80 dark:border-ink-700 shrink-0">
                    {getItemIcon(item.kind)}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-ink-950 dark:text-white truncate">
                        {item.title}
                      </h4>
                      {getStatusBadge(item.status, item.statusLabel)}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-ink-500 dark:text-ink-400">
                      {item.activityName && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-ink-100 dark:bg-ink-800 text-[11px] font-medium text-ink-700 dark:text-ink-300">
                          {item.activityColor && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: item.activityColor }}
                            />
                          )}
                          <span>{item.activityName}</span>
                        </span>
                      )}

                      {item.description && <span>{item.description}</span>}

                      {item.dueDate && (
                        <span className="inline-flex items-center gap-1 font-medium text-ink-600 dark:text-ink-300">
                          <Calendar className="w-3 h-3 text-ink-400" />
                          <span>
                            {item.status === "completed" && item.resolvedDate
                              ? `Réglé le ${formatDateLocale(item.resolvedDate, currentLocale)}`
                              : `Échéance : ${formatDateLocale(item.dueDate, currentLocale)}`}
                          </span>
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-ink-400 line-clamp-1 italic">
                        « {item.notes} »
                      </p>
                    )}
                  </div>
                </div>

                {/* Côté droit : Montant + Boutons d'action */}
                <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-ink-100 dark:border-ink-800">
                  {typeof item.amount === "number" && (
                    <div className="text-left sm:text-right">
                      <div
                        className={`text-base font-black ${
                          item.kind === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-ink-950 dark:text-white"
                        }`}
                      >
                        {item.kind === "income" ? "+" : "-"}
                        {formatCurrencyLocale(item.amount, item.currency || activeCurrency, currentLocale)}
                      </div>
                      <span className="text-[10px] text-ink-400 uppercase tracking-wider block">
                        {item.kind === "income"
                          ? "Revenu"
                          : item.kind === "scheduled_expense"
                          ? "Programmée"
                          : "Dépense"}
                      </span>
                    </div>
                  )}

                  {/* Boutons d'action contextuels et sécurisés */}
                  <div className="flex items-center gap-1.5">
                    {/* Action 1 : Revenu non encaissé */}
                    {item.kind === "income" && item.status !== "completed" && (
                      <>
                        <button
                          type="button"
                          disabled={isAnyLoading}
                          onClick={() => handleReceiveIncome(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Encaisser</span>
                        </button>

                        <button
                          type="button"
                          disabled={isAnyLoading}
                          onClick={() => handlePostponeIncome(item.id, 7)}
                          title="Reporter de 7 jours"
                          className="px-2.5 py-2 rounded-xl border border-ink-200 dark:border-ink-700 hover:bg-canvas-subtle dark:hover:bg-ink-800 text-xs font-semibold text-ink-600 dark:text-ink-300 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          +7j
                        </button>
                      </>
                    )}

                    {/* Action 2 : Dépense non réglée */}
                    {item.kind === "expense" && item.status !== "completed" && (
                      <button
                        type="button"
                        disabled={isAnyLoading}
                        onClick={() => handlePayExpense(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink-900 dark:bg-white text-white dark:text-ink-950 hover:bg-ink-800 dark:hover:bg-ink-100 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Régler</span>
                      </button>
                    )}

                    {/* Action 3 : Dépense programmée */}
                    {item.kind === "scheduled_expense" &&
                      item.status !== "completed" &&
                      item.status !== "cancelled" && (
                        <>
                          <button
                            type="button"
                            disabled={isAnyLoading}
                            onClick={() => handlePayScheduledExpense(item.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Repeat className="w-3.5 h-3.5" />
                            )}
                            <span>Régler l'échéance</span>
                          </button>

                          <button
                            type="button"
                            disabled={isAnyLoading}
                            onClick={() => handlePostponeScheduledExpense(item.id, 7)}
                            title="Reporter de 7 jours"
                            className="px-2.5 py-2 rounded-xl border border-ink-200 dark:border-ink-700 hover:bg-canvas-subtle dark:hover:bg-ink-800 text-xs font-semibold text-ink-600 dark:text-ink-300 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            +7j
                          </button>
                        </>
                      )}

                    {/* Action 4 : Message interne */}
                    {item.kind === "message" && (
                      <button
                        type="button"
                        onClick={() => setSelectedMessage(item)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-ink-200 dark:border-ink-700 hover:bg-canvas-subtle dark:hover:bg-ink-800 text-xs font-bold text-ink-800 dark:text-ink-200 transition-colors cursor-pointer"
                      >
                        <span>Consulter</span>
                        <ChevronRight className="w-3.5 h-3.5 text-ink-400" />
                      </button>
                    )}

                    {/* État résolu dans Historique */}
                    {item.status === "completed" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Enregistré</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. MODAL DE CONSULTATION D'UN MESSAGE OFFICIEL */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-ink-200 dark:border-ink-800 bg-canvas-raised dark:bg-ink-900 p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Mail className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-ink-950 dark:text-white">
                    {selectedMessage.sender || "Remind Me"}
                  </h3>
                  <span className="text-[11px] text-ink-400">
                    Reçu le {selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleDateString(currentLocale, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="p-1.5 rounded-xl text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black text-ink-950 dark:text-white leading-snug">
                {selectedMessage.title}
              </h2>
              <div className="p-4 rounded-2xl bg-canvas dark:bg-ink-950 border border-ink-100 dark:border-ink-800/80 text-sm text-ink-800 dark:text-ink-200 whitespace-pre-line leading-relaxed">
                {selectedMessage.body || "Aucun contenu textuel disponible."}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-400">
              <span className="inline-flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-signal" />
                <span>Communication certifiée Remind Me</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-1.5 rounded-xl bg-ink-900 dark:bg-white text-white dark:text-ink-950 font-bold hover:bg-ink-800 dark:hover:bg-ink-100 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
