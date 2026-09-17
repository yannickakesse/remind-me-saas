import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];
const RECOVERY_ROUTE = "/reset-password";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Accès direct 0ms pour la page d'accueil publique (aucun appel auth bloquant)
  if (pathname === "/") {
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

  // Authentifié sur une page d'auth → redirection vers dashboard
  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Applique le middleware uniquement aux pages applicatives, en excluant strictement :
     * - Fichiers statiques et builds Next.js (_next/static, _next/image)
     * - Favicons, icônes PWA, manifest, Service Worker
     * - Assets statiques (icons/, brand/)
     * - Fichiers robots et sitemaps
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|brand/|robots.txt|sitemap.xml).*)",
  ],
};
