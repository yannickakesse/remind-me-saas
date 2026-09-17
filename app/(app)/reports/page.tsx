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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  const timezone = profile?.timezone ?? "UTC";
  const defaultCurrency = profile?.default_currency ?? "XOF";
  const today = DateTime.now().setZone(timezone);
  const supabase = createClient();

  // Période par défaut : année civile en cours (YTD)
  const defaultStart = today.startOf("year").toISODate()!;
  const defaultEnd = today.endOf("year").toISODate()!;

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
  } = await calculateProfitabilityReport(supabase, user!.id, rangeStart, rangeEnd, timezone);

  // Totaux globaux
  const totalRevenue = profitabilityList.reduce((acc, curr) => acc + curr.totalIncome, 0);
  const totalExpenses = profitabilityList.reduce((acc, curr) => acc + curr.totalExpenses, 0);
  const netIncome = totalRevenue - totalExpenses;
  const averageHourlyRate =
    totalHoursWorked > 0 ? Math.round(netIncome / totalHoursWorked) : null;

  return (
    <div className="space-y-8">
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
            Analysez la profitabilité de vos activités, vos heures investies et vos flux de trésorerie.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={`/api/finances/export?from=${rangeStart}&to=${rangeEnd}`}
            className={buttonClasses("secondary", "sm")}
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Exporter CSV
          </a>
        </div>
      </div>

      {/* Sélecteur de période */}
      <PeriodFilter from={rangeStart} to={rangeEnd} />

      {/* Cartes KPI Synthèse */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-ink-200 bg-canvas-raised p-5 shadow-xs hover:border-gold/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Chiffre d'Affaires Total
            </span>
            <TrendingUp className="w-4 h-4 text-gold-dark" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gold-dark dark:text-gold-light">
            {formatAmount(totalRevenue, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Sur la période sélectionnée</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-canvas-raised p-5 shadow-xs hover:border-gold/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Frais & Dépenses Totales
            </span>
            <TrendingDown className="w-4 h-4 text-ink-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink-950">
            {formatAmount(totalExpenses, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Déductions directes & mixtes</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-canvas-raised p-5 shadow-xs hover:border-gold/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Bénéfice Net Réalisé
            </span>
            <Wallet className="w-4 h-4 text-positive" />
          </div>
          <p
            className={`mt-2 text-2xl font-extrabold ${
              netIncome >= 0 ? "text-positive" : "text-danger"
            }`}
          >
            {formatAmount(netIncome, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Revenus - Dépenses</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-canvas-raised p-5 shadow-xs hover:border-gold/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Rentabilité Horaire Moyenne
            </span>
            <Clock className="w-4 h-4 text-signal" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink-950">
            {averageHourlyRate !== null
              ? `${formatAmount(averageHourlyRate, defaultCurrency)}/h`
              : "—"}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Pour {totalHoursWorked} h travaillées au total
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
