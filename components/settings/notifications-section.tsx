"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  Briefcase,
  CheckSquare,
  Wallet,
  Clock,
  BarChart3,
  AlertTriangle,
  Moon,
  Globe,
  Share,
  PlusSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateNotificationPrefs } from "@/app/(app)/settings/actions";
import { urlBase64ToUint8Array } from "@/lib/push/client";
import { isSoundEnabled, setSoundEnabled, testChimeSound } from "@/lib/notifications/sound";
import type { NotificationPreference } from "@/types/database";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

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
    (notificationPreferences as any)?.push_enabled ?? (notifPrefs?.push_enabled as boolean ?? false)
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
  const [soundEnabled, setLocalSoundEnabled] = useState(true);

  // Push Web State
  const [isPushSupported, setIsPushSupported] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [registeringPush, setRegisteringPush] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  useEffect(() => {
    setLocalSoundEnabled(isSoundEnabled());
  }, []);

  function handleToggleSound(enabled: boolean) {
    setLocalSoundEnabled(enabled);
    setSoundEnabled(enabled);
    if (enabled) {
      testChimeSound();
    }
  }

  async function handleTestChime() {
    await testChimeSound();
    push("🔔 Le carillon audio Remind Me a été joué avec succès !", "success");
  }

  // Détection de l'environnement PWA & Push
  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMode);

    const pushSupported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsPushSupported(pushSupported);

    if (pushSupported && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            setPushSubscribed(true);
            setPushEnabled(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Déclencheur d'activation Web Push explicite (User Gesture)
  async function handleEnablePush() {
    if (!isPushSupported) {
      push("Les notifications push ne sont pas supportées sur ce navigateur.", "error");
      return;
    }

    // Sur iOS, Web Push requiert impérativement que l'application soit installée sur l'écran d'accueil
    if (isIOS && !isStandalone) {
      setShowIOSPrompt(true);
      return;
    }

    setRegisteringPush(true);
    try {
      // 1. Demande de permission native au navigateur
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        push("Autorisation refusée pour les notifications.", "error");
        setPushSubscribed(false);
        setPushEnabled(false);
        setRegisteringPush(false);
        return;
      }

      // 2. Récupération de l'enregistrement Service Worker
      const reg = await navigator.serviceWorker.ready;

      // 3. Création de la souscription PushManager avec clé VAPID
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // 4. Envoi de la souscription à Supabase via l'API
      const rawKeys = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: rawKeys.keys?.p256dh,
            auth: rawKeys.keys?.auth,
          },
          platform: isIOS ? "iOS" : "Web",
          browser: navigator.userAgent.includes("Chrome")
            ? "Chrome"
            : navigator.userAgent.includes("Safari")
            ? "Safari"
            : "Browser",
          device_name: isIOS ? "iPhone / iPad" : "Appareil connecté",
        }),
      });

      if (!response.ok) {
        throw new Error("Impossible d'enregistrer la souscription sur le serveur.");
      }

      setPushSubscribed(true);
      setPushEnabled(true);
      push("Notifications push activées avec succès !", "success");
    } catch (err: any) {
      console.error("[Push] Erreur activation:", err);
      push(err?.message || "Erreur lors de l'activation des notifications push.", "error");
    } finally {
      setRegisteringPush(false);
    }
  }

  // Test immédiat de notification push
  async function handleTestPush() {
    setTestingPush(true);
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();

      if (data.success) {
        push("Notification push de test envoyée !", "success");
      } else {
        push(data.error || "Impossible d'envoyer la notification de test.", "error");
      }
    } catch {
      push("Erreur réseau lors du test de notification.", "error");
    } finally {
      setTestingPush(false);
    }
  }

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

      {/* Modal / Bandeau d'installation iPhone PWA pour Push */}
      {showIOSPrompt && (
        <div className="p-4 rounded-2xl border-2 border-signal bg-signal-soft/30 space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-signal font-bold text-sm">
              <Smartphone className="w-4 h-4" />
              <span>Activation requise sur iPhone</span>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSPrompt(false)}
              className="text-ink-400 hover:text-ink-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-ink-700 font-medium leading-relaxed">
            Pour recevoir les notifications push sur votre iPhone, ajoutez d'abord Remind Me à votre écran d'accueil :
          </p>

          <ol className="text-xs text-ink-600 space-y-1.5 pl-4 list-decimal">
            <li className="flex items-center gap-1.5">
              <span>Appuyez sur le bouton Partager</span> <Share className="w-3.5 h-3.5 text-signal inline" /> <span>dans Safari</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span>Sélectionnez</span> <span className="font-semibold text-ink-950">« Sur l'écran d'accueil »</span> <PlusSquare className="w-3.5 h-3.5 text-signal inline" />
            </li>
            <li>Ouvrez l'application depuis la nouvelle icône <strong>Remind Me</strong></li>
            <li>Revenez dans les Paramètres et appuyez sur <strong>Activer les notifications push</strong></li>
          </ol>
        </div>
      )}

      {/* Section 1: Canaux de diffusion */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-600">
          Canaux de réception (Channels)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* In-App */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={inAppEnabled}
              onChange={(e) => setInAppEnabled(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-signal" />
                <span className="block text-xs font-bold text-ink-950">In-App</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-positive-soft text-positive">Actif</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Cloche, badges temps réel et panneau « Nécessite votre attention ».
              </span>
            </div>
          </label>

          {/* E-mail */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-signal" />
                <span className="block text-xs font-bold text-ink-950">E-mail</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-signal-soft text-signal">Configurable</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Relances pour paiements en retard et échéances critiques.
              </span>
            </div>
          </label>

          {/* Web Push */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            pushSubscribed
              ? "border-positive/40 bg-positive-soft/20"
              : "border-ink-200 bg-canvas-raised"
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-signal" />
                <span className="block text-xs font-bold text-ink-950">Push Mobile</span>
              </div>
              {pushSubscribed ? (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-positive-soft text-positive flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Actif
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-ink-100 text-ink-700">
                  Désactivé
                </span>
              )}
            </div>
            <span className="block text-[11px] text-ink-500 mt-1">
              Rappels instantanés sur iPhone, Android et Mac/PC.
            </span>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!pushSubscribed ? (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  loading={registeringPush}
                  onClick={handleEnablePush}
                  className="w-full text-xs py-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 mr-1.5" /> Activer Push
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={testingPush}
                  onClick={handleTestPush}
                  className="w-full text-xs py-1.5"
                >
                  <Send className="w-3 h-3 mr-1.5" /> Tester la notification
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 1.5: Sonnerie Audio de Rappel (Carillon Remind Me) */}
      <div className="p-4 rounded-2xl border border-signal/30 bg-signal-soft/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-signal text-white shrink-0 mt-0.5">
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink-950">Sonnerie des rappels & Alertes audio</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  soundEnabled ? "bg-positive-soft text-positive" : "bg-ink-100 text-ink-600"
                }`}>
                  {soundEnabled ? "Sonnerie activée" : "Sonnerie désactivée"}
                </span>
              </div>
              <p className="text-xs text-ink-600 mt-0.5">
                Joue le carillon sonore officiel Remind Me lors de l'arrivée d'une échéance de tâche ou d'une notification critique.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleTestChime}
              className="text-xs"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current text-signal" /> Tester le son
            </Button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => handleToggleSound(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-ink-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-signal"></div>
            </label>
          </div>
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
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-signal" />
                <span className="block text-xs font-bold text-ink-950">Activités & Séances</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Rappels programmés avant les créneaux d'activité (J-1, H-3, H-1, 30m, 15m).
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
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-signal" />
                <span className="block text-xs font-bold text-ink-950">Tâches & Échéances</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Rappels des tâches imminentes, échéances du jour et alertes de retard.
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
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-gold-dark" />
                <span className="block text-xs font-bold text-ink-950">Paiements attendus & Factures clients</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Alertes séquentielles avant échéance (J-7, J-3, J-1, Jour J) et signalement des impayés (+1j, +3j, +7j).
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
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-warning" />
                <span className="block text-xs font-bold text-ink-950">Dépenses & Factures à régler</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Alertes pour anticiper les paiements et charges d'activités dues.
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
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-signal" />
                <span className="block text-xs font-bold text-ink-950">Finances & Dépenses programmées</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Alertes d'échéances d'abonnements, charges récurrentes et objectifs d'épargne.
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
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                <span className="block text-xs font-bold text-ink-950">Détection de conflits d'agenda</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
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
            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-ink-700" />
              <span className="block text-xs font-bold text-ink-950">Heures silencieuses (Quiet Hours)</span>
            </div>
            <span className="block text-[11px] text-ink-500 mt-0.5">
              Suspendre l'envoi d'alertes durant votre période de repos nocturne.
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
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-ink-700" />
          <label className="block text-xs font-bold text-ink-950">
            Langue des alertes & messages (i18n)
          </label>
        </div>
        <select
          value={preferredLocale}
          onChange={(e) => setPreferredLocale(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 text-xs rounded-xl border border-ink-200 bg-canvas-raised text-ink-950 focus:outline-none focus:ring-2 focus:ring-signal"
        >
          <option value="fr">Français (Par défaut)</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="de">Deutsch</option>
          <option value="pt">Português</option>
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
