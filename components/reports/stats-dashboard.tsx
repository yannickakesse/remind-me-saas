"use client";

/**
 * Espace statistiques (lot B) : synthèse, comparaison, évolution, dépenses, activités, revenus.
 * Tous les chiffres viennent de buildProfitabilityReport (aucun calcul financier parallèle ici,
 * seulement de la mise en forme). Règle : jamais de chiffre inventé, jamais de « 0 » pour une absence de données.
 */
import Link from "next/link";
import { useState } from "react";
import { DateTime } from "luxon";
import { ArrowDownRight, ArrowUpRight, Lock, Minus, Sparkles, AlertTriangle, ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { formatAmount } from "@/lib/finances/format";
import { expenseCategoryLabel } from "@/lib/validation/finances";
import type { buildProfitabilityReport } from "@/lib/reports/profitability";
import type { ValueDelta, PeriodCoverage } from "@/lib/reports/periods";
import { detectGranularity } from "@/lib/reports/periods";
import {
  CATEGORY_COLORS,
  OTHER_COLOR,
  INCOME_COLOR,
  EXPENSE_COLOR,
  DonutChart,
  GroupedBars,
  TrendChart,
  DivergingBars,
  type DonutSlice,
  type TrendPoint,
} from "@/components/reports/charts";

type Report = ReturnType<typeof buildProfitabilityReport>;

interface Props {
  report: Report;
  currency: string;
  start: string;
  end: string;
  today: string;
  isPro: boolean;
}

const card = "rounded-3xl border border-ink-200/80 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/95 p-5 sm:p-6 shadow-xs";

/** Libellé lisible d'une période : « novembre 2026 », « T4 2026 », « 2026 » ou « 3 nov. – 20 déc. 2026 ». */
export function usePeriodLabel() {
  const { locale } = useLanguage();
  return (start: string, end: string) => {
    const s = DateTime.fromISO(start).setLocale(locale || "fr");
    const e = DateTime.fromISO(end).setLocale(locale || "fr");
    const g = detectGranularity(start, end);
    if (g === "month") return s.toFormat("LLLL yyyy");
    if (g === "quarter") return `T${s.quarter} ${s.year}`;
    if (g === "year") return String(s.year);
    return `${s.toFormat("d LLL yyyy")} – ${e.toFormat("d LLL yyyy")}`;
  };
}

function Section({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold tracking-tight text-ink-950 dark:text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProLock({ text }: { text: string }) {
  const { tr } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-300 dark:border-white/15 bg-ivory/60 dark:bg-white/[0.02] p-6 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brandAmber-soft px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
        <Lock className="h-3 w-3" /> {tr("Forfait Pro")}
      </span>
      <p className="max-w-sm text-xs text-ink-600 dark:text-ink-300">{text}</p>
      <Link href="/settings" className="text-xs font-bold text-forest dark:text-emerald-400 hover:underline">
        {tr("Voir les forfaits")}
      </Link>
    </div>
  );
}

/** Écart avec la période précédente. `goodWhenUp=false` pour les dépenses (une hausse est défavorable). */
function DeltaChip({ d, currency, goodWhenUp = true, indicative, compact }: { d: ValueDelta; currency: string; goodWhenUp?: boolean; indicative?: boolean; compact?: boolean }) {
  const { tr } = useLanguage();
  if (d.delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500">
        <Minus className="h-3 w-3" /> {tr("Stable")}
      </span>
    );
  }
  const up = d.delta > 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const pct = d.percent === null ? tr("nouveau") : `${up ? "+" : ""}${d.percent.toLocaleString("fr-FR")} %`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold tabular-nums ${good ? "text-emerald-700 dark:text-emerald-400" : "text-danger"}`}
      title={indicative ? tr("Comparaison indicative : une des deux périodes est incomplète") : undefined}
    >
      <Icon className="h-3.5 w-3.5" />
      {indicative ? "≈ " : ""}
      {pct}
      {!compact && (
        <span className="font-semibold text-ink-500 dark:text-ink-400">
          ({up ? "+" : "−"}
          {formatAmount(Math.abs(d.delta), currency)})
        </span>
      )}
    </span>
  );
}

function CoverageBadge({ coverage, trackingStart, start, end, today }: { coverage: PeriodCoverage; trackingStart: string | null; start: string; end: string; today: string }) {
  const { tr, locale } = useLanguage();
  if (coverage === "partial") {
    const since = trackingStart && trackingStart > start ? DateTime.fromISO(trackingStart).setLocale(locale || "fr").toFormat("d LLL") : null;
    const text = since ? tr("Période partielle (depuis le {date})", { date: since }) : end >= today ? tr("Période en cours") : tr("Période partielle");
    return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{text}</span>;
  }
  if (coverage === "zero") {
    return <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-[11px] font-bold text-ink-700 dark:bg-white/10 dark:text-ink-200">{tr("Aucune opération sur cette période")}</span>;
  }
  return null;
}

export function StatsDashboard({ report, currency, start, end, today, isPro }: Props) {
  const { tr, locale } = useLanguage();
  const periodLabel = usePeriodLabel();
  const granularity = detectGranularity(start, end);
  const monthParam = granularity === "month" ? `&month=${start.slice(0, 7)}` : "";
  const cmp = report.comparison;
  const deltas = cmp.deltas;
  const comparisonAllowed = isPro || granularity === "month";
  const prevLabel = periodLabel(cmp.start, cmp.end);

  // ---- Synthèse
  const indicators = [
    {
      key: "in",
      label: tr("Revenus encaissés"),
      value: report.totalIncomeReceived,
      tone: "text-emerald-700 dark:text-emerald-400",
      href: `/finances?tab=income${monthParam}`,
      delta: deltas?.incomeReceived,
      goodWhenUp: true,
    },
    {
      key: "exp",
      label: tr("Revenus attendus"),
      value: report.totalIncomeExpected,
      tone: "text-amber-700 dark:text-amber-400",
      href: `/finances?tab=income${monthParam}`,
    },
    {
      key: "paid",
      label: tr("Dépenses payées"),
      value: report.totalExpensesPaid,
      tone: "text-ink-950 dark:text-white",
      href: `/finances?tab=expenses${monthParam}`,
      delta: deltas?.expensesPaid,
      goodWhenUp: false,
    },
    {
      key: "up",
      label: tr("Dépenses à venir"),
      value: report.totalExpensesUpcoming,
      tone: "text-amber-700 dark:text-amber-400",
      href: report.scheduledUpcoming.total > 0 ? "/finances?tab=scheduled" : `/finances?tab=expenses${monthParam}`,
      sub: report.scheduledUpcoming.total > 0 ? tr("dont {amount} programmées", { amount: formatAmount(report.scheduledUpcoming.total, currency) }) : undefined,
    },
  ];
  const showHourly = isPro && report.averageHourlyRate !== null && report.activityHours > 0;
  const net = report.realNetBalance;

  // ---- Évolution
  const [months, setMonths] = useState<6 | 12>(6);
  const shownMonths = report.monthlySummaries.slice(-months);
  const trendPoints: TrendPoint[] = shownMonths.map((m) => {
    const none = m.coverage === "none";
    return {
      key: m.monthKey,
      label: DateTime.fromFormat(m.monthKey, "yyyy-MM").setLocale(locale || "fr").toFormat("LLL"),
      fullLabel: DateTime.fromFormat(m.monthKey, "yyyy-MM").setLocale(locale || "fr").toFormat("LLLL yyyy"),
      income: none ? null : m.incomeReceived,
      expense: none ? null : m.expensesPaid,
      net: none ? null : m.netReal,
      partial: m.coverage === "partial",
    };
  });
  const trendHasData = trendPoints.some((p) => p.income !== null);

  // ---- Dépenses
  const cats = report.categoryBreakdown;
  const top = cats.slice(0, CATEGORY_COLORS.length);
  const rest = cats.slice(CATEGORY_COLORS.length);
  const slices: DonutSlice[] = top.map((c, i) => ({ key: c.category, label: tr(expenseCategoryLabel(c.category)), value: c.amount, color: CATEGORY_COLORS[i]! }));
  const restTotal = rest.reduce((a, c) => a + c.amount, 0);
  if (restTotal > 0) slices.push({ key: "__rest", label: tr("Autres catégories"), value: restTotal, color: OTHER_COLOR });
  const paidTotal = cats.reduce((a, c) => a + c.amount, 0);

  const prevCats = new Map(report.previousCategoryBreakdown.map((c) => [c.category, c.amount]));
  const changes =
    deltas && cmp.coverage !== "none"
      ? Array.from(new Set([...cats.map((c) => c.category), ...prevCats.keys()]))
          .map((cat) => {
            const cur = cats.find((c) => c.category === cat)?.amount ?? 0;
            const prev = prevCats.get(cat) ?? 0;
            return { cat, cur, prev, delta: cur - prev };
          })
          .filter((c) => c.delta !== 0)
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
          .slice(0, 4)
      : [];
  const kinds = report.expenseKinds;
  const kindsTotal = kinds.recurringPaid + kinds.ponctualPaid;
  const gaugeTotal = report.totalExpensesPaid + report.totalExpensesUpcoming;

  // ---- Activités
  const activities = report.profitabilityList.filter((p) => !p.isGeneral && p.currency === currency);
  const general = report.profitabilityList.find((p) => p.isGeneral && p.currency === currency);

  // ---- Revenus
  const split = report.receivedIncomeSplit;
  const sources = report.incomeBreakdown;

  return (
    <div className="space-y-5">
      {/* 1. Synthèse */}
      <section className={`${card} overflow-hidden`} data-tour="reports-kpi">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{tr("Solde net encaissé")}</p>
          <CoverageBadge coverage={report.coverage} trackingStart={report.trackingStart} start={start} end={end} today={today} />
        </div>
        <div className="mt-1 space-y-4">
          <div className="min-w-0">
            <p className={`break-words text-[clamp(1.75rem,7vw,2.75rem)] font-black leading-tight tabular-nums ${net >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-danger"}`}>
              {formatAmount(net, currency)}
            </p>
            <p className="mt-1 text-xs text-ink-500">{tr("Revenus encaissés − dépenses payées")}</p>
            {comparisonAllowed && deltas && (
              <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[11px] text-ink-500">
                <DeltaChip d={deltas.realNetBalance} currency={currency} indicative={deltas.indicative} />
                <span>{tr("par rapport à {period}", { period: prevLabel })}</span>
              </p>
            )}
            {net < 0 && report.totalIncomeReceived > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-danger-soft px-2 py-1 text-[11px] font-semibold text-danger">
                <AlertTriangle className="h-3.5 w-3.5" /> {tr("Les dépenses payées dépassent les revenus encaissés")}
              </p>
            )}
          </div>
          <div className={`grid grid-cols-2 gap-2.5 ${showHourly ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-4"}`}>
            {indicators.map((k) => (
              <Link
                key={k.key}
                href={k.href}
                className="group flex min-w-0 flex-col justify-between rounded-2xl border border-ink-200/70 dark:border-white/10 bg-ivory/70 dark:bg-white/[0.03] p-3 transition-colors hover:border-forest/40"
              >
                <span className="text-[11px] font-semibold leading-tight text-ink-600 dark:text-ink-300">{k.label}</span>
                <span className={`mt-1.5 truncate text-[clamp(0.85rem,3.6vw,1.05rem)] font-extrabold tabular-nums ${k.tone}`} title={formatAmount(k.value, currency)}>
                  {formatAmount(k.value, currency)}
                </span>
                {k.sub && <span className="mt-0.5 truncate text-[10px] text-ink-500">{k.sub}</span>}
                {comparisonAllowed && k.delta && <span className="mt-1"><DeltaChip d={k.delta} currency={currency} goodWhenUp={k.goodWhenUp} indicative={deltas?.indicative} compact /></span>}
              </Link>
            ))}
            {showHourly && (
              <div className="col-span-2 flex min-w-0 flex-col justify-between rounded-2xl border border-ink-200/70 dark:border-white/10 bg-ivory/70 dark:bg-white/[0.03] p-3 sm:col-span-1">
                <span className="text-[11px] font-semibold leading-tight text-ink-600 dark:text-ink-300">{tr("Rentabilité horaire")}</span>
                <span className="mt-1.5 truncate text-[clamp(0.85rem,3.6vw,1.05rem)] font-extrabold tabular-nums text-ink-950 dark:text-white">
                  {formatAmount(report.averageHourlyRate!, currency)}/h
                </span>
                <span className="mt-0.5 text-[10px] text-ink-500">{tr("Pour {hours} h effectuées sur vos activités", { hours: report.activityHours })}</span>
              </div>
            )}
          </div>
        </div>
        {(split.exceptional > 0 || split.refunds > 0) && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-ink-200/70 dark:border-white/10 pt-3 text-[11px] text-ink-600 dark:text-ink-300">
            {split.exceptional > 0 && <span>{tr("dont revenus exceptionnels : {amount}", { amount: formatAmount(split.exceptional, currency) })}</span>}
            {split.refunds > 0 && <span>{tr("dont remboursements (pas des gains) : {amount}", { amount: formatAmount(split.refunds, currency) })}</span>}
            {split.refunds > 0 && <span className="font-semibold text-ink-800 dark:text-ink-100">{tr("Revenus hors remboursements : {amount}", { amount: formatAmount(split.gains, currency) })}</span>}
          </div>
        )}
        {report.otherCurrencies.length > 0 && (
          <p className="mt-3 text-[11px] text-ink-500">
            {tr("Autres devises (non additionnées) :")}{" "}
            {report.otherCurrencies.map((c) => `${formatAmount(c.realNetBalance, c.currency)}`).join(" · ")}
          </p>
        )}
      </section>

      {/* 2. Comparaison */}
      <Section
        title={tr("Comparaison avec la période précédente")}
        subtitle={`${periodLabel(start, end)} · ${prevLabel}`}
        action={deltas?.indicative ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{tr("Indicatif")}</span> : undefined}
      >
        {!comparisonAllowed ? (
          <ProLock text={tr("La comparaison par trimestre, par année ou sur une période personnalisée est incluse dans le forfait Pro. La comparaison mois par mois reste gratuite.")} />
        ) : !deltas ? (
          <p className="rounded-2xl bg-ivory/70 dark:bg-white/[0.03] p-5 text-center text-sm text-ink-600 dark:text-ink-300">
            {tr("Pas encore de données pour {period} : la comparaison apparaîtra dès qu'il y aura deux périodes à comparer.", { period: prevLabel })}
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
            <div className="mx-auto w-full max-w-md">
              <GroupedBars
                groups={[
                  { label: prevLabel, income: deltas.incomeReceived.previous, expense: deltas.expensesPaid.previous },
                  { label: periodLabel(start, end), income: deltas.incomeReceived.current, expense: deltas.expensesPaid.current },
                ]}
                currency={currency}
                incomeLabel={tr("Revenus encaissés")}
                expenseLabel={tr("Dépenses payées")}
              />
              <Legend items={[{ color: INCOME_COLOR, label: tr("Revenus encaissés") }, { color: EXPENSE_COLOR, label: tr("Dépenses payées") }]} />
            </div>
            <dl className="divide-y divide-ink-200/70 dark:divide-white/10 text-sm">
              {[
                { l: tr("Revenus encaissés"), d: deltas.incomeReceived, up: true },
                { l: tr("Revenus attendus"), d: deltas.incomeExpected, up: true },
                { l: tr("Dépenses payées"), d: deltas.expensesPaid, up: false },
                { l: tr("Solde net encaissé"), d: deltas.realNetBalance, up: true },
              ].map((r) => (
                <div key={r.l} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
                  <dt className="text-xs font-semibold text-ink-700 dark:text-ink-200">{r.l}</dt>
                  <dd className="text-right">
                    <span className="block text-sm font-bold tabular-nums text-ink-950 dark:text-white">{formatAmount(r.d.current, currency)}</span>
                    <DeltaChip d={r.d} currency={currency} goodWhenUp={r.up} indicative={deltas.indicative} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Section>

      {/* 3. Évolution */}
      <Section
        title={tr("Évolution")}
        subtitle={tr("Revenus encaissés, dépenses payées et solde, mois par mois")}
        action={
          <div className="inline-flex rounded-full bg-ink-100/80 dark:bg-white/5 p-0.5 text-[11px] font-bold">
            {([6, 12] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => (n === 12 && !isPro ? undefined : setMonths(n))}
                disabled={n === 12 && !isPro}
                title={n === 12 && !isPro ? tr("12 mois avec le forfait Pro") : undefined}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${months === n ? "bg-canvas-raised dark:bg-slate-800 text-ink-950 dark:text-white shadow-xs" : "text-ink-600 dark:text-ink-300"} disabled:opacity-60`}
              >
                {n === 12 && !isPro && <Lock className="h-3 w-3" />}
                {tr("{n} mois", { n })}
              </button>
            ))}
          </div>
        }
      >
        {trendHasData ? (
          <>
            <TrendChart
              points={trendPoints}
              currency={currency}
              labels={{ income: tr("Encaissé"), expense: tr("Payé"), net: tr("Solde"), partial: tr("partiel"), noData: tr("Pas de données") }}
            />
            <Legend
              items={[
                { color: INCOME_COLOR, label: tr("Revenus encaissés") },
                { color: EXPENSE_COLOR, label: tr("Dépenses payées") },
                { color: "currentColor", label: tr("Solde net"), dashed: true },
              ]}
            />
            <p className="mt-2 text-center text-[11px] text-ink-500">{tr("Les mois grisés n'ont pas encore de données : ils ne sont pas comptés comme des zéros.")}</p>
          </>
        ) : (
          <EmptyBlock />
        )}
      </Section>

      {/* 4. Dépenses */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={tr("Dépenses payées par catégorie")} subtitle={paidTotal > 0 ? formatAmount(paidTotal, currency) : undefined}>
          {slices.length === 0 ? (
            <p className="rounded-2xl bg-ivory/70 dark:bg-white/[0.03] p-5 text-center text-sm text-ink-600 dark:text-ink-300">{tr("Aucune dépense payée sur cette période.")}</p>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div className="mx-auto">
                <DonutChart slices={slices} currency={currency} centerLabel={tr("Total payé")} size={180} />
              </div>
              <ul className="space-y-1.5">
                {slices.map((s) => (
                  <li key={s.key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="inline-flex min-w-0 items-center gap-2 text-ink-800 dark:text-ink-100">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-950 dark:text-white">
                      <span className="font-bold">{formatAmount(s.value, currency)}</span>
                      <span className="ml-1.5 text-ink-500">{paidTotal > 0 ? Math.round((s.value / paidTotal) * 100) : 0} %</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.plannedCategoryBreakdown.length > 0 && (
            <p className="mt-4 border-t border-ink-200/70 dark:border-white/10 pt-3 text-[11px] text-ink-500">
              {tr("Prévues, non payées :")}{" "}
              {report.plannedCategoryBreakdown.map((c) => `${tr(expenseCategoryLabel(c.category))} ${formatAmount(c.amount, currency)}`).join(" · ")}
            </p>
          )}
        </Section>

        <Section title={tr("Analyse des dépenses")} subtitle={tr("Ce qui a changé, part récurrente et reste à payer")}>
          {!isPro ? (
            <ProLock text={tr("Variations par catégorie, part récurrente ou ponctuelle et suivi du reste à payer : inclus dans le forfait Pro.")} />
          ) : (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">{tr("Ce qui a changé")}</p>
                {changes.length === 0 ? (
                  <p className="text-xs text-ink-500">{deltas ? tr("Aucune variation notable par rapport à {period}.", { period: prevLabel }) : tr("Pas encore de période précédente à comparer.")}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {changes.map((c) => (
                      <li key={c.cat} className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-ink-800 dark:text-ink-100">{tr(expenseCategoryLabel(c.cat))}</span>
                        <span className={`shrink-0 inline-flex items-center gap-1 font-bold tabular-nums ${c.delta > 0 ? "text-danger" : "text-emerald-700 dark:text-emerald-400"}`}>
                          {c.delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          {c.delta > 0 ? "+" : "−"}
                          {formatAmount(Math.abs(c.delta), currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {kindsTotal > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">{tr("Récurrentes / ponctuelles")}</p>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-white/5">
                    <span style={{ width: `${(kinds.recurringPaid / kindsTotal) * 100}%`, background: CATEGORY_COLORS[2] }} />
                    <span className="border-l-2 border-canvas-raised dark:border-slate-900" style={{ width: `${(kinds.ponctualPaid / kindsTotal) * 100}%`, background: CATEGORY_COLORS[1] }} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-[11px] text-ink-600 dark:text-ink-300">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: CATEGORY_COLORS[2] }} />{tr("Récurrentes")} · <strong className="tabular-nums">{formatAmount(kinds.recurringPaid, currency)}</strong></span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: CATEGORY_COLORS[1] }} />{tr("Ponctuelles")} · <strong className="tabular-nums">{formatAmount(kinds.ponctualPaid, currency)}</strong></span>
                  </div>
                  <p className="mt-1 text-[10px] text-ink-500">{tr("Estimation : une dépense est récurrente si elle a été payée depuis l'échéancier.")}</p>
                </div>
              )}

              {gaugeTotal > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">{tr("Payé / à venir")}</p>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-white/5">
                    <span style={{ width: `${(report.totalExpensesPaid / gaugeTotal) * 100}%`, background: EXPENSE_COLOR }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-600 dark:text-ink-300">
                    {tr("{paid} payées sur {total} au total", { paid: formatAmount(report.totalExpensesPaid, currency), total: formatAmount(gaugeTotal, currency) })}
                  </p>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* 5. Activités */}
      <Section title={tr("Rentabilité par activité")} subtitle={tr("Résultat net encaissé et revenu par heure effectuée")}>
        {!isPro ? (
          <ProLock text={tr("Le calcul automatique de la rentabilité par activité et de votre taux horaire réel est inclus à partir du forfait Pro.")} />
        ) : activities.length === 0 && !general ? (
          <p className="rounded-2xl bg-ivory/70 dark:bg-white/[0.03] p-5 text-center text-sm text-ink-600 dark:text-ink-300">{tr("Aucune donnée d'activité disponible sur la période sélectionnée.")}</p>
        ) : (
          <div className="space-y-5">
            {activities.length > 0 && (
              <DivergingBars rows={activities.map((a) => ({ key: a.activityId ?? a.activityName, label: a.activityName, value: a.netRealProfit, color: a.activityColor }))} currency={currency} />
            )}
            <div className="grid gap-2.5 md:grid-cols-2">
              {activities.map((a) => (
                <ActivityCard key={a.activityId ?? a.activityName} a={a} currency={currency} />
              ))}
            </div>
            {general && (
              <div className="rounded-2xl border border-dashed border-ink-300 dark:border-white/15 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-ink-800 dark:text-ink-100">{tr("Général (non rattaché à une activité)")}</span>
                  <span className={`font-bold tabular-nums ${general.netRealProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-danger"}`}>{formatAmount(general.netRealProfit, currency)}</span>
                </div>
                <p className="mt-1 text-[11px] text-ink-500">
                  {tr("Encaissé {inc} · payé {exp}. Ces montants ne sont jamais répartis entre vos activités.", {
                    inc: formatAmount(general.incomeReceived, currency),
                    exp: formatAmount(general.expensesPaid, currency),
                  })}
                </p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 6. Revenus */}
      <Section title={tr("Sources de revenus encaissés")}>
        {sources.length === 0 && split.refunds === 0 ? (
          <p className="rounded-2xl bg-ivory/70 dark:bg-white/[0.03] p-5 text-center text-sm text-ink-600 dark:text-ink-300">{tr("Aucun revenu encaissé sur cette période.")}</p>
        ) : (
          <ul className="space-y-2.5">
            {sources.map((s) => (
              <li key={s.category}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-semibold text-ink-800 dark:text-ink-100">{s.category}</span>
                  <span className="shrink-0 tabular-nums">
                    <strong className="text-ink-950 dark:text-white">{formatAmount(s.amount, currency)}</strong>
                    <span className="ml-1.5 text-ink-500">{s.percentage} %</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-ink-100 dark:bg-white/5">
                  <span className="block h-1.5 rounded-full" style={{ width: `${s.percentage}%`, background: INCOME_COLOR }} />
                </div>
              </li>
            ))}
            {split.refunds > 0 && (
              <li className="flex items-center justify-between gap-3 border-t border-ink-200/70 dark:border-white/10 pt-2.5 text-xs text-ink-500">
                <span>{tr("Remboursements (pas un gain)")}</span>
                <span className="tabular-nums">{formatAmount(split.refunds, currency)}</span>
              </li>
            )}
          </ul>
        )}
      </Section>

      {!isPro && (
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" /> {tr("Prévision de trésorerie et analyse intelligente : bientôt disponibles.")}
        </p>
      )}
    </div>
  );
}

function Legend({ items }: { items: Array<{ color: string; label: string; dashed?: boolean }> }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-ink-600 dark:text-ink-300">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? (
            <svg width="16" height="4" className="text-ink-700 dark:text-ink-200"><line x1="0" y1="2" x2="16" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" /></svg>
          ) : (
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  );
}

function EmptyBlock() {
  const { tr } = useLanguage();
  return (
    <div className="rounded-2xl border border-dashed border-ink-300 dark:border-white/15 p-6 text-center">
      <p className="text-sm font-bold text-ink-950 dark:text-white">{tr("Pas encore de données disponibles pour cette période.")}</p>
      <p className="mt-1 text-xs text-ink-600 dark:text-ink-300">{tr("Vos statistiques apparaîtront au fur et à mesure de votre activité.")}</p>
    </div>
  );
}

function ActivityCard({ a, currency }: { a: Report["profitabilityList"][number]; currency: string }) {
  const { tr } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-ink-200/70 dark:border-white/10 bg-ivory/50 dark:bg-white/[0.02]">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-3.5 text-left" aria-expanded={open}>
        <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: a.activityColor ?? OTHER_COLOR }} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-ink-950 dark:text-white">{a.activityName}</span>
            {a.isTopPerformer && <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{tr("Top")}</span>}
            {a.incomplete && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{tr("Données incomplètes")}</span>}
          </span>
          <span className="mt-0.5 block text-[11px] text-ink-500 tabular-nums">
            {a.hourlyRate !== null ? `${formatAmount(a.hourlyRate, currency)}/h · ${a.totalHours} h` : a.totalHours > 0 ? `${a.totalHours} h` : tr("Aucune heure effectuée")}
          </span>
        </span>
        <span className={`shrink-0 text-sm font-extrabold tabular-nums ${a.netRealProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-danger"}`}>{formatAmount(a.netRealProfit, currency)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink-200/70 dark:border-white/10 p-3.5 text-[11px]">
          <div><dt className="text-ink-500">{tr("Encaissé")}</dt><dd className="font-bold tabular-nums text-ink-950 dark:text-white">{formatAmount(a.incomeReceived, currency)}</dd></div>
          <div><dt className="text-ink-500">{tr("Attendu")}</dt><dd className="font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatAmount(a.incomeExpected, currency)}</dd></div>
          <div><dt className="text-ink-500">{tr("Dépenses payées")}</dt><dd className="font-bold tabular-nums text-ink-950 dark:text-white">{formatAmount(a.expensesPaid, currency)}</dd></div>
          <div><dt className="text-ink-500">{tr("Prévues")}</dt><dd className="font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatAmount(a.expensesPlanned, currency)}</dd></div>
          {a.incomplete && (
            <p className="col-span-2 text-ink-500">
              {a.totalHours > 0 ? tr("Des heures sont enregistrées mais aucun montant.") : tr("Des montants sont enregistrés mais aucune séance terminée.")}
            </p>
          )}
        </dl>
      )}
    </div>
  );
}
