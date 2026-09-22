import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { notifyAdmin } from "@/lib/admin/notifier";

export const dynamic = "force-dynamic";

/**
 * Route de callback d'authentification Supabase (PKCE & OTP Token Hash).
 * Reçoit le retour du clic sur le bouton de confirmation d'e-mail.
 * Échange le code ou valide le token hash, établit la session et
 * redirige l'utilisateur vers la page de confirmation de succès Remind Me.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/dashboard";

  // 1. Vérification des erreurs renvoyées par Supabase
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (errorParam || errorCode) {
    console.warn(`[Auth:Callback] Erreur Supabase reçue : ${errorCode || errorParam} - ${errorDescription}`);
    const reason = errorCode === "otp_expired" ? "expired" : "invalid";
    return NextResponse.redirect(
      `${origin}/auth/error?reason=${reason}&description=${encodeURIComponent(errorDescription || "")}`
    );
  }

  const supabase = createClient();

  // 2. Flux PKCE (code)
  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[Auth:Callback] Erreur exchangeCodeForSession:", error.message);
        const isExpired =
          error.message.toLowerCase().includes("expired") ||
          error.message.toLowerCase().includes("invalid") ||
          error.message.toLowerCase().includes("already");
        const reason = isExpired ? "expired" : "failed";
        return NextResponse.redirect(
          `${origin}/auth/error?reason=${reason}&message=${encodeURIComponent(error.message)}`
        );
      }

      // Notification admin en arrière-plan
      if (data.user?.email) {
        notifyAdmin({
          type: "email_confirmed",
          email: data.user.email,
        }).catch(() => {});
      }

      // Si c'est une réinitialisation de mot de passe demandée
      if (next.includes("reset-password")) {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Confirmation d'inscription réussie
      return NextResponse.redirect(`${origin}/auth/confirmed?next=${encodeURIComponent(next)}`);
    } catch (err: any) {
      console.error("[Auth:Callback] Exception code exchange:", err);
      return NextResponse.redirect(
        `${origin}/auth/error?reason=failed&message=${encodeURIComponent(err?.message || "Erreur inattendue")}`
      );
    }
  }

  // 3. Flux OTP Token Hash (token_hash & type)
  if (token_hash && type) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });

      if (error) {
        console.error("[Auth:Callback] Erreur verifyOtp:", error.message);
        return NextResponse.redirect(
          `${origin}/auth/error?reason=expired&message=${encodeURIComponent(error.message)}`
        );
      }

      // Notification admin en arrière-plan
      if (data?.user?.email) {
        notifyAdmin({
          type: "email_confirmed",
          email: data.user.email,
        }).catch(() => {});
      }

      if (type === "recovery" || next.includes("reset-password")) {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      return NextResponse.redirect(`${origin}/auth/confirmed?next=${encodeURIComponent(next)}`);
    } catch (err: any) {
      console.error("[Auth:Callback] Exception verifyOtp:", err);
      return NextResponse.redirect(
        `${origin}/auth/error?reason=failed&message=${encodeURIComponent(err?.message || "Erreur inattendue")}`
      );
    }
  }

  // 4. Aucun paramètre d'authentification valide
  return NextResponse.redirect(`${origin}/auth/error?reason=missing_params`);
}
