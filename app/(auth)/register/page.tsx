"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, RefreshCw, CheckCircle2, ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validation/auth";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import { RemindMeLogo } from "@/components/landing/remindme-logo";

export default function RegisterPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const result = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as string] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: { full_name: result.data.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    setLoading(false);

    if (error) {
      setFormError(
        error.message.includes("already registered")
          ? "Un compte existe déjà avec cette adresse e-mail."
          : "Une erreur est survenue lors de la création du compte. Réessayez dans un instant."
      );
      return;
    }

    // Notification instantanée pour l'admin (non-bloquant)
    fetch("/api/admin/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "signup",
        email: result.data.email,
        fullName: result.data.fullName,
      }),
    }).catch(() => {});

    setSubmitted(true);
    setCooldown(60);
  }

  async function handleResendEmail() {
    if (cooldown > 0 || resending || !email) return;
    setResending(true);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (!error) {
        setResendSuccess(true);
        setCooldown(60);
      }
    } finally {
      setResending(false);
    }
  }

  // Écran d'attente d'e-mail avec instructions complètes
  if (submitted) {
    const isGmail = email.toLowerCase().includes("@gmail.");
    const isOutlook = email.toLowerCase().includes("@outlook.") || email.toLowerCase().includes("@hotmail.");

    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-canvas">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <Link href="/" className="inline-flex items-center group">
              <RemindMeLogo size="md" showText={true} />
            </Link>
          </div>

          {/* Card Explicative */}
          <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-6 sm:p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Icone */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-signal/10 text-signal border border-signal/20 shadow-sm">
              <Mail className="h-8 w-8" strokeWidth={2.2} />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-signal/10 text-signal text-xs font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Compte créé avec succès</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-ink-950">
                Vérifiez votre boîte mail
              </h1>

              <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
                Nous venons d&apos;envoyer un e-mail de confirmation à :
              </p>
              <div className="inline-block px-3 py-1.5 rounded-xl bg-canvas border border-ink-200 dark:border-ink-100/20 font-bold text-xs sm:text-sm text-ink-950 break-all">
                {email}
              </div>
            </div>

            {/* Instruction étape par étape */}
            <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas/60 p-4 text-left space-y-2">
              <p className="text-xs font-bold text-ink-950">Que devez-vous faire ?</p>
              <ol className="text-xs text-ink-600 dark:text-ink-400 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Ouvrez votre boîte de réception (vérifiez aussi les spams).</li>
                <li>Cliquez sur le bouton <strong>« Confirmer mon adresse e-mail »</strong>.</li>
                <li>Votre compte sera immédiatement activé et vous pourrez vous connecter.</li>
              </ol>
            </div>

            {/* Raccourci direct boîte mail */}
            <div className="space-y-2">
              {isGmail && (
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-4 py-3 text-xs font-bold text-white shadow-gold hover:brightness-110 active:scale-98 transition-all"
                >
                  <span>Ouvrir Gmail</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {isOutlook && (
                <a
                  href="https://outlook.live.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-4 py-3 text-xs font-bold text-white shadow-gold hover:brightness-110 active:scale-98 transition-all"
                >
                  <span>Ouvrir Outlook</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {/* Renvoyer l'email */}
              {resendSuccess && (
                <div className="rounded-xl bg-positive-soft p-3 text-xs text-positive font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Un nouvel e-mail de confirmation vient d&apos;être envoyé !</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleResendEmail}
                disabled={resending || cooldown > 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 dark:border-ink-100/20 bg-canvas px-4 py-2.5 text-xs font-bold text-ink-950 hover:bg-canvas-subtle disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
                <span>
                  {resending
                    ? "Envoi en cours..."
                    : cooldown > 0
                    ? `Renvoyer l'e-mail (${cooldown}s)`
                    : "Renvoyer l'e-mail de confirmation"}
                </span>
              </button>
            </div>

            {/* Modifier l'email / Retour */}
            <div className="pt-2 border-t border-ink-100 dark:border-ink-100/10 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="inline-flex items-center gap-1.5 text-ink-500 hover:text-ink-950 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Modifier mon adresse</span>
              </button>

              <Link href="/login" className="text-signal hover:underline font-semibold">
                Aller à la connexion
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-ink-400">
            Remind Me • Vos activités, votre temps et votre argent sous contrôle.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-canvas">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/" className="inline-flex items-center group">
            <RemindMeLogo size="md" showText={true} />
          </Link>
        </div>

        <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-ink-950">
              Créer votre compte
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-500">
              Un seul endroit pour toutes vos activités et vos finances.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Field label="Nom complet" htmlFor="fullName" error={fieldErrors.fullName}>
              <TextInput
                id="fullName"
                autoComplete="name"
                value={fullName}
                placeholder="Ex. Jean Dupont"
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>

            <Field label="Email" htmlFor="email" error={fieldErrors.email}>
              <TextInput
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                placeholder="jean.dupont@exemple.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Mot de passe" htmlFor="password" error={fieldErrors.password}>
              <TextInput
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                placeholder="8 caractères minimum"
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <Field
              label="Confirmer le mot de passe"
              htmlFor="confirmPassword"
              error={fieldErrors.confirmPassword}
            >
              <TextInput
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                placeholder="Répétez votre mot de passe"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>

            {formError ? (
              <div role="alert" className="rounded-xl bg-danger-soft p-3 text-xs text-danger font-medium">
                {formError}
              </div>
            ) : null}

            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "Création du compte..." : "Créer mon compte"}
            </PrimaryButton>
          </form>

          <p className="mt-6 text-center text-xs text-ink-500">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-signal font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-ink-400">
          En créant un compte, vous acceptez nos conditions d&apos;utilisation.
        </p>
      </div>
    </main>
  );
}
