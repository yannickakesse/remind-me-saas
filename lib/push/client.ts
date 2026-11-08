export const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BE8s3t5tTHgVP9A-V5tKLq4vUCcFNU1m8bhDtFgwil3ORODoMl4Jmbo47rhMaTcNemPJb8c588D7oqj6VqYtVBU";

/**
 * Convertit une clé VAPID base64url en Uint8Array pour l'API pushManager.subscribe.
 */
export function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}


/** Clé publique réellement utilisée par le serveur (évite tout désaccord client / serveur). */
export async function fetchServerVapidKey(): Promise<string> {
  try {
    const res = await fetch("/api/push/public-key", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.publicKey === "string" && data.publicKey.length > 40) return data.publicKey;
    }
  } catch {}
  return DEFAULT_VAPID_PUBLIC_KEY;
}

function sameKey(a: ArrayBuffer | null | undefined, b: ArrayBuffer): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
}

/**
 * Abonnement Web Push fiable (ordinateur et téléphone) :
 * - enregistre le service worker et attend qu'il soit prêt (délai maximum, jamais de bouton bloqué) ;
 * - réutilise l'abonnement existant s'il a la bonne clé, sinon le remplace (cas d'un ancien abonnement) ;
 * - traduit les erreurs du navigateur en message compréhensible.
 */
export async function subscribeToPushReliably(): Promise<PushSubscription> {
  try {
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch {}
    const reg = await withTimeout(navigator.serviceWorker.ready, 15000, "Le service de notifications du navigateur ne répond pas. Rechargez la page puis réessayez.");
    const key = urlBase64ToUint8Array(await fetchServerVapidKey());

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      if (sameKey(existing.options?.applicationServerKey, key)) return existing;
      await existing.unsubscribe().catch(() => {});
    }
    return await withTimeout(
      reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }),
      20000,
      "Le navigateur n'a pas répondu à la demande d'abonnement. Réessayez dans un instant."
    );
  } catch (err: any) {
    const name = err?.name || "";
    if (name === "NotAllowedError") throw new Error("Les notifications sont bloquées pour ce site : autorisez-les dans les réglages du navigateur (icône à gauche de l'adresse), puis réessayez.");
    if (name === "AbortError" || /push service/i.test(err?.message || ""))
      throw new Error("Le service de notifications du navigateur a refusé l'abonnement. Sur Brave, activez « Utiliser les services Google pour la messagerie push » ; sinon essayez Chrome ou Edge.");
    if (name === "InvalidStateError") throw new Error("Un ancien abonnement bloque l'activation : désactivez puis réactivez les notifications, ou rechargez la page.");
    throw err instanceof Error ? err : new Error(String(err));
  }
}
