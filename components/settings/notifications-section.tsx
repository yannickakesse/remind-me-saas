"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
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
  ShieldAlert,
  Calendar,
  Sparkles,
  Info,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateNotificationPrefs } from "@/app/(app)/settings/actions";
import { urlBase64ToUint8Array } from "@/lib/push/client";
import { isSoundEnabled, setSoundEnabled, testChimeSound } from "@/lib/notifications/sound";
import type { NotificationPreference } from "@/types/database";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BE8s3t5tTHgVP9A-V5tKLq4vUCcFNU1m8bhDtFgwil3ORODoMl4Jmbo47rhMaTcNemPJb8c588D7oqj6VqYtVBU";

interface NotificationsSectionProps {
  notifPrefs: Record<string, unknown> | null;
  notificationPreferences?: NotificationPreference | null;
}

export type PushState =
  | "disabled"
  | "activating"
  | "active"
  | "permission_denied"
  | "unsupported"
  | "ios_needs_pwa"
  | "error";

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
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(
    notificationPreferences?.weekly_summary_enabled ?? (notifPrefs?.weekly_summary_enabled as boolean ?? true)
  );
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(
    notificationPreferences?.daily_summary_enabled ?? (notifPrefs?.daily_summary_enabled as boolean ?? true)
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

  // Tests & États réels de chaque canal
  const [testingInApp, setTestingInApp] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const [pushState, setPushState] = useState<PushState>("disabled");
  const [pushErrorMessage, setPushErrorMessage] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
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

  // Détection de l'environnement PWA & Web Push
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

    if (!pushSupported) {
      setPushState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setPushState("permission_denied");
      return;
    }

    if (iosDevice && !standaloneMode) {
      setPushState("ios_needs_pwa");
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            setPushState("active");
            setPushEnabled(true);
          } else {
            setPushState("disabled");
          }
        })
        .catch(() => {
          setPushState("disabled");
        });
    }
  }, []);

  // Test de notification In-App réelle
  async function handleTestInApp() {
    setTestingInApp(true);
    try {
      const res = await fetch("/api/notifications/test-inapp", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        push("Notification In-App créée avec succès ! Vérifiez la cloche ou le centre de notifications.", "success");
      } else {
        push(data.error || "Impossible de créer la notification in-app.", "error");
      }
    } catch {
      push("Erreur réseau lors du test in-app.", "error");
    } finally {
      setTestingInApp(false);
    }
  }

  // Test d'envoi d'E-mail réel
  async function handleTestEmail() {
    setTestingEmail(true);
    setEmailStatusMsg(null);
    try {
      const res = await fetch("/api/email/test", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setEmailStatusMsg({
          type: "success",
          text: `E-mail envoyé avec succès à ${data.recipient} (Message ID : ${data.messageId}).`,
        });
        push(`Véritable e-mail de test envoyé à ${data.recipient} !`, "success");
      } else if (data.status === "NOT_CONFIGURED") {
        setEmailStatusMsg({
          type: "info",
          text: "Canal e-mail en attente de configuration : ajoutez votre clé RESEND_API_KEY dans vos variables d'environnement.",
        });
        push("Fournisseur e-mail non configuré (RESEND_API_KEY manquante).", "info");
      } else {
        setEmailStatusMsg({
          type: "error",
          text: data.error || "Échec de l'envoi de l'e-mail par le fournisseur.",
        });
        push(data.error || "Échec lors de l'envoi de l'e-mail.", "error");
      }
    } catch {
      setEmailStatusMsg({
        type: "error",
        text: "Erreur réseau lors du déclenchement de l'e-mail.",
      });
      push("Erreur réseau lors du test d'e-mail.", "error");
    } finally {
      setTestingEmail(false);
    }
  }

  // Activation Web Push
  async function handleEnablePush() {
    setPushErrorMessage(null);

    if (isIOS && !isStandalone) {
      setShowIOSPrompt(true);
      setPushState("ios_needs_pwa");
      return;
    }

    const pushSupported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    if (!pushSupported) {
      setPushState("unsupported");
      push("Ce navigateur ne prend pas en charge le Web Push.", "info");
      return;
    }

    setPushState("activating");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState("permission_denied");
        push("Autorisation refusée pour les notifications dans votre navigateur.", "info");
        return;
      }

      let reg: ServiceWorkerRegistration;
      try {
        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
      } catch (swErr: any) {
        reg = await navigator.serviceWorker.ready;
      }

      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

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
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || "Impossible d'enregistrer la souscription sur le serveur.");
      }

      setPushState("active");
      setPushEnabled(true);
      push("Notifications push activées avec succès sur cet appareil !", "success");
    } catch (err: any) {
      console.error("[Push] Erreur activation:", err);
      setPushState("error");
      setPushErrorMessage(err?.message || "Erreur lors de l'activation du push.");
      push(err?.message || "Erreur lors de l'activation des notifications push.", "error");
    }
  }

  // Désactivation Web Push
  async function handleDisablePush() {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
      }
      setPushState("disabled");
      setPushEnabled(false);
      push("Notifications push désactivées sur cet appareil.", "info");
    } catch {
      push("Impossible de désactiver le push.", "error");
    }
  }

  // Test Push
  async function handleTestPush() {
    setTestingPush(true);
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();

      if (data.success) {
        push("Notification push de test envoyée avec succès sur votre appareil !", "success");
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
      if (weeklySummaryEnabled) formData.set("weekly_summary_enabled", "on");
      if (dailySummaryEnabled) formData.set("daily_summary_enabled", "on");

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
        <h3 className="text-base font-bold text-ink-950">Centre de notifications & Alertes réelles</h3>
        <p className="text-xs text-ink-500 mt-1">
          Gérez vos canaux de réception réels (In-App, E-mail, Push Mobile), testez leur fonctionnement en direct et configurez vos règles de rappel.
        </p>
      </div>

      {/* Modal / Bandeau d'installation iPhone PWA pour Push */}
      {showIOSPrompt && (
        <div className="p-4 rounded-2xl border-2 border-signal bg-signal-soft/30 space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-signal font-bold text-sm">
              <Smartphone className="w-4 h-4" />
              <span>Activation requise sur iPhone (iOS PWA)</span>
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
            Pour recevoir les alertes push instantanées sur votre iPhone, Apple exige d'ajouter l'application à votre écran d'accueil :
          </p>

          <ol className="text-xs text-ink-600 space-y-1.5 pl-4 list-decimal">
            <li className="flex items-center gap-1.5">
              <span>Appuyez sur le bouton Partager</span> <Share className="w-3.5 h-3.5 text-signal inline" /> <span>en bas de Safari</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span>Sélectionnez</span> <span className="font-semibold text-ink-950">« Sur l'écran d'accueil »</span> <PlusSquare className="w-3.5 h-3.5 text-signal inline" />
            </li>
            <li>Ouvrez ensuite l'application depuis la nouvelle icône <strong>Remind Me</strong></li>
            <li>Revenez dans Paramètres &gt; Notifications et activez les alertes push.</li>
          </ol>
        </div>
      )}

      {/* Section 1: Canaux de diffusion */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-600">
          Canaux de réception (Multi-Channels)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. In-App */}
          <div className="p-3.5 rounded-xl border border-ink-200 bg-canvas-raised space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inAppEnabled}
                  onChange={(e) => setInAppEnabled(e.target.checked)}
                  className="rounded text-signal focus:ring-signal"
                />
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-signal" />
                  <span className="text-xs font-bold text-ink-950">In-App</span>
                </div>
              </label>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-positive-soft text-positive">Opérationnel</span>
            </div>
            <p className="text-[11px] text-ink-500 leading-relaxed">
              Cloche d'alertes, badges de non-lus et panneau d'attention quotidienne.
            </p>
            <div className="pt-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={testingInApp}
                onClick={handleTestInApp}
                className="w-full text-xs py-1.5"
              >
                <Send className="w-3 h-3 mr-1.5" /> Tester la notification In-App
              </Button>
            </div>
          </div>

          {/* 2. E-mail */}
          <div className="p-3.5 rounded-xl border border-ink-200 bg-canvas-raised space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="rounded text-signal focus:ring-signal"
                />
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-signal" />
                  <span className="text-xs font-bold text-ink-950">E-mail Transactionnel</span>
                </div>
              </label>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-signal-soft text-signal">Resend API</span>
            </div>
            <p className="text-[11px] text-ink-500 leading-relaxed">
              Véritables e-mails envoyés dans votre boîte mail pour les échéances et impayés.
            </p>
            <div className="pt-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={testingEmail}
                onClick={handleTestEmail}
                className="w-full text-xs py-1.5"
              >
                <Send className="w-3 h-3 mr-1.5" /> Tester l'envoi d'e-mail
              </Button>
            </div>
            {emailStatusMsg && (
              <p
                className={`text-[10px] p-2 rounded-lg leading-relaxed ${
                  emailStatusMsg.type === "success"
                    ? "bg-positive-soft text-positive"
                    : emailStatusMsg.type === "info"
                    ? "bg-signal-soft text-signal"
                    : "bg-danger-soft text-danger"
                }`}
              >
                {emailStatusMsg.text}
              </p>
            )}
          </div>

          {/* 3. Web Push Mobile & Desktop */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-2.5 sm:col-span-2 ${
            pushState === "active"
              ? "border-positive/40 bg-positive-soft/15"
              : pushState === "permission_denied"
              ? "border-warning/40 bg-warning-soft/15"
              : "border-ink-200 bg-canvas-raised"
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-signal" />
                <span className="text-xs font-bold text-ink-950">Push Mobile & Notifications Système</span>
              </div>

              {pushState === "active" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-positive-soft text-positive flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Push actif
                </span>
              )}
              {pushState === "activating" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-signal-soft text-signal animate-pulse">
                  Activation...
                </span>
              )}
              {pushState === "disabled" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ink-100 text-ink-700">
                  Désactivé
                </span>
              )}
              {pushState === "permission_denied" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger-soft text-danger flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Permission refusée
                </span>
              )}
              {pushState === "unsupported" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ink-100 text-ink-500">
                  Non supporté
                </span>
              )}
              {pushState === "ios_needs_pwa" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-warning-soft text-warning">
                  PWA requise (iOS)
                </span>
              )}
            </div>

            <p className="text-[11px] text-ink-500 leading-relaxed">
              {pushState === "permission_denied"
                ? "Autorisation bloquée dans votre navigateur. Cliquez sur l'icône de cadenas pour autoriser."
                : "Recevez les alertes directement sur votre écran même lorsque l'application est fermée."}
            </p>

            {pushErrorMessage && (
              <p className="text-[10px] text-danger font-medium">{pushErrorMessage}</p>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              {pushState === "active" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    loading={testingPush}
                    onClick={handleTestPush}
                    className="w-full sm:w-auto text-xs py-1.5"
                  >
                    <Send className="w-3 h-3 mr-1.5" /> Tester la notification push
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleDisablePush}
                    className="w-full sm:w-auto text-xs py-1.5 text-danger hover:text-danger"
                  >
                    Désactiver sur cet appareil
                  </Button>
                </>
              ) : pushState === "permission_denied" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => alert("Pour réactiver : cliquez sur l'icône de cadenas à gauche de l'adresse du site et autorisez les notifications.")}
                  className="w-full text-xs py-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-warning" /> Guide d'autorisation navigateur
                </Button>
              ) : pushState === "ios_needs_pwa" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setShowIOSPrompt(true);
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("open-pwa-install-guide"));
                    }
                  }}
                  className="w-full text-xs py-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 mr-1.5" /> Ajouter à l'écran d'accueil iPhone
                </Button>
              ) : pushState === "unsupported" ? (
                <div className="text-[10px] text-ink-500 italic">Navigateur non compatible Web Push</div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  loading={pushState === "activating"}
                  onClick={handleEnablePush}
                  className="w-full sm:w-auto text-xs py-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 mr-1.5" /> Activer les notifications push
                </Button>
              )}
            </div>
          </div>

          {/* 4. WhatsApp (Statut véridique & Architecture prête) */}
          <div className="p-3.5 rounded-xl border border-ink-200 bg-canvas-raised space-y-2.5 sm:col-span-2 opacity-85">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-ink-500" />
                <span className="text-xs font-bold text-ink-950">WhatsApp Business</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ink-100 text-ink-600 border border-ink-200">
                Non configuré (En attente d'API)
              </span>
            </div>
            <p className="text-[11px] text-ink-500 leading-relaxed">
              L'architecture technique pour l'API officielle (Twilio / Meta Cloud API) est intégrée. Aucun envoi n'est simulé tant que vos identifiants d'API officiels ne sont pas renseignés.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1.5: Sonnerie Audio de Rappel */}
      <div className="p-4 rounded-2xl border border-signal/30 bg-signal-soft/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-signal text-white shrink-0 mt-0.5">
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink-950">Carillon sonore officiel Remind Me</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  soundEnabled ? "bg-positive-soft text-positive" : "bg-ink-100 text-ink-600"
                }`}>
                  {soundEnabled ? "Son activé" : "Son coupé"}
                </span>
              </div>
              <p className="text-xs text-ink-600 mt-0.5">
                Joue un carillon agréable au moment exact des échéances de tâches et alertes urgentes.
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
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current text-signal" /> Écouter
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

      {/* Section 2: Types d'alertes & Règles déterministes */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-600">
          Règles de rappels & Alertes automatiques
        </h4>

        <div className="space-y-2.5">
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
                <span className="block text-xs font-bold text-ink-950">Paiements attendus (J-7, J-3, J-1, Jour J, Impayés)</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Rappels progressifs avant échéance et alertes si non encaissé. S'arrête immédiatement dès que le paiement est marqué comme reçu.
              </span>
            </div>
          </label>

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
                <span className="block text-xs font-bold text-ink-950">Activités & Séances du calendrier</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Rappels programmés (J-1, H-3, H-1, 30m, 15m) et alertes pour les séances passées non encore confirmées.
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
                Rappels des tâches du jour, imminentes et en retard. S'arrête automatiquement dès que la tâche est terminée.
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
                Alertes pour anticiper les paiements et charges dues. S'arrête dès que la facture est payée.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={dailySummaryEnabled}
              onChange={(e) => setDailySummaryEnabled(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                <span className="block text-xs font-bold text-ink-950">Rappel du début de mois (Perspectives mensuelles)</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Notification le 1er, 2e ou 3e jour du mois avec synthèse des encaissements prévus et charges programmées du mois.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-ink-100 bg-canvas-raised cursor-pointer hover:border-ink-200 transition-colors">
            <input
              type="checkbox"
              checked={weeklySummaryEnabled}
              onChange={(e) => setWeeklySummaryEnabled(e.target.checked)}
              className="mt-1 rounded text-signal focus:ring-signal"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-signal" />
                <span className="block text-xs font-bold text-ink-950">Résumé hebdomadaire (Le lundi)</span>
              </div>
              <span className="block text-[11px] text-ink-500 mt-0.5">
                Synthèse le lundi matin de votre planning de la semaine, priorités et échéances financières.
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
                Alerte instantanée en cas de chevauchement d'activités.
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
              Suspendre l'envoi d'alertes sonores et push durant votre période de repos nocturne (les alertes critiques restent visibles In-App).
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

      {/* Section 5: Application Mobile & Écran d'accueil */}
      <div className="p-4 rounded-xl border border-ink-200 bg-canvas-raised space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-signal" />
            <h4 className="text-xs font-bold text-ink-950">Application Mobile (PWA)</h4>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-signal-soft text-signal">
            Recommandé
          </span>
        </div>
        <p className="text-xs text-ink-600 leading-relaxed">
          Installez Remind Me sur l'écran d'accueil de votre iPhone, iPad ou Android pour profiter du mode plein écran fluide et de rappels fiables en temps réel.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("open-pwa-install-guide"));
            }
          }}
          className="text-xs"
        >
          <Smartphone className="w-3.5 h-3.5 mr-1.5 text-signal" /> Guide d'installation sur écran d'accueil
        </Button>
      </div>

      <div>
        <Button type="submit" loading={saving} className="w-full sm:w-auto">
          Enregistrer les préférences
        </Button>
      </div>
    </form>
  );
}
