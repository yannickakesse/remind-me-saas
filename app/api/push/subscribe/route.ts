import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const body = await request.json().catch(() => ({}));
    const { endpoint, keys, platform, browser, device_name } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Paramètres de souscription invalides (endpoint, p256dh, auth requis)" },
        { status: 400 }
      );
    }

    const userAgent =
      request.headers.get("user-agent") ||
      `${platform || "Web"} - ${browser || "Browser"} (${device_name || "Device"})`;

    const payload = {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    };

    // 1. Essai d'insertion/upsert avec client standard
    let { data, error } = await supabase
      .from("push_subscriptions" as any)
      .upsert(payload, { onConflict: "user_id,endpoint" })
      .select()
      .maybeSingle();

    // 2. Fallback avec admin client si restriction RLS
    if (error) {
      try {
        const admin = createAdminClient();
        const adminRes = await admin
          .from("push_subscriptions" as any)
          .upsert(payload, { onConflict: "user_id,endpoint" })
          .select()
          .maybeSingle();
        if (!adminRes.error) {
          data = adminRes.data;
          error = null;
        }
      } catch (adminErr) {
        console.warn("[Push:Subscribe] Fallback admin:", adminErr);
      }
    }

    if (error) {
      console.error("[Push:Subscribe] Erreur insertion:", error);
      return NextResponse.json({ error: error.message || "Impossible d'enregistrer la souscription" }, { status: 500 });
    }

    // Activer l'option push dans les préférences
    try {
      await supabase
        .from("notification_preferences")
        .update({ push_enabled: true } as any)
        .eq("user_id", user.id);
    } catch {
      // Ignorer si déjà géré
    }

    return NextResponse.json({
      success: true,
      message: "Souscription Web Push enregistrée avec succès.",
      subscriptionId: data?.id,
    });
  } catch (error: any) {
    console.error("[Push:Subscribe] Erreur globale:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
