import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";

export async function POST(req: Request) {
  try {
    const { locale } = await req.json();

    if (!locale || !SUPPORTED_LOCALES.some((l) => l.code === locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await Promise.allSettled([
        supabase
          .from("notification_preferences")
          .upsert({ user_id: user.id, preferred_locale: locale, updated_at: new Date().toISOString() }, { onConflict: "user_id" }),
        supabase
          .from("user_settings")
          .update({ notif_prefs: { preferred_locale: locale } })
          .eq("user_id", user.id),
      ]);
    }

    const response = NextResponse.json({ success: true, locale });
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("[api/user/locale] Error saving locale:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
