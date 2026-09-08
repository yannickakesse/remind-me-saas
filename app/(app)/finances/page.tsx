import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { getFinancesForRange, sumByCurrencyAndStatus, splitTotalsKey } from "@/lib/finances/aggregate";
import { financeStatusLabel, FINANCE_STATUS_STYLES, type FinanceStatus } from "@/lib/validation/finances";
import { setIncomeReceived, deleteIncome, setExpensePaid, deleteExpense } from "./actions";
import { formatAmount } from "@/lib/finances/format";

export default async function FinancesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user!.id).single();
  const timezone = profile?.timezone ?? "UTC";
  const today = DateTime.now().setZone(timezone);
  const todayISO = today.toISODate()!;

  // Fenêtre de matérialisation : mois précédent (pour ne pas rater des
  // échéances déjà en retard) jusqu'à deux mois plus tard (horizon "futur"
  // visible sur ce tableau de bord).
  const rangeStart = today.minus({ months: 1 }).startOf("month").toISODate()!;
  const rangeEnd = today.plus({ months: 2 }).endOf("month").toISODate()!;

  await ensureIncomeEntries(supabase, user!.id, rangeStart, rangeEnd);

  const { income, expenses } = await getFinancesForRange(supabase, user!.id, rangeStart, rangeEnd, todayISO);

  const incomeTotals = sumByCurrencyAndStatus(income);
  const expenseTotals = sumByCurrencyAndStatus(expenses);

  const STATUS_ORDER: FinanceStatus[] = ["late", "planned", "future", "received"];

  function renderTotals(totals: Map<string, number>, kind: "income" | "expense") {
    const entries = STATUS_ORDER.flatMap((status) =>
      Array.from(totals.entries())
        .filter(([key]) => key.startsWith(`${status}|`))
        .map(([key, amount]) => ({ ...splitTotalsKey(key), amount }))
    );
    if (entries.length === 0) return <p className="text-sm text-ink-500">Rien sur cette période.</p>;
    return (
      <div className="flex flex-wrap gap-3">
        {entries.map(({ status, currency, amount }) => (
          <span
            key={`${status}-${currency}`}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${FINANCE_STATUS_STYLES[status]}`}
          >
            {financeStatusLabel(status, kind)} : {formatAmount(amount, currency)}
          </span>
        ))}
      </div>
    );
  }

  function renderIncomeRow(item: (typeof income)[number]) {
    return (
      <li
        key={item.id}
        className="flex items-center justify-between gap-4 rounded-lg border border-ink-100 bg-canvas-raised px-4 py-3"
      >
        <div className="min-w-0">
          <p className="font-medium text-ink-950">{item.label}</p>
          <p className="text-sm text-ink-500">
            {item.activity ? <span className="mr-2">{item.activity.name}</span> : null}
            Échéance : {DateTime.fromISO(item.due_date, { zone: timezone }).setLocale("fr").toFormat("d MMM yyyy")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${FINANCE_STATUS_STYLES[item.status]}`}>
            {financeStatusLabel(item.status, "income")}
          </span>
          <span className="font-medium text-ink-950">{formatAmount(item.amount, item.currency)}</span>
          <form action={setIncomeReceived.bind(null, item.id, !item.received)}>
            <button type="submit" className="text-sm font-medium text-signal hover:underline">
              {item.received ? "Marquer non reçu" : "Marquer reçu"}
            </button>
          </form>
          <Link href={`/finances/income/${item.id}/edit`} className="text-sm text-ink-500 hover:underline">
            Modifier
          </Link>
          {!item.compensation_id ? (
            <form action={deleteIncome.bind(null, item.id)}>
              <button type="submit" className="text-sm text-ink-500 hover:text-danger hover:underline">
                Supprimer
              </button>
            </form>
          ) : null}
        </div>
      </li>
    );
  }

  function renderExpenseRow(item: (typeof expenses)[number]) {
    return (
      <li
        key={item.id}
        className="flex items-center justify-between gap-4 rounded-lg border border-ink-100 bg-canvas-raised px-4 py-3"
      >
        <div className="min-w-0">
          <p className="font-medium text-ink-950">{item.label}</p>
          <p className="text-sm text-ink-500">
            {item.activity ? <span className="mr-2">{item.activity.name}</span> : null}
            {item.category ? <span className="mr-2">{item.category}</span> : null}
            Échéance : {DateTime.fromISO(item.due_date, { zone: timezone }).setLocale("fr").toFormat("d MMM yyyy")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${FINANCE_STATUS_STYLES[item.status]}`}>
            {financeStatusLabel(item.status, "expense")}
          </span>
          <span className="font-medium text-ink-950">{formatAmount(item.amount, item.currency)}</span>
          <form action={setExpensePaid.bind(null, item.id, !item.paid)}>
            <button type="submit" className="text-sm font-medium text-signal hover:underline">
              {item.paid ? "Marquer non payé" : "Marquer payé"}
            </button>
          </form>
          <Link href={`/finances/expenses/${item.id}/edit`} className="text-sm text-ink-500 hover:underline">
            Modifier
          </Link>
          <form action={deleteExpense.bind(null, item.id)}>
            <button type="submit" className="text-sm text-ink-500 hover:text-danger hover:underline">
              Supprimer
            </button>
          </form>
        </div>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Finances</h1>
          <p className="text-ink-500">Prévisionnel vs réel — du mois dernier à deux mois d&apos;avance.</p>
        </div>
        {/* Même fenêtre que celle affichée à l'écran (rangeStart/rangeEnd) :
            l'export "sans réglage" correspond toujours à ce que l'utilisateur voit. */}
        <a
          href={`/api/finances/export?from=${rangeStart}&to=${rangeEnd}`}
          className="rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-canvas-raised"
        >
          Exporter en CSV
        </a>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Revenus</h2>
          <Link href="/finances/income/new" className="text-sm font-medium text-signal hover:underline">
            + Ajouter un revenu
          </Link>
        </div>
        <div className="mb-4">{renderTotals(incomeTotals, "income")}</div>
        {income.length === 0 ? (
          <p className="text-sm text-ink-500">Aucun revenu sur cette période.</p>
        ) : (
          <ul className="flex flex-col gap-2">{income.map(renderIncomeRow)}</ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Dépenses</h2>
          <Link href="/finances/expenses/new" className="text-sm font-medium text-signal hover:underline">
            + Ajouter une dépense
          </Link>
        </div>
        <div className="mb-4">{renderTotals(expenseTotals, "expense")}</div>
        {expenses.length === 0 ? (
          <p className="text-sm text-ink-500">Aucune dépense sur cette période.</p>
        ) : (
          <ul className="flex flex-col gap-2">{expenses.map(renderExpenseRow)}</ul>
        )}
      </section>
    </div>
  );
}
