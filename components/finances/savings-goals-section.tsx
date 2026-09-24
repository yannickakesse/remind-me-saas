"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Target,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  TrendingUp,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import { SAVINGS_CATEGORIES } from "@/lib/validation/finances";
import { formatAmount } from "@/lib/finances/format";
import { calculateGoalProjection } from "@/lib/finances/goals";
import { useToast } from "@/components/ui/toast";
import {
  createSavingsGoal,
  updateSavingsGoal,
  adjustSavingsGoalAmount,
  deleteSavingsGoal,
} from "@/app/(app)/finances/actions";
import type { SavingsGoal, SavingsCategory } from "@/types/database";

interface SavingsGoalsSectionProps {
  goals: SavingsGoal[];
  currencies: { code: string; symbol: string }[];
  defaultCurrency: string;
}

export function SavingsGoalsSection({
  goals,
  currencies,
  defaultCurrency,
}: SavingsGoalsSectionProps) {
  const toast = useToast();
  const [localGoals, setLocalGoals] = useState<SavingsGoal[]>(goals);
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustMode, setAdjustMode] = useState<"add" | "withdraw">("add");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalGoals(goals);
  }, [goals]);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SavingsCategory>("emergency_fund");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [deadline, setDeadline] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");

  function resetForm() {
    setIsAdding(false);
    setEditingId(null);
    setAdjustingId(null);
    setName("");
    setTargetAmount("");
    setCurrentAmount("0");
    setDeadline("");
    setMonthlyContribution("");
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("targetAmount", targetAmount);
    formData.append("currentAmount", currentAmount);
    formData.append("currency", currency);
    formData.append("deadline", deadline);
    formData.append("monthlyContribution", monthlyContribution);

    const targetId = editingId;
    const targetAmtNum = Number(targetAmount);
    const currAmtNum = Number(currentAmount);

    startTransition(async () => {
      try {
        if (targetId) {
          setLocalGoals((prev) =>
            prev.map((g) =>
              g.id === targetId
                ? {
                    ...g,
                    name,
                    category,
                    target_amount: targetAmtNum,
                    current_amount: currAmtNum,
                    currency,
                    deadline: deadline || null,
                  }
                : g
            )
          );
          const res = await updateSavingsGoal(targetId, formData);
          if (res && !res.success) {
            setLocalGoals(goals);
            setError(res.error || "Impossible de modifier l'objectif.");
            toast.push(res.error || "Impossible de modifier l'objectif.", "error");
            return;
          }
          toast.push("Objectif d'épargne mis à jour.", "success");
        } else {
          const res = await createSavingsGoal(formData);
          if (res && !res.success) {
            setLocalGoals(goals);
            setError(res.error || "Impossible de créer l'objectif d'épargne.");
            toast.push(res.error || "Impossible de créer l'objectif d'épargne.", "error");
            return;
          }
          toast.push("Objectif d'épargne créé avec succès.", "success");
        }
        resetForm();
      } catch (err: any) {
        setLocalGoals(goals);
        const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'objectif.";
        setError(msg);
        toast.push(msg, "error");
      }
    });
  }

  function handleAdjustSubmit(goalId: string, current: number) {
    const val = Number(adjustAmount);
    if (!val || val <= 0) return;
    const delta = adjustMode === "add" ? val : -val;
    const newAmount = Math.max(0, current + delta);

    // Mise à jour optimiste immédiate (0ms)
    setLocalGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, current_amount: newAmount } : g))
    );
    setAdjustingId(null);
    setAdjustAmount("");

    startTransition(async () => {
      try {
        await adjustSavingsGoalAmount(goalId, delta);
        toast.push(
          delta > 0
            ? `+${val} ajoutés à votre objectif.`
            : `-${val} retirés de votre objectif.`,
          "success"
        );
      } catch (err) {
        setLocalGoals(goals);
        toast.push("Erreur lors de l'ajustement du solde.", "error");
      }
    });
  }

  function handleDelete(id: string) {
    if (confirm("Supprimer cette poche d'épargne ?")) {
      setLocalGoals((prev) => prev.filter((g) => g.id !== id));
      startTransition(async () => {
        try {
          await deleteSavingsGoal(id);
          toast.push("Poche d'épargne supprimée.", "info");
        } catch (err) {
          setLocalGoals(goals);
          toast.push("Erreur lors de la suppression.", "error");
        }
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-950">Objectifs & Poches d'Épargne</h2>
          <p className="text-sm text-ink-500">
            Constituez votre fonds d'urgence, préparez vos investissements ou financez vos projets futurs.
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
            + Créer un objectif
          </button>
        ) : null}
      </div>

      {/* Formulaire création/édition */}
      {isAdding || editingId ? (
        <form onSubmit={handleSave} className="rounded-xl border border-ink-200 bg-canvas-raised p-5 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-semibold text-ink-950">
            {editingId ? "Modifier l'objectif" : "Nouvel objectif d'épargne"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Nom du projet / poche</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Fonds de sécurité 6 mois"
                className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Type de projet</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SavingsCategory)}
                className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
              >
                {SAVINGS_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Montant Cible</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Ex : 2000000"
                className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Montant Actuel</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
              />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Date butoir (optionnel)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Épargne mensuelle prévue</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="Ex : 100000"
                className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-signal focus:outline-none"
              />
            </div>
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
              {isPending ? "Enregistrement..." : editingId ? "Mettre à jour" : "Créer l'objectif"}
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

      {/* Liste des objectifs */}
      {localGoals.length === 0 && !isAdding ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-canvas-raised/50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gold-soft text-gold-dark mb-3">
            <Coins className="h-6 w-6" />
          </div>
          <p className="font-semibold text-ink-950">Aucun objectif d'épargne pour l'instant</p>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">
            Créez des poches d'épargne dédiées pour visualiser votre progression et anticiper la réalisation de vos projets.
          </p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-gold-dark px-4 py-2 text-sm font-semibold text-white shadow-gold-subtle hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            Définir un premier objectif
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {localGoals.map((g) => {
            const proj = calculateGoalProjection(g);
            const isCompleted = proj.remainingAmount === 0;

            return (
              <div
                key={g.id}
                className={`rounded-xl border bg-canvas-raised p-5 transition-shadow hover:shadow-md ${
                  isCompleted ? "border-positive/40 bg-positive/[0.02]" : "border-ink-200 hover:border-gold/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-ink-950 text-base">{g.name}</h3>
                    <p className="text-xs text-ink-500">
                      Cible : {formatAmount(g.target_amount, g.currency)}
                      {g.deadline ? ` • Échéance : ${g.deadline}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(g.id);
                        setName(g.name);
                        setCategory(g.category);
                        setCurrency(g.currency);
                        setTargetAmount(String(g.target_amount));
                        setCurrentAmount(String(g.current_amount));
                        setDeadline(g.deadline ?? "");
                        setMonthlyContribution(g.monthly_contribution ? String(g.monthly_contribution) : "");
                        setIsAdding(false);
                      }}
                      className="rounded p-1.5 text-ink-500 hover:text-gold-dark hover:bg-gold-soft transition-colors"
                      title="Modifier"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(g.id)}
                      className="rounded p-1.5 text-ink-400 hover:text-danger hover:bg-danger-soft/50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progression & Montants */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-ink-950">
                        {formatAmount(g.current_amount, g.currency)}
                      </span>
                      <span className="text-xs text-ink-500 ml-1.5">épargnés</span>
                    </div>
                    <span className="font-bold text-sm text-gold-dark">
                      {proj.progressPercentage}%
                    </span>
                  </div>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isCompleted ? "bg-positive" : "bg-gradient-to-r from-gold to-gold-dark"
                      }`}
                      style={{ width: `${proj.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Projections et alertes intelligentes */}
                <div className="mt-3 text-xs text-ink-600 bg-canvas/70 rounded-lg p-2.5">
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-positive">
                      <CheckCircle2 className="h-4 w-4 text-positive" />
                      Objectif 100% atteint !
                    </span>
                  ) : proj.estimatedCompletionDate ? (
                    <div className="flex items-center justify-between">
                      <span>
                        Rythme : <strong>{formatAmount(g.monthly_contribution!, g.currency)}/mois</strong>
                      </span>
                      <span>
                        Atteinte estimée : <strong>{proj.estimatedCompletionDate}</strong>
                      </span>
                    </div>
                  ) : (
                    <span>
                      Reste à épargner : <strong>{formatAmount(proj.remainingAmount, g.currency)}</strong>
                    </span>
                  )}
                </div>

                {/* Ajustement rapide de solde (Dépôt / Retrait) */}
                <div className="mt-4 pt-3 border-t border-ink-100">
                  {adjustingId === g.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={adjustMode}
                        onChange={(e) => setAdjustMode(e.target.value as "add" | "withdraw")}
                        className="rounded-lg border border-ink-300 bg-canvas px-2.5 py-1.5 text-xs text-ink-950"
                      >
                        <option value="add">+ Ajouter</option>
                        <option value="withdraw">- Retirer</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="Montant"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        className="w-28 rounded-lg border border-ink-300 bg-canvas px-2.5 py-1.5 text-xs text-ink-950"
                      />
                      <button
                        type="button"
                        onClick={() => handleAdjustSubmit(g.id, Number(g.current_amount))}
                        className="rounded-lg bg-signal px-3 py-1.5 text-xs font-semibold text-white hover:bg-signal/90"
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustingId(null)}
                        className="text-xs text-ink-400 hover:text-ink-700"
                      >
                        Fermer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustingId(g.id);
                        setAdjustAmount("");
                      }}
                      className="text-xs font-medium text-signal hover:underline"
                    >
                      + / - Ajuster le solde de cette poche
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
