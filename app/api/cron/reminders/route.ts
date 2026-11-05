import { NextResponse } from "next/server";
import { randomUUID, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { processAllUsersReminders } from "@/lib/notifications/engine";
import { retryFailedPushes } from "@/lib/push/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 secondes max pour les exécutions serverless

/**
 * Traitement des rappels en arrière-plan.
 *
 * Déclencheurs (tous protégés par CRON_SECRET) :
 *   - Supabase pg_cron + pg_net : chaque minute (principal, migration 0025)
 *   - GitHub Actions : secours
 *   - Vercel Cron : secours quotidien
 *
 * Fiabilité :
 *   - Verrou partagé en base (cron_locks) : deux exécutions ne se chevauchent jamais,
 *     quel que soit le serveur ou le déclencheur.
 *   - Limite de temps (45 s) : le cycle s'arrête proprement et la minute suivante reprend
 *     au bon utilisateur (curseur).
 *   - Clé anti-doublon unique sur les notifications : un rappel n'est enregistré, donc envoyé, qu'une fois.
 *   - Relance des push échoués (3 tentatives, 30 min).
 *   - Journal de chaque exécution dans cron_runs (jamais de secret dans les journaux).
 */
const LOCK_NAME = "reminders";
const LOCK_TTL_SECONDS = 58; // libéré automatiquement si une exécution plante
const TIME_BUDGET_MS = 45_000;

// Secours si la migration 0025 n'est pas encore appliquée (verrou limité à cette instance)
let isCronRunningLocally = false;

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") || "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function sourceOf(request: Request): string {
  const explicit = request.headers.get("x-cron-source");
  if (explicit) return explicit.slice(0, 20);
  if (request.headers.get("user-agent")?.includes("vercel-cron")) return "vercel";
  return "manuel";
}

async function handleCron(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé : clé secrète Cron invalide." }, { status: 401 });
  }

  const startTime = Date.now();
  const source = sourceOf(request);
  const holder = randomUUID();
  const supabaseAdmin = createAdminClient();
  const db = supabaseAdmin as any; // tables 0025 (cron_locks, cron_runs) absentes des types générés

  // 1. Verrou partagé
  let sharedLock = true;
  let cursor: string | null = null;
  const lock = await db.rpc("try_acquire_cron_lock", {
    p_name: LOCK_NAME,
    p_holder: holder,
    p_ttl_seconds: LOCK_TTL_SECONDS,
  });

  if (lock.error) {
    // Migration 0025 absente : repli sur le verrou mémoire de l'instance
    sharedLock = false;
    if (isCronRunningLocally) {
      return NextResponse.json({ success: true, skipped: "locked_local", timestamp: new Date().toISOString() });
    }
  } else {
    const row = Array.isArray(lock.data) ? lock.data[0] : lock.data;
    if (!row?.acquired) {
      await db.from("cron_runs").insert({ source, status: "skipped_locked", finished_at: new Date().toISOString(), duration_ms: 0 });
      return NextResponse.json({ success: true, skipped: "locked", timestamp: new Date().toISOString() });
    }
    cursor = row.cursor_user_id ?? null;
  }

  isCronRunningLocally = true;
  const { data: run } = await db.from("cron_runs").insert({ source, status: "running" }).select("id").maybeSingle();
  const runId: number | undefined = run?.id;

  try {
    // 2. Rappels de tous les utilisateurs (avec limite de temps et reprise)
    const result = await processAllUsersReminders(supabaseAdmin, {
      deadlineMs: startTime + TIME_BUDGET_MS,
      startAfterUserId: cursor,
    });

    // 3. Relance des push échoués, s'il reste du temps
    const retry =
      Date.now() < startTime + TIME_BUDGET_MS
        ? await retryFailedPushes(supabaseAdmin)
        : { retried: 0, recovered: 0 };

    const durationMs = Date.now() - startTime;
    const status = result.nextCursor ? "partial" : "success";

    console.log(
      `[Cron:Reminders] ${status} (${source}) en ${durationMs}ms — utilisateurs ${result.processedUsers}/${result.totalUsers}, notifications ${result.totalInserted}, push ${result.totalPushes} (échecs ${result.totalPushFailures}, relancés ${retry.retried}, récupérés ${retry.recovered}), e-mails ${result.totalEmails}`
    );

    if (runId) {
      await db
        .from("cron_runs")
        .update({
          status,
          finished_at: new Date().toISOString(),
          duration_ms: durationMs,
          users_total: result.totalUsers,
          users_processed: result.processedUsers,
          notifications_created: result.totalInserted,
          pushes_sent: result.totalPushes,
          pushes_failed: result.totalPushFailures,
          pushes_retried: retry.retried,
          emails_sent: result.totalEmails,
        })
        .eq("id", runId);
    }
    if (sharedLock) {
      await db.rpc("release_cron_lock", { p_name: LOCK_NAME, p_holder: holder, p_cursor_user_id: result.nextCursor });
    }

    return NextResponse.json({
      success: true,
      status,
      source,
      timestamp: new Date().toISOString(),
      durationMs,
      summary: {
        usersEvaluated: result.processedUsers,
        usersTotal: result.totalUsers,
        notificationsCreated: result.totalInserted,
        emailsDispatched: result.totalEmails,
        pushesDispatched: result.totalPushes,
        pushesFailed: result.totalPushFailures,
        pushesRetried: retry.retried,
      },
    });
  } catch (error: any) {
    const message = error?.message || "Erreur interne lors de l'évaluation des rappels.";
    console.error("[Cron:Reminders] Erreur d'exécution :", message);
    if (runId) {
      await db
        .from("cron_runs")
        .update({ status: "error", finished_at: new Date().toISOString(), duration_ms: Date.now() - startTime, error: message.slice(0, 500) })
        .eq("id", runId);
    }
    if (sharedLock) {
      await db.rpc("release_cron_lock", { p_name: LOCK_NAME, p_holder: holder, p_cursor_user_id: cursor });
    }
    return NextResponse.json({ success: false, error: message, timestamp: new Date().toISOString() }, { status: 500 });
  } finally {
    isCronRunningLocally = false;
  }
}
