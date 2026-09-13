import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processAllUsersReminders } from "@/lib/notifications/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 secondes max pour les exécutions serverless

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // 1. Validation de sécurité du déclencheur Cron
  if (cronSecret) {
    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: "Non autorisé : clé secrète Cron invalide." },
        { status: 401 }
      );
    }
  }

  const startTime = Date.now();

  try {
    const supabaseAdmin = createAdminClient();
    const result = await processAllUsersReminders(supabaseAdmin);
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      summary: {
        usersEvaluated: result.totalUsers,
        notificationsCreated: result.totalInserted,
        emailsDispatched: result.totalEmails,
        pushesDispatched: result.totalPushes,
      },
    });
  } catch (error: any) {
    console.error("[Cron:Reminders] Erreur d'exécution:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur interne lors de l'évaluation des rappels.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
