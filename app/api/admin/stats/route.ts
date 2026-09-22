import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    // 1. Comptages en parallèle
    const [
      { count: totalUsers },
      { count: totalActivities },
      { count: totalTasks },
      { count: totalIncome },
      { count: totalExpenses },
      { count: totalNotifications },
      { data: recentUsers },
      { data: recentNotifications },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("activities").select("*", { count: "exact", head: true }),
      supabase.from("tasks").select("*", { count: "exact", head: true }),
      supabase.from("income").select("*", { count: "exact", head: true }),
      supabase.from("expenses").select("*", { count: "exact", head: true }),
      supabase.from("notification_logs").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("id, full_name, created_at, timezone, locale, onboarding_completed").order("created_at", { ascending: false }).limit(10),
      supabase.from("notification_logs").select("id, channel, template, delivery_status, created_at").order("created_at", { ascending: false }).limit(8),
    ]);

    const envConfig = {
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
      emailNotifications: Boolean(process.env.RESEND_API_KEY),
      vercelAnalytics: true,
    };

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers ?? 0,
        totalActivities: totalActivities ?? 0,
        totalTasks: totalTasks ?? 0,
        totalIncome: totalIncome ?? 0,
        totalExpenses: totalExpenses ?? 0,
        totalNotifications: totalNotifications ?? 0,
      },
      recentUsers: recentUsers ?? [],
      recentNotifications: recentNotifications ?? [],
      envConfig,
      currentUserEmail: user.email,
    });
  } catch (error: any) {
    console.error("[API:Admin:Stats] Erreur:", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
