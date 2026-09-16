"use client";

import { useState, useEffect } from "react";
import { Plus, Clock, Check, Trash2, X, AlertCircle, Loader2 } from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import { scheduledStatusLabel, frequencyLabel } from "@/lib/validation/scheduled-expenses";
import { useToast } from "@/components/ui/toast";
import {
  createScheduledExpenseAction,
  deleteScheduledExpenseAction,
  markScheduledExpensePaidAction,
  cancelScheduledExpenseAction,
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
  const toast = useToast();
  const [items, setItems] = useState<ScheduledExpenseItem[]>(scheduledExpenses);
  const [filter, setFilter] = useState<"all" | "planned" | "due" | "paid" | "cancelled">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Synchronisation avec les props serveur
  useEffect(() => {
    setItems(scheduledExpenses);
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

  async function handleMarkPaid(id: string) {
    if (actionLoadingId) return;
    setActionLoadingId(id);

    // Mise à jour optimiste immédiate (0ms)
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: "paid" as const } : it))
    );

    try {
      await markScheduledExpensePaidAction(id);
      toast.push("Dépense marquée comme payée et enregistrée.", "success");
    } catch (err) {
      // Rollback en cas d'erreur
      setItems(scheduledExpenses);
      toast.push("Erreur lors de l'enregistrement du paiement.", "error");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(id: string) {
    if (actionLoadingId) return;
    if (confirm("Voulez-vous vraiment annuler cette dépense programmée ?")) {
      setActionLoadingId(id);

      // Mise à jour optimiste immédiate
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: "cancelled" as const } : it))
      );

      try {
        await cancelScheduledExpenseAction(id);
        toast.push("Dépense programmée annulée.", "info");
      } catch (err) {
        setItems(scheduledExpenses);
        toast.push("Erreur lors de l'annulation.", "error");
      } finally {
        setActionLoadingId(null);
      }
    }
  }

  async function handleDelete(id: string) {
    if (actionLoadingId) return;
    if (confirm("Voulez-vous supprimer définitivement cette dépense programmée ?")) {
      setActionLoadingId(id);

      // Suppression optimiste immédiate
      setItems((prev) => prev.filter((it) => it.id !== id));

      try {
        await deleteScheduledExpenseAction(id);
        toast.push("Dépense programmée supprimée.", "info");
      } catch (err) {
        setItems(scheduledExpenses);
        toast.push("Erreur lors de la suppression.", "error");
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
      await createScheduledExpenseAction(formData);
      toast.push("Dépense programmée avec succès.", "success");
      setIsModalOpen(false);
    } catch (err) {
      toast.push("Erreur lors de la programmation de la dépense.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with summary card and new button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-ink-200 bg-canvas-raised shadow-xs">
        <div>
          <h2 className="text-base font-bold text-ink-950">Dépenses Programmées & Récurrentes</h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Planifiez vos loyers, abonnements, factures et suivez vos échéances futures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-ink-500">Total prévisionnel : </span>
            <span className="font-bold text-sm text-ink-950">
              {formatAmount(totalPlannedThisMonth, defaultCurrency)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-signal text-white text-xs font-semibold hover:bg-signal/90 active:scale-95 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" /> Programmer une dépense
          </button>
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
        <div className="p-8 text-center rounded-xl border border-dashed border-ink-300 bg-canvas-raised">
          <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <div className="font-bold text-sm text-ink-900">Aucune dépense programmée</div>
          <div className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
            Programmez vos charges régulières (abonnements, électricité, internet, loyer) pour anticiper votre trésorerie.
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-signal text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            Programmer maintenant
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const statusInfo = scheduledStatusLabel(item.status);
            const isLoading = actionLoadingId === item.id;

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-ink-200 bg-canvas-raised shadow-xs flex flex-col justify-between space-y-4 hover:border-gold/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-ink-950">{item.name}</h3>
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
                          : item.status === "cancelled"
                          ? "bg-danger-soft text-danger border border-danger/30"
                          : "bg-signal-soft text-signal border border-signal/30"
                      }`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] text-ink-500 uppercase tracking-wider">Montant</div>
                      <div className="text-lg font-bold text-ink-950">
                        {formatAmount(item.amount, item.currency)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-ink-500 uppercase tracking-wider">Prochaine échéance</div>
                      <div className="text-xs font-bold text-ink-900">
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
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleMarkPaid(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-positive text-white text-xs font-semibold hover:bg-positive/90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Marquer payée
                      </button>
                    )}

                    {item.status !== "cancelled" && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleCancel(item.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-600 text-xs font-medium hover:bg-ink-100 active:scale-95 disabled:opacity-50 transition-all"
                      >
                        Annuler
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-danger hover:bg-danger-soft transition-colors"
                    title="Supprimer"
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
              <h3 className="font-bold text-base text-ink-950">Programmer une dépense</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-400 hover:text-ink-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">Nom / Description *</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Ex: Électricité, Loyer, Abonnement Claude"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">Montant *</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="25000"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">Devise *</label>
                  <select
                    name="currency"
                    defaultValue={defaultCurrency}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                  >
                    <option value="XOF">XOF (FCFA)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">Catégorie *</label>
                  <select
                    name="category"
                    required
                    defaultValue="utilities"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                  >
                    <option value="utilities">Électricité / Eau / Services</option>
                    <option value="housing">Logement / Loyer</option>
                    <option value="telecom">Internet / Télécom</option>
                    <option value="software">Logiciels & Abonnements</option>
                    <option value="transport">Transport / Carburant</option>
                    <option value="insurance">Assurance</option>
                    <option value="supplies">Fournitures & Équipement</option>
                    <option value="other">Autre charge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">Fréquence *</label>
                  <select
                    name="frequency"
                    required
                    defaultValue="monthly"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                  >
                    <option value="monthly">Mensuel</option>
                    <option value="once">Une seule fois</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="quarterly">Trimestriel</option>
                    <option value="yearly">Annuel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">1ère Échéance *</label>
                  <input
                    name="nextDueDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-700 mb-1">Activité associée</label>
                  <select
                    name="activityId"
                    defaultValue=""
                    className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                  >
                    <option value="">(Aucune - Dépense générale)</option>
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">Notes / Référence</label>
                <input
                  name="notes"
                  type="text"
                  placeholder="Ex: Compteur N° 45892, Prélèvement le 15"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-ink-300 bg-canvas text-ink-950 focus:outline-none focus:border-signal"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-700 hover:bg-ink-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-signal text-white text-xs font-bold shadow-xs active:scale-95 transition-transform disabled:opacity-50"
                >
                  {submitting ? "Enregistrement..." : "Enregistrer la dépense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
