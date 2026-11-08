"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Users, UserCheck, Activity, Hourglass, Gem, Wallet, Percent, Send, BellRing, Search, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { FounderMetrics, FounderUserRow, UserState } from "@/lib/admin/founder-metrics";
import { sendFounderDigestNow, sendFounderTestAlert } from "@/app/admin/actions";

const STATE_LABEL: Record<UserState, { label: string; cls: string }> = {
  paid_premium: { label: "Premium", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  paid_pro: { label: "Pro", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  trial: { label: "Essai", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  free: { label: "Gratuit", cls: "bg-ink-500/10 text-ink-600 dark:text-ink-300" },
  unconfirmed: { label: "Non confirmé", cls: "bg-red-500/10 text-red-700 dark:text-red-300" },
};

const fmtXof = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
function daysLeft(iso: string | null) {
  if (!iso) return "";
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return d <= 0 ? "aujourd'hui" : d === 1 ? "demain" : `dans ${d} j`;
}

function Tile({ icon: Icon, label, value, sub, tone = "ink" }: { icon: any; label: string; value: string | number; sub?: string; tone?: "ink" | "amber" | "emerald" | "blue" }) {
  const toneCls = { ink: "text-ink-700 bg-ink-500/10", amber: "text-amber-700 bg-amber-500/15", emerald: "text-emerald-700 bg-emerald-500/15", blue: "text-blue-700 bg-blue-500/15" }[tone];
  return (
    <div className="rounded-2xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised p-4 shadow-xs">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneCls}`}><Icon className="h-4 w-4" /></span>
        <span className="text-xs font-semibold text-ink-500">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tabular-nums text-ink-950 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-500">{sub}</p>}
    </div>
  );
}

function WatchList({ title, rows, empty, tone, dateLabel }: { title: string; rows: FounderUserRow[]; empty: string; tone: string; dateLabel: string }) {
  return (
    <div className="rounded-2xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised p-4 shadow-xs">
      <h3 className="flex items-center justify-between text-sm font-bold text-ink-950 dark:text-white">
        {title}
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{rows.length}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-ink-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 8).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink-900 dark:text-ink-100">{r.name}</span>
                <span className="block truncate text-ink-500">{r.email}</span>
              </span>
              <span className="shrink-0 text-right text-ink-600 dark:text-ink-300">
                {dateLabel} {fmtDate(r.endsAt)}
                <span className="block text-[10px] text-ink-500">{daysLeft(r.endsAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FounderDashboard({
  metrics,
  loadError,
  channels,
  founderEmail,
}: {
  metrics: FounderMetrics | null;
  loadError: string | null;
  channels: { telegram: boolean; email: boolean; discord: boolean; serviceKey: boolean };
  founderEmail: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UserState | "all">("all");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (metrics?.allUsers ?? []).filter(
      (u) => (filter === "all" || u.state === filter) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [metrics, query, filter]);

  const maxDay = Math.max(1, ...(metrics?.signupsByDay ?? []).map((d) => d.count));

  return (
    <main className="min-h-screen bg-canvas text-ink-950 dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* En-tête */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="text-xs font-semibold text-ink-500 hover:text-ink-950 dark:hover:text-white">← Retour à l'application</Link>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">Tableau de bord fondateur</h1>
            <p className="mt-1 text-xs text-ink-500">
              Connecté en tant que {founderEmail} · Données à jour au {fmtDateTime(metrics?.generatedAt ?? null)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => setFeedback(await sendFounderDigestNow()))}
              className="inline-flex items-center gap-2 rounded-full bg-[#214E3B] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1A3E2F] disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" /> Recevoir le résumé maintenant
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => setFeedback(await sendFounderTestAlert()))}
              className="inline-flex items-center gap-2 rounded-full border border-ink-300 dark:border-ink-700 px-4 py-2 text-xs font-semibold hover:bg-ink-100 dark:hover:bg-ink-800 disabled:opacity-60"
            >
              <BellRing className="h-3.5 w-3.5" /> Alerte de test
            </button>
          </div>
        </header>

        {feedback && (
          <p className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${feedback.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}>
            {feedback.message}
          </p>
        )}

        {/* Canaux d'alerte */}
        <section className="flex flex-wrap gap-2 text-[11px] font-semibold">
          {[
            ["Telegram", channels.telegram],
            ["E-mail", channels.email],
            ["Discord", channels.discord],
            ["Accès aux données (clé de service)", channels.serviceKey],
          ].map(([label, ok]) => (
            <span key={label as string} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-ink-500/10 text-ink-500"}`}>
              {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {label as string} {ok ? "actif" : "non configuré"}
            </span>
          ))}
        </section>

        {loadError || !metrics ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-300/60 bg-red-500/5 p-5 text-sm text-red-800 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Les chiffres n'ont pas pu être chargés.</p>
              <p className="mt-1 text-xs">{loadError} — vérifiez que SUPABASE_SERVICE_ROLE_KEY est bien configurée sur Vercel.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Indicateurs clés */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Tile icon={Users} label="Inscrits" value={metrics.users.total} sub={`+${metrics.users.today} aujourd'hui · +${metrics.users.last7} sur 7 j · +${metrics.users.last30} sur 30 j`} />
              <Tile icon={UserCheck} label="E-mail confirmé" value={metrics.users.confirmed} sub={`${metrics.users.unconfirmed} en attente de confirmation`} tone="emerald" />
              <Tile icon={Activity} label="Actifs sur 7 jours" value={metrics.users.active7} sub={`${metrics.users.onboarded} ont terminé la prise en main`} tone="blue" />
              <Tile icon={Hourglass} label="Essais en cours" value={metrics.trials.active} sub={`${metrics.trials.endingSoon} finissent sous 48 h · ${metrics.trials.endedNotPaid} terminés sans payer`} tone="blue" />
              <Tile icon={Gem} label="Abonnés payants" value={metrics.paid.real} sub={`Pro ${metrics.paid.pro} · Premium ${metrics.paid.premium}${metrics.paid.total > metrics.paid.real ? ` · ${metrics.paid.total - metrics.paid.real} offert(s)/démo` : ""}`} tone="amber" />
              <Tile icon={Wallet} label="Revenu mensuel estimé" value={fmtXof(metrics.revenue.monthlyXof)} sub={`≈ $${metrics.revenue.monthlyUsd} / mois (abonnements actifs)`} tone="amber" />
              <Tile icon={Percent} label="Conversion" value={`${metrics.paid.conversionRate} %`} sub="Comptes confirmés devenus payants" tone="emerald" />
              <Tile icon={AlertTriangle} label="Échéances sous 7 jours" value={metrics.expiringSoon.length} sub={`${metrics.recentlyExpired.length} expiré(s) sur 30 j sans renouvellement`} />
            </section>

            {/* Inscriptions sur 30 jours */}
            <section className="rounded-2xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised p-5 shadow-xs">
              <h2 className="text-sm font-bold">Inscriptions — 30 derniers jours</h2>
              <div className="mt-4 flex h-32 items-end gap-[3px]" role="img" aria-label="Inscriptions par jour sur 30 jours">
                {metrics.signupsByDay.map((d) => (
                  <div key={d.day} className="group relative flex-1 h-full flex items-end">
                    <div
                      className="w-full rounded-t-[3px] bg-amber-500/80 group-hover:bg-amber-500"
                      style={{ height: `${d.count ? Math.max(6, (d.count / maxDay) * 100) : 2}%`, opacity: d.count ? 1 : 0.25 }}
                    />
                    <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-950 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                      {new Date(d.day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} : {d.count}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-ink-500">
                <span>il y a 30 jours</span>
                <span>aujourd'hui</span>
              </div>
            </section>

            {/* À surveiller */}
            <section className="grid gap-3 md:grid-cols-3">
              <WatchList title="Abonnements qui expirent (7 j)" rows={metrics.expiringSoon} empty="Aucune échéance cette semaine." tone="bg-amber-500/15 text-amber-700" dateLabel="fin le" />
              <WatchList title="Essais qui finissent (48 h)" rows={metrics.trialsEndingSoon} empty="Aucun essai ne se termine bientôt." tone="bg-blue-500/15 text-blue-700" dateLabel="fin le" />
              <WatchList title="Expirés sans renouvellement (30 j)" rows={metrics.recentlyExpired} empty="Aucun abonnement perdu récemment." tone="bg-red-500/10 text-red-700" dateLabel="fini le" />
            </section>

            {/* Tous les utilisateurs */}
            <section className="rounded-2xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised shadow-xs">
              <div className="flex flex-col gap-3 border-b border-ink-200/70 dark:border-ink-800 p-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-bold">Utilisateurs ({users.length})</h2>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Nom ou e-mail"
                      className="h-9 w-full rounded-full border border-ink-200 dark:border-ink-700 bg-canvas pl-8 pr-3 text-xs sm:w-56"
                    />
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="h-9 rounded-full border border-ink-200 dark:border-ink-700 bg-canvas px-3 text-xs"
                  >
                    <option value="all">Tous</option>
                    <option value="paid_premium">Premium</option>
                    <option value="paid_pro">Pro</option>
                    <option value="trial">Essai</option>
                    <option value="free">Gratuit</option>
                    <option value="unconfirmed">Non confirmé</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Utilisateur</th>
                      <th className="px-4 py-2.5 font-semibold">Statut</th>
                      <th className="px-4 py-2.5 font-semibold">Inscrit le</th>
                      <th className="px-4 py-2.5 font-semibold">Dernière connexion</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Activités</th>
                      <th className="px-4 py-2.5 font-semibold">Fin essai / abonnement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 300).map((u) => (
                      <tr key={u.id} className="border-t border-ink-200/60 dark:border-ink-800/70">
                        <td className="px-4 py-2.5">
                          <span className="block font-semibold text-ink-900 dark:text-ink-100">{u.name}</span>
                          <span className="block text-ink-500">{u.email}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATE_LABEL[u.state].cls}`}>{STATE_LABEL[u.state].label}</span>
                          {(u.state === "paid_pro" || u.state === "paid_premium") && !u.realPayment && (
                            <span className="ml-1 text-[10px] text-ink-500">(offert)</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{fmtDate(u.createdAt)}</td>
                        <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{fmtDateTime(u.lastSignInAt)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{u.activities}</td>
                        <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">
                          {u.endsAt ? `${fmtDate(u.endsAt)} (${daysLeft(u.endsAt)})` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <p className="p-6 text-center text-xs text-ink-500">Aucun utilisateur ne correspond.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
