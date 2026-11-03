import { getTr } from "@/lib/i18n/server";
import { PageBackground } from "@/components/shared/page-background";
import { DateTime } from "luxon";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Download,
  Printer,
  Lock,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
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
import { getUserSubscription } from "@/lib/subscriptions/server";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const tr = await getTr();
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  const timezone = getUserTimezone(profile);
  const defaultCurrency = profile?.default_currency ?? "XOF";
  const today = DateTime.now().setZone(timezone);
  const supabase = createClient();

  const userSub = await getUserSubscription(supabase, user!.id);
  const hasHourlyProfitability = userSub.entitlements.hourlyProfitability;

  // Période par défaut : mois en cours
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

  const endDT = DateTime.fromISO(rangeEnd, { zone: timezone });
  const sixMonthsStart = endDT.minus({ months: 5 }).startOf("month").toISODate()!;
  const accountStart = user?.created_at
    ? DateTime.fromISO(user.created_at, { zone: timezone }).startOf("month").toISODate()!
    : null;
  const earliest = rangeStart < sixMonthsStart ? rangeStart : sixMonthsStart;
  const syncStart = accountStart && earliest < accountStart ? accountStart : earliest;

  // Synchronisation paresseuse des revenus sur la période demandée et l'historique des 6 derniers mois
  await ensureIncomeEntries(supabase, user!.id, syncStart, rangeEnd);

  // Rapport complet de rentabilité & analytics
  const {
    profitabilityList,
    categoryBreakdown,
    incomeBreakdown,
    monthlyEvolution,
    totalHoursWorked,
    totalIncomeReceived,
    totalIncomeExpected,
    totalExpensesPaid,
    totalExpensesPlanned,
    realNetBalance,
    otherCurrencies,
  } = await calculateProfitabilityReport(supabase, user!.id, rangeStart, rangeEnd, timezone, defaultCurrency, user!.created_at);

  const averageHourlyRate =
    totalHoursWorked > 0 ? Math.round(realNetBalance / totalHoursWorked) : null;

  const extraReceivedStr =
    otherCurrencies && otherCurrencies.length > 0
      ? otherCurrencies.map((c) => `+ ${formatAmount(c.incomeReceived, c.currency)}`).join(", ")
      : null;

  const isDeficit = realNetBalance < 0 || (totalExpensesPaid > totalIncomeReceived && totalIncomeReceived > 0);

  return (
    <div className="relative isolate min-h-full w-full space-y-8" data-tour="reports-container">
      <PageBackground src="/images/backgrounds/reports-bg.jpg" />

      {/* En-tête de page */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md p-6 sm:p-8 shadow-xs">

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50 flex items-center gap-2.5">
              <span className="bg-gradient-to-r from-gold to-gold-dark text-white p-2 rounded-xl shadow-gold-subtle inline-flex">
                <BarChart3 className="w-5 h-5" />
              </span>
              {tr("Rapports & Rentabilité")}</h1>
            <p className="text-sm text-ink-500 mt-1 max-w-xl">
              {tr("Analysez la profitabilité réelle de vos activités, vos heures investies et vos flux de trésorerie.")}</p>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-3 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
            <SectionGuideTrigger section="reports" label={tr("Guide rentabilité")} />
            <Link
              href={`/reports/print?from=${rangeStart}&to=${rangeEnd}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 rounded-xl bg-signal text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-signal-dark active:scale-95 transition-all flex-1 sm:flex-initial min-w-[150px] text-center"
              data-tour="reports-pdf-btn"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>{tr("Imprimer en PDF")}</span>
            </Link>
            <a
              href={`/api/finances/export?from=${rangeStart}&to=${rangeEnd}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 rounded-xl bg-canvas border border-ink-300 dark:border-ink-700 text-ink-900 dark:text-ink-100 hover:bg-ink-100 dark:hover:bg-ink-800 text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all flex-1 sm:flex-initial min-w-[150px] text-center"
              data-tour="reports-export-btn"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{tr("Exporter en CSV")}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Sélecteur de période */}
      <PeriodFilter from={rangeStart} to={rangeEnd} />

      {/* Bannière d'information / alerte si dépenses dépassent les revenus encaissés */}
      {isDeficit && totalIncomeReceived > 0 && (
        <div className="rounded-2xl border border-danger/40 bg-gradient-to-r from-danger-soft/50 via-danger-soft/20 to-canvas-raised p-4 sm:p-5 shadow-xs flex items-start gap-3.5 animate-in fade-in duration-300">
          <div className="p-2.5 rounded-xl bg-danger text-white shrink-0 mt-0.5 shadow-sm">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-danger text-sm sm:text-base flex items-center gap-2">
              {tr("Attention : Situation de Déficit Détectée")}</h3>
            <p className="text-xs sm:text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
              {tr("Vos dépenses payées (")}<strong>{formatAmount(totalExpensesPaid, defaultCurrency)}</strong>{tr(") dépassent vos revenus encaissés (")}<strong>{formatAmount(totalIncomeReceived, defaultCurrency)}</strong>{tr(") avec un solde net de")}{" "}<span className="font-extrabold text-danger">{formatAmount(realNetBalance, defaultCurrency)}</span> {tr("sur la période sélectionnée.")}</p>
          </div>
        </div>
      )}

      {/* Cartes KPI Synthèse */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="reports-kpi">
        <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-slate-900/95 p-5 shadow-xs hover:border-signal/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
              {tr("Revenus Reçus (Encaissés)")}</span>
            <TrendingUp className="w-4 h-4 text-positive" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {formatAmount(totalIncomeReceived, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs font-medium text-ink-500">
            {extraReceivedStr ? `(${extraReceivedStr}) · ` : ""}
            {totalIncomeExpected > 0 ? `+${formatAmount(totalIncomeExpected, defaultCurrency)} attendus` : tr("Aucun revenu en attente")}
          </p>
        </div>

        <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-slate-900/95 p-5 shadow-xs hover:border-signal/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
              {tr("Dépenses Payées")}</span>
            <TrendingDown className="w-4 h-4 text-danger" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono tabular-nums text-ink-950 dark:text-white">
            {formatAmount(totalExpensesPaid, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs font-medium text-ink-500">
            {totalExpensesPlanned > 0 ? `${formatAmount(totalExpensesPlanned, defaultCurrency)} prévues` : tr("Toutes payées")}
          </p>
        </div>

        <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-slate-900/95 p-5 shadow-xs hover:border-signal/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
              {tr("Solde Réel (Net)")}</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <p
            className={`mt-2 text-2xl font-black font-mono tabular-nums ${
              realNetBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-danger"
            }`}
          >
            {formatAmount(realNetBalance, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs font-medium text-ink-500">{tr("Reçus − Dépenses Payées")}</p>
        </div>

        <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-slate-900/95 p-5 shadow-xs hover:border-signal/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
              {tr("Rentabilité Horaire")}</span>
            <Clock className="w-4 h-4 text-signal" />
          </div>
          {hasHourlyProfitability ? (
            <>
              <p className="mt-2 text-xl sm:text-2xl font-black font-mono tabular-nums text-ink-950 dark:text-white">
                {averageHourlyRate !== null
                  ? `${formatAmount(averageHourlyRate, defaultCurrency)}/h`
                  : tr("Données insuffisantes")}
              </p>
              <p className="mt-1 text-xs font-medium text-ink-500">
                {totalHoursWorked > 0
                  ? `Pour ${totalHoursWorked} h travaillées au total`
                  : tr("Planifiez des séances dans le calendrier")}
              </p>
            </>
          ) : (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-signal-soft text-signal">
                <Lock className="w-3 h-3" /> {tr("Forfait Pro requis")}</span>
              <p className="mt-1 text-xs font-medium text-ink-500">
                {tr("Calcul automatique de votre taux horaire net.")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Section Stratégique : Rentabilité par Activité */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
              {tr("Rentabilité & Revenu par Heure Investie")}</h2>
            <p className="text-sm font-medium text-white/95 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
              {tr("Identifiez quelles activités génèrent le plus de valeur par rapport au temps passé.")}</p>
          </div>
        </div>

        {hasHourlyProfitability ? (
          <ProfitabilityTable items={profitabilityList} />
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-ink-200 bg-canvas-raised p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-soft text-signal">
              <Lock className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-ink-950">
                {tr("Débloquez l'analyse de rentabilité horaire")}</h3>
              <p className="text-xs text-ink-500 leading-relaxed">
                {tr("Le calcul automatique de la rentabilité par activité et de votre taux horaire réel est inclus à partir du forfait")}{" "}<strong>{tr("Pro")}</strong>.
              </p>
            </div>
            <div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-xl bg-signal px-4 py-2 text-xs font-bold text-white hover:bg-signal/90 transition-colors shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                {tr("Passer en Pro pour débloquer")}<ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Deux colonnes : Répartition par catégorie & Évolution mensuelle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBreakdown expenseItems={categoryBreakdown} incomeItems={incomeBreakdown} />
        <MonthlyEvolution items={monthlyEvolution} />
      </div>
    </div>
  );
}
