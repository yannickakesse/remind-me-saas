import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email/service";

export const dynamic = "force-dynamic";

/**
 * Route d'envoi immédiat d'un e-mail transactionnel de test vers l'adresse de l'utilisateur connecté.
 */
export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Non authentifié ou adresse e-mail manquante." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, locale")
      .eq("id", user.id)
      .maybeSingle();

    const recipientName = profile?.full_name?.split(" ")[0] || "Bonjour";

    const emailResult = await sendNotificationEmail(
      {
        userId: user.id,
        recipientEmail: user.email,
        recipientName,
        template: "test_verification",
        title: "Test de notification Remind Me — Votre canal e-mail est opérationnel",
        body: `Ceci est un véritable e-mail de test envoyé par votre plateforme Remind Me.\n\nVotre adresse (${user.email}) est correctement configurée pour recevoir les rappels d'échéances de paiement, alertes de dépenses et résumés d'activités.`,
        link: "/settings",
        locale: (profile?.locale as any) || "fr",
      },
      supabase
    );

    if (emailResult.status === "not_configured") {
      return NextResponse.json({
        success: false,
        status: "NOT_CONFIGURED",
        error: emailResult.error || "Clé d'API RESEND_API_KEY non configurée.",
        recipient: user.email,
      });
    }

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        status: "FAILED",
        error: emailResult.error || "Échec de l'envoi de l'e-mail par le fournisseur.",
        recipient: user.email,
      });
    }

    return NextResponse.json({
      success: true,
      status: "SENT",
      messageId: emailResult.messageId,
      recipient: user.email,
      message: `Véritable e-mail de test envoyé avec succès à ${user.email} (Message ID : ${emailResult.messageId}).`,
    });
  } catch (error: any) {
    console.error("[Email:Test] Erreur:", error);
    return NextResponse.json(
      { success: false, status: "ERROR", error: error.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
