"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Mail, ArrowRight, RefreshCw, CheckCircle2, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RemindMeLogo } from "@/components/landing/remindme-logo";
import { getAuthRedirectUrl } from "@/lib/auth/url";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "expired";
  const messageParam = searchParams.get("message") || "";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [loading, setLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const isAlreadyUsedOrExpired =
    reason === "expired" ||
    messageParam.toLowerCase().includes("expired") ||
    messageParam.toLowerCase().includes("already") ||
    messageParam.toLowerCase().includes("invalid");

  const title = isAlreadyUsedOrExpired
    ? "Le lien de confirmation n'est plus valide"
    : "Lien de confirmation invalide";

  const description = isAlreadyUsedOrExpired
    ? "Ce lien de confirmation a peut-être expiré (durée de validité dépassée) ou a déjà été utilisé pour activer votre compte."
    : "Impossible de valider ce lien de confirmation. Il manque des paramètres ou le lien est corrompu.";

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!email || cooldown > 0) return;

    setLoading(true);
    setErrorMessage(null);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: getAuthRedirectUrl("/dashboard"),
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already confirmed") || error.message.toLowerCase().includes("verified")) {
          setErrorMessage("Cette adresse e-mail est déjà confirmée. Vous pouvez vous connecter directement.");
        } else {
          setErrorMessage("Impossible d'envoyer l'e-mail. Vérifiez l'adresse et réessayez.");
        }
      } else {
        setResendSuccess(true);
        setCooldown(60);
      }
    } catch {
      setErrorMessage("Une erreur imprévue est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Logo */}
      <div className="flex justify-center">
        <Link href="/" className="inline-flex items-center group">
          <RemindMeLogo size="md" showText={true} />
        </Link>
      </div>

      {/* Card Principale */}
      <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Icone */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <AlertTriangle className="h-8 w-8" strokeWidth={2.2} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Vérification requise</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-ink-950">
            {title}
          </h1>

          <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Option 1: Déjà confirmé ? Se connecter */}
        <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas/60 p-4 text-left space-y-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-positive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-ink-950">Votre compte est peut-être déjà actif</h2>
              <p className="text-xs text-ink-500 leading-relaxed">
                Si vous avez déjà cliqué sur le lien précédemment, votre compte est prêt. Essayez de vous connecter avec votre mot de passe habituel.
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-4 py-2.5 text-xs font-bold text-white shadow-gold hover:brightness-110 active:scale-98 transition-all"
          >
            <span>Se connecter à Remind Me</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Séparateur */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-ink-100 dark:border-ink-100/10 w-full" />
          <span className="bg-canvas-raised px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Ou
          </span>
        </div>

        {/* Option 2: Recevoir un nouvel e-mail */}
        <form onSubmit={handleResend} className="text-left space-y-3">
          <div className="space-y-1">
            <label htmlFor="resend-email" className="text-xs font-bold text-ink-950 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-signal" />
              <span>Recevoir un nouvel e-mail de confirmation</span>
            </label>
            <p className="text-xs text-ink-500">
              Entrez l&apos;adresse e-mail utilisée lors de votre inscription.
            </p>
          </div>

          <div className="space-y-2">
            <input
              id="resend-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre-email@exemple.com"
              required
              className="w-full rounded-xl border border-ink-200 dark:border-ink-100/20 bg-canvas px-3.5 py-2.5 text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold"
            />

            {errorMessage ? (
              <p className="text-xs text-danger font-medium">{errorMessage}</p>
            ) : null}

            {resendSuccess ? (
              <div className="rounded-xl bg-positive-soft p-3 text-xs text-positive font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Un nouvel e-mail de confirmation vient de vous être envoyé.</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || cooldown > 0 || !email}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 dark:border-ink-100/20 bg-canvas px-4 py-2.5 text-xs font-bold text-ink-950 hover:bg-canvas-subtle disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>
                {loading
                  ? "Envoi en cours..."
                  : cooldown > 0
                  ? `Patientez ${cooldown}s`
                  : "Renvoyer le lien de confirmation"}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-ink-400">
        Besoin d&apos;aide ? Contactez notre support ou retournez à la{" "}
        <Link href="/" className="text-signal hover:underline">
          page d&apos;accueil
        </Link>
        .
      </p>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-canvas">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8 text-ink-500 text-sm">
            Chargement...
          </div>
        }
      >
        <AuthErrorContent />
      </Suspense>
    </main>
  );
}
