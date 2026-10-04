import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processAllUsersReminders } from "@/lib/notifications/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 secondes max pour les exécutions serverless

let isCronRunning = false;
let lastCronRunTimestamp = 0;
const MIN_CRON_INTERVAL_MS = 60 * 1000; // 60 secondes minimum entre deux déclenchements

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

  // 2. Protection contre la double exécution concurrente (Mutex mémoire)
  const now = Date.now();
  if (isCronRunning) {
    return NextResponse.json({
      success: true,
      throttled: true,
      message: "Un cycle d'évaluation des rappels est déjà en cours d'exécution.",
      timestamp: new Date().toISOString(),
    });
  }

  // Cooldown de sécurité sauf si forcé par paramètre ?force=1
  const url = new URL(request.url);
  const isForced = url.searchParams.get("force") === "1";
  if (!isForced && now - lastCronRunTimestamp < MIN_CRON_INTERVAL_MS) {
    return NextResponse.json({
      success: true,
      throttled: true,
      message: `Cycle ignoré car le précédent s'est exécuté il y a moins de 60s (${Math.round((now - lastCronRunTimestamp) / 1000)}s).`,
      timestamp: new Date().toISOString(),
    });
  }

  isCronRunning = true;
  lastCronRunTimestamp = now;
  const startTime = Date.now();

  try {
    const supabaseAdmin = createAdminClient();
    const result = await processAllUsersReminders(supabaseAdmin);
    const durationMs = Date.now() - startTime;

    console.log(
      `[Cron:Reminders] ✅ Succès en ${durationMs}ms — Profils: ${result.totalUsers}, Notifs créées: ${result.totalInserted}, Emails: ${result.totalEmails}, Pushes: ${result.totalPushes}`
    );

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
    console.error("[Cron:Reminders] ❌ Erreur d'exécution:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur interne lors de l'évaluation des rappels.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    isCronRunning = false;
  }
}
