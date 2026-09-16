"use client";

import { useState, useTransition, useEffect } from "react";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "@/lib/validation/finances";
import { formatAmount } from "@/lib/finances/format";
import { useToast } from "@/components/ui/toast";
import { createBudget, updateBudget, deleteBudget } from "@/app/(app)/finances/actions";
import type { Budget } from "@/types/database";

interface BudgetWithSpent extends Budget {
  spent: number;
}

interface BudgetsSectionProps {
  budgets: BudgetWithSpent[];
  currencies: { code: string; symbol: string }[];
  defaultCurrency: string;
}

export function BudgetsSection({
  budgets,
  currencies,
  defaultCurrency,
}: BudgetsSectionProps) {
  const toast = useToast();
  const [localBudgets, setLocalBudgets] = useState<BudgetWithSpent[]>(budgets);
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalBudgets(budgets);
  }, [budgets]);

  // Form State
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0].value);
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);

  function resetForm() {
    setIsAdding(false);
    setEditingId(null);
    setMonthlyLimit("");
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("category", category);
    formData.append("monthlyLimit", monthlyLimit);
    formData.append("currency", currency);

    const targetId = editingId;
    const limitNum = Number(monthlyLimit);

    startTransition(async () => {
      try {
        if (targetId) {
          setLocalBudgets((prev) =>
            prev.map((b) =>
              b.id === targetId ? { ...b, monthly_limit: limitNum, currency } : b
            )
          );
          await updateBudget(targetId, formData);
          toast.push("Budget mis à jour.", "success");
        } else {
          await createBudget(formData);
          toast.push("Budget créé avec succès.", "success");
        }
        resetForm();
      } catch (err) {
        setLocalBudgets(budgets);
        setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
        toast.push("Erreur lors de l'enregistrement du budget.", "error");
      }
    });
  }

  function handleDelete(id: string) {
    if (confirm("Supprimer ce budget mensuel ?")) {
      setLocalBudgets((prev) => prev.filter((b) => b.id !== id));
      startTransition(async () => {
        try {
          await deleteBudget(id);
          toast.push("Budget supprimé.", "info");
        } catch (err) {
          setLocalBudgets(budgets);
          toast.push("Erreur lors de la suppression.", "error");
        }
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-950">Budgets Mensuels</h2>
          <p className="text-sm text-ink-500">
            Définissez des plafonds de dépenses par catégorie pour garder le contrôle de vos coûts.
          </p>
        </div>

        {!isAdding && !editingId ? (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90 transition-colors"
          >
            + Définir un budget
          </button>
        ) : null}
      </div>

      {/* Formulaire d'ajout / édition */}
      {isAdding || editingId ? (
        <form onSubmit={handleSave} className="rounded-xl border border-ink-200 bg-canvas-raised p-5 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-semibold text-ink-950">
            {editingId ? "Modifier le budget" : "Nouveau budget mensuel"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={Boolean(editingId)}
                className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Devise</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={Boolean(editingId)}
                className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Plafond mensuel</label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="Ex : 150000"
              className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
            />
          </div>

          {error ? (
            <p className="text-xs font-medium text-danger">{error}</p>
          ) : null}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90 disabled:opacity-50"
            >
              {isPending ? "Enregistrement..." : editingId ? "Mettre à jour" : "Créer le budget"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      {/* Liste des budgets */}
      {localBudgets.length === 0 && !isAdding ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised/50 p-8 text-center">
          <p className="font-semibold text-ink-950">Aucun budget défini</p>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">
            Définissez des limites de dépenses mensuelles par catégorie (Logement, Déplacements, Logiciels, etc.) pour suivre votre consommation en direct.
          </p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-4 rounded-lg bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90"
          >
            + Créer mon premier budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localBudgets.map((b) => {
            const limit = Number(b.monthly_limit);
            const spent = Number(b.spent) || 0;
            const remaining = Math.max(0, limit - spent);
            const percentage = Math.round((spent / limit) * 100);

            const isExceeded = spent > limit;
            const isNearLimit = percentage >= 80 && !isExceeded;

            return (
              <div
                key={b.id}
                className={`rounded-xl border bg-canvas-raised p-5 transition-shadow hover:shadow-sm ${
                  isExceeded
                    ? "border-danger/40 bg-danger/[0.02]"
                    : isNearLimit
                    ? "border-warning/40 bg-warning/[0.02]"
                    : "border-ink-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-ink-950 text-base">
                      {expenseCategoryLabel(b.category)}
                    </span>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Plafond : {formatAmount(limit, b.currency)} / mois
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(b.id);
                        setCategory(b.category);
                        setCurrency(b.currency);
                        setMonthlyLimit(String(b.monthly_limit));
                        setIsAdding(false);
                      }}
                      className="rounded px-2 py-1 text-xs font-medium text-signal hover:bg-signal-soft"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-ink-400 hover:text-danger hover:bg-danger-soft/50"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-ink-700">
                      Dépensé : {formatAmount(spent, b.currency)}
                    </span>
                    <span
                      className={`font-semibold ${
                        isExceeded
                          ? "text-danger"
                          : isNearLimit
                          ? "text-warning"
                          : "text-positive"
                      }`}
                    >
                      {isExceeded
                        ? `Dépassement de ${formatAmount(spent - limit, b.currency)} (${percentage}%)`
                        : `Reste : ${formatAmount(remaining, b.currency)} (${percentage}% consommé)`}
                    </span>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isExceeded
                          ? "bg-danger"
                          : isNearLimit
                          ? "bg-warning"
                          : "bg-signal"
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
