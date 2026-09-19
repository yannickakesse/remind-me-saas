"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Building2, Wallet, Plus, Trash2, Archive, RotateCcw, Edit3 } from "lucide-react";
import { archiveActivity, restoreActivity, deleteActivity } from "@/app/(app)/activities/actions";
import { buttonClasses, Button } from "@/components/ui/button";
import { formatAmount } from "@/lib/finances/format";
import { ACTIVITY_TYPES } from "@/lib/validation/activities";

function typeLabel(type: string) {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export interface ActivityViewItem {
  id: string;
  name: string;
  type: string;
  color: string | null;
  status: string;
  work_mode: string | null;
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
  const [activities, setActivities] = useState<ActivityViewItem[]>(initialActivities);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const active = activities.filter((a) => a.status === "active");
  const archived = activities.filter((a) => a.status === "archived");

  async function handleDelete(activityId: string) {
    setDeletingId(activityId);
    setErrorMap((prev) => ({ ...prev, [activityId]: "" }));

    const previousActivities = [...activities];
    // Optimistic removal: remove immediately from UI
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
    setConfirmDeleteId(null);

    try {
      const res = await deleteActivity(activityId);
      if (res && res.error) {
        // Rollback if server fails
        setActivities(previousActivities);
        setErrorMap((prev) => ({ ...prev, [activityId]: res.error || "Erreur de suppression" }));
        setConfirmDeleteId(activityId);
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

  async function handleArchive(activityId: string) {
    setArchivingId(activityId);
    setErrorMap((prev) => ({ ...prev, [activityId]: "" }));

    const previousActivities = [...activities];
    // Optimistic status update
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, status: "archived" } : a))
    );

    try {
      const res = await archiveActivity(activityId);
      if (res && res.error) {
        setActivities(previousActivities);
        setErrorMap((prev) => ({ ...prev, [activityId]: res.error || "Erreur d'archivage" }));
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
    // Optimistic status update
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, status: "active" } : a))
    );

    try {
      const res = await restoreActivity(activityId);
      if (res && res.error) {
        setActivities(previousActivities);
        setErrorMap((prev) => ({ ...prev, [activityId]: res.error || "Erreur de restauration" }));
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

  return (
    <div className="space-y-8">
      {/* En-tête responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950">Activités & Métiers</h1>
          <p className="text-sm text-ink-500">
            {active.length} activité{active.length > 1 ? "s" : ""} active{active.length > 1 ? "s" : ""} gérée{active.length > 1 ? "s" : ""} au même endroit.
          </p>
        </div>
        <Link href="/activities/new" className={buttonClasses("primary", "md")}>
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter une activité
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-300 bg-canvas-raised/50 p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-signal-soft text-signal">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-ink-950">Vous n'avez pas encore d'activité</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
            Créez votre première activité (salariat, freelance, consulting, enseignement, etc.) pour organiser vos horaires et vos rémunérations.
          </p>
          <div className="mt-5">
            <Link href="/activities/new" className={buttonClasses("primary", "sm")}>
              <Plus className="h-4 w-4 mr-1" />
              Créer une activité
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map((activity) => {
            const isDeleting = deletingId === activity.id;
            const isArchiving = archivingId === activity.id;
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
                          onClick={() => handleArchive(activity.id)}
                          disabled={isArchiving || isDeleting}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-500 hover:text-ink-800 hover:bg-ink-100 transition-colors min-h-[32px] inline-flex items-center gap-1"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          {isArchiving ? "..." : "Archiver"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(activity.id)}
                          disabled={isArchiving || isDeleting}
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

      {/* Activités archivées */}
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

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 p-2 rounded-xl text-xs">
                      <span className="text-danger font-semibold">Supprimer ?</span>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        loading={isDeleting}
                        disabled={isDeleting}
                        onClick={() => handleDelete(activity.id)}
                      >
                        Oui
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
                  ) : (
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
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
