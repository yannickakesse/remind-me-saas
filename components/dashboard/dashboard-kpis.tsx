"use client";

import Link from "next/link";
import { Clock, TrendingUp, TrendingDown, Wallet, ArrowRight } from "lucide-react";
import { formatAmount } from "@/lib/finances/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { useLanguage } from "@/components/i18n/language-provider";

interface DashboardKpisProps {
  incomeExpected: number;
  incomeReceived: number;
  expensesPaid: number;
  net: number;
  currency: string;
}

export function DashboardKpis({
  incomeExpected,
  incomeReceived,
  expensesPaid,
  net,
  currency,
}: DashboardKpisProps) {
  const { t } = useLanguage();

  const totalIncomeForecast = incomeReceived + incomeExpected;
  const collectionRate =
    totalIncomeForecast > 0
      ? Math.round((incomeReceived / totalIncomeForecast) * 100)
      : 0;

  return (
    <div className="space-y-3" data-tour="dashboard-kpi">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-signal/10 text-signal">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300">
              {t("nav.finances")} • Mois en cours
            </h2>
            <p className="text-[10px] text-ink-500">
              {collectionRate}% encaissé sur l&apos;objectif
            </p>
          </div>
        </div>
        <Link
          href="/finances"
          className="text-xs font-semibold text-signal hover:underline flex items-center gap-1 group"
        >
          <span>{t("dashboard.see_all")}</span>
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Mini jauge de complétion du mois */}
      <div className="p-3 rounded-2xl border border-ink-200/80 dark:border-white/10 bg-canvas-raised/80 dark:bg-slate-900/80 backdrop-blur-md shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-ink-600 dark:text-ink-400">Progression des encaissements</span>
          <span className="text-signal font-mono font-bold">{collectionRate}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-signal via-amber-500 to-emerald-500 transition-all duration-700 ease-out shadow-xs"
            style={{ width: `${Math.min(collectionRate, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 w-full min-w-0">
        {/* 1. Total Reçu (Réalisé) */}
        <StatCard
          label={t("dashboard.total_received")}
          value={formatAmount(incomeReceived, currency)}
          helper="Argent déjà perçu"
          badge="Réalisé"
          tone="positive"
          icon={TrendingUp}
        />

        {/* 2. Dépenses Payées (Réalisé) */}
        <StatCard
          label={t("dashboard.expenses_paid")}
          value={formatAmount(expensesPaid, currency)}
          helper="Charges réglées"
          badge="Réalisé"
          tone="danger"
          icon={TrendingDown}
        />

        {/* 3. Solde Net (Réalisé effectif) */}
        <StatCard
          label={t("dashboard.net_balance")}
          value={formatAmount(net, currency)}
          helper="Encaissé - Réglé"
          badge={net >= 0 ? "Bénéfice" : "Déficit"}
          tone={net >= 0 ? "positive" : "danger"}
          icon={Wallet}
        />

        {/* 4. Paiements en attente (Prévision / En attente) */}
        <StatCard
          label={t("dashboard.pending_payments")}
          value={formatAmount(incomeExpected, currency)}
          helper="Factures à encaisser"
          badge="En attente"
          tone="warning"
          icon={Clock}
        />
      </div>
    </div>
  );
}
