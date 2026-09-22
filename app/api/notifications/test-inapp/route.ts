import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Route de création immédiate d'une notification In-App de test.
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

    const testId = `test_${Date.now()}`;

    const { data: inserted, error } = await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        category: "system",
        kind: "system_alert",
        priority: "normal",
        status: "unread",
        entity_type: "system",
        entity_id: testId,
        title: "Test In-App — Remind Me opérationnel 🔔",
        body: "Votre centre de notifications in-app fonctionne parfaitement. Vous recevrez ici vos rappels de paiements et d'échéances.",
        link: "/notifications",
        idempotency_key: `test_inapp:${user.id}:${Date.now()}`,
        metadata: { source: "settings_test" },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Notification In-App créée avec succès.",
      notification: inserted,
    });
  } catch (error: any) {
    console.error("[InApp:Test] Erreur:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
