import { NextResponse, type NextRequest } from "next/server";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ensureCalendarEvents } from "@/lib/calendar/sync";
import { detectConflicts } from "@/lib/calendar/conflicts";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getUserTimezone } from "@/lib/time/timezones";
import { generateCalendarPdf, type CalendarPdfEvent, type CalendarPdfActivity } from "@/lib/calendar/pdf-generator";
import type { CalendarEventView } from "@/components/calendar/types";

export const dynamic = "force-dynamic";

/**
 * Route d'export PDF A4 officiel du calendrier Remind Me
 * GET /api/calendar/export?date=YYYY-MM-DD&orientation=landscape&locale=fr
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // Limitation de débit : max 15 exports de calendrier par 10 minutes par utilisateur
  const rl = checkRateLimit(`export_calendar:${user.id}`, 15, 600);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Limite d'exports de calendrier atteinte. Veuillez patienter quelques minutes." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, timezone, country_code")
    .eq("id", user.id)
    .single();

  const timezone = getUserTimezone(profile);
  const today = DateTime.now().setZone(timezone);

  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get("date");
  const orientationParam = searchParams.get("orientation") === "portrait" ? "portrait" : "landscape";
  const localeParam = searchParams.get("locale") || "fr";

  // Date d'ancrage validée
  const anchorDate =
    dateParam && DateTime.fromISO(dateParam).isValid
      ? dateParam
      : today.toISODate()!;

  const anchorDt = DateTime.fromISO(anchorDate, { zone: timezone });
  const monthStart = anchorDt.startOf("month");
  const monthEnd = anchorDt.endOf("month");

  // Fenêtre de la grille (semaines complètes débordantes pour cohérence totale avec la vue mensuelle)
  const gridStart = monthStart.startOf("week");
  const gridEnd = monthEnd.endOf("week");

  const rangeStartISO = gridStart.toISODate()!;
  const rangeEndISO = gridEnd.toISODate()!;

  // 1. Synchronisation des occurrences de calendrier
  await ensureCalendarEvents(supabase, user.id, rangeStartISO, rangeEndISO, timezone);

  // 2. Récupération des données en parallèle
  const [
    { data: rawEvents },
    { data: rawScheduled },
    { data: rawActivities },
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, activity_id, schedule_id, title, starts_at, ends_at, status, is_exception, original_starts_at, notes, activities(color, name)")
      .eq("user_id", user.id)
      .gte("starts_at", gridStart.toUTC().toISO()!)
      .lte("starts_at", gridEnd.toUTC().toISO()!)
      .order("starts_at", { ascending: true }),
    supabase
      .from("scheduled_expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("next_due_date", rangeStartISO)
      .lte("next_due_date", rangeEndISO)
      .neq("status", "cancelled"),
    supabase
      .from("activities")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const regularEvents: CalendarEventView[] = (rawEvents ?? []).map((e) => ({
    ...e,
    activity: Array.isArray(e.activities) ? e.activities[0] ?? null : e.activities,
  }));

  const conflictIds = detectConflicts(regularEvents);

  const regularPdfEvents: CalendarPdfEvent[] = regularEvents.map((e) => ({
    id: e.id,
    title: e.title,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    status: e.status,
    activityName: e.activity?.name || "Général",
    activityColor: e.activity?.color || "#3B82F6",
    is_scheduled_expense: false,
    notes: e.notes,
    hasConflict: conflictIds.has(e.id),
  }));

  const scheduledPdfEvents: CalendarPdfEvent[] = (rawScheduled ?? []).map((sc) => {
    const dt = DateTime.fromISO(sc.next_due_date, { zone: timezone }).set({ hour: 9, minute: 0 });
    return {
      id: `scheduled-${sc.id}`,
      title: `${sc.name} (${sc.amount} ${sc.currency})`,
      starts_at: dt.toUTC().toISO()!,
      ends_at: dt.plus({ hours: 1 }).toUTC().toISO()!,
      status: sc.status === "paid" ? "completed" : "planned",
      activityName: "Dépense programmée",
      activityColor: "#D97706",
      is_scheduled_expense: true,
      amount: sc.amount,
      currency: sc.currency,
      notes: sc.notes,
      hasConflict: false,
    };
  });

  const allEvents = [...regularPdfEvents, ...scheduledPdfEvents].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const activities: CalendarPdfActivity[] = (rawActivities ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color || "#3B82F6",
  }));

  const pdfBuffer = generateCalendarPdf({
    anchorDate,
    timezone,
    locale: localeParam,
    orientation: orientationParam,
    user: {
      fullName: profile?.full_name || null,
      email: user.email || null,
      planName: "Remind Me Pro",
    },
    events: allEvents,
    activities,
  });

  const monthFormatted = anchorDt.toFormat("yyyy-MM");
  const filename = `RemindMe_Calendrier_${monthFormatted}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
