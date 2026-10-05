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

    const [{ data: profile }, { data: prefs }] = await Promise.all([
      supabase
        .from("profiles")
        .select("timezone, country_code, full_name, locale")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("notification_preferences")
        .select("voice_reminders, voice_type, voice_language, repeat_voice")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const timezone = getUserTimezone(profile);

    // 1. Récupérer les notifications non lues actives
    const { data: unread } = await supabase
      .from("notifications")
      .select("id, title, body, category, kind, link, priority, metadata, created_at")
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
      userName: profile?.full_name || null,
      voicePrefs: {
        voice_reminders: prefs?.voice_reminders ?? true,
        voice_type: prefs?.voice_type ?? "system",
        voice_language: prefs?.voice_language ?? "fr",
        repeat_voice: prefs?.repeat_voice ?? 0,
      },
    });
  } catch (error: any) {
    console.error("[Notifications:Poll] Erreur:", error);
    return NextResponse.json(
      { success: false, unread: [], error: error.message },
      { status: 500 }
    );
  }
}
