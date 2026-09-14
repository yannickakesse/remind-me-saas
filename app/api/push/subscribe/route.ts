import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Route d'enregistrement et mise à jour d'une souscription Web Push pour l'utilisateur connecté.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys, platform, browser, device_name } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Paramètres de souscription invalides (endpoint, p256dh, auth requis)" },
        { status: 400 }
      );
    }

    // Upsert de la souscription push
    const { data, error } = await supabase
      .from("push_subscriptions" as any)
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          platform: platform || "web",
          browser: browser || "unknown",
          device_name: device_name || "Navigateur Web",
          is_active: true,
          updated_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      )
      .select()
      .single();

    if (error) {
      console.error("[Push:Subscribe] Erreur insertion:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Activer l'option push dans les préférences si ce n'était pas fait
    await supabase
      .from("notification_preferences")
      .update({ push_enabled: true } as any)
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      message: "Souscription Web Push enregistrée avec succès.",
      subscriptionId: data?.id,
    });
  } catch (error: any) {
    console.error("[Push:Subscribe] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
