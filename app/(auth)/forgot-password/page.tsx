"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import { getAuthRedirectUrl } from "@/lib/auth/url";
import { RemindMeLogo } from "@/components/landing/remindme-logo";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSelector } from "@/components/ui/language-selector";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const { t } = useLanguage();

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
      { redirectTo: getAuthRedirectUrl("/reset-password") }
    );
    setLoading(false);

    if (!resetError) setSent(true);
    else setSent(true);
  }

  if (sent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-canvas">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center group">
              <RemindMeLogo size="md" showText={true} />
            </Link>
            <LanguageSelector variant="pill" />
          </div>

          <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-6 sm:p-8 shadow-xl space-y-4">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-ink-950">
              {t("auth.verify_email_title")}
            </h1>
            <p className="text-xs sm:text-sm text-ink-500">
              {t("auth.verify_email_sent_to")} <br />
              <strong className="text-ink-950">{email}</strong>
            </p>
            <div className="pt-2">
              <Link href="/login" className="text-signal hover:underline font-semibold text-xs">
                {t("auth.btn_back_to_login")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-canvas">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center group">
            <RemindMeLogo size="md" showText={true} />
          </Link>
          <LanguageSelector variant="pill" />
        </div>

        <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-ink-950">
              {t("auth.forgot_title")}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-500">
              {t("auth.forgot_subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Field label={t("auth.email")} htmlFor="email" error={error ?? undefined}>
              <TextInput
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                placeholder={t("auth.email_placeholder")}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "..." : t("auth.btn_send_reset")}
            </PrimaryButton>
          </form>

          <p className="mt-6 text-center text-xs">
            <Link href="/login" className="text-signal hover:underline font-semibold">
              {t("auth.btn_back_to_login")}
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-ink-400">
          {t("auth.footer_brand")}
        </p>
      </div>
    </main>
  );
}
