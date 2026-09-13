import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route de callback d'authentification Supabase (PKCE).
 * Échange le code d'autorisation temporaire reçu par email contre
 * une session persistée dans les cookies HTTP sécurisés.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirection vers la page demandée (ex: /reset-password ou /dashboard)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // En cas d'erreur ou de code expiré, renvoyer vers login avec message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
