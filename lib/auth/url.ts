/**
 * Retourne l'URL racine publique de l'application.
 * Privilégie l'URL de production Vercel (https://remind-me-saas.vercel.app)
 * ou l'origin du navigateur s'il est valide et en ligne.
 */
export function getAppUrl(): string {
  // 1. Variable d'environnement explicite si définie
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. Si exécuté côté navigateur et que nous sommes en ligne (non localhost)
  if (typeof window !== "undefined" && window.location.origin) {
    const origin = window.location.origin;
    if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin;
    }
  }

  // 3. Variables automatiques Vercel
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // 4. URL de production officielle Remind Me
  return "https://remind-me-saas.vercel.app";
}

/**
 * Construit l'URL complète de redirection d'authentification pour Supabase.
 */
export function getAuthRedirectUrl(next: string = "/dashboard"): string {
  const baseUrl = getAppUrl();
  const safeNext = next.startsWith("/") ? next : `/${next}`;
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
