"use client";

import Link from "next/link";
import { Plus, CheckSquare, TrendingDown, TrendingUp } from "lucide-react";
import { openQuickTransaction } from "@/components/finances/quick-transaction-modal";

export function QuickActions() {
  return (
    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
      {/* 1. Dépense rapide */}
      <button
        type="button"
        onClick={() => openQuickTransaction("expense")}
        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-2xs hover:shadow-sm tap-active cursor-pointer bg-rose-50/80 hover:bg-rose-100/90 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/40 min-h-[40px] group"
        title="Ajouter une dépense ponctuelle"
      >
        <div className="p-1 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-transform group-hover:scale-110">
          <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>
        <span>+ Dépense</span>
      </button>

      {/* 2. Revenu rapide */}
      <button
        type="button"
        onClick={() => openQuickTransaction("income")}
        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-2xs hover:shadow-sm tap-active cursor-pointer bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/40 min-h-[40px] group"
        title="Ajouter un revenu ou encaissement"
      >
        <div className="p-1 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110">
          <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>
        <span>+ Revenu</span>
      </button>

      {/* 3. Tâche rapide */}
      <Link
        href="/tasks/new"
        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-2xs hover:shadow-sm tap-active cursor-pointer bg-sky-50/80 hover:bg-sky-100/90 dark:bg-sky-950/30 dark:hover:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-900/40 min-h-[40px] group"
        title="Créer une nouvelle tâche"
      >
        <div className="p-1 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition-transform group-hover:scale-110">
          <CheckSquare className="w-3.5 h-3.5" strokeWidth={2.2} />
        </div>
        <span>+ Tâche</span>
      </Link>

      {/* 4. Activité / Mission (Signature Gold Pill) */}
      <Link
        href="/activities/new"
        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_4px_16px_rgba(217,119,6,0.25)] hover:shadow-[0_6px_20px_rgba(217,119,6,0.35)] tap-active cursor-pointer bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white min-h-[40px] group border border-amber-400/40"
        title="Créer une nouvelle activité ou mission"
      >
        <div className="p-0.5 rounded-md bg-white/20 transition-transform group-hover:rotate-90">
          <Plus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
        <span>+ Activité</span>
      </Link>
    </div>
  );
}

