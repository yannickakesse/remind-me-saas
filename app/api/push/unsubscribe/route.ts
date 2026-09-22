import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    if (endpoint) {
      await supabase
        .from("push_subscriptions" as any)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);
    } else {
      await supabase
        .from("push_subscriptions" as any)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }

    await supabase
      .from("notification_preferences")
      .update({ push_enabled: false } as any)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, message: "Notifications push désactivées." });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur interne" }, { status: 500 });
  }
}
