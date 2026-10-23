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
  Search,
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
  const [filterTab, setFilterTab] = useState<"all" | "active" | "expired" | "suspended" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
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

  const totalActive = activities.filter((a) => a.status === "active").length;
  const totalExpired = activities.filter((a) => a.status === "expired").length;
  const totalSuspended = activities.filter((a) => a.status === "suspended").length;
  const totalArchived = activities.filter((a) => a.status === "archived").length;

  const filteredActivities = activities.filter((a) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.name.toLowerCase().includes(q);
      const matchOrg = a.organizationName?.toLowerCase().includes(q);
      const matchType = typeLabel(a.type).toLowerCase().includes(q);
      if (!matchName && !matchOrg && !matchType) return false;
    }
    if (filterTab === "all") return true;
    return a.status === filterTab;
  });

  const active = filteredActivities.filter((a) => a.status === "active");
  const expired = filteredActivities.filter((a) => a.status === "expired");
  const suspended = filteredActivities.filter((a) => a.status === "suspended");
  const archived = filteredActivities.filter((a) => a.status === "archived");

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
    <div className="relative isolate min-h-full w-full space-y-6">
      {/* Auras d'ambiance en arrière-plan */}
      <div className="absolute top-0 -left-16 w-72 h-72 rounded-full bg-signal/10 dark:bg-signal/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-16 w-80 h-80 rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-3xl pointer-events-none" />

      {/* En-tête responsive haute fidélité */}
      <div
        className="relative overflow-hidden rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-7 shadow-xs"
        data-tour="activities-header"
      >
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-signal/15 dark:bg-signal/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-signal/10 dark:bg-signal/20 text-signal text-[11px] font-bold border border-signal/20 shadow-2xs">
                <Briefcase className="w-3 h-3" />
                <span>Portefeuille d&apos;activités</span>
              </span>
              <span className="text-xs text-ink-500">
                {activities.length} activité{activities.length > 1 ? "s" : ""} au total
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white flex items-center gap-2.5">
              {t("activities.title")}
            </h1>
            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mt-1">
              Pilotez vos différentes casquettes, contrats, tarifs et temps de mission en un seul endroit.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <SectionGuideTrigger section="activities" label="Guide" />
            <Link
              href="/activities/new"
              data-tour="activity-create"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_4px_16px_rgba(217,119,6,0.25)] hover:shadow-[0_6px_20px_rgba(217,119,6,0.35)] tap-active cursor-pointer bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 border border-amber-400/40 min-h-[42px]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.8} />
              <span>{t("activities.add_btn")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Barre de navigation par onglets & Recherche */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Onglets Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-2xl border border-ink-200/80 dark:border-white/10 bg-canvas-raised/80 dark:bg-slate-900/80 backdrop-blur-md shadow-2xs">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === "all"
                ? "bg-signal text-white shadow-xs"
                : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
            }`}
          >
            <span>Toutes</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filterTab === "all" ? "bg-white/20 text-white" : "bg-ink-100 dark:bg-white/10 text-ink-700 dark:text-ink-300"
              }`}
            >
              {activities.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === "active"
                ? "bg-signal text-white shadow-xs"
                : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
            }`}
          >
            <span>Actives</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filterTab === "active" ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {totalActive}
            </span>
          </button>

          {totalExpired > 0 && (
            <button
              type="button"
              onClick={() => setFilterTab("expired")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === "expired"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Expirées</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterTab === "expired" ? "bg-white/20 text-white" : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                }`}
              >
                {totalExpired}
              </span>
            </button>
          )}

          {totalSuspended > 0 && (
            <button
              type="button"
              onClick={() => setFilterTab("suspended")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === "suspended"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>En pause</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterTab === "suspended" ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {totalSuspended}
              </span>
            </button>
          )}

          {totalArchived > 0 && (
            <button
              type="button"
              onClick={() => setFilterTab("archived")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === "archived"
                  ? "bg-ink-800 text-white shadow-xs"
                  : "text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white"
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-ink-400" />
              <span>Archivées</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterTab === "archived" ? "bg-white/20 text-white" : "bg-ink-100 dark:bg-white/10 text-ink-600 dark:text-ink-400"
                }`}
              >
                {totalArchived}
              </span>
            </button>
          )}
        </div>

        {/* Champ de recherche */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une activité..."
            className="w-full pl-9 pr-8 py-2 rounded-2xl border border-ink-200/80 dark:border-white/10 bg-canvas-raised/80 dark:bg-slate-900/80 text-xs text-ink-950 dark:text-white placeholder:text-ink-400 focus:outline-none focus:border-signal transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* LISTE PRINCIPALE DES ACTIVITÉS */}
      {filteredActivities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 dark:border-ink-800 bg-canvas-raised/50 dark:bg-slate-900/50 p-10 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-signal/10 text-signal border border-signal/20 shadow-xs">
            <Briefcase className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-ink-950 dark:text-white">
            {searchQuery ? "Aucune activité ne correspond à votre recherche" : t("activities.empty_title")}
          </h3>
          <p className="text-xs sm:text-sm text-ink-500 max-w-sm mx-auto">
            {searchQuery ? `Essayez de modifier votre terme de recherche « ${searchQuery} »` : t("activities.empty_desc")}
          </p>
          <div className="pt-2">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 rounded-xl bg-ink-100 dark:bg-white/10 text-ink-900 dark:text-white text-xs font-bold hover:bg-ink-200 transition-colors"
              >
                Effacer la recherche
              </button>
            ) : (
              <Link
                href="/activities/new"
                data-tour="activity-create"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-signal text-white text-xs font-bold hover:bg-signal-dark transition-colors shadow-2xs"
              >
                <Plus className="h-4 w-4" />
                {t("activities.add_btn")}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5" data-tour="activities-list">
          {filteredActivities.map((activity) => {
            const isDeleting = deletingId === activity.id;
            const isArchiving = archivingId === activity.id;
            const isSuspending = suspendingId === activity.id;
            const isRestoring = restoringId === activity.id;
            const isResuming = resumingId === activity.id;
            const isConfirmingDelete = confirmDeleteId === activity.id;
            const itemError = errorMap[activity.id];
            const activityColor = activity.color ?? "#E5A91E";

            return (
              <div
                key={activity.id}
                className="relative overflow-hidden flex flex-col justify-between gap-4 rounded-3xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised/95 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-6 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 group"
              >
                {/* Barre d'accentuation supérieure thématique */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: activityColor }}
                />

                <div className="space-y-3.5 pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/20 shadow-2xs"
                        style={{ backgroundColor: activityColor }}
                      />
                      <h3 className="font-bold text-ink-950 dark:text-white text-base truncate group-hover:text-signal transition-colors">
                        {activity.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                      <span className="rounded-full bg-ink-100 dark:bg-white/5 border border-ink-200/50 dark:border-white/5 px-2.5 py-0.5 text-xs font-semibold text-ink-700 dark:text-ink-300 shrink-0">
                        {typeLabel(activity.type)}
                      </span>

                      {activity.status === "expired" && (
                        <span className="rounded-full bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Expirée
                        </span>
                      )}

                      {activity.status === "suspended" && (
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0 flex items-center gap-1">
                          <Pause className="w-2.5 h-2.5" /> En pause
                        </span>
                      )}

                      {activity.status === "archived" && (
                        <span className="rounded-full bg-ink-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-medium text-ink-600 dark:text-ink-400 shrink-0">
                          Archivée
                        </span>
                      )}

                      {activity.engagement_nature === "routine" && (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          Routine
                        </span>
                      )}

                      {activity.engagement_nature === "important" && (
                        <span className="rounded-full bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 shrink-0">
                          Important
                        </span>
                      )}

                      {activity.validity_type === "permanent" ? (
                        <span className="rounded-full bg-sky-500/15 border border-sky-500/25 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300 shrink-0">
                          Permanente
                        </span>
                      ) : activity.validity_type === "temporary" ? (
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 shrink-0">
                          Temporaire
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-600 dark:text-ink-400">
                    {activity.organizationName ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-ink-800 dark:text-ink-200">
                        <Building2 className="h-3.5 w-3.5 text-ink-400" />
                        {activity.organizationName}
                      </span>
                    ) : null}

                    {activity.compensation ? (
                      <span className="inline-flex items-center gap-1.5 font-mono font-bold text-signal bg-signal/10 dark:bg-signal/20 px-2.5 py-0.5 rounded-lg border border-signal/20">
                        <Wallet className="h-3.5 w-3.5" />
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
                      <div className="rounded-2xl border border-amber-400/50 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-950/30 p-3.5 space-y-2.5 mt-2 shadow-2xs">
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
                            className="px-3 py-1.5 rounded-xl bg-signal hover:bg-signal-dark text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            Passer en routine
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeclineEvolution(activity.id, suggestion.id)}
                            className="px-3 py-1.5 rounded-xl bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700 text-ink-700 dark:text-ink-200 text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Garder la configuration actuelle (répit 30j)
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-3 border-t border-ink-100/70 dark:border-white/5">
                  {isConfirmingDelete ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl text-xs">
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
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
                    <div className="flex flex-col gap-1 w-full">
                      {itemError && <span className="text-rose-600 text-xs text-right">{itemError}</span>}
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {activity.status === "expired" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setRenewingActivity(activity)}
                              className="rounded-xl px-2.5 py-1.5 text-xs font-bold text-purple-900 dark:text-purple-200 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 transition-colors min-h-[32px] inline-flex items-center gap-1 shadow-2xs cursor-pointer border border-purple-300 dark:border-purple-800"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              Renouveler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleKeepExpired(activity.id)}
                              className="rounded-xl px-2 py-1.5 text-xs font-medium text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-white/5 transition-colors min-h-[32px] inline-flex items-center gap-1 cursor-pointer"
                              title="Conserver l'activité expirée sans la renouveler"
                            >
                              <X className="w-3.5 h-3.5 text-ink-400" />
                              Conserver expirée
                            </button>
                          </>
                        )}

                        {activity.status === "suspended" && (
                          <button
                            type="button"
                            onClick={() => handleResume(activity.id)}
                            disabled={isResuming || isDeleting}
                            className="rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 hover:bg-emerald-200 transition-colors min-h-[32px] inline-flex items-center gap-1 shadow-2xs border border-emerald-300 dark:border-emerald-800"
                          >
                            <Play className="w-3.5 h-3.5 fill-emerald-800 dark:fill-emerald-300" />
                            {isResuming ? "..." : "Reprendre"}
                          </button>
                        )}

                        {activity.status === "archived" && (
                          <button
                            type="button"
                            onClick={() => handleRestore(activity.id)}
                            disabled={isRestoring || isDeleting}
                            className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-signal hover:bg-signal/10 transition-colors min-h-[32px] inline-flex items-center gap-1 border border-signal/20"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {isRestoring ? "..." : "Restaurer"}
                          </button>
                        )}

                        <Link
                          href={`/activities/${activity.id}/edit`}
                          className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-signal hover:bg-signal/10 transition-colors min-h-[32px] inline-flex items-center gap-1 border border-signal/20"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Modifier
                        </Link>

                        <Link
                          href={`/activities/new?duplicate_from=${activity.id}`}
                          title="Dupliquer cette activité pour créer une nouvelle occurrence rapidement"
                          className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-ink-700 dark:text-ink-300 hover:text-ink-950 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-white/5 transition-colors min-h-[32px] inline-flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5 text-ink-400" />
                          Dupliquer
                        </Link>

                        {activity.status === "active" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSuspend(activity.id)}
                              disabled={isSuspending || isArchiving || isDeleting}
                              title="Mettre en pause temporairement"
                              className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 bg-amber-500/10 transition-colors min-h-[32px] inline-flex items-center gap-1"
                            >
                              <Pause className="w-3.5 h-3.5 text-amber-600" />
                              {isSuspending ? "..." : "Suspendre"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleArchive(activity.id)}
                              disabled={isSuspending || isArchiving || isDeleting}
                              className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-white/5 transition-colors min-h-[32px] inline-flex items-center gap-1"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              {isArchiving ? "..." : "Archiver"}
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(activity.id)}
                          disabled={isSuspending || isArchiving || isDeleting}
                          className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors min-h-[32px] inline-flex items-center gap-1"
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
