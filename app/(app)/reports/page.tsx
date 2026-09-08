import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, default_currency")
    .eq("id", user!.id)
    .single();

  const timezone = profile?.timezone ?? "UTC";
  const defaultCurrency = profile?.default_currency ?? "XOF";
  const today = DateTime.now().setZone(timezone);

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
  await ensureIncomeEntries(supabase, user!.id, rangeStart, rangeEnd, timezone);

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
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">
            Rapports & Rentabilité
          </h1>
          <p className="text-sm text-ink-500">
            Analysez la profitabilité de vos activités, vos heures investies et vos flux de trésorerie.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={`/api/finances/export?from=${rangeStart}&to=${rangeEnd}`}
            className={buttonClasses("secondary", "sm")}
          >
            Exporter CSV
          </a>
        </div>
      </div>

      {/* Sélecteur de période */}
      <PeriodFilter from={rangeStart} to={rangeEnd} />

      {/* Cartes KPI Synthèse */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-ink-200 bg-canvas-raised p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Chiffre d'Affaires Total
          </span>
          <p className="mt-2 text-2xl font-extrabold text-signal">
            {formatAmount(totalRevenue, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Sur la période sélectionnée</p>
        </div>

        <div className="rounded-xl border border-ink-200 bg-canvas-raised p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Frais & Dépenses Totales
          </span>
          <p className="mt-2 text-2xl font-extrabold text-ink-950">
            {formatAmount(totalExpenses, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Déductions directes & mixtes</p>
        </div>

        <div className="rounded-xl border border-ink-200 bg-canvas-raised p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Bénéfice Net Réalisé
          </span>
          <p
            className={`mt-2 text-2xl font-extrabold ${
              netIncome >= 0 ? "text-positive" : "text-danger"
            }`}
          >
            {formatAmount(netIncome, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs text-ink-500">Revenus - Dépenses</p>
        </div>

        <div className="rounded-xl border border-ink-200 bg-canvas-raised p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Rentabilité Horaire Moyenne
          </span>
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
