"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateNotificationPrefs } from "@/app/(app)/settings/actions";
import type { NotificationPreference } from "@/types/database";

interface NotificationsSectionProps {
  notifPrefs: Record<string, unknown> | null;
  notificationPreferences?: NotificationPreference | null;
}

export function NotificationsSection({ notifPrefs, notificationPreferences }: NotificationsSectionProps) {
  const { push } = useToast();

  const [emailEnabled, setEmailEnabled] = useState(
    notificationPreferences?.email_enabled ?? (notifPrefs?.email_enabled as boolean ?? true)
  );
  const [inAppEnabled, setInAppEnabled] = useState(
    notificationPreferences?.in_app_enabled ?? (notifPrefs?.in_app_enabled as boolean ?? true)
  );
  const [pushEnabled, setPushEnabled] = useState(
    (notifPrefs?.push_enabled as boolean) ?? false
  );

  const [activityReminders, setActivityReminders] = useState(
    notificationPreferences?.activity_reminders ?? (notifPrefs?.activity_reminders as boolean ?? true)
  );
  const [paymentReminders, setPaymentReminders] = useState(
    notificationPreferences?.payment_reminders ?? (notifPrefs?.payment_reminders as boolean ?? true)
  );
  const [expenseReminders, setExpenseReminders] = useState(
    notificationPreferences?.expense_reminders ?? (notifPrefs?.expense_reminders as boolean ?? true)
  );
  const [financeReminders, setFinanceReminders] = useState(
    (notifPrefs?.finance_reminders as boolean) ?? true
  );
  const [taskReminders, setTaskReminders] = useState(
    notificationPreferences?.task_reminders ?? (notifPrefs?.task_reminders as boolean ?? true)
  );
  const [conflictAlerts, setConflictAlerts] = useState(
    notificationPreferences?.conflict_alerts ?? (notifPrefs?.conflict_alerts as boolean ?? true)
  );

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    notificationPreferences?.quiet_hours_enabled ?? (notifPrefs?.quiet_hours_enabled as boolean ?? false)
  );
  const [quietHoursStart, setQuietHoursStart] = useState(
    notificationPreferences?.quiet_hours_start ?? (notifPrefs?.quiet_hours_start as string ?? "22:00")
  );
  const [quietHoursEnd, setQuietHoursEnd] = useState(
    notificationPreferences?.quiet_hours_end ?? (notifPrefs?.quiet_hours_end as string ?? "08:00")
  );

  const [preferredLocale, setPreferredLocale] = useState(
    notificationPreferences?.preferred_locale ?? (notifPrefs?.preferred_locale as string ?? "fr")
  );

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      if (emailEnabled) formData.set("email_enabled", "on");
      if (inAppEnabled) formData.set("in_app_enabled", "on");
      if (pushEnabled) formData.set("push_enabled", "on");
      if (activityReminders) formData.set("activity_reminders", "on");
      if (paymentReminders) formData.set("payment_reminders", "on");
      if (expenseReminders) formData.set("expense_reminders", "on");
      if (financeReminders) formData.set("finance_reminders", "on");
      if (taskReminders) formData.set("task_reminders", "on");
      if (conflictAlerts) formData.set("conflict_alerts", "on");

      if (quietHoursEnabled) formData.set("quiet_hours_enabled", "on");
      formData.set("quiet_hours_start", quietHoursStart);
      formData.set("quiet_hours_end", quietHoursEnd);
      formData.set("preferred_locale", preferredLocale);

      await updateNotificationPrefs(formData);
      push("Préférences de notifications enregistrées avec succès.", "success");
    } catch {
      push("Impossible d'enregistrer vos préférences.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      <div>
        <h3 className="text-base font-bold text-ink-950">Centre de notifications & Alertes</h3>
        <p className="text-xs text-ink-500 mt-1">
          Personnalisez la fréquence, les canaux de diffusion et les alertes automatisées de vos activités.
        </p>
      </div>

      {/* Section 1: Canaux de diffusion */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-600">
          Canaux de réception (Channels)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={inAppEnabled}
              onChange={(e) => setInAppEnabled(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="block text-xs font-bold text-ink-950">🔔 In-App</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-positive-soft text-positive">Actif</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Cloche, badges temps réel et panneau « Nécessite votre attention ».
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="block text-xs font-bold text-ink-950">📧 E-mail</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-signal-soft text-signal">Configurable</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Relances pour paiements en retard et échéances critiques.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-dashed border-ink-200 bg-canvas-raised/60 cursor-pointer hover:border-ink-300 transition-colors opacity-80">
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={(e) => setPushEnabled(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="block text-xs font-bold text-ink-950">📱 Push Web</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-ink-200 text-ink-700">Phase 3</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Notifications push sur mobile & navigateur (requiert Service Worker).
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Section 2: Types d'alertes & Rappels */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-600">
          Catégories d'alertes prises en charge
        </h4>

        <div className="space-y-2.5">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={activityReminders}
              onChange={(e) => setActivityReminders(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div className="flex-1">
              <span className="block text-xs font-bold text-ink-950">🎯 Activités & Séances de coaching</span>
              <span className="block text-[11px] text-ink-500">
                Rappels programmés avant les créneaux d'activité (J-1, H-2).
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={taskReminders}
              onChange={(e) => setTaskReminders(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div className="flex-1">
              <span className="block text-xs font-bold text-ink-950">📝 Tâches & Échéances</span>
              <span className="block text-[11px] text-ink-500">
                Rappels des tâches à accomplir aujourd'hui et alertes de retard.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={paymentReminders}
              onChange={(e) => setPaymentReminders(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div className="flex-1">
              <span className="block text-xs font-bold text-ink-950">💰 Paiements attendus & Factures clients</span>
              <span className="block text-[11px] text-ink-500">
                Alertes avant échéance (J-7, J-3, Jour J) et signalement des impayés.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={expenseReminders}
              onChange={(e) => setExpenseReminders(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div className="flex-1">
              <span className="block text-xs font-bold text-ink-950">⏰ Dépenses & Factures à régler</span>
              <span className="block text-[11px] text-ink-500">
                Alertes pour anticiper les paiements et factures fournisseurs dues.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={financeReminders}
              onChange={(e) => setFinanceReminders(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div className="flex-1">
              <span className="block text-xs font-bold text-ink-950">📊 Finances & Dépenses programmées</span>
              <span className="block text-[11px] text-ink-500">
                Alertes d'échéances d'abonnements, charges récurrentes et seuils de trésorerie.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={conflictAlerts}
              onChange={(e) => setConflictAlerts(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div className="flex-1">
              <span className="block text-xs font-bold text-ink-950">⚠️ Détection de conflits d'agenda</span>
              <span className="block text-[11px] text-ink-500">
                Notification immédiate si deux créneaux d'activités se chevauchent.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Section 3: Heures silencieuses (Quiet Hours) */}
      <div className="p-4 rounded-2xl border border-ink-100 bg-canvas-raised space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-ink-950">🌙 Heures silencieuses (Quiet Hours)</span>
            <span className="block text-[11px] text-ink-500">
              Suspendre l'envoi d'emails durant votre période de repos nocturne.
            </span>
          </div>
          <input
            type="checkbox"
            checked={quietHoursEnabled}
            onChange={(e) => setQuietHoursEnabled(e.target.checked)}
            className="h-4 w-4 rounded text-signal focus:ring-signal"
          />
        </div>

        {quietHoursEnabled && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-ink-100">
            <div>
              <label className="block text-[11px] font-medium text-ink-700 mb-1">
                Début du repos
              </label>
              <input
                type="time"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-ink-200 bg-canvas text-ink-950 focus:outline-none focus:ring-1 focus:ring-signal"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-700 mb-1">
                Fin du repos
              </label>
              <input
                type="time"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-ink-200 bg-canvas text-ink-950 focus:outline-none focus:ring-1 focus:ring-signal"
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Langue des notifications */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-ink-950">
          🌐 Langue des alertes & messages (i18n)
        </label>
        <select
          value={preferredLocale}
          onChange={(e) => setPreferredLocale(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 text-xs rounded-xl border border-ink-200 bg-canvas-raised text-ink-950 focus:outline-none focus:ring-2 focus:ring-signal"
        >
          <option value="fr">🇫🇷 Français (Par défaut)</option>
          <option value="en">🇬🇧 English</option>
          <option value="es">🇪🇸 Español</option>
          <option value="de">🇩🇪 Deutsch</option>
          <option value="pt">🇵🇹 Português</option>
        </select>
      </div>

      <div>
        <Button type="submit" loading={saving} className="w-full sm:w-auto">
          Enregistrer les préférences
        </Button>
      </div>
    </form>
  );
}
