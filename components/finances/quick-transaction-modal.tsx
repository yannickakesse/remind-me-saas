"use client";


import { useLanguage } from "@/components/i18n/language-provider";
import { useState, useEffect, useRef } from "react";
import { EXCEPTIONAL_INCOME_CATEGORIES, exceptionalCategory, type ExceptionalIncomeCategory } from "@/lib/finances/income-kinds";
import { useRouter } from "next/navigation";
import {
  X,
  TrendingDown,
  TrendingUp,
  Clock,
  Loader2,
  Calendar,
  Wallet,
  Tag,
  Briefcase,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/validation/finances";
import {
  createQuickExpenseAction,
  createQuickIncomeAction,
  createScheduledExpenseAction,
} from "@/app/(app)/finances/actions";
import { useToast } from "@/components/ui/toast";

export type QuickTransactionTab = "expense" | "income" | "scheduled";
export type IncomeMode = "regular" | "exceptional";

/** Date du jour sur l'appareil (évite le décalage d'un jour lié à l'heure UTC). */
function localTodayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

interface QuickTransactionModalProps {
  activities?: Array<{ id: string; name: string; color?: string | null }>;
  currencies?: Array<{ code: string; symbol: string }>;
  defaultCurrency?: string;
}

export function openQuickTransaction(type: QuickTransactionTab = "expense", incomeMode: IncomeMode = "regular") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("remindme:open-quick-transaction", {
        detail: { type, incomeMode },
      })
    );
  }
}

export function QuickTransactionModal({
  activities = [],
  currencies = [
    { code: "XOF", symbol: "FCFA" },
    { code: "EUR", symbol: "€" },
    { code: "USD", symbol: "$" },
    { code: "GBP", symbol: "£" },
    { code: "CAD", symbol: "$" },
    { code: "CHF", symbol: "CHF" },
  ],
  defaultCurrency = "XOF",
}: QuickTransactionModalProps) {
  const { tr } = useLanguage();
  const router = useRouter();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickTransactionTab>("expense");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Valeurs par défaut du formulaire
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("other");
  const [activityId, setActivityId] = useState("");
  const [dueDate, setDueDate] = useState(() => localTodayISO());
  const [isPaid, setIsPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [frequency, setFrequency] = useState("monthly");
  const [notes, setNotes] = useState("");
  const [incomeMode, setIncomeMode] = useState<IncomeMode>("regular");
  const [exceptionalType, setExceptionalType] = useState<ExceptionalIncomeCategory>("windfall");
  const [source, setSource] = useState("");

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Écoute de l'événement global pour ouvrir le modal
  useEffect(() => {
    function handleOpenEvent(e: Event) {
      const customEvent = e as CustomEvent<{ type?: QuickTransactionTab; incomeMode?: IncomeMode }>;
      if (customEvent.detail?.type) {
        setActiveTab(customEvent.detail.type);
      }
      setIncomeMode(customEvent.detail?.incomeMode ?? "regular");
      setExceptionalType("windfall");
      setSource("");
      setError(null);
      setAmount("");
      setLabel("");
      setNotes("");
      setDueDate(localTodayISO());
      setIsPaid(true);
      setIsOpen(true);
    }

    window.addEventListener("remindme:open-quick-transaction", handleOpenEvent);
    return () => {
      window.removeEventListener("remindme:open-quick-transaction", handleOpenEvent);
    };
  }, []);

  // Focus automatique sur le montant à l'ouverture
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  // Fermeture par touche Echap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !submitting) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting]);

  // Empêcher le scroll d'arrière-plan quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const numAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(tr("Veuillez renseigner un montant valide supérieur à 0."));
      return;
    }

    // Revenu exceptionnel : libellé automatique « Catégorie — provenance » si non saisi
    const exceptionalLabel = [tr(exceptionalCategory(exceptionalType)?.label ?? ""), source.trim()].filter(Boolean).join(" — ");
    const finalLabel = label.trim() || (activeTab === "income" && incomeMode === "exceptional" ? exceptionalLabel : "");
    if (!finalLabel) {
      setError(tr("Veuillez indiquer un libellé ou une description."));
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      if (activeTab === "expense") {
        // 1. Dépense ponctuelle
        const formData = new FormData();
        formData.append("amount", String(numAmount));
        formData.append("currency", currency);
        formData.append("label", label.trim());
        formData.append("category", category);
        formData.append("dueDate", dueDate);
        formData.append("paid", isPaid ? "true" : "false");
        formData.append("paymentMethod", paymentMethod);
        if (activityId) formData.append("activityId", activityId);
        if (notes.trim()) formData.append("notes", notes.trim());

        const result = await createQuickExpenseAction(formData);
        if (!result.success) {
          setError(result.error || "Erreur lors de l'enregistrement de la dépense.");
          setSubmitting(false);
          return;
        }

        toast.push(
          isPaid
            ? tr("Dépense de {numAmount} {currency} enregistrée et réglée.", { numAmount, currency })
            : tr("Dépense de {numAmount} {currency} enregistrée (en attente).", { numAmount, currency }),
          "success"
        );
      } else if (activeTab === "income") {
        // 2. Revenu (habituel ou exceptionnel)
        const exceptional = incomeMode === "exceptional";
        const formData = new FormData();
        formData.append("amount", String(numAmount));
        formData.append("currency", currency);
        formData.append("label", finalLabel);
        formData.append("dueDate", dueDate);
        formData.append("received", isPaid ? "true" : "false");
        formData.append("paymentMethod", paymentMethod);
        if (exceptional) {
          // Catégorie choisie, envoyée telle quelle (jamais remplacée par une autre)
          formData.append("incomeType", exceptionalType);
          if (source.trim()) formData.append("reference", source.trim());
        } else if (activityId) {
          formData.append("activityId", activityId);
        }
        if (notes.trim()) formData.append("notes", notes.trim());

        const result = await createQuickIncomeAction(formData);
        if (!result.success) {
          setError(result.error || "Erreur lors de l'enregistrement du revenu.");
          setSubmitting(false);
          return;
        }

        toast.push(
          isPaid
            ? tr("Revenu de {numAmount} {currency} encaissé.", { numAmount, currency })
            : tr("Revenu de {numAmount} {currency} enregistré (en attente).", { numAmount, currency }),
          "success"
        );
      } else if (activeTab === "scheduled") {
        // 3. Dépense récurrente programmée
        const formData = new FormData();
        formData.append("name", label.trim());
        formData.append("amount", String(numAmount));
        formData.append("currency", currency);
        formData.append("category", category);
        formData.append("frequency", frequency);
        formData.append("nextDueDate", dueDate);
        if (activityId) formData.append("activityId", activityId);
        if (notes.trim()) formData.append("notes", notes.trim());

        const result = await createScheduledExpenseAction(formData);
        if (!result.success) {
          setError(result.error || "Erreur lors de la programmation de la dépense.");
          setSubmitting(false);
          return;
        }

        toast.push(
          tr("Dépense programmée ({frequency}) enregistrée avec succès.", { frequency }),
          "success"
        );
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error("Erreur soumission transaction rapide :", err);
      setError(err?.message || "Une erreur inattendue est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div
        className="fixed inset-0 bg-transparent"
        onClick={() => !submitting && setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Container */}
      <div className="relative z-10 w-full sm:max-w-lg bg-canvas-raised dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-ink-200/90 dark:border-ink-800/90 shadow-2xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 duration-200">
        {/* Mobile Drag Indicator */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-ink-300 dark:bg-ink-700" />
        </div>

        {/* Modal Header */}
        <div className="px-5 pt-3 pb-3 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-ink-100 dark:bg-ink-950/80 rounded-2xl w-full max-w-[360px]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("expense");
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "expense"
                  ? "bg-danger text-white shadow-xs"
                  : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{tr("Dépense")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("income");
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "income"
                  ? "bg-positive text-white shadow-xs"
                  : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{tr("Revenu")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("scheduled");
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "scheduled"
                  ? "bg-signal text-white shadow-xs"
                  : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{tr("Récurrente")}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => !submitting && setIsOpen(false)}
            aria-label={tr("Fermer")}
            className="p-2 rounded-xl text-ink-400 hover:text-ink-700 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-danger-soft text-danger text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Revenu habituel / exceptionnel */}
          {activeTab === "income" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-ink-100 dark:bg-slate-800 p-1">
                {(["regular", "exceptional"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setIncomeMode(m);
                      setError(null);
                    }}
                    className={`rounded-xl py-2 text-xs font-bold transition-all ${
                      incomeMode === m ? "bg-canvas-raised dark:bg-slate-950 text-ink-950 dark:text-white shadow-xs" : "text-ink-600 dark:text-ink-300"
                    }`}
                  >
                    {m === "regular" ? tr("Revenu habituel") : tr("Revenu exceptionnel")}
                  </button>
                ))}
              </div>

              {incomeMode === "exceptional" && (
                <>
                  <p className="text-center text-xs text-ink-600 dark:text-ink-300">
                    {tr("Une somme imprévue ? Enregistrez-la ici, sans créer d'activité ni de tâche.")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={tr("Catégorie du revenu")}>
                    {EXCEPTIONAL_INCOME_CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        role="radio"
                        aria-checked={exceptionalType === c.value}
                        onClick={() => setExceptionalType(c.value)}
                        className={`flex flex-col items-center gap-0.5 rounded-2xl border p-2.5 text-center transition-all ${
                          exceptionalType === c.value
                            ? "border-positive bg-positive/10 ring-1 ring-positive/40"
                            : "border-ink-200 dark:border-white/10 bg-canvas dark:bg-slate-950/60"
                        }`}
                      >
                        <span className="text-lg" aria-hidden="true">{c.emoji}</span>
                        <span className="text-[11px] font-bold leading-tight text-ink-950 dark:text-white">{tr(c.label)}</span>
                        <span className="text-[10px] leading-tight text-ink-500">{tr(c.hint)}</span>
                      </button>
                    ))}
                  </div>
                  {exceptionalType === "refund" && (
                    <p className="rounded-xl bg-sky-500/10 p-2.5 text-[11px] text-sky-800 dark:text-sky-200">
                      {tr("Un remboursement n'est pas un gain : il sera compté dans vos encaissements mais affiché à part dans les rapports.")}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* CHAMP 1 : MONTANT & DEVISE (Hero Input) */}
          <div className="bg-canvas/80 dark:bg-ink-950/60 p-4 rounded-2xl border border-ink-200/80 dark:border-ink-800/80 space-y-2">
            <label htmlFor="quick-amount" className="block text-[11px] font-bold uppercase tracking-wider text-ink-500">
              {tr("Montant de la transaction *")}</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={amountInputRef}
                  id="quick-amount"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full text-3xl font-extrabold text-ink-950 dark:text-white bg-transparent border-none p-0 focus:outline-none focus:ring-0 placeholder:text-ink-300 dark:placeholder:text-ink-700 tracking-tight"
                />
              </div>

              <select
                aria-label={tr("Devise de la transaction")}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas-raised dark:bg-ink-900 text-xs font-extrabold text-ink-900 dark:text-ink-100 focus:outline-none focus:border-signal shrink-0 shadow-2xs"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CHAMP 2 : LIBELLÉ / DESCRIPTION */}
          <div>
            <label htmlFor="quick-label" className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
              {activeTab === "income" && incomeMode === "exceptional" ? tr("Libellé (facultatif)") : tr("Libellé ou description *")}</label>
            <input
              id="quick-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                activeTab === "expense"
                  ? tr("Ex : Déjeuner d'affaires, Fournitures, Taxi, Carburant...")
                  : activeTab === "income" && incomeMode === "exceptional"
                  ? tr("Rempli automatiquement si vous le laissez vide")
                  : activeTab === "income"
                  ? tr("Ex : Acompte mission, Facture client, Coaching...")
                  : tr("Ex : Loyer bureau, Abonnement Figma, Électricité...")
              }
              required={!(activeTab === "income" && incomeMode === "exceptional")}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal transition-colors min-h-[44px]"
            />
          </div>

          {/* Provenance et note (revenu exceptionnel) */}
          {activeTab === "income" && incomeMode === "exceptional" && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label htmlFor="quick-source" className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
                  {tr("Provenance (facultatif)")}
                </label>
                <input
                  id="quick-source"
                  type="text"
                  maxLength={160}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder={tr("Ex : employeur, famille, poche d'une veste…")}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="quick-notes" className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
                  {tr("Note (facultatif)")}
                </label>
                <textarea
                  id="quick-notes"
                  rows={2}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal"
                />
              </div>
              <p className="text-[11px] text-ink-500">
                {tr("Un transfert entre vos propres comptes n'est pas un revenu : ne l'enregistrez pas ici.")}
              </p>
            </div>
          )}

          {/* CHAMP 3 : CATÉGORIE (Pour dépenses et récurrentes) */}
          {activeTab !== "income" && (
            <div>
              <label htmlFor="quick-category" className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
                {tr("Catégorie *")}</label>
              <select
                id="quick-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal transition-colors min-h-[44px]"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CHAMP 4 : FRÉQUENCE (Uniquement pour dépense récurrente) */}
          {activeTab === "scheduled" && (
            <div>
              <label htmlFor="quick-frequency" className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
                {tr("Fréquence de répétition *")}</label>
              <select
                id="quick-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal font-semibold min-h-[44px]"
              >
                <option value="monthly">{tr("Mensuelle (tous les mois)")}</option>
                <option value="weekly">{tr("Hebdomadaire (chaque semaine)")}</option>
                <option value="quarterly">{tr("Trimestrielle (tous les 3 mois)")}</option>
                <option value="yearly">{tr("Annuelle (une fois par an)")}</option>
                <option value="daily">{tr("Quotidienne (tous les jours)")}</option>
                <option value="once">{tr("Ponctuelle programmée")}</option>
              </select>
            </div>
          )}

          {/* CHAMP 5 : DATE & STATUT DE RÈGLEMENT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="quick-due-date" className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
                {activeTab === "scheduled"
                  ? tr("Première échéance *")
                  : activeTab === "income" && incomeMode === "exceptional"
                  ? isPaid
                    ? tr("Date de réception *")
                    : tr("Date prévue *")
                  : tr("Date *")}
              </label>
              <input
                id="quick-due-date"
                type="date"
                value={dueDate}
                max={activeTab === "income" && incomeMode === "exceptional" && isPaid ? localTodayISO() : undefined}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal min-h-[44px]"
              />
            </div>

            {activeTab !== "scheduled" && (
              <div>
                <label className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
                  {tr("Statut immédiat")}</label>
                <button
                  type="button"
                  onClick={() => setIsPaid(!isPaid)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                    isPaid
                      ? "bg-positive-soft border-positive/40 text-positive dark:bg-positive/20"
                      : "bg-warning-soft border-warning/40 text-warning dark:bg-warning/20"
                  }`}
                >
                  <span>
                    {activeTab === "expense"
                      ? isPaid
                        ? tr("✓ Payée (comptant)")
                        : tr("⏳ À régler plus tard")
                      : isPaid
                      ? tr("✓ Déjà encaissé")
                      : tr("⏳ En attente de paiement")}
                  </span>
                  <span className="text-[10px] underline uppercase tracking-wider">
                    {isPaid ? "Modifier" : "Modifier"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* CHAMP 6 : ACTIVITÉ LIÉE (Optionnel) — sans objet pour un revenu exceptionnel */}
          <div className={activeTab === "income" && incomeMode === "exceptional" ? "hidden" : undefined}>
            <label htmlFor="quick-activity" className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
              {tr("Activité liée (optionnel)")}</label>
            <select
              id="quick-activity"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal min-h-[44px]"
            >
              <option value="">{tr("Aucune — générale")}</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Modal Footer / Actions */}
          <div className="pt-3 border-t border-ink-100 dark:border-ink-800 flex items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsOpen(false)}
              className="flex-1 py-3 px-4 rounded-xl border border-ink-300 dark:border-ink-700 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors min-h-[46px]"
            >
              {tr("Annuler")}</button>

            <button
              type="submit"
              disabled={submitting}
              className={`flex-2 py-3 px-4 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 min-h-[46px] ${
                activeTab === "expense"
                  ? "bg-danger hover:bg-danger/90 active:scale-98"
                  : activeTab === "income"
                  ? "bg-positive hover:bg-positive/90 active:scale-98"
                  : "bg-signal hover:bg-signal/90 active:scale-98"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{tr("Enregistrement...")}</span>
                </>
              ) : (
                <span>
                  {activeTab === "expense"
                    ? tr("Enregistrer la dépense")
                    : activeTab === "income" && incomeMode === "exceptional"
                    ? tr("Enregistrer le revenu exceptionnel")
                    : activeTab === "income"
                    ? tr("Enregistrer le revenu")
                    : tr("Programmer la dépense")}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
