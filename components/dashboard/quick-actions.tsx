"use client";

import Link from "next/link";
import { Plus, CheckSquare, TrendingDown, TrendingUp } from "lucide-react";
import { openQuickTransaction } from "@/components/finances/quick-transaction-modal";

export function QuickActions() {
  return (
    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
      {/* 1. Dépense rapide */}
      <button
        type="button"
        onClick={() => openQuickTransaction("expense")}
        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 shadow-2xs tap-active cursor-pointer bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200/90 dark:border-rose-900/60 min-h-[42px]"
        title="Ajouter une dépense ponctuelle"
      >
        <TrendingDown className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" strokeWidth={2.5} />
        <span>+ Dépense</span>
      </button>

      {/* 2. Revenu rapide */}
      <button
        type="button"
        onClick={() => openQuickTransaction("income")}
        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 shadow-2xs tap-active cursor-pointer bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-900/60 min-h-[42px]"
        title="Ajouter un revenu ou encaissement"
      >
        <TrendingUp className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
        <span>+ Revenu</span>
      </button>

      {/* 3. Tâche rapide */}
      <Link
        href="/tasks/new"
        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 shadow-2xs tap-active cursor-pointer bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/90 dark:border-blue-900/60 min-h-[42px]"
        title="Créer une nouvelle tâche"
      >
        <CheckSquare className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" strokeWidth={2.2} />
        <span>+ Tâche</span>
      </Link>

      {/* 4. Activité / Séance */}
      <Link
        href="/activities/new"
        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 shadow-xs tap-active cursor-pointer bg-signal text-white hover:bg-signal-dark min-h-[42px]"
        title="Créer une nouvelle activité ou mission"
      >
        <Plus className="w-3.5 h-3.5 shrink-0 text-white" strokeWidth={2.8} />
        <span>+ Activité</span>
      </Link>
    </div>
  );
}

