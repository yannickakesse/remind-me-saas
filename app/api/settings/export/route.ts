import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

/**
 * §98 du prompt maître — "Export my data". Un export JSON complet des
 * données de l'utilisateur, table par table. Chaque requête est déjà
 * filtrée par RLS (auth.uid() = user_id) — aucun risque de fuite vers un
 * autre compte même en cas d'erreur de code ici.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // Limitation de débit : max 5 exports complets par heure par utilisateur
  const rl = checkRateLimit(`export_all:${user.id}`, 5, 3600);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Limite d'exports atteinte. Réessayez dans une heure." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  const [
    profile,
    userSettings,
    subscription,
    activities,
    organizations,
    contacts,
    calendarEvents,
    tasks,
    income,
    expenses,
    notifications,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("activities").select("*").eq("user_id", user.id),
    supabase.from("organizations").select("*").eq("user_id", user.id),
    supabase.from("contacts").select("*").eq("user_id", user.id),
    supabase.from("calendar_events").select("*").eq("user_id", user.id),
    supabase.from("tasks").select("*").eq("user_id", user.id),
    supabase.from("income").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("notifications").select("*").eq("user_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account_email: user.email,
    profile: profile.data,
    user_settings: userSettings.data,
    subscription: subscription.data,
    activities: activities.data ?? [],
    organizations: organizations.data ?? [],
    contacts: contacts.data ?? [],
    calendar_events: calendarEvents.data ?? [],
    tasks: tasks.data ?? [],
    income: income.data ?? [],
    expenses: expenses.data ?? [],
    notifications: notifications.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
