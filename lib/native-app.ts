// Détection de l'application mobile (Android / iPhone, empaquetée avec Capacitor).
// capacitor.config.json ajoute "RemindMeApp" à l'identifiant du navigateur (user agent) :
// le serveur comme le navigateur peuvent donc savoir qu'on est dans l'application.
//
// Pourquoi : Apple et Google interdisent de vendre un abonnement numérique dans une
// application sans passer par leur propre système de paiement. Dans l'application,
// on masque donc les prix et le paiement Bictorys (ils restent disponibles sur le site).

export const NATIVE_APP_UA_MARKER = "RemindMeApp";

export function isNativeAppUserAgent(userAgent: string | null | undefined): boolean {
  return !!userAgent && userAgent.includes(NATIVE_APP_UA_MARKER);
}

/** Côté navigateur uniquement. Renvoie false pendant le rendu serveur. */
export function isNativeAppClient(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.Capacitor?.isNativePlatform?.()) return true;
  return isNativeAppUserAgent(window.navigator.userAgent);
}
