import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createClient();
  const requestUrl = new URL(request.url);
  const secretParam = requestUrl.searchParams.get("secret");
  const adminSecret = process.env.ADMIN_SECRET_KEY || "remindme2026";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isSecretValid = secretParam === adminSecret;

  if (!user && !isSecretValid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Comptages globaux et temporels
    const [
      { count: totalUsers },
      { count: newUsersToday },
      { count: newUsers7d },
      { count: totalActivities },
      { count: totalTasks },
      { count: totalIncome },
      { count: totalExpenses },
      { count: totalNotifications },
      { data: recentProfiles },
      { data: recentSubscriptions },
      { data: recentActivities },
      { data: recentNotificationLogs },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfToday),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("activities").select("*", { count: "exact", head: true }),
      supabase.from("tasks").select("*", { count: "exact", head: true }),
      supabase.from("income").select("*", { count: "exact", head: true }),
      supabase.from("expenses").select("*", { count: "exact", head: true }),
      supabase.from("notification_logs").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id, full_name, created_at, timezone, locale, onboarding_completed")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("subscriptions")
        .select("id, user_id, plan, status, current_period_end")
        .order("current_period_end", { ascending: false }),
      supabase
        .from("activities")
        .select("id, user_id, name, type, color, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("notification_logs")
        .select("id, user_id, channel, template, delivery_status, created_at, error_message")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // 2. Calcul de la répartition des abonnements
    const subStats = {
      free: 0,
      pro: 0,
      premium: 0,
      active: 0,
    };

    if (recentSubscriptions) {
      for (const sub of recentSubscriptions) {
        if (sub.plan === "pro") subStats.pro++;
        else if (sub.plan === "premium") subStats.premium++;
        else subStats.free++;

        if (sub.status === "active" || sub.status === "trialing") {
          subStats.active++;
        }
      }
    }

    // 3. Construction du flux d'activité en direct (Timeline unifiée)
    const timelineEvents: Array<{
      id: string;
      type: "signup" | "activity" | "notification" | "subscription";
      title: string;
      description: string;
      date: string;
      badge: string;
      tone: "positive" | "signal" | "gold" | "danger" | "neutral";
    }> = [];

    // Ajouter les inscriptions
    if (recentProfiles) {
      for (const p of recentProfiles) {
        timelineEvents.push({
          id: `profile-${p.id}`,
          type: "signup",
          title: "Nouvel utilisateur inscrit",
          description: p.full_name ? `${p.full_name}` : `Utilisateur #${p.id.slice(0, 6)}`,
          date: p.created_at,
          badge: p.onboarding_completed ? "Actif" : "En attente",
          tone: p.onboarding_completed ? "positive" : "signal",
        });
      }
    }

    // Ajouter les créations d'activités
    if (recentActivities) {
      for (const a of recentActivities) {
        timelineEvents.push({
          id: `act-${a.id}`,
          type: "activity",
          title: "Nouvelle activité créée",
          description: `« ${a.name} » (${a.type})`,
          date: a.created_at,
          badge: "Activité",
          tone: "gold",
        });
      }
    }

    // Ajouter les notifications / rappels envoyés
    if (recentNotificationLogs) {
      for (const n of recentNotificationLogs) {
        timelineEvents.push({
          id: `notif-${n.id}`,
          type: "notification",
          title: `Rappel envoyé (${n.channel.toUpperCase()})`,
          description: `Modèle : ${n.template || "Rappel standard"}`,
          date: n.created_at,
          badge: n.delivery_status === "delivered" || n.delivery_status === "sent" ? "Envoyé" : n.delivery_status,
          tone: n.delivery_status === "failed" ? "danger" : "positive",
        });
      }
    }

    // Trier la timeline par date décroissante
    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const envConfig = {
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      telegramBotName: "RemindMeAlertsbot",
      discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
      emailNotifications: Boolean(process.env.RESEND_API_KEY),
      vercelAnalytics: true,
    };

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers ?? 0,
        newUsersToday: newUsersToday ?? 0,
        newUsers7d: newUsers7d ?? 0,
        totalActivities: totalActivities ?? 0,
        totalTasks: totalTasks ?? 0,
        totalIncome: totalIncome ?? 0,
        totalExpenses: totalExpenses ?? 0,
        totalNotifications: totalNotifications ?? 0,
        subscriptions: subStats,
      },
      timeline: timelineEvents.slice(0, 30),
      recentUsers: recentProfiles ?? [],
      envConfig,
      currentUserEmail: user?.email || "Admin Authentifié",
    });
  } catch (error: any) {
    console.error("[API:Admin:Stats] Erreur:", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
