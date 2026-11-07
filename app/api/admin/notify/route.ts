import { NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/admin/notifier";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

/**
 * Alerte envoyée au fondateur (Telegram / Discord).
 * - « signup » : appelé par la page d'inscription (visiteur pas encore connecté) ; champs bornés.
 * - « test_alert » : réservé à un utilisateur connecté (bouton de test de la page admin).
 * Tout autre type est refusé : les alertes de paiement et de système sont émises côté serveur uniquement.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body?.type;

    if (type === "signup") {
      const email = clip(body?.email, 254);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "E-mail invalide" }, { status: 400 });
      }
      const result = await notifyAdmin({ type: "signup", email, fullName: clip(body?.fullName, 120) });
      return NextResponse.json({ success: true, channels: result });
    }

    if (type === "test_alert") {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      const result = await notifyAdmin({ type: "test_alert", email: user.email ?? "—" });
      return NextResponse.json({ success: true, channels: result });
    }

    return NextResponse.json({ error: "Type non autorisé" }, { status: 400 });
  } catch (error: any) {
    console.error("[API:Admin:Notify] Erreur:", error?.message);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
