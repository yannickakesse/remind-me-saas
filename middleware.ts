import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

// /reset-password est un cas particulier : Supabase y établit une session
// de récupération (temporaire) une fois le lien de l'email consommé côté
// client. Si on appliquait la règle "authentifié sur une page d'auth →
// dashboard" ici, l'utilisateur serait renvoyé au dashboard avant même
// d'avoir pu choisir son nouveau mot de passe. Cette route reste donc
// accessible dans les deux cas (authentifié ou non), sans redirection.
const RECOVERY_ROUTE = "/reset-password";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(RECOVERY_ROUTE)) {
    return response;
  }

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Non authentifié sur une route privée → login
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Authentifié sur une page d'auth → dashboard
  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Applique le middleware à toutes les routes sauf :
     * - fichiers statiques et assets Next.js
     * - favicon
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
