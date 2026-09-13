import { NextResponse, type NextRequest } from "next/server";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ensureIncomeEntries } from "@/lib/finances/sync";
import { getFinancesForRange } from "@/lib/finances/aggregate";
import { buildFinancesCsv } from "@/lib/finances/csv";
import { checkRateLimit } from "@/lib/security/rate-limit";

/**
 * Export CSV des revenus + dépenses sur une période. Réutilise
 * exactement la même requête/dérivation de statut que /finances
 * (lib/finances/aggregate.ts) pour que l'export corresponde toujours à
 * ce que l'utilisateur voit à l'écran.
 *
 * GET /api/finances/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 * `from`/`to` optionnels : par défaut, même fenêtre que la page
 * /finances (mois précédent → +2 mois), pour qu'un export "sans réglage"
 * corresponde à l'écran par défaut.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // Limitation de débit : max 10 exports CSV par 10 minutes par utilisateur
  const rl = checkRateLimit(`export_finances:${user.id}`, 10, 600);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Limite d'exports atteinte. Veuillez patienter quelques minutes." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  const timezone = profile?.timezone ?? "UTC";
  const today = DateTime.now().setZone(timezone);

  const searchParams = request.nextUrl.searchParams;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const defaultStart = today.minus({ months: 1 }).startOf("month").toISODate();
  const defaultEnd = today.plus({ months: 2 }).endOf("month").toISODate();
  if (!defaultStart || !defaultEnd) {
    return NextResponse.json({ error: "Impossible de calculer la période par défaut." }, { status: 500 });
  }

  const rangeStart = fromParam && DateTime.fromISO(fromParam).isValid ? fromParam : defaultStart;
  const rangeEnd = toParam && DateTime.fromISO(toParam).isValid ? toParam : defaultEnd;

  if (rangeStart > rangeEnd) {
    return NextResponse.json({ error: "La date de début doit précéder la date de fin." }, { status: 400 });
  }

  const todayISO = today.toISODate();
  if (!todayISO) {
    return NextResponse.json({ error: "Impossible de déterminer la date du jour." }, { status: 500 });
  }

  await ensureIncomeEntries(supabase, user.id, rangeStart, rangeEnd);
  const { income, expenses } = await getFinancesForRange(supabase, user.id, rangeStart, rangeEnd, todayISO);

  const csv = buildFinancesCsv(income, expenses, timezone);
  const filename = `finances_${rangeStart}_${rangeEnd}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
