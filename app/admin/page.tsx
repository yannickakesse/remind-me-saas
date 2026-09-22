"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Briefcase,
  CheckSquare,
  TrendingUp,
  Bell,
  Smartphone,
  Send,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
} from "lucide-react";
import { RemindMeLogo } from "@/components/landing/remindme-logo";

interface AdminStats {
  totalUsers: number;
  totalActivities: number;
  totalTasks: number;
  totalIncome: number;
  totalExpenses: number;
  totalNotifications: number;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  created_at: string;
  timezone: string;
  locale: string;
  onboarding_completed: boolean;
}

interface NotificationLog {
  id: string;
  channel: string;
  template: string;
  delivery_status: string;
  created_at: string;
}

interface EnvConfig {
  telegram: boolean;
  discord: boolean;
  emailNotifications: boolean;
  vercelAnalytics: boolean;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<NotificationLog[]>([]);
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentUsers(data.recentUsers);
        setRecentNotifications(data.recentNotifications);
        setEnvConfig(data.envConfig);
        setCurrentUserEmail(data.currentUserEmail);
      }
    } catch (e) {
      console.error("Erreur chargement admin stats:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  async function handleSendTestAlert() {
    setTestSending(true);
    setTestSuccess(null);
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "test_alert",
          email: currentUserEmail,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const sentChannels = [];
        if (data.channels?.telegram) sentChannels.push("Telegram");
        if (data.channels?.discord) sentChannels.push("Discord");

        if (sentChannels.length > 0) {
          setTestSuccess(`Alerte envoyée sur votre téléphone via ${sentChannels.join(" & ")} !`);
        } else {
          setTestSuccess("Alerte simulée avec succès ! (Configurez TELEGRAM_BOT_TOKEN pour recevoir la notification push)");
        }
      }
    } catch {
      setTestSuccess("Erreur lors de l'envoi du test.");
    } finally {
      setTestSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas pb-20 text-ink-950 selection:bg-gold/20">
      {/* Header Mobile & Desktop */}
      <header className="sticky top-0 z-30 border-b border-ink-200/80 dark:border-ink-100/10 bg-canvas/90 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 dark:border-ink-100/20 bg-canvas text-ink-600 hover:text-ink-950 transition-colors"
              title="Retour au dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <RemindMeLogo size="sm" showText={false} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-ink-950">
                    Centre de Contrôle Admin
                  </h1>
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-gold-dark dark:text-gold">
                    Live Mobile
                  </span>
                </div>
                <p className="text-[11px] text-ink-500">
                  Connecté en tant que <span className="font-semibold text-ink-700">{currentUserEmail}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 dark:border-ink-100/20 bg-canvas-raised px-3 py-1.5 text-xs font-bold text-ink-950 hover:bg-canvas-subtle transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 space-y-6">
        {/* Banner Alerte Test Smartphone */}
        <div className="rounded-3xl border border-gold/30 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/20 text-gold-dark dark:text-gold text-[11px] font-bold">
              <Smartphone className="h-3.5 w-3.5" />
              <span>Surveillance mobile en temps réel</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-ink-950">
              Recevez un ping direct dès qu&apos;un utilisateur arrive sur le site
            </h2>
            <p className="text-xs text-ink-600 dark:text-ink-400 max-w-xl">
              Chaque inscription, confirmation d&apos;e-mail et action clé est instantanément relayée sur votre smartphone via Telegram ou Discord.
            </p>
          </div>

          <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-2">
            <button
              onClick={handleSendTestAlert}
              disabled={testSending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-4 py-2.5 text-xs font-bold text-white shadow-gold hover:brightness-110 active:scale-98 transition-all"
            >
              <Send className={`h-3.5 w-3.5 ${testSending ? "animate-pulse" : ""}`} />
              <span>{testSending ? "Envoi du ping..." : "Tester l'alerte sur mon téléphone"}</span>
            </button>
            {testSuccess && (
              <p className="text-[11px] text-positive font-medium animate-in fade-in flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{testSuccess}</span>
              </p>
            )}
          </div>
        </div>

        {/* Métriques Clés */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Utilisateurs */}
          <div className="rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 space-y-1">
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-xs font-semibold">Comptes</span>
              <Users className="h-4 w-4 text-signal" />
            </div>
            <p className="text-2xl font-black tracking-tight text-ink-950">
              {stats?.totalUsers ?? "-"}
            </p>
            <p className="text-[11px] text-ink-400">Total inscrits</p>
          </div>

          {/* Activités */}
          <div className="rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 space-y-1">
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-xs font-semibold">Activités</span>
              <Briefcase className="h-4 w-4 text-positive" />
            </div>
            <p className="text-2xl font-black tracking-tight text-ink-950">
              {stats?.totalActivities ?? "-"}
            </p>
            <p className="text-[11px] text-ink-400">Pôles créés</p>
          </div>

          {/* Tâches */}
          <div className="rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 space-y-1">
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-xs font-semibold">Tâches</span>
              <CheckSquare className="h-4 w-4 text-sky-500" />
            </div>
            <p className="text-2xl font-black tracking-tight text-ink-950">
              {stats?.totalTasks ?? "-"}
            </p>
            <p className="text-[11px] text-ink-400">Missions</p>
          </div>

          {/* Revenus */}
          <div className="rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 space-y-1">
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-xs font-semibold">Revenus</span>
              <TrendingUp className="h-4 w-4 text-gold" />
            </div>
            <p className="text-2xl font-black tracking-tight text-ink-950">
              {stats?.totalIncome ?? "-"}
            </p>
            <p className="text-[11px] text-ink-400">Lignes suivies</p>
          </div>

          {/* Dépenses */}
          <div className="rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 space-y-1">
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-xs font-semibold">Dépenses</span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black tracking-tight text-ink-950">
              {stats?.totalExpenses ?? "-"}
            </p>
            <p className="text-[11px] text-ink-400">Charges</p>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 space-y-1">
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-xs font-semibold">Rappels</span>
              <Bell className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-2xl font-black tracking-tight text-ink-950">
              {stats?.totalNotifications ?? "-"}
            </p>
            <p className="text-[11px] text-ink-400">Envoyés</p>
          </div>
        </div>

        {/* État des Canaux de Notification Smartphone */}
        <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-bold text-ink-950">Canaux de surveillance connectés</h3>
            </div>
            <span className="text-xs text-ink-500">État du monitoring</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Telegram */}
            <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas/60 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs">
                  TG
                </div>
                <div>
                  <p className="text-xs font-bold text-ink-950">Bot Telegram</p>
                  <p className="text-[11px] text-ink-500">Alertes smartphone directes</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  envConfig?.telegram
                    ? "bg-positive-soft text-positive"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {envConfig?.telegram ? "Connecté" : "À configurer"}
              </span>
            </div>

            {/* Discord */}
            <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas/60 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                  DC
                </div>
                <div>
                  <p className="text-xs font-bold text-ink-950">Discord Webhook</p>
                  <p className="text-[11px] text-ink-500">Salon privé admin</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  envConfig?.discord
                    ? "bg-positive-soft text-positive"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {envConfig?.discord ? "Connecté" : "Optionnel"}
              </span>
            </div>

            {/* Vercel Analytics */}
            <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas/60 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-ink-950 text-white dark:bg-white dark:text-ink-950 flex items-center justify-center font-bold text-xs">
                  VA
                </div>
                <div>
                  <p className="text-xs font-bold text-ink-950">Vercel Analytics</p>
                  <p className="text-[11px] text-ink-500">Trafic & Visiteurs réels</p>
                </div>
              </div>
              <span className="rounded-full bg-positive-soft text-positive px-2 py-0.5 text-[10px] font-bold">
                Actif
              </span>
            </div>
          </div>
        </div>

        {/* 2 Colonnes : Dernières inscriptions & Dernières notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dernières Inscriptions */}
          <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-signal" />
                <h3 className="text-sm font-bold text-ink-950">Derniers utilisateurs inscrits</h3>
              </div>
              <span className="text-xs text-ink-400">Total : {stats?.totalUsers ?? 0}</span>
            </div>

            <div className="divide-y divide-ink-100 dark:divide-ink-100/10 space-y-1">
              {recentUsers.length === 0 ? (
                <p className="text-xs text-ink-500 py-4 text-center">Aucun utilisateur pour le moment.</p>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-ink-950">{user.full_name || "Utilisateur sans nom"}</p>
                      <p className="text-[11px] text-ink-500">ID : {user.id.slice(0, 8)}... • Fuseau : {user.timezone || "Europe/Paris"}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-positive-soft text-positive text-[10px] font-bold">
                        {user.onboarding_completed ? "Actif" : "Inscrit"}
                      </span>
                      <p className="text-[10px] text-ink-400">
                        {new Date(user.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Guide Rapide d'Alertes Téléphone */}
          <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-bold text-ink-950">
                Comment recevoir les alertes sur smartphone en 1 minute
              </h3>
            </div>

            <div className="space-y-3 text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
              <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas/60 p-3.5 space-y-1.5">
                <p className="font-bold text-ink-950 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gold text-white text-[10px]">1</span>
                  Option Telegram (Le plus rapide)
                </p>
                <p className="text-[11px]">
                  1. Sur votre application Telegram, ouvrez <strong>@BotFather</strong> et tapez <code>/newbot</code>.
                </p>
                <p className="text-[11px]">
                  2. Copiez le <strong>Token</strong> reçu et ajoutez-le dans Vercel en variable d&apos;environnement sous le nom <code>TELEGRAM_BOT_TOKEN</code>.
                </p>
                <p className="text-[11px]">
                  3. Envoyez un message à votre bot, puis ajoutez votre ID chat sous <code>TELEGRAM_CHAT_ID</code>.
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas/60 p-3.5 space-y-1.5">
                <p className="font-bold text-ink-950 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gold text-white text-[10px]">2</span>
                  Suivi des visiteurs en direct (Google Analytics / Vercel)
                </p>
                <p className="text-[11px]">
                  Téléchargez l&apos;application <strong>Google Analytics</strong> ou ouvrez <strong>vercel.com</strong> sur Safari/Chrome mobile pour voir le nombre de visiteurs en ligne à la seconde près.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
