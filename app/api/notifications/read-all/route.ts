import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({
        read_at: nowIso,
        status: "read",
      })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, timestamp: nowIso });
  } catch (error) {
    console.error("Erreur mark-all-read notifications:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
