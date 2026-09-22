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
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Clock,
  Lock,
  Search,
  Layers,
  Activity,
  Share,
  PlusSquare,
  KeyRound,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { RemindMeLogo } from "@/components/landing/remindme-logo";

interface SubStats {
  free: number;
  pro: number;
  premium: number;
  active: number;
}

interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  totalActivities: number;
  totalTasks: number;
  totalIncome: number;
  totalExpenses: number;
  totalNotifications: number;
  subscriptions: SubStats;
}

interface TimelineEvent {
  id: string;
  type: "signup" | "activity" | "notification" | "subscription";
  title: string;
  description: string;
  date: string;
  badge: string;
  tone: "positive" | "signal" | "gold" | "danger" | "neutral";
}

interface UserProfile {
  id: string;
  full_name: string | null;
  created_at: string;
  timezone: string;
  locale: string;
  onboarding_completed: boolean;
}

interface EnvConfig {
  telegram: boolean;
  telegramBotName: string;
  discord: boolean;
  emailNotifications: boolean;
  vercelAnalytics: boolean;
}

type AdminTab = "kpis" | "timeline" | "users" | "alerts";

export default function DedicatedAdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("kpis");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [timelineFilter, setTimelineFilter] = useState<string>("all");
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  // Vérifier si un mot de passe a été mémorisé sur cet iPhone
  useEffect(() => {
    const savedToken = localStorage.getItem("remindme_admin_auth");
    if (savedToken === "authenticated") {
      setAuthenticated(true);
      fetchAdminData();
    } else {
      // Tenter une requête sans secret pour voir si l'utilisateur est déjà connecté via session Supabase
      fetch("/api/admin/stats")
        .then((res) => {
          if (res.ok) {
            setAuthenticated(true);
            return res.json().then((data) => applyData(data));
          } else {
            setAuthenticated(false);
          }
        })
        .catch(() => setAuthenticated(false));
    }
  }, []);

  function applyData(data: any) {
    setStats(data.stats);
    setTimeline(data.timeline || []);
    setRecentUsers(data.recentUsers || []);
    setEnvConfig(data.envConfig);
    setCurrentUserEmail(data.currentUserEmail);
  }

  async function fetchAdminData(secret?: string) {
    setLoading(true);
    try {
      const url = secret ? `/api/admin/stats?secret=${encodeURIComponent(secret)}` : "/api/admin/stats";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        applyData(data);
        setAuthenticated(true);
        localStorage.setItem("remindme_admin_auth", "authenticated");
      } else {
        if (secret) setAuthError("Code d'accès incorrect.");
      }
    } catch (e) {
      console.error("Erreur admin:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    // Accepte le mot de passe admin configuré ou le secret par défaut
    if (adminPassword === "remindme2026" || adminPassword.length >= 4) {
      fetchAdminData(adminPassword);
    } else {
      setAuthError("Mot de passe incorrect.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("remindme_admin_auth");
    setAuthenticated(false);
    setAdminPassword("");
  }

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
        if (data.channels?.telegram) {
          setTestSuccess("Alerte envoyée sur votre Telegram (@RemindMeAlertsbot) !");
        } else {
          setTestSuccess("Signal envoyé avec succès !");
        }
      }
    } catch {
      setTestSuccess("Erreur lors de l'envoi.");
    } finally {
      setTestSending(false);
    }
  }

  // Écran de déverrouillage si non connecté
  if (authenticated === false) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-canvas text-ink-950">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center">
            <Link href="/" className="inline-flex items-center group">
              <RemindMeLogo size="md" showText={true} />
            </Link>
          </div>

          <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 text-gold-dark dark:text-gold border border-gold/30 shadow-sm">
              <ShieldCheck className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-black tracking-tight text-ink-950">
                Espace Propriétaire
              </h1>
              <p className="text-xs text-ink-500 leading-relaxed">
                Accès direct au centre de contrôle et aux alertes smartphone en temps réel.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-3 text-left">
              <div>
                <label className="text-xs font-bold text-ink-950 flex items-center gap-1.5 mb-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-gold" />
                  <span>Code d&apos;accès Administrateur</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe"
                  className="w-full rounded-xl border border-ink-200 dark:border-ink-100/20 bg-canvas px-3.5 py-2.5 text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold"
                  autoFocus
                />
              </div>

              {authError && (
                <p className="text-xs text-danger font-medium">{authError}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-4 py-3 text-xs font-bold text-white shadow-gold hover:brightness-110 active:scale-98 transition-all"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{loading ? "Vérification..." : "Déverrouiller l'Admin"}</span>
              </button>
            </form>

            <div className="pt-2 border-t border-ink-100 dark:border-ink-100/10">
              <Link href="/" className="text-xs text-ink-400 hover:text-ink-600">
                ← Retour au site
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Filtrage des utilisateurs
  const filteredUsers = recentUsers.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  // Filtrage de la timeline
  const filteredTimeline = timeline.filter((item) => {
    if (timelineFilter === "all") return true;
    return item.type === timelineFilter;
  });

  return (
    <main className="min-h-screen bg-canvas pb-28 text-ink-950 selection:bg-gold/20">
      {/* Header Mobile & Desktop Spécifique Admin */}
      <header className="sticky top-0 z-30 border-b border-ink-200/80 dark:border-ink-100/10 bg-canvas/95 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-dark text-white font-black text-sm shadow-gold">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-ink-950">
                  Remind Me • Admin
                </h1>
                <span className="rounded-full bg-positive-soft px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-positive">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-ink-500">
                Surveillance smartphone en temps réel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPwaGuide(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold-dark dark:text-gold hover:bg-gold/20 transition-all"
              title="Ajouter à l'écran d'accueil iPhone"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sur mon iPhone</span>
            </button>

            <button
              onClick={() => fetchAdminData()}
              disabled={loading}
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-ink-200 dark:border-ink-100/20 bg-canvas-raised text-ink-700 hover:text-ink-950 transition-all"
              title="Actualiser"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl text-ink-400 hover:text-danger transition-colors"
              title="Verrouiller"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Guide Installation Écran d'Accueil iPhone (Modal / Bannière) */}
      {showPwaGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-ink-200 dark:border-ink-100/20 bg-canvas-raised p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-ink-950">
                <Smartphone className="h-4 w-4 text-gold" />
                <span>Installer sur votre iPhone</span>
              </div>
              <button
                onClick={() => setShowPwaGuide(false)}
                className="text-xs text-ink-400 hover:text-ink-600 font-bold"
              >
                Fermer
              </button>
            </div>

            <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
              Pour ouvrir cette page en 1 clic comme une véritable application sur votre iPhone :
            </p>

            <div className="space-y-2.5 text-xs text-ink-700 dark:text-ink-300">
              <div className="flex items-start gap-2 rounded-xl bg-canvas p-2.5 border border-ink-100 dark:border-ink-100/10">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-white font-bold text-[10px]">1</span>
                <span>Ouvrez cette page dans <strong>Safari</strong> sur votre iPhone.</span>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-canvas p-2.5 border border-ink-100 dark:border-ink-100/10">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-white font-bold text-[10px]">2</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  Appuyez sur le bouton <strong>Partager</strong> <Share className="h-3.5 w-3.5 inline text-signal" /> en bas de l&apos;écran.
                </span>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-canvas p-2.5 border border-ink-100 dark:border-ink-100/10">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-white font-bold text-[10px]">3</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  Sélectionnez <strong>« Sur l&apos;écran d&apos;accueil »</strong> <PlusSquare className="h-3.5 w-3.5 inline text-signal" />.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowPwaGuide(false)}
              className="w-full rounded-xl bg-gradient-to-r from-gold to-gold-dark py-2.5 text-xs font-bold text-white"
            >
              Compris !
            </button>
          </div>
        </div>
      )}

      {/* Contenu des 4 Onglets */}
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-8 space-y-5">
        {/* Onglet 1 : KPIs & VUE D'ENSEMBLE */}
        {activeTab === "kpis" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Bannière d'alerte instantanée */}
            <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/20 text-gold-dark dark:text-gold text-[11px] font-bold">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Bot Telegram Actif : @{envConfig?.telegramBotName || "RemindMeAlertsbot"}</span>
                </div>
                <button
                  onClick={handleSendTestAlert}
                  disabled={testSending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-3 py-1 text-[11px] font-bold text-white hover:brightness-110 active:scale-98 transition-all"
                >
                  <Send className="h-3 w-3" />
                  <span>{testSending ? "Envoi..." : "Tester le ping"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="rounded-2xl bg-canvas/60 p-3 border border-ink-100 dark:border-ink-100/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Aujourd&apos;hui</p>
                  <p className="text-xl font-black text-ink-950">+{stats?.newUsersToday ?? 0}</p>
                  <p className="text-[10px] text-positive font-medium">Nouveaux inscrits</p>
                </div>
                <div className="rounded-2xl bg-canvas/60 p-3 border border-ink-100 dark:border-ink-100/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">7 Derniers jours</p>
                  <p className="text-xl font-black text-ink-950">+{stats?.newUsers7d ?? 0}</p>
                  <p className="text-[10px] text-signal font-medium">Inscriptions hebdo</p>
                </div>
                <div className="rounded-2xl bg-canvas/60 p-3 border border-ink-100 dark:border-ink-100/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Abonnements</p>
                  <p className="text-xl font-black text-gold">
                    {stats?.subscriptions?.active ?? 0}
                  </p>
                  <p className="text-[10px] text-ink-500">Comptes payants</p>
                </div>
                <div className="rounded-2xl bg-canvas/60 p-3 border border-ink-100 dark:border-ink-100/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Total Comptes</p>
                  <p className="text-xl font-black text-ink-950">{stats?.totalUsers ?? 0}</p>
                  <p className="text-[10px] text-ink-500">Inscrits global</p>
                </div>
              </div>

              {testSuccess && (
                <p className="text-xs text-positive font-bold animate-in fade-in flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{testSuccess}</span>
                </p>
              )}
            </div>

            {/* Répartition des Abonnements */}
            <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-gold" /> Plans & Abonnements
                </h3>
                <span className="text-xs text-ink-400">Total : {stats?.totalUsers ?? 0}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-canvas p-3 border border-ink-100 dark:border-ink-100/10">
                  <p className="text-[11px] font-semibold text-ink-500">Plan Gratuit</p>
                  <p className="text-lg font-black text-ink-950">{stats?.subscriptions?.free ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-canvas p-3 border border-gold/30 bg-gold/5">
                  <p className="text-[11px] font-bold text-gold-dark dark:text-gold">Plan Pro</p>
                  <p className="text-lg font-black text-gold-dark dark:text-gold">{stats?.subscriptions?.pro ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-canvas p-3 border border-purple-500/30 bg-purple-500/5">
                  <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400">Premium</p>
                  <p className="text-lg font-black text-purple-600 dark:text-purple-400">{stats?.subscriptions?.premium ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Activité Plateforme */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 space-y-1">
                <div className="flex items-center justify-between text-ink-500">
                  <span className="text-xs font-semibold">Activités</span>
                  <Briefcase className="h-4 w-4 text-positive" />
                </div>
                <p className="text-xl font-black text-ink-950">{stats?.totalActivities ?? 0}</p>
                <p className="text-[10px] text-ink-400">Pôles créés</p>
              </div>

              <div className="rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 space-y-1">
                <div className="flex items-center justify-between text-ink-500">
                  <span className="text-xs font-semibold">Tâches</span>
                  <CheckSquare className="h-4 w-4 text-sky-500" />
                </div>
                <p className="text-xl font-black text-ink-950">{stats?.totalTasks ?? 0}</p>
                <p className="text-[10px] text-ink-400">Missions</p>
              </div>

              <div className="rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 space-y-1">
                <div className="flex items-center justify-between text-ink-500">
                  <span className="text-xs font-semibold">Revenus</span>
                  <TrendingUp className="h-4 w-4 text-gold" />
                </div>
                <p className="text-xl font-black text-ink-950">{stats?.totalIncome ?? 0}</p>
                <p className="text-[10px] text-ink-400">Lignes suivies</p>
              </div>

              <div className="rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 space-y-1">
                <div className="flex items-center justify-between text-ink-500">
                  <span className="text-xs font-semibold">Rappels</span>
                  <Bell className="h-4 w-4 text-violet-500" />
                </div>
                <p className="text-xl font-black text-ink-950">{stats?.totalNotifications ?? 0}</p>
                <p className="text-[10px] text-ink-400">Envoyés</p>
              </div>
            </div>
          </div>
        )}

        {/* Onglet 2 : FLUX EN DIRECT (TIMELINE) */}
        {activeTab === "timeline" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Filtres de la timeline */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setTimelineFilter("all")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all ${
                  timelineFilter === "all"
                    ? "bg-gold text-white shadow-gold"
                    : "bg-canvas-raised text-ink-600 border border-ink-200 dark:border-ink-100/15"
                }`}
              >
                Tout ({timeline.length})
              </button>
              <button
                onClick={() => setTimelineFilter("signup")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all ${
                  timelineFilter === "signup"
                    ? "bg-gold text-white shadow-gold"
                    : "bg-canvas-raised text-ink-600 border border-ink-200 dark:border-ink-100/15"
                }`}
              >
                Inscriptions
              </button>
              <button
                onClick={() => setTimelineFilter("activity")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all ${
                  timelineFilter === "activity"
                    ? "bg-gold text-white shadow-gold"
                    : "bg-canvas-raised text-ink-600 border border-ink-200 dark:border-ink-100/15"
                }`}
              >
                Activités
              </button>
              <button
                onClick={() => setTimelineFilter("notification")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all ${
                  timelineFilter === "notification"
                    ? "bg-gold text-white shadow-gold"
                    : "bg-canvas-raised text-ink-600 border border-ink-200 dark:border-ink-100/15"
                }`}
              >
                Rappels envoyés
              </button>
            </div>

            {/* Liste chronologique */}
            <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 sm:p-5 space-y-3">
              {filteredTimeline.length === 0 ? (
                <p className="text-xs text-ink-500 py-6 text-center">Aucune action enregistrée pour le moment.</p>
              ) : (
                <div className="divide-y divide-ink-100 dark:divide-ink-100/10 space-y-1">
                  {filteredTimeline.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                            item.tone === "positive"
                              ? "bg-positive-soft text-positive"
                              : item.tone === "gold"
                              ? "bg-gold/15 text-gold-dark dark:text-gold"
                              : item.tone === "danger"
                              ? "bg-danger-soft text-danger"
                              : "bg-signal-soft text-signal"
                          }`}
                        >
                          {item.type === "signup" ? "👤" : item.type === "activity" ? "💼" : "🔔"}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-ink-950">{item.title}</p>
                          <p className="text-[11px] text-ink-500">{item.description}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.tone === "positive"
                              ? "bg-positive-soft text-positive"
                              : item.tone === "gold"
                              ? "bg-gold/15 text-gold-dark dark:text-gold"
                              : "bg-canvas text-ink-600 border border-ink-200 dark:border-ink-100/15"
                          }`}
                        >
                          {item.badge}
                        </span>
                        <p className="text-[10px] text-ink-400">
                          {new Date(item.date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onglet 3 : UTILISATEURS & ABONNÉS */}
        {activeTab === "users" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou identifiant..."
                className="w-full rounded-2xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised pl-10 pr-4 py-2.5 text-xs text-ink-950 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  Membres Remind Me ({filteredUsers.length})
                </h3>
              </div>

              <div className="divide-y divide-ink-100 dark:divide-ink-100/10 space-y-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-ink-500 py-6 text-center">Aucun utilisateur trouvé.</p>
                ) : (
                  filteredUsers.map((u) => (
                    <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-soft text-signal font-bold text-xs">
                          {u.full_name ? u.full_name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-ink-950">{u.full_name || "Sans nom renseigné"}</p>
                          <p className="text-[10px] text-ink-400">ID: {u.id.slice(0, 8)}... • {u.timezone || "Europe/Paris"}</p>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-positive-soft text-positive text-[10px] font-bold">
                          {u.onboarding_completed ? "Actif" : "Inscrit"}
                        </span>
                        <p className="text-[10px] text-ink-400">
                          {new Date(u.created_at).toLocaleDateString("fr-FR", {
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
          </div>
        )}

        {/* Onglet 4 : ALERTES & SYSTÈMES */}
        {activeTab === "alerts" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* État des Canaux */}
            <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                État des Canaux Connectés
              </h3>

              <div className="space-y-2.5">
                {/* Telegram */}
                <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 font-bold text-xs">
                      TG
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-950">Bot Telegram</p>
                      <p className="text-[11px] text-ink-500">@{envConfig?.telegramBotName || "RemindMeAlertsbot"}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-positive-soft text-positive px-2.5 py-0.5 text-[10px] font-bold">
                    Opérationnel
                  </span>
                </div>

                {/* Vercel Analytics */}
                <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-950 text-white dark:bg-white dark:text-ink-950 font-bold text-xs">
                      VA
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-950">Vercel Analytics</p>
                      <p className="text-[11px] text-ink-500">Trafic & Visiteurs réels</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-positive-soft text-positive px-2.5 py-0.5 text-[10px] font-bold">
                    Actif
                  </span>
                </div>

                {/* E-mails Resend */}
                <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 text-gold-dark dark:text-gold font-bold text-xs">
                      EM
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-950">Notifications E-mail</p>
                      <p className="text-[11px] text-ink-500">Moteur de rappels automatisés</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-positive-soft text-positive px-2.5 py-0.5 text-[10px] font-bold">
                    Connecté
                  </span>
                </div>
              </div>
            </div>

            {/* Test de notification manuelle */}
            <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-5 space-y-3">
              <h3 className="text-xs font-bold text-ink-950">Déclencher un ping test smartphone</h3>
              <p className="text-xs text-ink-500">
                Envoie immédiatement un message de test sur votre compte Telegram pour vérifier la réception de notifications push.
              </p>
              <button
                onClick={handleSendTestAlert}
                disabled={testSending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-4 py-3 text-xs font-bold text-white shadow-gold hover:brightness-110 active:scale-98 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{testSending ? "Envoi en cours..." : "Faire sonner mon smartphone"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Barre d'Onglets Mobile Fixe en Bas (Bottom Navigation pour iPhone) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-ink-200 dark:border-ink-100/15 bg-canvas-raised/95 backdrop-blur-md px-2 py-2 shadow-2xl safe-area-bottom">
        <button
          onClick={() => setActiveTab("kpis")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[64px] transition-all ${
            activeTab === "kpis"
              ? "text-gold font-bold scale-105"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <Activity className="h-5 w-5 mb-0.5" strokeWidth={activeTab === "kpis" ? 2.4 : 1.8} />
          <span className="text-[10px]">KPIs</span>
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[64px] transition-all ${
            activeTab === "timeline"
              ? "text-gold font-bold scale-105"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <Clock className="h-5 w-5 mb-0.5" strokeWidth={activeTab === "timeline" ? 2.4 : 1.8} />
          <span className="text-[10px]">En Direct</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[64px] transition-all ${
            activeTab === "users"
              ? "text-gold font-bold scale-105"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <Users className="h-5 w-5 mb-0.5" strokeWidth={activeTab === "users" ? 2.4 : 1.8} />
          <span className="text-[10px]">Membres</span>
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[64px] transition-all ${
            activeTab === "alerts"
              ? "text-gold font-bold scale-105"
              : "text-ink-500 hover:text-ink-800 font-medium"
          }`}
        >
          <Bell className="h-5 w-5 mb-0.5" strokeWidth={activeTab === "alerts" ? 2.4 : 1.8} />
          <span className="text-[10px]">Alertes</span>
        </button>
      </nav>
    </main>
  );
}
