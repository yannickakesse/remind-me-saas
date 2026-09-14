import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchWebPush } from "@/lib/push/webpush";

export const dynamic = "force-dynamic";

/**
 * Route d'envoi immédiat d'une notification push de test sur les appareils de l'utilisateur.
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

    const result = await dispatchWebPush(supabase, user.id, {
      title: "Remind Me — Test Push",
      body: "Vos notifications système sont parfaitement configurées et actives !",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      data: {
        url: "/dashboard",
        category: "system",
      },
    });

    if (result.total === 0) {
      return NextResponse.json({
        success: false,
        error: "Aucun appareil enregistré. Activez d'abord les notifications sur cet appareil.",
      });
    }

    return NextResponse.json({
      success: result.successful > 0,
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      message: `${result.successful} notification(s) envoyée(s) avec succès.`,
    });
  } catch (error: any) {
    console.error("[Push:Test] Erreur:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
