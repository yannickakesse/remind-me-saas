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
  Copy,
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
  keepActivityExpired,
  acceptEvolutionToRoutine,
  declineEvolutionSuggestion,
} from "@/app/(app)/activities/actions";
import { buttonClasses, Button } from "@/components/ui/button";
import { formatAmount } from "@/lib/finances/format";
import { ACTIVITY_TYPES } from "@/lib/validation/activities";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/language-provider";
import { SectionGuideTrigger } from "@/components/onboarding/section-guide-trigger";

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
  validity_type?: string | null;
  engagement_nature?: string | null;
  reminder_preference?: string | null;
  organizationName?: string | null;
  compensation?: {
    amount: number;
    currency: string;
    frequency: string;
  } | null;
}

export interface RoutineSuggestionItem {
  id: string;
  activityId: string;
  title: string;
  body: string;
  metadata?: any;
}

interface ActivitiesClientViewProps {
  initialActivities: ActivityViewItem[];
  initialSuggestions?: RoutineSuggestionItem[];
  initialRenewActivityId?: string;
}

export function ActivitiesClientView({
  initialActivities,
  initialSuggestions = [],
  initialRenewActivityId,
}: ActivitiesClientViewProps) {
  const { push: toastPush } = useToast();
  const { t } = useLanguage();
  const [activities, setActivities] = useState<ActivityViewItem[]>(initialActivities);
  const [suggestions, setSuggestions] = useState<RoutineSuggestionItem[]>(initialSuggestions);
  const [evolutionProcessingId, setEvolutionProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [renewingActivity, setRenewingActivity] = useState<ActivityViewItem | null>(() => {
    if (initialRenewActivityId) {
      return initialActivities.find((a) => a.id === initialRenewActivityId) ?? null;
    }
    return null;
  });
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const active = activities.filter((a) => a.status === "active");
  const expired = activities.filter((a) => a.status === "expired");
  const suspended = activities.filter((a) => a.status === "suspended");
  const archived = activities.filter((a) => a.status === "archived");

  async function handleAcceptEvolution(activityId: string, suggestionId?: string) {
    if (evolutionProcessingId) return;
    setEvolutionProcessingId(activityId);
    try {
      const res = await acceptEvolutionToRoutine(activityId, suggestionId);
      if (res && res.error) {
        toastPush(res.error, "error");
      } else {
        toastPush("Félicitations ! L'activité est désormais enregistrée comme routine.", "success");
        setActivities((prev) =>
          prev.map((a) => (a.id === activityId ? { ...a, engagement_nature: "routine" } : a))
        );
        setSuggestions((prev) => prev.filter((s) => s.activityId !== activityId && s.id !== suggestionId));
      }
    } catch {
      toastPush("Erreur lors de la mise à jour de la routine.", "error");
    } finally {
      setEvolutionProcessingId(null);
    }
  }

  async function handleDeclineEvolution(activityId: string, suggestionId?: string) {
    if (evolutionProcessingId) return;
    setEvolutionProcessingId(activityId);
    try {
      const res = await declineEvolutionSuggestion(activityId, suggestionId, 30);
      if (res && res.error) {
        toastPush(res.error, "error");
      } else {
        toastPush("Choix enregistré : nous respecterons votre décision avec un répit de 30 jours.", "info");
        setSuggestions((prev) => prev.filter((s) => s.activityId !== activityId && s.id !== suggestionId));
      }
    } catch {
      toastPush("Erreur lors de l'enregistrement de votre choix.", "error");
    } finally {
      setEvolutionProcessingId(null);
    }
  }

  async function handleDelete(activityId: string) {
    if (deletingId || suspendingId || resumingId || archivingId || restoringId) return;
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
    if (deletingId || suspendingId || resumingId || archivingId || restoringId) return;
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
    if (deletingId || suspendingId || resumingId || archivingId || restoringId) return;
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
    if (deletingId || suspendingId || resumingId || archivingId || restoringId) return;
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
    if (deletingId || suspendingId || resumingId || archivingId || restoringId) return;
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

  async function handleKeepExpired(activityId: string) {
    if (renewSubmitting) return;
    setRenewSubmitting(true);
    try {
      const res = await keepActivityExpired(activityId);
      if (res && res.error) {
        toastPush(res.error, "error");
      } else {
        toastPush("Activité maintenue expirée sans renouvellement.", "info");
        setActivities((prev) =>
          prev.map((a) => (a.id === activityId ? { ...a, status: "expired" } : a))
        );
        setRenewingActivity(null);
      }
    } catch {
      toastPush("Erreur lors de la confirmation du statut expiré.", "error");
    } finally {
      setRenewSubmitting(false);
    }
  }

  async function handleRenewSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!renewingActivity || renewSubmitting) return;

    const form = new FormData(e.currentTarget);
    const newEndDate = (form.get("newEndDate") as string) || undefined;
    const newAmountStr = form.get("newAmount") as string;
    const newAmount = newAmountStr ? Number(newAmountStr) : undefined;

    if (!newEndDate) {
      toastPush("Veuillez sélectionner une nouvelle date de fin.", "error");
      return;
    }

    if (renewingActivity.startDate && newEndDate < renewingActivity.startDate) {
      toastPush(
        `La nouvelle date de fin ne peut pas précéder la date de début (${new Date(renewingActivity.startDate).toLocaleDateString("fr-FR")}).`,
        "error"
      );
      return;
    }

    setRenewSubmitting(true);

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
    <div className="relative isolate min-h-full w-full space-y-8">
      {/* Fond d'écran global de la page Activités */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none -z-10"
        style={{ backgroundImage: "url('/images/backgrounds/activities-bg.jpg')" }}
      />

      {/* En-tête responsive */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-ink-900/95 backdrop-blur-md p-6 sm:p-8 shadow-sm" data-tour="activities-header">

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-ink-50 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-signal text-white shadow-xs">
                <Briefcase className="h-5 w-5" />
              </span>
              {t("activities.title")}
            </h1>
            <p className="text-sm text-ink-500 mt-1">
              {t("activities.count_active", { count: active.length })}
              {expired.length > 0 ? ` · ${t("activities.count_expired", { count: expired.length })}` : ""}
              {suspended.length > 0 ? ` · ${t("activities.count_suspended", { count: suspended.length })}` : ""}
              {archived.length > 0 ? ` · ${t("activities.count_archived", { count: archived.length })}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SectionGuideTrigger section="activities" label="Guide des activités" />
            <Link href="/activities/new" data-tour="activity-create" className={buttonClasses("primary", "md")}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t("activities.add_btn")}
            </Link>
          </div>
        </div>
      </div>

      {/* 1. ACTIVITÉS ACTIVES */}
      {active.length === 0 && expired.length === 0 && suspended.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-300 bg-canvas-raised/50 p-10 text-center" data-tour="activities-list">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-signal-soft text-signal">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-ink-950">{t("activities.empty_title")}</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
            {t("activities.empty_desc")}
          </p>
          <div className="mt-5">
            <Link href="/activities/new" data-tour="activity-create" className={buttonClasses("primary", "sm")}>
              <Plus className="h-4 w-4 mr-1" />
              {t("activities.add_btn")}
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
                className="flex flex-col justify-between gap-4 rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md p-6 hover:border-signal/50 hover:shadow-md transition-all shadow-xs"
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
                    <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                      <span className="rounded-full bg-ink-100 dark:bg-ink-800 px-2.5 py-0.5 text-xs font-semibold text-ink-700 dark:text-ink-300 shrink-0">
                        {typeLabel(activity.type)}
                      </span>
                      {activity.engagement_nature === "routine" && (
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          Routine
                        </span>
                      )}
                      {activity.engagement_nature === "important" && (
                        <span className="rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 shrink-0">
                          Important
                        </span>
                      )}
                      {activity.validity_type === "permanent" ? (
                        <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 shrink-0">
                          Permanente
                        </span>
                      ) : activity.validity_type === "temporary" ? (
                        <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 shrink-0">
                          Temporaire
                        </span>
                      ) : null}
                    </div>
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

                  {/* Suggestion d'évolution vers une routine */}
                  {(() => {
                    const suggestion = suggestions.find((s) => s.activityId === activity.id);
                    if (!suggestion) return null;
                    const isBusy = evolutionProcessingId === activity.id;

                    return (
                      <div className="rounded-2xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-800/80 dark:bg-amber-950/40 p-4 space-y-2.5 mt-2">
                        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{suggestion.title}</span>
                        </div>
                        <p className="text-xs text-amber-900/90 dark:text-amber-300 leading-relaxed">
                          {suggestion.body}
                        </p>
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAcceptEvolution(activity.id, suggestion.id)}
                            className="px-3 py-1.5 rounded-lg bg-signal hover:bg-signal-dark text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            Passer en routine
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeclineEvolution(activity.id, suggestion.id)}
                            className="px-3 py-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700 text-ink-700 dark:text-ink-200 text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Garder la configuration actuelle (répit 30j)
                          </button>
                        </div>
                      </div>
                    );
                  })()}
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
                        <Link
                          href={`/activities/new?duplicate_from=${activity.id}`}
                          title="Dupliquer cette activité pour créer une nouvelle occurrence rapidement"
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:text-ink-950 hover:bg-ink-100 transition-colors min-h-[32px] inline-flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5 text-ink-500" />
                          Dupliquer
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
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {itemError && <span className="text-danger text-xs">{itemError}</span>}
                      <button
                        type="button"
                        onClick={() => setRenewingActivity(activity)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-purple-900 bg-purple-200/80 hover:bg-purple-300 transition-colors min-h-[32px] inline-flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                        Renouveler
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeepExpired(activity.id)}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors min-h-[32px] inline-flex items-center gap-1 cursor-pointer"
                        title="Conserver l'activité expirée sans la renouveler"
                      >
                        <X className="w-3.5 h-3.5 text-ink-400" />
                        Conserver expirée
                      </button>
                      <Link
                        href={`/activities/new?duplicate_from=${activity.id}`}
                        title="Dupliquer cette activité pour créer une nouvelle occurrence"
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-purple-900 hover:bg-purple-100 transition-colors min-h-[32px] inline-flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Dupliquer
                      </Link>
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
                      href={`/activities/new?duplicate_from=${activity.id}`}
                      title="Dupliquer cette activité"
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors min-h-[32px] inline-flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Dupliquer
                    </Link>
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
                    <Link
                      href={`/activities/new?duplicate_from=${activity.id}`}
                      title="Dupliquer cette activité archivée"
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-100 transition-colors min-h-[32px] inline-flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Dupliquer
                    </Link>
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
          <div className="relative w-full max-w-md rounded-2xl border border-purple-300 dark:border-purple-800 bg-canvas-raised dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setRenewingActivity(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-950 dark:text-ink-50">Renouveler l'activité</h3>
                <p className="text-xs text-ink-500">« {renewingActivity.name} »</p>
              </div>
            </div>

            {/* Présentation claire des dates actuelles */}
            <div className="rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/60 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-ink-600 dark:text-ink-400">
                <span>Date de fin actuelle :</span>
                <span className="font-semibold text-ink-950 dark:text-ink-100">
                  {renewingActivity.endDate
                    ? new Date(renewingActivity.endDate).toLocaleDateString("fr-FR")
                    : "Non définie"}
                </span>
              </div>
              {renewingActivity.startDate ? (
                <div className="flex justify-between text-ink-600 dark:text-ink-400">
                  <span>Date de début :</span>
                  <span className="font-semibold text-ink-950 dark:text-ink-100">
                    {new Date(renewingActivity.startDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-ink-600 dark:text-ink-400">
                <span>Nature de l'activité :</span>
                <span className="font-medium text-ink-700 dark:text-ink-300 capitalize">
                  {renewingActivity.engagement_nature === "routine"
                    ? "Routine"
                    : renewingActivity.engagement_nature === "important"
                    ? "Important"
                    : "Engagement temporaire"}
                </span>
              </div>
              <div className="flex justify-between text-ink-600 dark:text-ink-400">
                <span>Type de validité :</span>
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  Temporaire (préservé)
                </span>
              </div>
            </div>

            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div>
                <label htmlFor="newEndDate" className="block text-xs font-semibold text-ink-800 dark:text-ink-200 mb-1">
                  Nouvelle date de fin *
                </label>
                <input
                  id="newEndDate"
                  name="newEndDate"
                  type="date"
                  required
                  min={renewingActivity.startDate || undefined}
                  defaultValue={
                    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                  }
                  className="w-full rounded-lg border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 px-3 py-2 text-sm text-ink-950 dark:text-ink-50 focus:border-purple-600 focus:outline-none"
                />
                <p className="text-[11px] text-ink-500 mt-1">
                  L'activité redeviendra active jusqu'à cette nouvelle date. L'historique des occurrences passées reste intégralement préservé.
                </p>
              </div>

              {renewingActivity.compensation ? (
                <div>
                  <label htmlFor="newAmount" className="block text-xs font-semibold text-ink-800 dark:text-ink-200 mb-1">
                    Montant de rémunération ({renewingActivity.compensation.currency})
                  </label>
                  <input
                    id="newAmount"
                    name="newAmount"
                    type="number"
                    step="any"
                    min="0"
                    defaultValue={renewingActivity.compensation.amount}
                    className="w-full rounded-lg border border-ink-300 dark:border-ink-700 bg-canvas dark:bg-ink-950 px-3 py-2 text-sm text-ink-950 dark:text-ink-50 focus:border-purple-600 focus:outline-none"
                  />
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-ink-100 dark:border-ink-800">
                <button
                  type="button"
                  disabled={renewSubmitting}
                  onClick={() => handleKeepExpired(renewingActivity.id)}
                  className="text-xs text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200 underline cursor-pointer"
                  title="Conserver l'activité expirée sans prolonger"
                >
                  Conserver expirée sans renouvellement
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
