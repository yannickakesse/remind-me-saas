import { getServerLocale } from "@/lib/i18n/server";
import { DateTime } from "luxon";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { calculateProfitabilityReport } from "@/lib/reports/profitability";
import { getUserTimezone } from "@/lib/time/timezones";
import { getUserSubscription } from "@/lib/subscriptions/server";
import { PrintReport } from "@/components/reports/print-report";

export const dynamic = "force-dynamic";

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const [user, profile] = await Promise.all([requireCurrentUser(), getCurrentProfile()]);
  if (!user) redirect("/login");

  const timezone = getUserTimezone(profile);
  const defaultCurrency = profile?.default_currency ?? "XOF";
  const today = DateTime.now().setZone(timezone);
  const supabase = createClient();
  const userSub = await getUserSubscription(supabase, user.id);
  // Mêmes droits que l'écran : analyse détaillée réservée aux forfaits Pro et Premium
  const isPro = userSub.entitlements.hourlyProfitability;

  // Même période que l'écran (mois en cours par défaut)
  const validFrom = searchParams?.from && DateTime.fromISO(searchParams.from).isValid ? searchParams.from : null;
  const validTo = searchParams?.to && DateTime.fromISO(searchParams.to).isValid ? searchParams.to : null;
  let rangeStart = validFrom ?? today.startOf("month").toISODate()!;
  let rangeEnd = validTo ?? today.endOf("month").toISODate()!;
  if (rangeStart > rangeEnd) [rangeStart, rangeEnd] = [rangeEnd, rangeStart];

  // Synchronisation des revenus : période + 12 mois d'historique (courbe et annexe)
  const historyStart = DateTime.fromISO(rangeEnd, { zone: timezone }).minus({ months: 11 }).startOf("month").toISODate()!;
  const accountStart = user.created_at
    ? DateTime.fromISO(user.created_at, { zone: timezone }).startOf("month").toISODate()!
    : null;
  const earliest = rangeStart < historyStart ? rangeStart : historyStart;
  await ensureIncomeEntries(supabase, user.id, accountStart && earliest < accountStart ? accountStart : earliest, rangeEnd);

  const report = await calculateProfitabilityReport(supabase, user.id, rangeStart, rangeEnd, timezone, defaultCurrency, user.created_at);

  const docHash = Math.abs(user.id.split("-").reduce((acc, part) => acc + parseInt(part, 16) || 0, 0))
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");

  return (
    <PrintReport
      report={report}
      currency={defaultCurrency}
      start={rangeStart}
      end={rangeEnd}
      today={today.toISODate()!}
      isPro={isPro}
      user={{ fullName: profile?.full_name ?? null, email: user.email, planName: userSub.entitlements.planName }}
      generatedAt={today.setLocale(getServerLocale()).toFormat("dd/MM/yyyy HH:mm")}
      documentRef={`RM-${today.toFormat("yyyyMM")}-${docHash}`}
    />
  );
}
