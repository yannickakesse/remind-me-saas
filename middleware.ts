import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isNativeAppUserAgent } from "@/lib/native-app";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/auth", "/fondateur", "/confidentialite", "/suppression-compte"];
const RECOVERY_ROUTE = "/reset-password";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Laisser passer tous les fichiers statiques (vidéos, images, sons, documents)
  if (
    pathname.endsWith(".mp4") ||
    pathname.endsWith(".webm") ||
    pathname.endsWith(".ogg") ||
    pathname.endsWith(".mp3") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 1. Accès direct 0ms pour la page d'accueil publique (aucun appel auth bloquant)
  //    Dans l'application mobile, pas de page vitrine (elle affiche les prix) : direction la connexion,
  //    qui renvoie elle-même vers le tableau de bord si l'utilisateur est déjà connecté.
  if (pathname === "/") {
    if (isNativeAppUserAgent(request.headers.get("user-agent"))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // 2. Accès direct pour la route de récupération de mot de passe
  if (pathname.startsWith(RECOVERY_ROUTE)) {
    return NextResponse.next();
  }

  // 3. Ne pas bloquer les routes API internes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Non authentifié sur une route privée → redirection immédiate vers login
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Authentifié sur une page d'auth (login/register) → redirection vers dashboard
  // Note: /auth/confirmed et /auth/error restent accessibles même connecté
  if (user && (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Applique le middleware uniquement aux pages applicatives, en excluant strictement :
     * - Fichiers statiques et builds Next.js (_next/static, _next/image)
     * - Fichiers multimédias (.mp4, .webm, .png, etc.)
     * - Favicons, icônes PWA, manifest, Service Worker
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|ogg|mp3|wav|json|js|css|webmanifest|txt|xml)$).*)",
  ],
};
