import { DateTime } from "luxon";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { calculateProfitabilityReport } from "@/lib/reports/profitability";
import { getUserTimezone } from "@/lib/time/timezones";
import { getUserSubscription } from "@/lib/subscriptions/server";
import { PrintableReport } from "@/components/reports/printable-report";

export const dynamic = "force-dynamic";

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
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
  const supabase = createClient();

  const userSub = await getUserSubscription(supabase, user.id);

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

  // Synchronisation des revenus
  await ensureIncomeEntries(supabase, user.id, rangeStart, rangeEnd);

  // Calcul du rapport complet
  const {
    profitabilityList,
    categoryBreakdown,
    monthlyEvolution,
    totalHoursWorked,
    totalIncomeReceived,
    totalIncomeExpected,
    totalExpensesPaid,
    totalExpensesPlanned,
    realNetBalance,
    otherCurrencies,
  } = await calculateProfitabilityReport(supabase, user.id, rangeStart, rangeEnd, timezone, defaultCurrency);

  const averageHourlyRate =
    totalHoursWorked > 0 ? Math.round(realNetBalance / totalHoursWorked) : null;

  const dtStart = DateTime.fromISO(rangeStart, { zone: timezone });
  const dtEnd = DateTime.fromISO(rangeEnd, { zone: timezone });

  const docHash = Math.abs(
    user.id.split("-").reduce((acc, part) => acc + parseInt(part, 16) || 0, 0)
  ).toString(36).toUpperCase().padStart(4, "0");

  const documentRef = `RM-${today.toFormat("yyyyMM")}-${docHash}`;

  return (
    <PrintableReport
      user={{
        fullName: profile?.full_name ?? null,
        email: user.email,
        planName: userSub.entitlements.planName,
      }}
      period={{
        from: rangeStart,
        to: rangeEnd,
        fromLabel: dtStart.setLocale("fr").toFormat("dd LLL yyyy"),
        toLabel: dtEnd.setLocale("fr").toFormat("dd LLL yyyy"),
        generatedAtFormatted: today.setLocale("fr").toFormat("dd/MM/yyyy HH:mm"),
        documentRef,
      }}
      metrics={{
        defaultCurrency,
        totalIncomeReceived,
        totalIncomeExpected,
        totalExpensesPaid,
        totalExpensesPlanned,
        realNetBalance,
        totalHoursWorked,
        averageHourlyRate,
        otherCurrencies,
      }}
      profitabilityList={profitabilityList}
      categoryBreakdown={categoryBreakdown}
      monthlyEvolution={monthlyEvolution}
    />
  );
}
