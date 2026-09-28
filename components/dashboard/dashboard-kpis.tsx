"use client";

import { Clock, TrendingUp, TrendingDown, Wallet } from "lucide-react";
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full min-w-0" data-tour="dashboard-kpi">
      <StatCard
        label={t("dashboard.pending_payments")}
        value={formatAmount(incomeExpected, currency)}
        helper={t("dashboard.pending_payments_helper")}
        tone="warning"
        icon={Clock}
      />
      <StatCard
        label={t("dashboard.total_received")}
        value={formatAmount(incomeReceived, currency)}
        helper={t("dashboard.total_received_helper")}
        tone="positive"
        icon={TrendingUp}
      />
      <StatCard
        label={t("dashboard.expenses_paid")}
        value={formatAmount(expensesPaid, currency)}
        helper={t("dashboard.expenses_paid_helper")}
        tone="danger"
        icon={TrendingDown}
      />
      <StatCard
        label={t("dashboard.net_balance")}
        value={formatAmount(net, currency)}
        helper={t("dashboard.net_balance_helper")}
        tone={net >= 0 ? "positive" : "danger"}
        icon={Wallet}
      />
    </div>
  );
}
