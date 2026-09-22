import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
    const { endpoint } = body;

    // 1. Suppression de la souscription
    if (endpoint) {
      await supabase
        .from("push_subscriptions" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);
    } else {
      await supabase
        .from("push_subscriptions" as any)
        .delete()
        .eq("user_id", user.id);
    }

    // 2. Fallback admin si besoin
    try {
      const admin = createAdminClient();
      if (endpoint) {
        await admin
          .from("push_subscriptions" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", endpoint);
      } else {
        await admin
          .from("push_subscriptions" as any)
          .delete()
          .eq("user_id", user.id);
      }
    } catch {
      // Ignorer
    }

    // 3. Mise à jour des préférences
    try {
      await supabase
        .from("notification_preferences")
        .update({ push_enabled: false } as any)
        .eq("user_id", user.id);
    } catch {
      // Ignorer
    }

    return NextResponse.json({ success: true, message: "Notifications push désactivées." });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur interne" }, { status: 500 });
  }
}
