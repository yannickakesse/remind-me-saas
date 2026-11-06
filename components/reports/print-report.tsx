"use client";

/**
 * Rapport financier A4 (lot C) : un vrai document, pas une copie de l'écran.
 * Page 1 synthèse + comparaison · Page 2 évolution + dépenses · Page 3 activités + revenus · Annexe mensuelle.
 * Graphiques SVG vectoriels (mêmes composants que l'écran), toujours en thème clair.
 * Aucun calcul financier ici : tout vient de buildProfitabilityReport.
 */
import { useEffect } from "react";
import { DateTime } from "luxon";
import { ArrowLeft, Download } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { formatAmount } from "@/lib/finances/format";
import { expenseCategoryLabel } from "@/lib/validation/finances";
import { RemindMeLogo } from "@/components/landing/remindme-logo";
import type { buildProfitabilityReport } from "@/lib/reports/profitability";
import type { PeriodCoverage, ValueDelta } from "@/lib/reports/periods";
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
} from "@/components/reports/charts";

type Report = ReturnType<typeof buildProfitabilityReport>;

interface Props {
  report: Report;
  currency: string;
  start: string;
  end: string;
  today: string;
  isPro: boolean;
  user: { fullName: string | null; email?: string | null; planName: string };
  generatedAt: string;
  documentRef: string;
}

const PRINT_CSS = `
@page { size: A4; margin: 14mm 14mm 16mm; }
@page { @bottom-right { content: counter(page) " / " counter(pages); font: 8pt system-ui, sans-serif; color: #6b7280; } }
@media print {
  html, body { background: #fff !important; }
  .rm-sheet { width: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; }
  .rm-sheet + .rm-sheet { break-before: page; }
  .rm-block { break-inside: avoid; }
  .rm-doc thead { display: table-header-group; }
  .rm-doc tr { break-inside: avoid; }
}
.rm-doc, .rm-doc * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

function useLabels() {
  const { locale } = useLanguage();
  const loc = locale || "fr";
  return {
    period: (start: string, end: string) => {
      const s = DateTime.fromISO(start).setLocale(loc);
      const e = DateTime.fromISO(end).setLocale(loc);
      const g = detectGranularity(start, end);
      if (g === "month") return s.toFormat("LLLL yyyy");
      if (g === "quarter") return `T${s.quarter} ${s.year}`;
      if (g === "year") return String(s.year);
      return `${s.toFormat("d LLL yyyy")} – ${e.toFormat("d LLL yyyy")}`;
    },
    date: (iso: string) => DateTime.fromISO(iso).setLocale(loc).toFormat("d LLLL yyyy"),
    month: (key: string, fmt = "LLLL yyyy") => DateTime.fromFormat(key, "yyyy-MM").setLocale(loc).toFormat(fmt),
  };
}

function Delta({ d, goodWhenUp = true, indicative }: { d: ValueDelta; goodWhenUp?: boolean; indicative?: boolean }) {
  const { tr } = useLanguage();
  if (d.delta === 0) return <span className="text-slate-500">{tr("Stable")}</span>;
  const up = d.delta > 0;
  const good = up === goodWhenUp;
  return (
    <span className={good ? "text-emerald-700" : "text-red-600"}>
      {indicative ? "≈ " : ""}
      {up ? "▲" : "▼"} {d.percent === null ? tr("nouveau") : `${up ? "+" : ""}${d.percent.toLocaleString("fr-FR")} %`}
    </span>
  );
}

function Sheet({ children, header }: { children: React.ReactNode; header: React.ReactNode }) {
  return (
    <section className="rm-sheet mx-auto mb-6 w-[210mm] min-h-[297mm] rounded-sm border border-slate-200 bg-white px-[14mm] py-[12mm] shadow-xl">
      {header}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function H2({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-slate-300 pb-1">
      <h2 className="text-[11pt] font-extrabold tracking-tight text-slate-950">{children}</h2>
      {note && <span className="text-[8pt] text-slate-500">{note}</span>}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-slate-50 px-3 py-2 text-[8.5pt] text-slate-600">{children}</p>;
}

export function PrintReport({ report, currency, start, end, today, isPro, user, generatedAt, documentRef }: Props) {
  const { tr } = useLanguage();
  const L = useLabels();

  // Document toujours en thème clair, quel que soit le thème de l'application
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    return () => {
      if (previous) root.setAttribute("data-theme", previous);
    };
  }, []);

  const periodLabel = L.period(start, end);
  const cmp = report.comparison;
  const granularity = detectGranularity(start, end);
  const deltas = isPro || granularity === "month" ? cmp.deltas : null;
  const prevLabel = L.period(cmp.start, cmp.end);
  const fmt = (v: number) => formatAmount(v, currency);
  const net = report.realNetBalance;
  const split = report.receivedIncomeSplit;

  const coverageText = (c: PeriodCoverage, from?: string | null) =>
    c === "partial"
      ? from && from > start
        ? tr("Période partielle (depuis le {date})", { date: L.date(from) })
        : end >= today
        ? tr("Période en cours")
        : tr("Période partielle")
      : c === "zero"
      ? tr("Aucune opération sur cette période")
      : c === "complete"
      ? tr("Période complète")
      : tr("Pas de données");

  // Dépenses par catégorie (mêmes règles que l'écran : 7 couleurs fixes puis « Autres »)
  const cats = report.categoryBreakdown;
  const slices: DonutSlice[] = cats
    .slice(0, CATEGORY_COLORS.length)
    .map((c, i) => ({ key: c.category, label: tr(expenseCategoryLabel(c.category)), value: c.amount, color: CATEGORY_COLORS[i]! }));
  const restTotal = cats.slice(CATEGORY_COLORS.length).reduce((a, c) => a + c.amount, 0);
  if (restTotal > 0) slices.push({ key: "__rest", label: tr("Autres catégories"), value: restTotal, color: OTHER_COLOR });
  const paidTotal = cats.reduce((a, c) => a + c.amount, 0);
  const prevCats = new Map(report.previousCategoryBreakdown.map((c) => [c.category, c.amount]));
  const changes = deltas
    ? Array.from(new Set([...cats.map((c) => c.category), ...prevCats.keys()]))
        .map((cat) => ({ cat, delta: (cats.find((c) => c.category === cat)?.amount ?? 0) - (prevCats.get(cat) ?? 0) }))
        .filter((c) => c.delta !== 0)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 5)
    : [];

  const months = report.monthlySummaries.slice(isPro ? -12 : -6);
  const trendPoints = months.map((m) => {
    const none = m.coverage === "none";
    return {
      key: m.monthKey,
      label: L.month(m.monthKey, "LLL"),
      fullLabel: L.month(m.monthKey),
      income: none ? null : m.incomeReceived,
      expense: none ? null : m.expensesPaid,
      net: none ? null : m.netReal,
      partial: m.coverage === "partial",
    };
  });
  const coveredMonths = months.filter((m) => m.coverage !== "none");

  const activities = report.profitabilityList.filter((p) => !p.isGeneral && p.currency === currency);
  const general = report.profitabilityList.find((p) => p.isGeneral && p.currency === currency);

  const header = (n: string) => (
    <div className="mb-5 flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3">
      <div className="flex items-center gap-2.5">
        <RemindMeLogo size="sm" showText={false} />
        <div>
          <p className="text-[12pt] font-black leading-tight text-slate-950">{tr("Rapport financier")}</p>
          <p className="text-[8.5pt] text-slate-600">
            {user.fullName ?? user.email ?? ""} · {tr("Forfait")} {tr(user.planName)}
          </p>
        </div>
      </div>
      <div className="text-right text-[8.5pt] text-slate-600">
        <p className="text-[10pt] font-bold capitalize text-slate-950">{periodLabel}</p>
        <p>{tr("Du {start} au {end}", { start: L.date(start), end: L.date(end) })}</p>
        <p>
          {n} · {documentRef}
        </p>
      </div>
    </div>
  );

  if (report.coverage === "none") {
    return (
      <Shell>
        <Sheet header={header(tr("Synthèse"))}>
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
            <p className="text-[11pt] font-bold text-slate-950">{tr("Pas encore de données disponibles pour cette période.")}</p>
            <p className="mt-1 text-[9pt] text-slate-600">{tr("Vos statistiques apparaîtront au fur et à mesure de votre activité.")}</p>
          </div>
        </Sheet>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* ---------------- Page 1 : synthèse et comparaison ---------------- */}
      <Sheet header={header(tr("Synthèse"))}>
        <div className="rm-block">
          <div className="flex items-end justify-between gap-6 rounded-lg border border-slate-200 bg-[#F7F6F2] p-4">
            <div>
              <p className="text-[8pt] font-bold uppercase tracking-wider text-slate-500">{tr("Solde net encaissé")}</p>
              <p className={`text-[24pt] font-black leading-tight tabular-nums ${net >= 0 ? "text-[#1F7A55]" : "text-red-600"}`}>{fmt(net)}</p>
              <p className="text-[8pt] text-slate-500">{tr("Revenus encaissés − dépenses payées")}</p>
            </div>
            <div className="text-right text-[8.5pt] text-slate-600">
              <p className="font-semibold">{coverageText(report.coverage, report.trackingStart)}</p>
              {deltas && (
                <p className="mt-0.5">
                  <Delta d={deltas.realNetBalance} indicative={deltas.indicative} /> {tr("par rapport à {period}", { period: prevLabel })}
                </p>
              )}
            </div>
          </div>
          <table className="mt-3 w-full text-[9pt]">
            <tbody>
              {[
                [tr("Revenus encaissés"), report.totalIncomeReceived, "text-[#1F7A55]"],
                [tr("Revenus attendus"), report.totalIncomeExpected, "text-amber-700"],
                [tr("Dépenses payées"), report.totalExpensesPaid, "text-slate-950"],
                [
                  report.scheduledUpcoming.total > 0
                    ? `${tr("Dépenses à venir")} (${tr("dont {amount} programmées", { amount: fmt(report.scheduledUpcoming.total) })})`
                    : tr("Dépenses à venir"),
                  report.totalExpensesUpcoming,
                  "text-amber-700",
                ],
              ].map(([l, v, c]) => (
                <tr key={l as string} className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-700">{l as string}</td>
                  <td className={`py-1.5 text-right font-bold tabular-nums ${c}`}>{fmt(v as number)}</td>
                </tr>
              ))}
              {isPro && report.averageHourlyRate !== null && report.activityHours > 0 && (
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-700">{tr("Rentabilité horaire")} · {tr("Pour {hours} h effectuées sur vos activités", { hours: report.activityHours })}</td>
                  <td className="py-1.5 text-right font-bold tabular-nums text-slate-950">{fmt(report.averageHourlyRate)}/h</td>
                </tr>
              )}
            </tbody>
          </table>
          {(split.exceptional > 0 || split.refunds > 0 || report.otherCurrencies.length > 0) && (
            <div className="mt-2 space-y-0.5 text-[8pt] text-slate-600">
              {split.exceptional > 0 && <p>{tr("dont revenus exceptionnels : {amount}", { amount: fmt(split.exceptional) })}</p>}
              {split.refunds > 0 && (
                <p>
                  {tr("dont remboursements (pas des gains) : {amount}", { amount: fmt(split.refunds) })} ·{" "}
                  {tr("Revenus hors remboursements : {amount}", { amount: fmt(split.gains) })}
                </p>
              )}
              {report.otherCurrencies.length > 0 && (
                <p>
                  {tr("Autres devises (non additionnées) :")} {report.otherCurrencies.map((c) => formatAmount(c.realNetBalance, c.currency)).join(" · ")}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rm-block">
          <H2 note={deltas?.indicative ? tr("Comparaison indicative : une des deux périodes est incomplète") : undefined}>
            {tr("Comparaison avec la période précédente")}
          </H2>
          {!deltas ? (
            <Note>
              {isPro || granularity === "month"
                ? tr("Pas encore de données pour {period} : la comparaison apparaîtra dès qu'il y aura deux périodes à comparer.", { period: prevLabel })
                : tr("La comparaison par trimestre, par année ou sur une période personnalisée est incluse dans le forfait Pro. La comparaison mois par mois reste gratuite.")}
            </Note>
          ) : (
            <div className="grid grid-cols-[42%_1fr] items-center gap-5">
              <div>
                <GroupedBars
                  groups={[
                    { label: prevLabel, income: deltas.incomeReceived.previous, expense: deltas.expensesPaid.previous },
                    { label: periodLabel, income: deltas.incomeReceived.current, expense: deltas.expensesPaid.current },
                  ]}
                  currency={currency}
                  incomeLabel={tr("Revenus encaissés")}
                  expenseLabel={tr("Dépenses payées")}
                />
                <Legend items={[{ color: INCOME_COLOR, label: tr("Revenus encaissés") }, { color: EXPENSE_COLOR, label: tr("Dépenses payées") }]} />
              </div>
              <table className="w-full text-[8.5pt]">
                <thead>
                  <tr className="border-b border-slate-300 text-left text-slate-500">
                    <th className="py-1 font-semibold"></th>
                    <th className="py-1 text-right font-semibold capitalize">{prevLabel}</th>
                    <th className="py-1 text-right font-semibold capitalize">{periodLabel}</th>
                    <th className="py-1 text-right font-semibold">{tr("Écart")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { l: tr("Revenus encaissés"), d: deltas.incomeReceived, up: true },
                    { l: tr("Revenus attendus"), d: deltas.incomeExpected, up: true },
                    { l: tr("Dépenses payées"), d: deltas.expensesPaid, up: false },
                    { l: tr("Solde net encaissé"), d: deltas.realNetBalance, up: true },
                  ].map((r) => (
                    <tr key={r.l} className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-700">{r.l}</td>
                      <td className="py-1.5 text-right tabular-nums text-slate-600">{fmt(r.d.previous)}</td>
                      <td className="py-1.5 text-right font-bold tabular-nums text-slate-950">{fmt(r.d.current)}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">
                        <Delta d={r.d} goodWhenUp={r.up} indicative={deltas.indicative} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Sheet>

      {/* ---------------- Page 2 : évolution et dépenses ---------------- */}
      <Sheet header={header(tr("Évolution et dépenses"))}>
        <div className="rm-block">
          <H2 note={tr("{n} mois", { n: months.length })}>{tr("Évolution")}</H2>
          {coveredMonths.length === 0 ? (
            <Note>{tr("Pas encore de données disponibles pour cette période.")}</Note>
          ) : (
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
                  { color: "#334155", label: tr("Solde net"), dashed: true },
                ]}
              />
              <p className="mt-1 text-center text-[7.5pt] text-slate-500">{tr("Les mois grisés n'ont pas encore de données : ils ne sont pas comptés comme des zéros.")}</p>
            </>
          )}
        </div>

        <div className="rm-block">
          <H2 note={paidTotal > 0 ? fmt(paidTotal) : undefined}>{tr("Dépenses payées par catégorie")}</H2>
          {slices.length === 0 ? (
            <Note>{tr("Aucune dépense payée sur cette période.")}</Note>
          ) : (
            <div className="grid grid-cols-[170px_1fr] items-center gap-6">
              <DonutChart slices={slices} currency={currency} centerLabel={tr("Total payé")} size={170} />
              <table className="w-full text-[8.5pt]">
                <tbody>
                  {slices.map((s) => (
                    <tr key={s.key} className="border-b border-slate-100">
                      <td className="py-1">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: s.color }} />
                        {s.label}
                      </td>
                      <td className="py-1 text-right font-bold tabular-nums">{fmt(s.value)}</td>
                      <td className="w-12 py-1 text-right tabular-nums text-slate-500">{paidTotal > 0 ? Math.round((s.value / paidTotal) * 100) : 0} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {report.plannedCategoryBreakdown.length > 0 && (
            <p className="mt-2 text-[8pt] text-slate-600">
              {tr("Prévues, non payées :")} {report.plannedCategoryBreakdown.map((c) => `${tr(expenseCategoryLabel(c.category))} ${fmt(c.amount)}`).join(" · ")}
            </p>
          )}
        </div>

        {isPro && (
          <div className="rm-block grid grid-cols-2 gap-6">
            <div>
              <H2>{tr("Ce qui a changé")}</H2>
              {changes.length === 0 ? (
                <p className="text-[8.5pt] text-slate-500">{deltas ? tr("Aucune variation notable par rapport à {period}.", { period: prevLabel }) : tr("Pas encore de période précédente à comparer.")}</p>
              ) : (
                <table className="w-full text-[8.5pt]">
                  <tbody>
                    {changes.map((c) => (
                      <tr key={c.cat} className="border-b border-slate-100">
                        <td className="py-1 text-slate-700">{tr(expenseCategoryLabel(c.cat))}</td>
                        <td className={`py-1 text-right font-bold tabular-nums ${c.delta > 0 ? "text-red-600" : "text-emerald-700"}`}>
                          {c.delta > 0 ? "▲ +" : "▼ −"}
                          {fmt(Math.abs(c.delta))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <H2>{tr("Récurrentes / ponctuelles")}</H2>
              <table className="w-full text-[8.5pt]">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 text-slate-700">{tr("Récurrentes")}</td>
                    <td className="py-1 text-right font-bold tabular-nums">{fmt(report.expenseKinds.recurringPaid)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1 text-slate-700">{tr("Ponctuelles")}</td>
                    <td className="py-1 text-right font-bold tabular-nums">{fmt(report.expenseKinds.ponctualPaid)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-700">{tr("Dépenses à venir")}</td>
                    <td className="py-1 text-right font-bold tabular-nums text-amber-700">{fmt(report.totalExpensesUpcoming)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-1 text-[7.5pt] text-slate-500">{tr("Estimation : une dépense est récurrente si elle a été payée depuis l'échéancier.")}</p>
            </div>
          </div>
        )}
      </Sheet>

      {/* ---------------- Page 3 : activités et revenus ---------------- */}
      <Sheet header={header(tr("Activités et revenus"))}>
        <div className="rm-block">
          <H2>{tr("Rentabilité par activité")}</H2>
          {!isPro ? (
            <Note>{tr("Le calcul automatique de la rentabilité par activité et de votre taux horaire réel est inclus à partir du forfait Pro.")}</Note>
          ) : activities.length === 0 && !general ? (
            <Note>{tr("Aucune donnée d'activité disponible sur la période sélectionnée.")}</Note>
          ) : (
            <>
              {activities.length > 0 && (
                <div className="mb-3">
                  <DivergingBars rows={activities.map((a) => ({ key: a.activityId ?? a.activityName, label: a.activityName, value: a.netRealProfit, color: a.activityColor }))} currency={currency} />
                </div>
              )}
              <table className="w-full text-[8pt] [&_td+td]:pl-3 [&_th+th]:pl-3">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500">
                    <th className="py-1 text-left font-semibold">{tr("Activité")}</th>
                    <th className="py-1 text-right font-semibold">{tr("Encaissé")}</th>
                    <th className="py-1 text-right font-semibold">{tr("Attendu")}</th>
                    <th className="py-1 text-right font-semibold">{tr("Dépenses payées")}</th>
                    <th className="py-1 text-right font-semibold">{tr("Solde net")}</th>
                    <th className="py-1 text-right font-semibold">{tr("Heures")}</th>
                    <th className="py-1 text-right font-semibold">{tr("Par heure")}</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.activityId ?? a.activityName} className="border-b border-slate-100">
                      <td className="py-1.5">
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: a.activityColor ?? OTHER_COLOR }} />
                        <span className="font-semibold text-slate-900">{a.activityName}</span>
                        {a.incomplete && <span className="ml-1 text-[7pt] font-semibold text-amber-700">· {tr("Données incomplètes")}</span>}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(a.incomeReceived)}</td>
                      <td className="py-1.5 text-right tabular-nums text-amber-700">{fmt(a.incomeExpected)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(a.expensesPaid)}</td>
                      <td className={`py-1.5 text-right font-bold tabular-nums ${a.netRealProfit >= 0 ? "text-[#1F7A55]" : "text-red-600"}`}>{fmt(a.netRealProfit)}</td>
                      <td className="py-1.5 text-right tabular-nums">{a.totalHours > 0 ? `${a.totalHours} h` : "—"}</td>
                      <td className="py-1.5 text-right tabular-nums">{a.hourlyRate !== null ? `${fmt(a.hourlyRate)}` : "—"}</td>
                    </tr>
                  ))}
                  {general && (
                    <tr className="bg-slate-50">
                      <td className="py-1.5 italic text-slate-700">{tr("Général (non rattaché à une activité)")}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(general.incomeReceived)}</td>
                      <td className="py-1.5 text-right tabular-nums text-amber-700">{fmt(general.incomeExpected)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(general.expensesPaid)}</td>
                      <td className={`py-1.5 text-right font-bold tabular-nums ${general.netRealProfit >= 0 ? "text-[#1F7A55]" : "text-red-600"}`}>{fmt(general.netRealProfit)}</td>
                      <td className="py-1.5 text-right">—</td>
                      <td className="py-1.5 text-right">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {general && <p className="mt-1 text-[7.5pt] text-slate-500">{tr("Les montants généraux ne sont jamais répartis entre vos activités.")}</p>}
            </>
          )}
        </div>

        <div className="rm-block">
          <H2>{tr("Sources de revenus encaissés")}</H2>
          {report.incomeBreakdown.length === 0 && split.refunds === 0 ? (
            <Note>{tr("Aucun revenu encaissé sur cette période.")}</Note>
          ) : (
            <table className="w-full text-[8.5pt]">
              <tbody>
                {report.incomeBreakdown.map((s) => (
                  <tr key={s.category} className="border-b border-slate-100">
                    <td className="py-1 text-slate-700">{s.category}</td>
                    <td className="py-1 text-right font-bold tabular-nums">{fmt(s.amount)}</td>
                    <td className="w-12 py-1 text-right tabular-nums text-slate-500">{s.percentage} %</td>
                  </tr>
                ))}
                {split.refunds > 0 && (
                  <tr className="text-slate-500">
                    <td className="py-1 italic">{tr("Remboursements (pas un gain)")}</td>
                    <td className="py-1 text-right tabular-nums">{fmt(split.refunds)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Sheet>

      {/* ---------------- Annexe : détail mensuel ---------------- */}
      <Sheet header={header(tr("Annexe"))}>
        <div>
          <H2>{tr("Détail mensuel")}</H2>
          <table className="w-full text-[8pt] [&_td+td]:pl-3 [&_th+th]:pl-3">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500">
                <th className="py-1 text-left font-semibold">{tr("Mois")}</th>
                <th className="py-1 text-right font-semibold">{tr("Encaissé")}</th>
                <th className="py-1 text-right font-semibold">{tr("Attendu")}</th>
                <th className="py-1 text-right font-semibold">{tr("Payé")}</th>
                <th className="py-1 text-right font-semibold">{tr("Prévues")}</th>
                <th className="py-1 text-right font-semibold">{tr("Solde net")}</th>
                <th className="py-1 text-right font-semibold">{tr("Statut")}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) =>
                m.coverage === "none" ? (
                  <tr key={m.monthKey} className="border-b border-slate-100 text-slate-400">
                    <td className="py-1.5 capitalize">{L.month(m.monthKey)}</td>
                    <td colSpan={5} className="py-1.5 text-center italic">{tr("Pas de données")}</td>
                    <td className="py-1.5 text-right">—</td>
                  </tr>
                ) : (
                  <tr key={m.monthKey} className="border-b border-slate-100">
                    <td className="py-1.5 capitalize text-slate-800">{L.month(m.monthKey)}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmt(m.incomeReceived)}</td>
                    <td className="py-1.5 text-right tabular-nums text-amber-700">{fmt(m.incomeExpected)}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmt(m.expensesPaid)}</td>
                    <td className="py-1.5 text-right tabular-nums text-amber-700">{fmt(m.expensesPlanned)}</td>
                    <td className={`py-1.5 text-right font-bold tabular-nums ${m.netReal >= 0 ? "text-[#1F7A55]" : "text-red-600"}`}>{fmt(m.netReal)}</td>
                    <td className="py-1.5 text-right text-[7pt] text-slate-500">
                      {m.coverage === "partial" ? tr("partiel") : m.coverage === "zero" ? tr("aucune opération") : tr("complet")}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <div className="mt-6 space-y-1 border-t border-slate-200 pt-3 text-[7.5pt] text-slate-500">
            <p>{tr("Montants en {currency}. Les autres devises sont indiquées à part et ne sont jamais additionnées.", { currency })}</p>
            <p>{tr("Une opération compte dans le mois de sa date réelle, même si elle a été saisie plus tard.")}</p>
            <p>
              {tr("Document généré par Remind Me le {date}", { date: generatedAt })} · {documentRef}
            </p>
          </div>
        </div>
      </Sheet>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { tr } = useLanguage();
  return (
    <div className="rm-doc min-h-screen bg-slate-200 py-6 text-slate-900 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4 print:hidden">
        <a href="/reports" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> {tr("Retour aux statistiques")}
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-slate-600 sm:inline">{tr("Choisissez « Enregistrer au format PDF » dans la fenêtre d'impression.")}</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#214E3B] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#1A3E2F]"
          >
            <Download className="h-4 w-4" /> {tr("Télécharger le PDF")}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto px-4 print:overflow-visible print:px-0">{children}</div>
    </div>
  );
}

function Legend({ items }: { items: Array<{ color: string; label: string; dashed?: boolean }> }) {
  return (
    <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[7.5pt] text-slate-600">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? (
            <svg width="16" height="4">
              <line x1="0" y1="2" x2="16" y2="2" stroke={i.color} strokeWidth="2" strokeDasharray="4 3" />
            </svg>
          ) : (
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  );
}
