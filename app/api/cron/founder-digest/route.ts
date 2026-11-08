import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadFounderMetrics } from "@/lib/admin/founder-metrics";
import { buildFounderDigest } from "@/lib/admin/founder-digest";
import { sendFounderMessage } from "@/lib/admin/notifier";
import { getAppUrl } from "@/lib/auth/url";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Résumé quotidien du fondateur (Vercel Cron, chaque matin à 7 h GMT — heure d'Abidjan).
 * Protégé par CRON_SECRET (Vercel envoie automatiquement « Authorization: Bearer <CRON_SECRET> »).
 * Lecture seule : aucune donnée n'est modifiée.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") || "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const metrics = await loadFounderMetrics(createAdminClient());
    const digest = buildFounderDigest(metrics, Date.now(), getAppUrl());
    const sent = await sendFounderMessage(digest);
    return NextResponse.json({ success: true, sent, counts: digest.counts });
  } catch (err: any) {
    console.error("[Cron:FounderDigest] Erreur :", err?.message);
    return NextResponse.json({ error: "Résumé impossible" }, { status: 500 });
  }
}
