import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateSmartReminders } from "@/lib/notifications/engine";
import { getUserTimezone } from "@/lib/time/timezones";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone, country_code")
      .eq("id", user.id)
      .maybeSingle();

    const timezone = getUserTimezone(profile);


    // 1. Évaluer les rappels récents
    await evaluateSmartReminders(supabase, user.id, timezone);

    // 2. Récupérer les notifications non lues actives
    const { data: unread } = await supabase
      .from("notifications")
      .select("id, title, body, category, kind, link, priority, created_at")
      .eq("user_id", user.id)
      .is("read_at", null)
      .neq("status", "resolved")
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      unread: unread || [],
      count: unread?.length || 0,
    });
  } catch (error: any) {
    console.error("[Notifications:Poll] Erreur:", error);
    return NextResponse.json(
      { success: false, unread: [], error: error.message },
      { status: 500 }
    );
  }
}
