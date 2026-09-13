"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Email invalide");
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      result.data.email,
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }
    );
    setLoading(false);

    // On affiche toujours le même message de succès, que l'email existe
    // ou non, pour ne pas révéler quels emails sont enregistrés.
    if (!resetError) setSent(true);
    else setSent(true);
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-semibold text-ink-950">
            Email envoyé
          </h1>
          <p className="text-sm text-ink-500">
            Si un compte existe pour {email}, un lien de réinitialisation vient
            d'être envoyé.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-ink-950">
          Mot de passe oublié
        </h1>
        <p className="mb-6 text-sm text-ink-500">
          Indiquez votre email, nous vous enverrons un lien de réinitialisation.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Email" htmlFor="email" error={error ?? undefined}>
            <TextInput
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer le lien"}
          </PrimaryButton>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-signal hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
