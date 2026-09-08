"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { passwordChangeSchema } from "@/lib/validation/settings";
import { changePassword } from "@/app/(app)/settings/actions";

export function SecuritySection() {
  const { push } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = passwordChangeSchema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[issue.path[0] as string] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("newPassword", result.data.newPassword);
      formData.set("confirmPassword", result.data.confirmPassword);
      await changePassword(formData);
      push("Mot de passe mis à jour.", "success");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      push("Impossible de changer le mot de passe. Réessayez.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-sm">
      <h3 className="mb-1 text-sm font-semibold text-ink-950">Changer de mot de passe</h3>
      <p className="mb-4 text-sm text-ink-500">Choisissez un nouveau mot de passe pour votre compte.</p>

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
        <Button type="submit" loading={saving} className="self-start">
          Mettre à jour
        </Button>
      </form>
    </div>
  );
}
