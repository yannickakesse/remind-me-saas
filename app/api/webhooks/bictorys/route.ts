import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBictorysWebhookSecret, expectedAmountXof } from "@/lib/payments/bictorys";
import { normalizePlan } from "@/lib/subscriptions/entitlements";
import { notifyAdmin } from "@/lib/admin/notifier";
import { computePaidPeriod, isFirstMonthEligible } from "@/lib/subscriptions/pricing";

const SUCCESS_STATUSES = new Set(["succeeded", "completed", "paid", "successful"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Webhook Bictorys : seule voie d'activation d'un forfait payant.
 * Un abonnement n'est activé que si le secret est valide, le paiement explicitement
 * réussi, le montant et la devise conformes au forfait, et la charge jamais traitée.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticité de l'appel (secret partagé, comparaison à temps constant)
    if (!verifyBictorysWebhookSecret(request.headers.get("x-secret-key"))) {
      console.warn("[Bictorys Webhook] Appel refusé : secret absent ou invalide.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const chargeData = payload?.data || payload;
    const status = String(chargeData?.status || "").toLowerCase();
    const chargeId = String(chargeData?.chargeId || chargeData?.id || "");
    const merchantReference = String(chargeData?.merchantReference || chargeData?.merchant_reference || "");

    // Journal minimal : aucune donnée personnelle ni secret
    console.log("[Bictorys Webhook] Reçu :", { status, chargeId, merchantReference });

    // 2. Paiement explicitement réussi uniquement (jamais par défaut)
    if (!SUCCESS_STATUSES.has(status)) {
      return NextResponse.json({ received: true, status: "ignored" });
    }

    // 3. Référence marchande : remindme_<userId>_<plan>_<cycle>_<timestamp>
    const [prefix, userId, rawPlan, billingCycle] = merchantReference.split("_");
    const plan = normalizePlan(rawPlan);
    if (prefix !== "remindme" || !userId || !UUID_RE.test(userId) || plan === "free") {
      console.warn("[Bictorys Webhook] Référence marchande invalide.");
      return NextResponse.json({ received: true, warning: "Référence non reconnue" });
    }

    const adminSupabase = createAdminClient();

    // 4. Abonnement actuel (lu avant toute écriture) : sert à l'anti-rejeu, à l'offre de bienvenue et à la période
    let { data: currentSub, error: subReadError } = await (adminSupabase as any)
      .from("subscriptions")
      .select("plan, status, current_period_end, provider, provider_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (subReadError) {
      ({ data: currentSub } = await adminSupabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle());
    }

    // 5. Anti-rejeu : une même charge n'est appliquée qu'une seule fois
    if (chargeId && (currentSub as any)?.provider_subscription_id === chargeId) {
      return NextResponse.json({ received: true, status: "already_processed" });
    }

    // 6. Montant et devise conformes au tarif du forfait
    // (premier mois réduit accepté seulement si le compte n'a jamais payé : décision serveur, pas la référence)
    const firstMonth = billingCycle === "monthly" && !subReadError && isFirstMonthEligible(currentSub as any);
    const expected = expectedAmountXof(plan, billingCycle ?? "", firstMonth);
    const paidAmount = Number(chargeData?.amount);
    const currency = String(chargeData?.currency || "XOF").toUpperCase();
    if (!expected || currency !== "XOF" || !Number.isFinite(paidAmount) || paidAmount < expected) {
      console.warn("[Bictorys Webhook] Montant ou devise non conforme :", { plan, billingCycle, paidAmount, currency });
      await notifyAdmin({
        type: "payment_received",
        email: "—",
        fullName: "⚠️ Paiement NON appliqué (montant non conforme)",
        details: { plan, billingCycle: billingCycle ?? "?", amount: `${paidAmount} ${currency}`, merchantReference },
      }).catch(() => {});
      return NextResponse.json({ received: true, warning: "Montant non conforme" });
    }

    const { data: userRes, error: userErr } = await adminSupabase.auth.admin.getUserById(userId);
    if (userErr || !userRes?.user) {
      console.warn("[Bictorys Webhook] Utilisateur introuvable pour la référence.");
      return NextResponse.json({ received: true, warning: "Utilisateur introuvable" });
    }

    // 7. Activation : la table subscriptions (écrite uniquement côté serveur) fait foi.
    // Paiement anticipé du même forfait : la nouvelle période s'ajoute à la suite (aucun jour perdu).
    const now = new Date();
    const { end: periodEnd } = computePaidPeriod(currentSub as any, plan, billingCycle === "yearly" ? "yearly" : "monthly", now);

    const { error: subError } = await adminSupabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        provider: "bictorys",
        provider_subscription_id: chargeId || null,
        updated_at: now.toISOString(),
      } as any,
      { onConflict: "user_id" }
    );

    if (subError) {
      console.error("[Bictorys Webhook] Erreur d'activation :", subError.message);
      // 500 : Bictorys réessaiera la notification
      return NextResponse.json({ error: "Activation impossible" }, { status: 500 });
    }

    await notifyAdmin({
      type: "payment_received",
      email: userRes.user.email ?? "Inconnu",
      fullName: `Client ${plan.toUpperCase()}`,
      details: {
        plan,
        billingCycle: billingCycle === "yearly" ? "Annuel" : firstMonth ? "Mensuel (1er mois offre de bienvenue)" : "Mensuel",
        amount: `${paidAmount} ${currency}`,
        merchantReference,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Bictorys Webhook] Exception :", err?.message);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
