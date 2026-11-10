import { NextResponse } from "next/server";
import { VAPID_PUBLIC_KEY, VAPID_CONFIG_ERROR } from "@/lib/push/webpush";

export const dynamic = "force-dynamic";

/**
 * Clé publique VAPID utilisée par le serveur pour signer les notifications.
 * Le navigateur s'abonne avec cette clé exacte : client et serveur ne peuvent plus être désaccordés.
 * (Clé publique par nature : aucune donnée sensible.)
 */
export async function GET() {
  // « valid » : les clés sont acceptées par web-push (sinon aucun push ne peut partir)
  return NextResponse.json({
    publicKey: VAPID_PUBLIC_KEY,
    configured: Boolean(process.env.VAPID_PRIVATE_KEY),
    valid: VAPID_CONFIG_ERROR === null,
  });
}
