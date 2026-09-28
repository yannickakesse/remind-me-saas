"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validation/auth";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import { RemindMeLogo } from "@/components/landing/remindme-logo";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSelector } from "@/components/ui/language-selector";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isConfirmed = searchParams.get("confirmed") === "true";
  const supabase = createClient();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const result = loginSchema.safeParse({ email, password });
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

    const { error } = await supabase.auth.signInWithPassword(result.data);

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setFormError(
          "Votre adresse e-mail n'a pas encore été confirmée. Veuillez vérifier votre boîte de réception et cliquer sur le lien reçu."
        );
      } else if (error.message === "Invalid login credentials" || error.message.toLowerCase().includes("invalid")) {
        setFormError("Email ou mot de passe incorrect. Vérifiez vos identifiants.");
      } else {
        setFormError("Une erreur est survenue lors de la connexion. Réessayez dans un instant.");
      }
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Top bar with Logo & Language Selector */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center group">
          <RemindMeLogo size="md" showText={true} />
        </Link>
        <LanguageSelector variant="pill" />
      </div>

      <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-ink-950">
            {t("auth.login_title")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-500">
            {t("auth.login_subtitle")}
          </p>
        </div>

        {/* Message de confirmation de compte réussie */}
        {isConfirmed && (
          <div className="mb-5 rounded-2xl bg-positive-soft border border-positive/20 p-3.5 flex items-start gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="h-5 w-5 text-positive shrink-0 mt-0.5" />
            <div className="text-xs text-positive-dark space-y-0.5">
              <p className="font-bold text-positive">{t("auth.account_confirmed_title")}</p>
              <p className="text-ink-600 dark:text-ink-400">
                {t("auth.account_confirmed_desc")}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label={t("auth.email")} htmlFor="email" error={fieldErrors.email}>
            <TextInput
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              placeholder={t("auth.email_placeholder")}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label={t("auth.password")} htmlFor="password" error={fieldErrors.password}>
            <TextInput
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              placeholder={t("auth.password_placeholder")}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {formError ? (
            <div role="alert" className="rounded-xl bg-danger-soft p-3 text-xs text-danger font-medium">
              {formError}
            </div>
          ) : null}

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? t("auth.btn_login_loading") : t("auth.btn_login")}
          </PrimaryButton>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs">
          <Link href="/forgot-password" className="text-ink-500 hover:text-ink-950 transition-colors">
            {t("auth.forgot_password_link")}
          </Link>
          <Link href="/register" className="text-signal font-semibold hover:underline">
            {t("auth.create_account")}
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-ink-400">
        {t("auth.footer_brand")}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-canvas">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8 text-ink-500 text-sm">
            ...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
