import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const nowIso = new Date().toISOString();
    let resolveAll = false;
    try {
      const body = await req.json();
      if (body?.resolveAll) resolveAll = true;
    } catch {}

    const updateData = resolveAll
      ? { status: "resolved" as const, resolved_at: nowIso, read_at: nowIso }
      : { status: "read" as const, read_at: nowIso };

    const { error } = await supabase
      .from("notifications")
      .update(updateData)
      .eq("user_id", user.id)
      .neq("status", "resolved")
      .neq("status", "dismissed");

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, timestamp: nowIso });
  } catch (error) {
    console.error("Erreur mark-all-read notifications:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
