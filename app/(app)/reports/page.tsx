import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { getFinancesForRange, summarizeByActivity } from "@/lib/finances/aggregate";
import { formatAmount } from "@/lib/finances/format";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user!.id).single();
  const timezone = profile?.timezone ?? "UTC";
  const today = DateTime.now().setZone(timezone);
  const todayISO = today.toISODate()!;

  // Par défaut : l'année civile en cours. Contrairement à /finances (qui
  // montre une fenêtre glissante mois-1 → +2), un rapport sert à regarder en
  // arrière sur une période choisie — l'année en cours est le point de
  // départ le plus utile, ajustable via le formulaire de dates ci-dessous.
  const defaultStart = today.startOf("year").toISODate()!;
  const defaultEnd = today.endOf("year").toISODate()!;

  const rangeStart =
    searchParams.from && DateTime.fromISO(searchParams.from).isValid ? searchParams.from : defaultStart;
  const rangeEnd = searchParams.to && DateTime.fromISO(searchParams.to).isValid ? searchParams.to : defaultEnd;

  await ensureIncomeEntries(supabase, user!.id, rangeStart, rangeEnd);
  const { income, expenses } = await getFinancesForRange(supabase, user!.id, rangeStart, rangeEnd, todayISO);

  const byActivity = summarizeByActivity(income, expenses);

  const overallTotals = new Map<string, { income: number; expenses: number }>();
  for (const row of byActivity) {
    const t = overallTotals.get(row.currency) ?? { income: 0, expenses: 0 };
    t.income += row.income;
    t.expenses += row.expenses;
    overallTotals.set(row.currency, t);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Rapports</h1>
          <p className="text-ink-500">Historique et statistiques par activité sur la période choisie.</p>
        </div>
        <a
          href={`/api/finances/export?from=${rangeStart}&to=${rangeEnd}`}
          className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-canvas-raised"
        >
          Exporter en CSV
        </a>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-4 rounded-lg border border-ink-100 bg-canvas-raised p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="from" className="text-sm font-medium text-ink-700">
            Du
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={rangeStart}
            className="rounded-md border border-ink-300 bg-canvas px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="to" className="text-sm font-medium text-ink-700">
            Au
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={rangeEnd}
            className="rounded-md border border-ink-300 bg-canvas px-3 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal/90">
          Appliquer
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Ensemble de la période</h2>
        {overallTotals.size === 0 ? (
          <p className="text-sm text-ink-500">Aucun mouvement sur cette période.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Array.from(overallTotals.entries()).map(([currency, t]) => (
              <span
                key={currency}
                className="rounded-full border border-ink-200 px-3 py-1 text-sm font-medium text-ink-700"
              >
                Revenus {formatAmount(t.income, currency)} · Dépenses {formatAmount(t.expenses, currency)} · Net{" "}
                {formatAmount(t.income - t.expenses, currency)}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Par activité</h2>
        {byActivity.length === 0 ? (
          <p className="text-sm text-ink-500">Rien à afficher sur cette période.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-ink-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-canvas-raised text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-2 font-semibold">Activité</th>
                  <th className="px-4 py-2 font-semibold">Devise</th>
                  <th className="px-4 py-2 text-right font-semibold">Revenus</th>
                  <th className="px-4 py-2 text-right font-semibold">Dépenses</th>
                  <th className="px-4 py-2 text-right font-semibold">Net</th>
                </tr>
              </thead>
              <tbody>
                {byActivity.map((row) => (
                  <tr key={`${row.activityId ?? "none"}-${row.currency}`} className="border-b border-ink-100 last:border-0">
                    <td className="px-4 py-2 text-ink-950">{row.activityName}</td>
                    <td className="px-4 py-2 text-ink-500">{row.currency}</td>
                    <td className="px-4 py-2 text-right text-ink-950">{formatAmount(row.income, row.currency)}</td>
                    <td className="px-4 py-2 text-right text-ink-950">{formatAmount(row.expenses, row.currency)}</td>
                    <td
                      className={`px-4 py-2 text-right font-medium ${
                        row.income - row.expenses < 0 ? "text-danger" : "text-positive"
                      }`}
                    >
                      {formatAmount(row.income - row.expenses, row.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
