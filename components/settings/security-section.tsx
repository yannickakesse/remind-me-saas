"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { passwordChangeSchema } from "@/lib/validation/settings";
import { changePassword } from "@/app/(app)/settings/actions";
import { KeyRound, ShieldCheck } from "lucide-react";

export function SecuritySection() {
  const { push } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    const result = passwordChangeSchema.safeParse({
      currentPassword: currentPassword.trim() || undefined,
      newPassword,
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
    setSaving(true);

    try {
      const formData = new FormData();
      if (currentPassword) formData.set("currentPassword", currentPassword);
      formData.set("newPassword", result.data.newPassword);
      formData.set("confirmPassword", result.data.confirmPassword);

      await changePassword(formData);
      push("Votre mot de passe a été modifié avec succès.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const message = err?.message || "Impossible de changer le mot de passe. Réessayez.";
      setGlobalError(message);
      push(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h3 className="text-base font-bold text-ink-950 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-signal" />
          Sécurité & Mot de passe
        </h3>
        <p className="text-xs text-ink-500 mt-1">
          Mettez à jour votre mot de passe pour garantir la protection de vos données d'activités et financières.
        </p>
      </div>

      {globalError && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-xs font-semibold text-danger animate-in fade-in">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Mot de passe actuel (optionnel)"
          htmlFor="currentPassword"
          error={fieldErrors.currentPassword}
        >
          <TextInput
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>

        <Field
          label="Nouveau mot de passe"
          htmlFor="newPassword"
          error={fieldErrors.newPassword}
        >
          <TextInput
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>

        <Field
          label="Confirmer le nouveau mot de passe"
          htmlFor="confirmPassword"
          error={fieldErrors.confirmPassword}
        >
          <TextInput
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Retapez le nouveau mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        <div className="pt-2">
          <Button type="submit" loading={saving} className="w-full sm:w-auto">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            Mettre à jour le mot de passe
          </Button>
        </div>
      </form>
    </div>
  );
}
