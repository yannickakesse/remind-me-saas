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

  return (
    <div className="space-y-3" data-tour="dashboard-kpi">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-signal/10 text-signal">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300">
            {t("nav.finances")} • Mois en cours
          </h2>
        </div>
        <Link
          href="/finances"
          className="text-xs font-semibold text-signal hover:underline flex items-center gap-0.5"
        >
          {t("dashboard.see_all")} <ArrowRight className="w-3 h-3" />
        </Link>
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
