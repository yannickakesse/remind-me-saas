import { getTr, getServerLocale } from "@/lib/i18n/server";
import { PageBackground } from "@/components/shared/page-background";
import { DateTime } from "luxon";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { calculateProfitabilityReport } from "@/lib/reports/profitability";
import { PeriodFilter } from "@/components/reports/period-filter";
import { StatsDashboard } from "@/components/reports/stats-dashboard";
import { getUserTimezone } from "@/lib/time/timezones";
import { getUserSubscription } from "@/lib/subscriptions/server";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const tr = await getTr();
  const [user, profile] = await Promise.all([requireCurrentUser(), getCurrentProfile()]);

  const timezone = getUserTimezone(profile);
  const defaultCurrency = profile?.default_currency ?? "XOF";
  const today = DateTime.now().setZone(timezone);
  const supabase = createClient();

  const userSub = await getUserSubscription(supabase, user!.id);
  // Analyse détaillée (activités, comparaisons avancées, 12 mois) : forfaits Pro et Premium
  const isPro = userSub.entitlements.hourlyProfitability;

  // Période par défaut : mois en cours (comparé au mois précédent)
  const defaultStart = today.startOf("month").toISODate()!;
  const defaultEnd = today.endOf("month").toISODate()!;
  const validFrom = searchParams?.from && DateTime.fromISO(searchParams.from).isValid ? searchParams.from : null;
  const validTo = searchParams?.to && DateTime.fromISO(searchParams.to).isValid ? searchParams.to : null;
  let rangeStart = validFrom ?? defaultStart;
  let rangeEnd = validTo ?? defaultEnd;
  if (rangeStart > rangeEnd) [rangeStart, rangeEnd] = [rangeEnd, rangeStart];

  // Synchronisation paresseuse des revenus : période demandée + 12 mois d'historique (courbe)
  const endDT = DateTime.fromISO(rangeEnd, { zone: timezone });
  const historyStart = endDT.minus({ months: 11 }).startOf("month").toISODate()!;
  const accountStart = user?.created_at
    ? DateTime.fromISO(user.created_at, { zone: timezone }).startOf("month").toISODate()!
    : null;
  const earliest = rangeStart < historyStart ? rangeStart : historyStart;
  const syncStart = accountStart && earliest < accountStart ? accountStart : earliest;
  await ensureIncomeEntries(supabase, user!.id, syncStart, rangeEnd);

  const report = await calculateProfitabilityReport(
    supabase,
    user!.id,
    rangeStart,
    rangeEnd,
    timezone,
    defaultCurrency,
    user!.created_at
  );

  const locale = getServerLocale();
  const startLabel = DateTime.fromISO(rangeStart).setLocale(locale).toFormat("d LLL yyyy");
  const endLabel = DateTime.fromISO(rangeEnd).setLocale(locale).toFormat("d LLL yyyy");

  return (
    <div className="relative isolate min-h-full w-full space-y-5" data-tour="reports-container">
      <PageBackground src="/images/backgrounds/reports-bg.jpg" />

      {/* En-tête compact : titre, période, sélecteur, exports */}
      <header className="rounded-3xl border border-ink-200/80 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/95 backdrop-blur-md p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">{tr("Statistiques financières")}</h1>
            <p className="mt-0.5 text-xs text-ink-500 tabular-nums">
              {tr("Du {start} au {end}", { start: startLabel, end: endLabel })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SectionGuideTrigger section="reports" label={tr("Guide rentabilité")} />
            <Link
              href={`/reports/print?from=${rangeStart}&to=${rangeEnd}`}
              target="_blank"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-forest px-3.5 text-xs font-bold text-white shadow-xs hover:bg-forest-hover"
              data-tour="reports-pdf-btn"
            >
              <Printer className="h-4 w-4" />
              {tr("Télécharger le PDF")}
            </Link>
            <a
              href={`/api/finances/export?from=${rangeStart}&to=${rangeEnd}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink-300 dark:border-white/15 bg-canvas dark:bg-slate-950 px-3.5 text-xs font-bold text-ink-900 dark:text-ink-100 hover:bg-ink-100 dark:hover:bg-white/5"
              data-tour="reports-export-btn"
            >
              <Download className="h-4 w-4" />
              {tr("CSV")}
            </a>
          </div>
        </div>
        <PeriodFilter from={rangeStart} to={rangeEnd} timezone={timezone} />
      </header>

      {report.coverage === "none" ? (
        <div className="rounded-3xl border border-dashed border-ink-300 dark:border-white/15 bg-canvas-raised/95 dark:bg-slate-900/90 p-8 text-center space-y-1.5">
          <p className="text-base font-bold text-ink-950 dark:text-white">{tr("Pas encore de données disponibles pour cette période.")}</p>
          <p className="text-sm text-ink-600 dark:text-ink-300">{tr("Vos statistiques apparaîtront au fur et à mesure de votre activité.")}</p>
        </div>
      ) : (
        <StatsDashboard
          report={report}
          currency={defaultCurrency}
          start={rangeStart}
          end={rangeEnd}
          today={today.toISODate()!}
          isPro={isPro}
        />
      )}
    </div>
  );
}
