"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { passwordChangeSchema } from "@/lib/validation/settings";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";

/**
 * Page atteinte depuis le lien reçu par email (voir forgot-password/page.tsx
 * → redirectTo: `${origin}/reset-password`). Le SDK Supabase détecte
 * automatiquement le jeton de récupération dans l'URL au chargement et émet
 * l'événement PASSWORD_RECOVERY — on attend ce signal avant d'afficher le
 * formulaire, pour ne jamais laisser quelqu'un taper un mot de passe sur
 * une page sans session de récupération valide.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    // Si l'événement a déjà été émis avant que ce composant ne s'abonne
    // (course possible au tout premier rendu), on vérifie aussi la session
    // directement après un court délai.
    const timeout = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
      else setInvalid(true);
    }, 2500);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client stable pour la durée du montage
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const result = passwordChangeSchema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: result.data.newPassword });
    setLoading(false);

    if (error) {
      setFormError("Impossible de changer le mot de passe. Réessayez.");
      return;
    }

    setDone(true);
    window.setTimeout(() => router.replace("/dashboard"), 1500);
  }

  if (invalid) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-semibold text-ink-950">Lien invalide ou expiré</h1>
          <p className="mb-4 text-sm text-ink-500">
            Ce lien de réinitialisation n'est plus valide. Demandez-en un nouveau.
          </p>
          <Link href="/forgot-password" className="text-sm font-medium text-signal hover:underline">
            Redemander un lien
          </Link>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-semibold text-ink-950">Mot de passe mis à jour</h1>
          <p className="text-sm text-ink-500">Redirection vers votre tableau de bord...</p>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-ink-500">Vérification du lien...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-ink-950">Nouveau mot de passe</h1>
        <p className="mb-6 text-sm text-ink-500">Choisissez un nouveau mot de passe pour votre compte.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Nouveau mot de passe" htmlFor="newPassword" error={fieldErrors.newPassword}>
            <TextInput
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>

          <Field label="Confirmer le mot de passe" htmlFor="confirmPassword" error={fieldErrors.confirmPassword}>
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
            {loading ? "Enregistrement..." : "Enregistrer le mot de passe"}
          </PrimaryButton>
        </form>
      </div>
    </main>
  );
}
