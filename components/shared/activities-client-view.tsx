"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Wallet,
  Plus,
  Trash2,
  Archive,
  RotateCcw,
  Edit3,
  Pause,
  Play,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  X,
} from "lucide-react";
import {
  archiveActivity,
  restoreActivity,
  deleteActivity,
  suspendActivity,
  resumeActivity,
  renewActivity,
} from "@/app/(app)/activities/actions";
import { buttonClasses, Button } from "@/components/ui/button";
import { formatAmount } from "@/lib/finances/format";
import { ACTIVITY_TYPES } from "@/lib/validation/activities";
import { useToast } from "@/components/ui/toast";

function typeLabel(type: string) {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export interface ActivityViewItem {
  id: string;
  name: string;
  type: string;
  color: string | null;
  status: string; // 'active' | 'suspended' | 'archived' | 'expired'
  work_mode: string | null;
  startDate?: string | null;
  endDate?: string | null;
  organizationName?: string | null;
  compensation?: {
    amount: number;
    currency: string;
    frequency: string;
  } | null;
}

interface ActivitiesClientViewProps {
  initialActivities: ActivityViewItem[];
}

export function ActivitiesClientView({ initialActivities }: ActivitiesClientViewProps) {
  const { push: toastPush } = useToast();
  const [activities, setActivities] = useState<ActivityViewItem[]>(initialActivities);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [renewingActivity, setRenewingActivity] = useState<ActivityViewItem | null>(null);
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const active = activities.filter((a) => a.status === "active");
  const expired = activities.filter((a) => a.status === "expired");
  const suspended = activities.filter((a) => a.status === "suspended");
  const archived = activities.filter((a) => a.status === "archived");

  async function handleDelete(activityId: string) {
    setDeletingId(activityId);
    setErrorMap((prev) => ({ ...prev, [activityId]: "" }));

    const previousActivities = [...activities];
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
    setConfirmDeleteId(null);

    try {
      const res = await deleteActivity(activityId);
      if (res && res.error) {
        setActivities(previousActivities);
        setErrorMap((prev) => ({ ...prev, [activityId]: res.error || "Erreur de suppression" }));
        setConfirmDeleteId(activityId);
      } else {
        toastPush("Activité supprimée avec succès.", "success");
      }
    } catch (err: any) {
      setActivities(previousActivities);
      setErrorMap((prev) => ({
        ...prev,
        [activityId]: err?.message || "Erreur lors de la suppression.",
      }));
      setConfirmDeleteId(activityId);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSuspend(activityId: string) {
    setSuspendingId(activityId);
    setErrorMap((prev) => ({ ...prev, [activityId]: "" }));

    const previousActivities = [...activities];
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, status: "suspended" } : a))
    );

    try {
      const res = await suspendActivity(activityId);
      if (res && res.error) {
        setActivities(previousActivities);
        setErrorMap((prev) => ({ ...prev, [activityId]: res.error || "Erreur lors de la suspension" }));
      } else {
        toastPush("Activité mise en pause.", "info");
      }
    } catch (err: any) {
      setActivities(previousActivities);
      setErrorMap((prev) => ({
        ...prev,
        [activityId]: err?.message || "Erreur lors de la suspension.",
      }));
    } finally {
      setSuspendingId(null);
    }
  }

  async function handleResume(activityId: string) {
    setResumingId(activityId);
    setErrorMap((prev) => ({ ...prev, [activityId]: "" }));

    const previousActivities = [...activities];
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, status: "active" } : a))
    );

    try {
      const res = await resumeActivity(activityId);
      if (res && res.error) {
        setActivities(previousActivities);
        setErrorMap((prev) => ({ ...prev, [activityId]: res.error || "Erreur lors de la réactivation" }));
      } else {
        toastPush("Activité réactivée avec succès.", "success");
      }
    } catch (err: any) {
      setActivities(previousActivities);
      setErrorMap((prev) => ({
        ...prev,
        [activityId]: err?.message || "Erreur lors de la réactivation.",
      }));
    } finally {
      setResumingId(null);
    }
  }

  async function handleArchive(activityId: string) {
    setArchivingId(activityId);
    setErrorMap((prev) => ({ ...prev, [activityId]: "" }));

    const previousActivities = [...activities];
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, status: "archived" } : a))
    );

    try {
      const res = await archiveActivity(activityId);
      if (res && res.error) {
        setActivities(previousActivities);
        setErrorMap((prev) => ({ ...prev, [activityId]: res.error || "Erreur d'archivage" }));
      } else {
        toastPush("Activité archivée (historique financier préservé).", "info");
      }
    } catch (err: any) {
      setActivities(previousActivities);
      setErrorMap((prev) => ({
        ...prev,
        [activityId]: err?.message || "Erreur lors de l'archivage.",
      }));
    } finally {
      setArchivingId(null);
    }
  }

  async function handleRestore(activityId: string) {
    setRestoringId(activityId);
    setErrorMap((prev) => ({ ...prev, [activityId]: "" }));

    const previousActivities = [...activities];
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, status: "active" } : a))
    );

    try {
      const res = await restoreActivity(activityId);
      if (res && res.error) {
        setActivities(previousActivities);
        setErrorMap((prev) => ({ ...prev, [activityId]: res.error || "Erreur de restauration" }));
      } else {
        toastPush("Activité restaurée.", "success");
      }
    } catch (err: any) {
      setActivities(previousActivities);
      setErrorMap((prev) => ({
        ...prev,
        [activityId]: err?.message || "Erreur lors de la restauration.",
      }));
    } finally {
      setRestoringId(null);
    }
  }

  async function handleRenewSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!renewingActivity || renewSubmitting) return;

    setRenewSubmitting(true);
    const form = new FormData(e.currentTarget);
    const newEndDate = (form.get("newEndDate") as string) || undefined;
    const newAmountStr = form.get("newAmount") as string;
    const newAmount = newAmountStr ? Number(newAmountStr) : undefined;

    try {
      const res = await renewActivity(renewingActivity.id, {
        endDate: newEndDate,
        amount: newAmount,
      });

      if (res && res.error) {
        toastPush(res.error, "error");
      } else {
        setActivities((prev) =>
          prev.map((a) =>
            a.id === renewingActivity.id
              ? {
                  ...a,
                  status: "active",
                  endDate: newEndDate ?? null,
                  compensation: a.compensation
                    ? {
                        ...a.compensation,
                        amount: newAmount !== undefined ? newAmount : a.compensation.amount,
                      }
                    : null,
                }
              : a
          )
        );
        toastPush(`Activité « ${renewingActivity.name} » renouvelée avec succès !`, "success");
        setRenewingActivity(null);
      }
    } catch (err: any) {
      toastPush(err?.message || "Erreur lors du renouvellement.", "error");
    } finally {
      setRenewSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* En-tête responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">Activités & Métiers</h1>
          <p className="text-sm text-ink-500">
            {active.length} active{active.length > 1 ? "s" : ""}
            {expired.length > 0 ? ` · ${expired.length} expirée${expired.length > 1 ? "s" : ""}` : ""}
            {suspended.length > 0 ? ` · ${suspended.length} en pause` : ""}
            {archived.length > 0 ? ` · ${archived.length} archivée${archived.length > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Link href="/activities/new" data-tour="activity-create" className={buttonClasses("primary", "md")}>
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter une activité
        </Link>
      </div>

      {/* 1. ACTIVITÉS ACTIVES */}
      {active.length === 0 && expired.length === 0 && suspended.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-300 bg-canvas-raised/50 p-10 text-center" data-tour="activities-list">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-signal-soft text-signal">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-ink-950">Vous n'avez pas encore d'activité active</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
            Créez votre première activité (salariat, freelance, consulting, enseignement, etc.) pour organiser vos plannings et vos rémunérations.
          </p>
          <div className="mt-5">
            <Link href="/activities/new" data-tour="activity-create" className={buttonClasses("primary", "sm")}>
              <Plus className="h-4 w-4 mr-1" />
              Créer une activité
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="activities-list">
          {active.map((activity) => {
            const isDeleting = deletingId === activity.id;
            const isArchiving = archivingId === activity.id;
            const isSuspending = suspendingId === activity.id;
            const isConfirmingDelete = confirmDeleteId === activity.id;
            const itemError = errorMap[activity.id];

            return (
              <div
                key={activity.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-ink-200 bg-canvas-raised p-5 hover:border-ink-300 hover:shadow-xs transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                        style={{ backgroundColor: activity.color ?? "#1E3A5F" }}
                      />
                      <h3 className="font-bold text-ink-950 text-base truncate">{activity.name}</h3>
                    </div>
                    <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700 shrink-0">
                      {typeLabel(activity.type)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
                    {activity.organizationName ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-ink-800">
                        <Building2 className="h-3.5 w-3.5 text-ink-500" />
                        {activity.organizationName}
                      </span>
                    ) : null}

                    {activity.compensation ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-signal">
                        <Wallet className="h-3.5 w-3.5 text-signal" />
                        {formatAmount(activity.compensation.amount, activity.compensation.currency)} /{" "}
                        {activity.compensation.frequency === "monthly"
                          ? "mois"
                          : activity.compensation.frequency === "hourly"
                          ? "h"
                          : activity.compensation.frequency}
                      </span>
                    ) : null}

                    {activity.endDate ? (
                      <span className="inline-flex items-center gap-1 text-ink-500 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-ink-400" />
                        Fin : {new Date(activity.endDate).toLocaleDateString("fr-FR")}
                      </span>
                    ) : null}

                    {activity.work_mode ? (
                      <span className="text-ink-400 capitalize">
                        • {activity.work_mode}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="pt-3 border-t border-ink-100">
                  {isConfirmingDelete ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-danger/10 border border-danger/20 p-2.5 rounded-xl text-xs">
                      <span className="text-danger font-semibold">
                        Supprimer définitivement « {activity.name} » ?
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          loading={isDeleting}
                          disabled={isDeleting}
                          onClick={() => handleDelete(activity.id)}
                        >
                          Oui, supprimer
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isDeleting}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                      {itemError && <span className="text-danger text-xs text-right">{itemError}</span>}
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Link
                          href={`/activities/${activity.id}/edit`}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-signal hover:bg-signal-soft transition-colors min-h-[32px] inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Modifier
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleSuspend(activity.id)}
                          disabled={isSuspending || isArchiving || isDeleting}
                          title="Mettre en pause temporairement"
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100/60 bg-amber-50 transition-colors min-h-[32px] inline-flex items-center gap-1"
                        >
                          <Pause className="w-3.5 h-3.5 text-amber-600" />
                          {isSuspending ? "..." : "Suspendre"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(activity.id)}
                          disabled={isSuspending || isArchiving || isDeleting}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-500 hover:text-ink-800 hover:bg-ink-100 transition-colors min-h-[32px] inline-flex items-center gap-1"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          {isArchiving ? "..." : "Archiver"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(activity.id)}
                          disabled={isSuspending || isArchiving || isDeleting}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors min-h-[32px] inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. ACTIVITÉS EXPIRÉES (CONTRATS TERMINÉS / À RENOUVELER) */}
      {expired.length > 0 ? (
        <div className="space-y-3 pt-6 border-t border-purple-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-purple-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600" /> Activités & Contrats expirés ({expired.length})
              </h2>
              <span className="text-xs text-purple-700 font-normal">
                — Historique comptable conservé intact, libère le quota actif
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expired.map((activity) => {
              const isDeleting = deletingId === activity.id;
              const isConfirmingDelete = confirmDeleteId === activity.id;
              const itemError = errorMap[activity.id];

              return (
                <div
                  key={activity.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-purple-300/80 bg-purple-50/40 p-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full opacity-60"
                          style={{ backgroundColor: activity.color ?? "#1E3A5F" }}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink-950 text-sm truncate">{activity.name}</div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full mt-0.5">
                            <Clock className="w-2.5 h-2.5" /> Expirée le {activity.endDate ? new Date(activity.endDate).toLocaleDateString("fr-FR") : "terme échu"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-ink-600">
                        {typeLabel(activity.type)}
                      </span>
                    </div>

                    {activity.compensation ? (
                      <div className="text-xs text-ink-600 font-medium">
                        Rémunération historique :{" "}
                        <span className="font-semibold text-ink-900">
                          {formatAmount(activity.compensation.amount, activity.compensation.currency)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-ink-500">Toutes les données passées restent aux rapports</span>
                    <div className="flex items-center gap-2">
                      {itemError && <span className="text-danger text-xs">{itemError}</span>}
                      <button
                        type="button"
                        onClick={() => setRenewingActivity(activity)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-purple-900 bg-purple-200/80 hover:bg-purple-300 transition-colors min-h-[32px] inline-flex items-center gap-1 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                        Renouveler / Réactiver
                      </button>
                      <Link
                        href={`/activities/${activity.id}/edit`}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-100 transition-colors min-h-[32px] inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Modifier
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 3. ACTIVITÉS SUSPENDUES (EN PAUSE) */}
      {suspended.length > 0 ? (
        <div className="space-y-3 pt-6 border-t border-amber-200/80">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
              <Pause className="w-4 h-4 text-amber-600" /> Activités suspendues ({suspended.length})
            </h2>
            <span className="text-xs text-amber-700/80 font-normal">
              — Hors comptabilité prévisionnelle
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suspended.map((activity) => {
              const isDeleting = deletingId === activity.id;
              const isResuming = resumingId === activity.id;
              const isConfirmingDelete = confirmDeleteId === activity.id;
              const itemError = errorMap[activity.id];

              return (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-300/80 bg-amber-50/40 p-4"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full opacity-60"
                      style={{ backgroundColor: activity.color ?? "#1E3A5F" }}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-ink-950 text-sm truncate">{activity.name}</div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mt-0.5">
                        <Pause className="w-2.5 h-2.5" /> En pause
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {itemError && <span className="text-danger text-xs mr-2">{itemError}</span>}
                    <button
                      type="button"
                      onClick={() => handleResume(activity.id)}
                      disabled={isResuming || isDeleting}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 transition-colors min-h-[32px] inline-flex items-center gap-1 shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-emerald-800" />
                      {isResuming ? "..." : "Reprendre / Activer"}
                    </button>
                    <Link
                      href={`/activities/${activity.id}/edit`}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 transition-colors min-h-[32px] inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 4. ACTIVITÉS ARCHIVÉES */}
      {archived.length > 0 ? (
        <div className="space-y-3 pt-6 border-t border-ink-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Activités archivées ({archived.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-85">
            {archived.map((activity) => {
              const isDeleting = deletingId === activity.id;
              const isRestoring = restoringId === activity.id;
              const isConfirmingDelete = confirmDeleteId === activity.id;
              const itemError = errorMap[activity.id];

              return (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-ink-200 bg-canvas p-4"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full opacity-60"
                      style={{ backgroundColor: activity.color ?? "#1E3A5F" }}
                    />
                    <span className="font-medium text-ink-700 text-sm truncate">{activity.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {itemError && <span className="text-danger text-xs mr-2">{itemError}</span>}
                    <button
                      type="button"
                      onClick={() => handleRestore(activity.id)}
                      disabled={isRestoring || isDeleting}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-signal hover:bg-signal-soft transition-colors min-h-[32px] inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isRestoring ? "..." : "Restaurer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activity.id)}
                      disabled={isRestoring || isDeleting}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors min-h-[32px] inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* MODAL DE RENOUVELLEMENT D'ACTIVITÉ */}
      {renewingActivity ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-purple-300 bg-canvas-raised p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setRenewingActivity(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-950">Renouveler l'activité</h3>
                <p className="text-xs text-ink-500">« {renewingActivity.name} »</p>
              </div>
            </div>

            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div>
                <label htmlFor="newEndDate" className="block text-xs font-semibold text-ink-800 mb-1">
                  Nouvelle date d'échéance / fin de contrat *
                </label>
                <input
                  id="newEndDate"
                  name="newEndDate"
                  type="date"
                  required
                  defaultValue={
                    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                  }
                  className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-purple-600 focus:outline-none"
                />
                <p className="text-[11px] text-ink-500 mt-1">
                  L'activité redeviendra active jusqu'à cette nouvelle date. L'historique précédent reste intact.
                </p>
              </div>

              {renewingActivity.compensation ? (
                <div>
                  <label htmlFor="newAmount" className="block text-xs font-semibold text-ink-800 mb-1">
                    Montant de rémunération ({renewingActivity.compensation.currency})
                  </label>
                  <input
                    id="newAmount"
                    name="newAmount"
                    type="number"
                    step="any"
                    min="0"
                    defaultValue={renewingActivity.compensation.amount}
                    className="w-full rounded-lg border border-ink-300 bg-canvas px-3 py-2 text-sm text-ink-950 focus:border-purple-600 focus:outline-none"
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={renewSubmitting}
                  onClick={() => setRenewingActivity(null)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={renewSubmitting}
                  disabled={renewSubmitting}
                  className="bg-purple-700 hover:bg-purple-800 text-white"
                >
                  Confirmer le renouvellement
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
