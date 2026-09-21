import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateSmartReminders } from "@/lib/notifications/engine";
import { getUserTimezone } from "@/lib/time/timezones";

export const dynamic = "force-dynamic";

/**
 * Route d'évaluation asynchrone non-bloquante des rappels de l'utilisateur connecté.
 * Appelée en arrière-plan sans ralentir l'affichage initial du tableau de bord.
 */
export async function POST() {
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
    const result = await evaluateSmartReminders(supabase, user.id, timezone);


    return NextResponse.json({
      success: true,
      processed: result.processed,
      inserted: result.inserted,
      emailCount: result.emailCount,
      pushCount: result.pushCount,
    });
  } catch (error: any) {
    console.error("[Notifications:Sync] Erreur sync:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
