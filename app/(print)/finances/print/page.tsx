import { DateTime } from "luxon";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { aggregateFinancesForMonth } from "@/lib/finances/aggregate";
import { getUserTimezone } from "@/lib/time/timezones";
import { getUserSubscription } from "@/lib/subscriptions/server";
import { PrintableStatement } from "@/components/finances/printable-statement";

export const dynamic = "force-dynamic";

export default async function FinancesPrintPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const timezone = getUserTimezone(profile);
  const defaultCurrency = profile?.default_currency ?? "XOF";
  const today = DateTime.now().setZone(timezone);

  const monthParam = searchParams?.month;
  const currentMonth =
    monthParam && DateTime.fromFormat(monthParam, "yyyy-MM").isValid
      ? DateTime.fromFormat(monthParam, "yyyy-MM", { zone: timezone })
      : today.startOf("month");

  const rangeStart = currentMonth.startOf("month").toISODate()!;
  const rangeEnd = currentMonth.endOf("month").toISODate()!;

  const supabase = createClient();
  const userSub = await getUserSubscription(supabase, user.id);

  // Synchronisation des revenus
  await ensureIncomeEntries(supabase, user.id, rangeStart, rangeEnd);

  const [
    { data: incomeRows },
    { data: expenseRows },
    { data: scheduledExpenses },
  ] = await Promise.all([
    supabase
      .from("income")
      .select("*, activity:activities(id, name, color)")
      .eq("user_id", user.id)
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
      .order("due_date", { ascending: true }),
    supabase
      .from("expenses")
      .select("*, activity:activities(id, name, color)")
      .eq("user_id", user.id)
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
      .order("due_date", { ascending: true }),
    supabase
      .from("scheduled_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("next_due_date", { ascending: true }),
  ]);

  const aggregates = aggregateFinancesForMonth(
    incomeRows ?? [],
    expenseRows ?? [],
    today.toISODate()!
  );

  const docHash = Math.abs(
    user.id.split("-").reduce((acc, part) => acc + parseInt(part, 16) || 0, 0)
  ).toString(36).toUpperCase().padStart(4, "0");

  const documentRef = `RM-STMT-${currentMonth.toFormat("yyyyMM")}-${docHash}`;

  return (
    <PrintableStatement
      user={{
        fullName: profile?.full_name ?? null,
        email: user.email,
        planName: userSub.entitlements.planName,
      }}
      period={{
        monthLabel: currentMonth.setLocale("fr").toFormat("LLLL yyyy"),
        generatedAtFormatted: today.setLocale("fr").toFormat("dd/MM/yyyy HH:mm"),
        documentRef,
      }}
      defaultCurrency={defaultCurrency}
      totals={{
        totalIncomeReceived: aggregates.totalIncomeReceived,
        totalIncomeExpected: aggregates.totalIncomePending,
        totalExpensesPaid: aggregates.totalExpensesPaid,
        totalExpensesPlanned: aggregates.totalExpensesPending,
        netRealBalance: aggregates.netBalance,
      }}
      incomeRows={incomeRows ?? []}
      expenseRows={expenseRows ?? []}
      scheduledExpenses={scheduledExpenses ?? []}
    />
  );
}
