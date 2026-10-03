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

  // Synchronisation paresseuse des revenus
  await ensureIncomeEntries(supabase, user!.id, rangeStart, rangeEnd);

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
  } = await calculateProfitabilityReport(supabase, user!.id, rangeStart, rangeEnd, timezone, defaultCurrency);

  const averageHourlyRate =
    totalHoursWorked > 0 ? Math.round(realNetBalance / totalHoursWorked) : null;

  const extraReceivedStr =
    otherCurrencies && otherCurrencies.length > 0
      ? otherCurrencies.map((c) => `+ ${formatAmount(c.incomeReceived, c.currency)}`).join(", ")
      : null;

  const isDeficit = realNetBalance < 0 || (totalExpensesPaid > totalIncomeReceived && totalIncomeReceived > 0);

  return (
    <div className="space-y-8" data-tour="reports-container">
      {/* En-tête de page avec bannière visuelle retravaillée et visible */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-200 dark:border-ink-800 bg-canvas-raised p-6 sm:p-8 shadow-xs">
        <div 
          className="absolute right-0 top-0 bottom-0 w-1/3 sm:w-1/2 bg-contain bg-right bg-no-repeat opacity-85 dark:opacity-80 pointer-events-none hidden sm:block"
          style={{ backgroundImage: "url('/images/backgrounds/reports-bg.jpg')" }}
        />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-35 pointer-events-none sm:hidden"
          style={{ backgroundImage: "url('/images/backgrounds/reports-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-canvas-raised via-canvas-raised/90 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50 flex items-center gap-2.5">
              <span className="bg-gradient-to-r from-gold to-gold-dark text-white p-2 rounded-xl shadow-gold-subtle inline-flex">
                <BarChart3 className="w-5 h-5" />
              </span>
              Rapports &amp; Rentabilité
            </h1>
            <p className="text-sm text-ink-500 mt-1 max-w-xl">
              Analysez la profitabilité réelle de vos activités, vos heures investies et vos flux de trésorerie.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/reports/print?from=${rangeStart}&to=${rangeEnd}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-signal text-white text-xs font-bold shadow-xs hover:bg-signal-dark active:scale-95 transition-all"
              data-tour="reports-pdf-btn"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimer en PDF
            </Link>
            <a
              href={`/api/finances/export?from=${rangeStart}&to=${rangeEnd}`}
              className={buttonClasses("secondary", "sm")}
              data-tour="reports-export-btn"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> CSV
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
              Attention : Situation de Déficit Détectée
            </h3>
            <p className="text-xs sm:text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
              Vos dépenses payées (<strong>{formatAmount(totalExpensesPaid, defaultCurrency)}</strong>) dépassent vos revenus encaissés (<strong>{formatAmount(totalIncomeReceived, defaultCurrency)}</strong>) avec un solde net de <span className="font-extrabold text-danger">{formatAmount(realNetBalance, defaultCurrency)}</span> sur la période sélectionnée.
            </p>
          </div>
        </div>
      )}

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
          {hasHourlyProfitability ? (
            <>
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
            </>
          ) : (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-signal-soft text-signal">
                <Lock className="w-3 h-3" /> Forfait Pro requis
              </span>
              <p className="mt-1 text-xs text-ink-500">
                Calcul automatique de votre taux horaire net.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section Stratégique : Rentabilité par Activité */}
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

        {hasHourlyProfitability ? (
          <ProfitabilityTable items={profitabilityList} />
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-ink-200 bg-canvas-raised p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-soft text-signal">
              <Lock className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-ink-950">
                Débloquez l'analyse de rentabilité horaire
              </h3>
              <p className="text-xs text-ink-500 leading-relaxed">
                Le calcul automatique de la rentabilité par activité et de votre taux horaire réel est inclus à partir du forfait <strong>Pro</strong>.
              </p>
            </div>
            <div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-xl bg-signal px-4 py-2 text-xs font-bold text-white hover:bg-signal/90 transition-colors shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                Passer en Pro pour débloquer
                <ArrowRight className="w-3.5 h-3.5" />
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
