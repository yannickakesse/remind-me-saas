import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFounder, loadFounderMetrics } from "@/lib/admin/founder-metrics";

export const dynamic = "force-dynamic";

/** Indicateurs du fondateur en JSON : réservé aux comptes listés dans FOUNDER_EMAILS. */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isFounder(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const metrics = await loadFounderMetrics(createAdminClient());
    return NextResponse.json(metrics);
  } catch (err: any) {
    console.error("[API:Admin:Stats] Erreur :", err?.message);
    return NextResponse.json({ error: "Lecture impossible" }, { status: 500 });
  }
}
