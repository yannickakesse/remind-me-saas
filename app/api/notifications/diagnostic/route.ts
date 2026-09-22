import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Endpoint de diagnostic complet du système de notifications de Remind Me.
 * Permet de vérifier l'état de chaque canal, des variables d'environnement et de la base de données.
 */
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const [
      { data: prefs },
      { data: profile },
      { count: unreadCount },
      { count: pushCount },
      { data: lastLogs },
    ] = await Promise.all([
      supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("timezone, locale, full_name").eq("id", user.id).maybeSingle(),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null).neq("status", "resolved"),
      supabase.from("push_subscriptions" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("notification_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    ]);

    const resendConfigured = Boolean(process.env.RESEND_API_KEY);
    const vapidConfigured = Boolean(process.env.VAPID_PRIVATE_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    const twilioConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER);
    const metaWhatsAppConfigured = Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        timezone: profile?.timezone || "UTC",
        locale: profile?.locale || "fr",
      },
      channels: {
        in_app: {
          status: "PASS",
          active: prefs?.in_app_enabled ?? true,
          unreadNotificationsCount: unreadCount ?? 0,
        },
        email: {
          status: resendConfigured ? "PASS" : "NOT_CONFIGURED",
          active: prefs?.email_enabled ?? true,
          configured: resendConfigured,
          provider: resendConfigured ? "Resend API" : "Aucun (RESEND_API_KEY manquante)",
          sender: process.env.EMAIL_FROM || "Remind Me <onboarding@resend.dev>",
        },
        push: {
          status: (pushCount ?? 0) > 0 ? "PASS" : "IDLE",
          active: (prefs as any)?.push_enabled ?? false,
          vapidReady: vapidConfigured,
          registeredDevices: pushCount ?? 0,
        },
        whatsapp: {
          status: twilioConfigured || metaWhatsAppConfigured ? "PASS" : "NOT_CONFIGURED",
          configured: twilioConfigured || metaWhatsAppConfigured,
          provider: twilioConfigured ? "Twilio" : metaWhatsAppConfigured ? "Meta Cloud API" : "Non configuré",
          notes: "Aucun envoi simulé. En attente de clés d'API officielles.",
        },
      },
      recentLogs: lastLogs || [],
    });
  } catch (error: any) {
    console.error("[Notifications:Diagnostic] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur de diagnostic" },
      { status: 500 }
    );
  }
}
