import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBictorysWebhookSecret } from "@/lib/payments/bictorys";
import { normalizePlan } from "@/lib/subscriptions/entitlements";
import { notifyAdmin } from "@/lib/admin/notifier";

export async function POST(request: NextRequest) {
  try {
    const receivedSecret = request.headers.get("x-secret-key") || request.headers.get("X-Secret-Key");
    
    // 1. Vérification de la signature / Secret
    if (!verifyBictorysWebhookSecret(receivedSecret)) {
      console.warn("[Bictorys Webhook] Secret invalide reçu:", receivedSecret);
      return NextResponse.json({ error: "Secret key invalide" }, { status: 401 });
    }

    const payload = await request.json();
    console.log("[Bictorys Webhook Received]:", JSON.stringify(payload, null, 2));

    // Bictorys payload can have `data` or flat structure
    const eventType = payload?.event || payload?.type || "charge.completed";
    const chargeData = payload?.data || payload;
    const status = (chargeData?.status || "").toLowerCase();

    // Vérifier si la charge est payée / validée
    const isSuccess =
      status === "succeeded" ||
      status === "completed" ||
      status === "paid" ||
      status === "successful" ||
      eventType === "charge.completed";

    if (!isSuccess) {
      console.log(`[Bictorys Webhook] Statut non finalisé (${status}), ignoré.`);
      return NextResponse.json({ received: true, status: "ignored" });
    }

    const merchantReference = chargeData?.merchantReference || chargeData?.merchant_reference || "";
    
    // Découpage du merchantReference: remindme_${userId}_${plan}_${billingCycle}_${timestamp}
    const parts = merchantReference.split("_");
    if (parts.length < 4 || parts[0] !== "remindme") {
      console.warn("[Bictorys Webhook] Format merchantReference non reconnu:", merchantReference);
      return NextResponse.json({ received: true, warning: "Référence non reconnue" });
    }

    const userId = parts[1];
    const rawPlan = parts[2];
    const billingCycle = parts[3];
    const plan = normalizePlan(rawPlan);

    const adminSupabase = createAdminClient();

    // Calcul de la période de validité
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 2. Mise à jour de la table subscriptions
    const { error: subError } = await adminSupabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan,
        status: "active",
        current_period_end: periodEnd.toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (subError) {
      console.error("[Bictorys Webhook] Erreur mise à jour subscriptions:", subError);
    }

    // 3. Mise à jour auth user_metadata pour persistance totale
    try {
      await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: { subscription_plan: plan },
      });
    } catch (authErr) {
      console.error("[Bictorys Webhook] Erreur update user_metadata:", authErr);
    }

    // 4. Récupérer l'email de l'utilisateur pour l'alerte
    let userEmail = "Inconnu";
    try {
      const { data: userRes } = await adminSupabase.auth.admin.getUserById(userId);
      if (userRes?.user?.email) {
        userEmail = userRes.user.email;
      }
    } catch {}

    // 5. Alerte Telegram temps réel pour l'administrateur
    const amountStr = chargeData?.amount ? `${chargeData.amount} ${chargeData.currency || "XOF"}` : "Paiement validé";
    await notifyAdmin({
      type: "payment_received",
      email: userEmail,
      fullName: `Client ${plan.toUpperCase()}`,
      details: {
        plan,
        billingCycle: billingCycle === "yearly" ? "Annuel" : "Mensuel",
        amount: amountStr,
        merchantReference,
      },
    });

    return NextResponse.json({ success: true, plan, userId });
  } catch (err: any) {
    console.error("[Bictorys Webhook Exception]:", err);
    return NextResponse.json({ error: err?.message || "Erreur interne webhook" }, { status: 500 });
  }
}
