"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validation/auth";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";

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
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    setLoading(false);

    if (error) {
      setFormError(
        error.message.includes("already registered")
          ? "Un compte existe déjà avec cet email."
          : "Une erreur est survenue. Réessayez dans un instant."
      );
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-semibold text-ink-950">
            Vérifiez votre boîte mail
          </h1>
          <p className="text-sm text-ink-500">
            Nous avons envoyé un lien de confirmation à <strong>{email}</strong>.
            Cliquez dessus pour activer votre compte.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-ink-950">
          Créer votre compte
        </h1>
        <p className="mb-6 text-sm text-ink-500">
          Un seul endroit pour toutes vos activités et vos revenus.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Nom complet" htmlFor="fullName" error={fieldErrors.fullName}>
            <TextInput
              id="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field label="Email" htmlFor="email" error={fieldErrors.email}>
            <TextInput
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Mot de passe" htmlFor="password" error={fieldErrors.password}>
            <TextInput
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
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
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>

          {formError ? (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Création..." : "Créer mon compte"}
          </PrimaryButton>
        </form>

        <p className="mt-4 text-center text-sm">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-signal hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
