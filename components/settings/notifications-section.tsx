"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateNotificationPrefs } from "@/app/(app)/settings/actions";
import { isNotificationEnabled, type NotifPrefsInput } from "@/lib/validation/settings";

interface NotificationsSectionProps {
  notifPrefs: Record<string, unknown> | null;
}

const ROWS: { key: keyof NotifPrefsInput; label: string; description: string }[] = [
  { key: "task_reminder", label: "Rappels de tâche", description: "Avant l'échéance d'une tâche (délai configuré sur la tâche)." },
  { key: "task_overdue", label: "Tâches en retard", description: "Quand une tâche dépasse son échéance." },
  { key: "finance_overdue", label: "Échéances financières en retard", description: "Revenu attendu ou dépense prévue non réglée à temps." },
];

export function NotificationsSection({ notifPrefs }: NotificationsSectionProps) {
  const { push } = useToast();
  const [values, setValues] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const row of ROWS) initial[row.key] = isNotificationEnabled(notifPrefs, row.key);
    return initial;
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      for (const row of ROWS) {
        if (values[row.key]) formData.set(row.key, "on");
      }
      await updateNotificationPrefs(formData);
      push("Préférences enregistrées.", "success");
    } catch {
      push("Impossible d'enregistrer vos préférences.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg">
      <h3 className="mb-1 text-sm font-semibold text-ink-950">Notifications</h3>
      <p className="mb-4 text-sm text-ink-500">
        Choisissez les notifications in-app que vous souhaitez recevoir.
      </p>

      <div className="flex flex-col gap-3">
        {ROWS.map((row) => (
          <label
            key={row.key}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-100 px-4 py-3"
          >
            <input
              type="checkbox"
              checked={values[row.key] ?? true}
              onChange={(e) => setValues((v) => ({ ...v, [row.key]: e.target.checked }))}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-ink-950">{row.label}</span>
              <span className="block text-xs text-ink-500">{row.description}</span>
            </span>
          </label>
        ))}
      </div>

      <Button type="submit" loading={saving} className="mt-4">
        Enregistrer
      </Button>
    </form>
  );
}
