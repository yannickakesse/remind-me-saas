"use client";


import { useLanguage } from "@/components/i18n/language-provider";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DateTime } from "luxon";
import { Plus, Clock, Check, Trash2, X, AlertCircle, Loader2, Calendar } from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import { scheduledStatusLabel, frequencyLabel } from "@/lib/validation/scheduled-expenses";
import { useToast } from "@/components/ui/toast";
import {
  createScheduledExpenseAction,
  deleteScheduledExpenseAction,
  markScheduledExpensePaidAction,
  cancelScheduledExpenseAction,
  postponeScheduledExpenseAction,
} from "@/app/(app)/finances/actions";

interface ScheduledExpenseItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  frequency: "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  status: "planned" | "due" | "paid" | "cancelled";
  merchant: string | null;
  payment_method: string | null;
  notes: string | null;
  activity_id: string | null;
}

interface Props {
  scheduledExpenses: ScheduledExpenseItem[];
  defaultCurrency: string;
  activities: Array<{ id: string; name: string }>;
}

export function ScheduledExpensesSection({
  scheduledExpenses,
  defaultCurrency,
  activities,
}: Props) {
  const { tr } = useLanguage();
  const toast = useToast();
  const [items, setItems] = useState<ScheduledExpenseItem[]>(scheduledExpenses);
  const [filter, setFilter] = useState<"all" | "planned" | "due" | "paid" | "cancelled">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expenseType, setExpenseType] = useState<"once" | "recurring">("once");
  const [recurringFrequency, setRecurringFrequency] = useState<string>("monthly");

  // Synchronisation avec les props serveur et ouverture automatique si action=new
  useEffect(() => {
    setItems(scheduledExpenses);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("action") === "new") {
        setIsModalOpen(true);
      }
    }
  }, [scheduledExpenses]);

  // Filtered list
  const filtered = items.filter((item) => {
    if (filter === "all") return item.status !== "cancelled";
    return item.status === filter;
  });

  // Calculate totals
  const totalPlannedThisMonth = items
    .filter((e) => e.status === "planned" || e.status === "due")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  async function handlePostpone(id: string) {
    if (actionLoadingId) return;
    setActionLoadingId(id);
    try {
      await postponeScheduledExpenseAction(id, 7);
      toast.push(tr("Échéance reportée de 7 jours."), "info");
    } catch (err) {
      toast.push(tr("Erreur lors du report de l'échéance."), "error");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleMarkPaid(id: string) {
    if (actionLoadingId) return;
    setActionLoadingId(id);

    // Mise à jour optimiste immédiate (0ms) en respectant la récurrence et la date de contrat
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (it.frequency === "once") return { ...it, status: "paid" as const };
        const curDT = DateTime.fromISO(it.next_due_date);
        let nextDT = curDT;
        if (it.frequency === "daily") nextDT = curDT.plus({ days: 1 });
        else if (it.frequency === "weekly") nextDT = curDT.plus({ weeks: 1 });
        else if (it.frequency === "monthly") nextDT = curDT.plus({ months: 1 });
        else if (it.frequency === "quarterly") nextDT = curDT.plus({ months: 3 });
        else if (it.frequency === "yearly") nextDT = curDT.plus({ years: 1 });
        const nextDueDateStr = nextDT.toISODate()!;
        if (it.end_date && nextDueDateStr > it.end_date) {
          return { ...it, status: "paid" as const };
        }
        return { ...it, next_due_date: nextDueDateStr, status: "planned" as const };
      })
    );

    try {
      await markScheduledExpensePaidAction(id);
      toast.push(tr("Dépense marquée comme payée et enregistrée."), "success");
    } catch (err) {
      // Rollback en cas d'erreur
      setItems(scheduledExpenses);
      toast.push(tr("Erreur lors de l'enregistrement du paiement."), "error");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(id: string) {
    if (actionLoadingId) return;
    if (confirm(tr("Voulez-vous vraiment annuler cette dépense programmée ?"))) {
      setActionLoadingId(id);

      // Mise à jour optimiste immédiate
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: "cancelled" as const } : it))
      );

      try {
        await cancelScheduledExpenseAction(id);
        toast.push(tr("Dépense programmée annulée."), "info");
      } catch (err) {
        setItems(scheduledExpenses);
        toast.push(tr("Erreur lors de l'annulation."), "error");
      } finally {
        setActionLoadingId(null);
      }
    }
  }

  async function handleDelete(id: string) {
    if (actionLoadingId) return;
    if (confirm(tr("Voulez-vous supprimer définitivement cette dépense programmée ?"))) {
      setActionLoadingId(id);

      // Suppression optimiste immédiate
      setItems((prev) => prev.filter((it) => it.id !== id));

      try {
        await deleteScheduledExpenseAction(id);
        toast.push(tr("Dépense programmée supprimée."), "info");
      } catch (err) {
        setItems(scheduledExpenses);
        toast.push(tr("Erreur lors de la suppression."), "error");
      } finally {
        setActionLoadingId(null);
      }
    }
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await createScheduledExpenseAction(formData);
      if (res && !res.success) {
        toast.push(res.error || "Erreur lors de la programmation de la dépense.", "error");
        return;
      }
      toast.push(tr("Dépense programmée avec succès."), "success");
      setIsModalOpen(false);
    } catch (err: any) {
      toast.push(err?.message || "Erreur lors de la programmation de la dépense.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with summary card and new button */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-200 dark:border-ink-800 bg-canvas-raised p-6 sm:p-7 shadow-xs">
        <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50 flex items-center justify-center sm:justify-start gap-2">
              <span className="p-1.5 rounded-xl bg-signal text-white shadow-xs">
                <Clock className="w-4 h-4" />
              </span>
              {tr("Dépenses Programmées & Récurrentes")}</h2>
            <p className="text-xs text-ink-500 mt-1">
              {tr("Planifiez vos charges régulières (loyers, abonnements, factures) et anticipez votre trésorerie.")}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-ink-500">{tr("Total prévisionnel :")}{" "}</span>
              <span className="font-bold text-sm text-ink-950 dark:text-ink-50">
                {formatAmount(totalPlannedThisMonth, defaultCurrency)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-signal text-white text-xs font-semibold hover:bg-signal/90 active:scale-95 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" /> {tr("Programmer une dépense")}</button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: "all", label: "Actives" },
          { id: "planned", label: "Planifiées" },
          { id: "due", label: "Échues" },
          { id: "paid", label: "Payées" },
          { id: "cancelled", label: "Annulées" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === tab.id
                ? "bg-signal text-white font-semibold"
                : "bg-canvas-raised border border-ink-200 text-ink-700 hover:bg-ink-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Expenses Cards List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-ink-300 dark:border-ink-800 bg-canvas-raised">
          <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <div className="font-bold text-sm text-ink-900 dark:text-ink-100">
            {filter === "cancelled" ? tr("Aucune dépense annulée") : tr("Aucune dépense programmée")}
          </div>
          <div className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
            {filter === "cancelled"
              ? tr("Toutes vos charges récurrentes sont actuellement actives, planifiées ou payées.")
              : tr("Programmez vos charges régulières (abonnements, électricité, internet, loyer) pour anticiper votre trésorerie.")}
          </div>
          {filter !== "cancelled" && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-signal text-white text-xs font-semibold active:scale-95 transition-transform"
            >
              {tr("Programmer maintenant")}</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filtered.map((item) => {
            const statusInfo = scheduledStatusLabel(item.status);
            const isLoading = actionLoadingId === item.id;
            const isCancelled = item.status === "cancelled";

            return (
              <div
                key={item.id}
                className={`relative overflow-hidden p-5 rounded-2xl border bg-canvas-raised shadow-xs flex flex-col justify-between space-y-4 hover:border-gold/40 transition-colors ${
                  isCancelled
                    ? "border-danger/40 bg-danger-soft/5 opacity-85"
                    : "border-ink-200 dark:border-ink-800"
                }`}
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-ink-950 dark:text-ink-50">{item.name}</h3>
                      <span className="text-[11px] text-ink-500">
                        {item.category} • {frequencyLabel(item.frequency)}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === "due"
                          ? "bg-warning-soft text-warning border border-warning/30"
                          : item.status === "paid"
                          ? "bg-positive-soft text-positive border border-positive/30"
                          : isCancelled
                          ? "bg-danger-soft text-danger border border-danger/40"
                          : "bg-signal-soft text-signal border border-signal/30"
                      }`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] text-ink-500 uppercase tracking-wider">{tr("Montant")}</div>
                      <div className="text-lg font-bold font-mono tabular-nums text-ink-950 dark:text-white">
                        {formatAmount(item.amount, item.currency)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-ink-500 uppercase tracking-wider">{tr("Prochaine échéance")}</div>
                      <div className="text-xs font-bold text-ink-900 dark:text-ink-100">
                        {item.next_due_date}
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mt-2 text-xs text-ink-600 bg-canvas p-2 rounded-lg italic">
                      "{item.notes}"
                    </div>
                  )}
                </div>

                {/* Actions bottom bar */}
                <div className="pt-3 border-t border-ink-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.status !== "paid" && item.status !== "cancelled" && (
                      <>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleMarkPaid(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{isLoading ? "Traitement..." : tr("Marquer payée")}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handlePostpone(item.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 bg-canvas dark:bg-ink-950 text-xs font-medium hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
                          title={tr("Reporter l'échéance de 7 jours")}
                        >
                          {isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{isLoading ? "Report..." : tr("Reporter (+7j)")}</span>
                        </button>
                      </>
                    )}

                    {item.status !== "cancelled" && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleCancel(item.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-600 text-xs font-medium hover:bg-ink-100 active:scale-95 disabled:opacity-50 transition-all"
                      >
                        {tr("Annuler")}</button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-danger hover:bg-danger-soft transition-colors"
                    title={tr("Supprimer")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-canvas-raised rounded-2xl p-6 shadow-2xl border border-ink-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-ink-200">
              <h3 className="font-bold text-base text-ink-950">{tr("Programmer une dépense")}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-400 hover:text-ink-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Choix Explicite : Dépense Occasionnelle vs Récurrente */}
              <div>
                <label className="block text-xs font-bold text-ink-700 mb-2">{tr("Type d'engagement financier *")}</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExpenseType("once")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      expenseType === "once"
                        ? "border-signal bg-signal-soft/30 ring-1 ring-signal text-ink-950 font-bold"
                        : "border-ink-200 bg-canvas text-ink-600 hover:bg-ink-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Calendar className="w-3.5 h-3.5 text-signal" />
                      <span>{tr("Dépense occasionnelle")}</span>
                    </div>
                    <p className="text-[10px] text-ink-500 mt-1 font-normal leading-tight">
                      {tr("Une seule fois à la date choisie, sans répétition automatique.")}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpenseType("recurring")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      expenseType === "recurring"
                        ? "border-signal bg-signal-soft/30 ring-1 ring-signal text-ink-950 font-bold"
                        : "border-ink-200 bg-canvas text-ink-600 hover:bg-ink-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-signal" />
                      <span>{tr("Dépense récurrente")}</span>
                    </div>
                    <p className="text-[10px] text-ink-500 mt-1 font-normal leading-tight">
                      {tr("Répétition périodique selon la fréquence choisie (loyer, facture...).")}</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">{tr("Nom / Description *")}</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder={expenseType === "once" ? tr("Ex: Réparation équipement, Achat ponctuel") : tr("Ex: Électricité, Loyer, Abonnement Internet")}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">{tr("Montant *")}</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="25000"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">{tr("Devise *")}</label>
                  <select
                    name="currency"
                    defaultValue={defaultCurrency}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                  >
                    <option value="XOF">{tr("XOF (FCFA)")}</option>
                    <option value="EUR">{tr("EUR (€)")}</option>
                    <option value="USD">{tr("USD ($)")}</option>
                    <option value="GBP">{tr("GBP (£)")}</option>
                    <option value="CAD">{tr("CAD ($)")}</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>

              <div className={`grid ${expenseType === "recurring" ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">{tr("Catégorie *")}</label>
                  <select
                    name="category"
                    required
                    defaultValue="utilities"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                  >
                    <option value="utilities">{tr("Électricité / Eau / Services")}</option>
                    <option value="housing">{tr("Logement / Loyer")}</option>
                    <option value="telecom">{tr("Internet / Télécom")}</option>
                    <option value="software">{tr("Logiciels & Abonnements")}</option>
                    <option value="transport">{tr("Transport / Carburant")}</option>
                    <option value="insurance">{tr("Assurance")}</option>
                    <option value="supplies">{tr("Fournitures & Équipement")}</option>
                    <option value="other">{tr("Autre charge")}</option>
                  </select>
                </div>

                {expenseType === "recurring" ? (
                  <div>
                    <label className="block text-xs font-bold text-ink-700 mb-1">{tr("Fréquence de répétition *")}</label>
                    <select
                      name="frequency"
                      required
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal font-semibold"
                    >
                      <option value="monthly">{tr("Mensuel")}</option>
                      <option value="weekly">{tr("Hebdomadaire")}</option>
                      <option value="quarterly">{tr("Trimestriel")}</option>
                      <option value="yearly">{tr("Annuel")}</option>
                    </select>
                  </div>
                ) : (
                  <input type="hidden" name="frequency" value="once" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">
                    {expenseType === "once" ? tr("Date de paiement *") : tr("1ère Échéance *")}
                  </label>
                  <input
                    name="nextDueDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">{tr("Activité associée")}</label>
                  <select
                    name="activityId"
                    defaultValue=""
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                  >
                    <option value="">{tr("(Aucune - Dépense générale)")}</option>
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">{tr("Notes / Référence")}</label>
                <input
                  name="notes"
                  type="text"
                  placeholder={tr("Ex: Compteur N° 45892, Prélèvement le 15")}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-700 hover:bg-ink-100 rounded-xl"
                >
                  {tr("Annuler")}</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-signal text-white text-xs font-bold shadow-xs active:scale-95 transition-transform disabled:opacity-50"
                >
                  {submitting ? "Enregistrement..." : tr("Enregistrer la dépense")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
