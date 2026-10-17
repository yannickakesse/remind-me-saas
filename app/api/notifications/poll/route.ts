import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateSmartReminders } from "@/lib/notifications/engine";
import { getUserTimezone } from "@/lib/time/timezones";

export const dynamic = "force-dynamic";

const lastPollEvalByUser = new Map<string, number>();
const POLL_EVAL_COOLDOWN_MS = 25 * 1000; // 25 secondes de cooldown par utilisateur

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const [{ data: profile }, { data: prefs }, { data: userSettings }] = await Promise.all([
      supabase
        .from("profiles")
        .select("timezone, country_code, full_name, locale")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_settings")
        .select("notif_prefs")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const mergedPrefs = {
      ...((userSettings?.notif_prefs as Record<string, any>) || {}),
      ...(prefs || {}),
    };

    const timezone = getUserTimezone(profile);

    // Évaluation dynamique proactive des rappels à chaque cycle de polling (cooldown de 25s par utilisateur)
    const nowTimestamp = Date.now();
    const lastEval = lastPollEvalByUser.get(user.id) || 0;
    if (nowTimestamp - lastEval > POLL_EVAL_COOLDOWN_MS) {
      lastPollEvalByUser.set(user.id, nowTimestamp);
      try {
        await evaluateSmartReminders(supabase, user.id, timezone);
      } catch (evalErr) {
        console.warn("[Notifications:Poll] evaluateSmartReminders silent fallback:", evalErr);
      }
    }

    // 1. Récupérer les notifications non lues actives
    const { data: unread } = await supabase
      .from("notifications")
      .select("id, title, body, category, kind, link, priority, metadata, created_at")
      .eq("user_id", user.id)
      .is("read_at", null)
      .neq("status", "resolved")
      .neq("status", "dismissed")
      .neq("status", "actioned")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      unread: unread || [],
      count: unread?.length || 0,
      userName: profile?.full_name || null,
      voicePrefs: {
        voice_reminders: mergedPrefs.voice_reminders ?? true,
        voice_type: mergedPrefs.voice_type ?? "system",
        voice_language: mergedPrefs.voice_language ?? "fr",
        repeat_voice: mergedPrefs.repeat_voice ?? 0,
        voice_category_activities: mergedPrefs.voice_category_activities ?? true,
        voice_category_tasks: mergedPrefs.voice_category_tasks ?? true,
        voice_category_finances: mergedPrefs.voice_category_finances ?? true,
        voice_category_briefings: mergedPrefs.voice_category_briefings ?? true,
        voice_hide_financial_amounts: mergedPrefs.voice_hide_financial_amounts ?? false,
        voice_include_user_name: mergedPrefs.voice_include_user_name ?? true,
        custom_voice_reminder_text: mergedPrefs.custom_voice_reminder_text ?? "",
        voice_playback_rate: mergedPrefs.voice_playback_rate ?? 1.0,
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
