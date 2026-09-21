import { DateTime } from "luxon";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { calculateProfitabilityReport } from "@/lib/reports/profitability";
import { formatAmount } from "@/lib/finances/format";
import { PeriodFilter } from "@/components/reports/period-filter";
import { ProfitabilityTable } from "@/components/reports/profitability-table";
import { CategoryBreakdown } from "@/components/reports/category-breakdown";
import { MonthlyEvolution } from "@/components/reports/monthly-evolution";
import { buttonClasses } from "@/components/ui/button";
import { getUserTimezone } from "@/lib/time/timezones";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  const timezone = getUserTimezone(profile);

  const defaultCurrency = profile?.default_currency ?? "XOF";
  const today = DateTime.now().setZone(timezone);
  const supabase = createClient();

  // Période par défaut : mois en cours (pour une concordance exacte avec le Tableau de bord et les Finances)
  const defaultStart = today.startOf("month").toISODate()!;
  const defaultEnd = today.endOf("month").toISODate()!;

  const rangeStart =
    searchParams?.from && DateTime.fromISO(searchParams.from).isValid
      ? searchParams.from
      : defaultStart;
  const rangeEnd =
    searchParams?.to && DateTime.fromISO(searchParams.to).isValid
      ? searchParams.to
      : defaultEnd;

  // Synchronisation paresseuse des revenus
  await ensureIncomeEntries(supabase, user!.id, rangeStart, rangeEnd);

  // Rapport complet de rentabilité & analytics
  const {
    profitabilityList,
    categoryBreakdown,
    monthlyEvolution,
    totalHoursWorked,
    totalIncomeReceived,
    totalIncomeExpected,
    totalExpensesPaid,
    totalExpensesPlanned,
    realNetBalance,
    otherCurrencies,
  } = await calculateProfitabilityReport(supabase, user!.id, rangeStart, rangeEnd, timezone, defaultCurrency);

  const averageHourlyRate =
    totalHoursWorked > 0 ? Math.round(realNetBalance / totalHoursWorked) : null;

  const extraReceivedStr =
    otherCurrencies && otherCurrencies.length > 0
      ? otherCurrencies.map((c) => `+ ${formatAmount(c.incomeReceived, c.currency)}`).join(", ")
      : null;

  return (
    <div className="space-y-8" data-tour="reports-container">
      {/* En-tête de page */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 flex items-center gap-2">
            <span className="bg-gradient-to-r from-gold to-gold-dark text-white p-1.5 rounded-xl shadow-gold-subtle inline-flex">
              <BarChart3 className="w-5 h-5" />
            </span>
            Rapports & Rentabilité
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Analysez la profitabilité réelle de vos activités, vos heures investies et vos flux de trésorerie.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={`/api/finances/export?from=${rangeStart}&to=${rangeEnd}`}
            className={buttonClasses("secondary", "sm")}
            data-tour="reports-export-btn"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Exporter CSV
          </a>
        </div>
      </div>

      {/* Sélecteur de période */}
      <PeriodFilter from={rangeStart} to={rangeEnd} />

      {/* Cartes KPI Synthèse */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="reports-kpi">
        <div className="rounded-2xl border border-ink-200 bg-canvas-raised p-5 shadow-xs hover:border-gold/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Revenus Reçus (Encaissés)
            </span>
            <TrendingUp className="w-4 h-4 text-gold-dark" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gold-dark dark:text-gold-light">
            {formatAmount(totalIncomeReceived, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {extraReceivedStr ? `(${extraReceivedStr}) · ` : ""}
            {totalIncomeExpected > 0 ? `+${formatAmount(totalIncomeExpected, defaultCurrency)} attendus` : "Aucun revenu en attente"}
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-canvas-raised p-5 shadow-xs hover:border-gold/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Dépenses Payées
            </span>
            <TrendingDown className="w-4 h-4 text-ink-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink-950">
            {formatAmount(totalExpensesPaid, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {totalExpensesPlanned > 0 ? `${formatAmount(totalExpensesPlanned, defaultCurrency)} prévues` : "Toutes payées"}
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-canvas-raised p-5 shadow-xs hover:border-gold/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Solde Réel (Net)
            </span>
            <Wallet className="w-4 h-4 text-positive" />
          </div>
          <p
            className={`mt-2 text-2xl font-extrabold ${
              realNetBalance >= 0 ? "text-positive" : "text-danger"
            }`}
          >
            {formatAmount(realNetBalance, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Reçus − Dépenses Payées</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-canvas-raised p-5 shadow-xs hover:border-gold/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Rentabilité Horaire
            </span>
            <Clock className="w-4 h-4 text-signal" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-extrabold text-ink-950">
            {averageHourlyRate !== null
              ? `${formatAmount(averageHourlyRate, defaultCurrency)}/h`
              : "Données insuffisantes"}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {totalHoursWorked > 0
              ? `Pour ${totalHoursWorked} h travaillées au total`
              : "Planifiez des séances dans le calendrier"}
          </p>
        </div>
      </div>

      {/* Section Stratégique : Rentabilité par Activité (§55) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink-950">
              Rentabilité & Revenu par Heure Investie
            </h2>
            <p className="text-sm text-ink-500">
              Identifiez quelles activités génèrent le plus de valeur par rapport au temps passé.
            </p>
          </div>
        </div>
        <ProfitabilityTable items={profitabilityList} />
      </div>

      {/* Deux colonnes : Répartition par catégorie & Évolution mensuelle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBreakdown items={categoryBreakdown} />
        <MonthlyEvolution items={monthlyEvolution} />
      </div>
    </div>
  );
}
