import { timingSafeEqual } from "crypto";
import { PLAN_ENTITLEMENTS, type PlanType } from "@/lib/subscriptions/entitlements";

const BICTORYS_API_URL = process.env.BICTORYS_API_URL || "https://api.test.bictorys.com";
const BICTORYS_API_KEY = process.env.BICTORYS_API_KEY || "";
// Aucun secret par défaut : sans BICTORYS_WEBHOOK_SECRET configuré, tous les webhooks sont refusés.
const BICTORYS_WEBHOOK_SECRET = process.env.BICTORYS_WEBHOOK_SECRET || "";

// Tarification prélevée en FCFA (XOF) : montants définis dans lib/subscriptions/pricing.ts (affichage en dollars)
import { PLAN_PRICES_XOF } from "@/lib/subscriptions/pricing";
export { PLAN_PRICES_XOF };

export interface CreateCheckoutParams {
  userId: string;
  userEmail: string;
  userName?: string;
  plan: PlanType;
  billingCycle: "monthly" | "yearly";
  baseUrl: string;
}

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  chargeId?: string;
  error?: string;
}

/**
 * Initialise une session de paiement sécurisée Bictorys (Checkout hébergé)
 * Permet à l'utilisateur de payer via Wave, Orange Money, MTN MoMo, Moov ou Carte.
 */
export async function createBictorysCheckoutSession(
  params: CreateCheckoutParams
): Promise<CheckoutResult> {
  if (!BICTORYS_API_KEY) {
    return {
      success: false,
      error: "Clé API Bictorys non configurée. Contactez le support.",
    };
  }

  const { userId, userEmail, userName, plan, billingCycle, baseUrl } = params;
  const planInfo = PLAN_ENTITLEMENTS[plan];
  const prices = PLAN_PRICES_XOF[plan];
  const amount = billingCycle === "monthly" ? prices.monthly : prices.yearly;

  if (amount <= 0) {
    return {
      success: false,
      error: "Le forfait gratuit ne nécessite aucun paiement.",
    };
  }

  const timestamp = Date.now();
  const merchantReference = `remindme_${userId}_${plan}_${billingCycle}_${timestamp}`;
  const successRedirectUrl = `${baseUrl}/settings?payment=success&plan=${plan}`;
  const errorRedirectUrl = `${baseUrl}/settings?payment=cancelled`;

  const payload = {
    amount,
    currency: "XOF",
    merchantReference,
    paymentReference: `Remind Me - Forfait ${planInfo.planName} (${billingCycle === "monthly" ? "Mensuel" : "Annuel"})`,
    successRedirectUrl,
    errorRedirectUrl,
    orderDetails: [
      {
        name: `Abonnement Remind Me ${planInfo.planName}`,
        price: amount,
        quantity: 1,
      },
    ],
    customerObject: {
      name: userName || userEmail.split("@")[0] || "Utilisateur Remind Me",
      email: userEmail,
      country: "CI",
    },
  };

  try {
    const response = await fetch(`${BICTORYS_API_URL}/pay/v1/charges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": BICTORYS_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Bictorys API Error]:", data);
      return {
        success: false,
        error: data?.message || data?.error || `Erreur Bictorys (${response.status})`,
      };
    }

    // Récupération de l'URL de redirection (checkoutUrl ou url ou paymentUrl)
    const checkoutUrl = data?.checkoutUrl || data?.url || data?.paymentUrl || data?.data?.checkoutUrl || data?.data?.url;
    const chargeId = data?.chargeId || data?.id || data?.data?.id;

    if (!checkoutUrl) {
      console.error("[Bictorys] Pas de checkoutUrl reçue:", data);
      return {
        success: false,
        error: "Lien de paiement non généré par Bictorys.",
      };
    }

    return {
      success: true,
      checkoutUrl,
      chargeId,
    };
  } catch (err: any) {
    console.error("[createBictorysCheckoutSession] Exception:", err);
    return {
      success: false,
      error: err?.message || "Impossible de joindre la passerelle de paiement Bictorys.",
    };
  }
}

/**
 * Valide le secret du webhook Bictorys
 */
export function verifyBictorysWebhookSecret(receivedSecret: string | null): boolean {
  if (!BICTORYS_WEBHOOK_SECRET || !receivedSecret) return false;
  const expected = Buffer.from(BICTORYS_WEBHOOK_SECRET);
  const received = Buffer.from(receivedSecret);
  // Comparaison à temps constant (évite de deviner le secret caractère par caractère)
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Montant attendu (XOF) pour un forfait et une périodicité, ou null si invalide. */
export function expectedAmountXof(plan: PlanType, billingCycle: string): number | null {
  if (billingCycle !== "monthly" && billingCycle !== "yearly") return null;
  const amount = PLAN_PRICES_XOF[plan]?.[billingCycle];
  return amount && amount > 0 ? amount : null;
}
