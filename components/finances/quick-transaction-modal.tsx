"use client";

import { useState, useEffect, useRef } from "react";
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

interface QuickTransactionModalProps {
  activities?: Array<{ id: string; name: string; color?: string | null }>;
  currencies?: Array<{ code: string; symbol: string }>;
  defaultCurrency?: string;
}

export function openQuickTransaction(type: QuickTransactionTab = "expense") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("remindme:open-quick-transaction", {
        detail: { type },
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
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isPaid, setIsPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [frequency, setFrequency] = useState("monthly");
  const [notes, setNotes] = useState("");

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Écoute de l'événement global pour ouvrir le modal
  useEffect(() => {
    function handleOpenEvent(e: Event) {
      const customEvent = e as CustomEvent<{ type?: QuickTransactionTab }>;
      if (customEvent.detail?.type) {
        setActiveTab(customEvent.detail.type);
      }
      setError(null);
      setAmount("");
      setLabel("");
      setNotes("");
      setDueDate(new Date().toISOString().slice(0, 10));
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
      setError("Veuillez renseigner un montant valide supérieur à 0.");
      return;
    }

    if (!label.trim()) {
      setError("Veuillez indiquer un libellé ou une description.");
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
            ? `Dépense de ${numAmount} ${currency} enregistrée et réglée.`
            : `Dépense de ${numAmount} ${currency} enregistrée (en attente).`,
          "success"
        );
      } else if (activeTab === "income") {
        // 2. Revenu
        const formData = new FormData();
        formData.append("amount", String(numAmount));
        formData.append("currency", currency);
        formData.append("label", label.trim());
        formData.append("dueDate", dueDate);
        formData.append("received", isPaid ? "true" : "false");
        formData.append("paymentMethod", paymentMethod);
        if (activityId) formData.append("activityId", activityId);
        if (notes.trim()) formData.append("notes", notes.trim());

        const result = await createQuickIncomeAction(formData);
        if (!result.success) {
          setError(result.error || "Erreur lors de l'enregistrement du revenu.");
          setSubmitting(false);
          return;
        }

        toast.push(
          isPaid
            ? `Revenu de ${numAmount} ${currency} encaissé.`
            : `Revenu de ${numAmount} ${currency} enregistré (en attente).`,
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
          `Dépense programmée (${frequency}) enregistrée avec succès.`,
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
              <span>Dépense</span>
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
              <span>Revenu</span>
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
              <span>Récurrente</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => !submitting && setIsOpen(false)}
            aria-label="Fermer"
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

          {/* CHAMP 1 : MONTANT & DEVISE (Hero Input) */}
          <div className="bg-canvas/80 dark:bg-ink-950/60 p-4 rounded-2xl border border-ink-200/80 dark:border-ink-800/80 space-y-2">
            <label htmlFor="quick-amount" className="block text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Montant de la transaction *
            </label>
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
                aria-label="Devise de la transaction"
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
              Libellé ou description *
            </label>
            <input
              id="quick-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                activeTab === "expense"
                  ? "Ex : Déjeuner d'affaires, Fournitures, Taxi, Carburant..."
                  : activeTab === "income"
                  ? "Ex : Acompte mission, Facture client, Coaching..."
                  : "Ex : Loyer bureau, Abonnement Figma, Électricité..."
              }
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal transition-colors min-h-[44px]"
            />
          </div>

          {/* CHAMP 3 : CATÉGORIE (Pour dépenses et récurrentes) */}
          {activeTab !== "income" && (
            <div>
              <label htmlFor="quick-category" className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
                Catégorie *
              </label>
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
                Fréquence de répétition *
              </label>
              <select
                id="quick-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal font-semibold min-h-[44px]"
              >
                <option value="monthly">Mensuelle (tous les mois)</option>
                <option value="weekly">Hebdomadaire (chaque semaine)</option>
                <option value="quarterly">Trimestrielle (tous les 3 mois)</option>
                <option value="yearly">Annuelle (une fois par an)</option>
                <option value="daily">Quotidienne (tous les jours)</option>
                <option value="once">Ponctuelle programmée</option>
              </select>
            </div>
          )}

          {/* CHAMP 5 : DATE & STATUT DE RÈGLEMENT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="quick-due-date" className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
                {activeTab === "scheduled" ? "Première échéance *" : "Date *"}
              </label>
              <input
                id="quick-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal min-h-[44px]"
              />
            </div>

            {activeTab !== "scheduled" && (
              <div>
                <label className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
                  Statut immédiat
                </label>
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
                        ? "✓ Payée (comptant)"
                        : "⏳ À régler plus tard"
                      : isPaid
                      ? "✓ Déjà encaissé"
                      : "⏳ En attente de paiement"}
                  </span>
                  <span className="text-[10px] underline uppercase tracking-wider">
                    {isPaid ? "Modifier" : "Modifier"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* CHAMP 6 : ACTIVITÉ LIÉE (Optionnel) */}
          <div>
            <label htmlFor="quick-activity" className="block text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
              Activité liée (optionnel)
            </label>
            <select
              id="quick-activity"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 text-ink-950 dark:text-white focus:outline-none focus:border-signal min-h-[44px]"
            >
              <option value="">Aucune — générale</option>
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
              Annuler
            </button>

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
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>
                  {activeTab === "expense"
                    ? "Enregistrer la dépense"
                    : activeTab === "income"
                    ? "Enregistrer le revenu"
                    : "Programmer la dépense"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
