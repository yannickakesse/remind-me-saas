"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Archive, RotateCcw, Edit3 } from "lucide-react";
import { archiveActivity, restoreActivity, deleteActivity } from "@/app/(app)/activities/actions";
import { Button } from "@/components/ui/button";

interface ActivityItemActionsProps {
  activityId: string;
  activityName: string;
  isArchived?: boolean;
}

export function ActivityItemActions({
  activityId,
  activityName,
  isArchived = false,
}: ActivityItemActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setLoading(true);
    setError(null);
    try {
      const res = await archiveActivity(activityId);
      if (res && res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'archivage.");
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    setError(null);
    try {
      const res = await restoreActivity(activityId);
      if (res && res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la restauration.");
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await deleteActivity(activityId);
      if (res && res.error) {
        setError(res.error);
        setLoading(false);
        setShowDeleteConfirm(false);
        return;
      }
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la suppression.");
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  if (showDeleteConfirm) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-2 bg-danger/10 border border-danger/20 p-2.5 rounded-xl text-xs">
        <span className="text-danger font-semibold">
          Supprimer définitivement « {activityName} » ?
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={loading}
            disabled={loading}
            onClick={handleDelete}
          >
            Oui, supprimer
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => setShowDeleteConfirm(false)}
          >
            Annuler
          </Button>
        </div>
        {error && <span className="text-danger text-xs">{error}</span>}
      </div>
    );
  }

  if (isArchived) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="text-danger text-xs mr-2">{error}</span>}
        <button
          type="button"
          onClick={handleRestore}
          disabled={loading}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-signal hover:bg-signal-soft transition-colors min-h-[32px] inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurer
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={loading}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors min-h-[32px] inline-flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      {error && <span className="text-danger text-xs text-right">{error}</span>}
      <div className="flex items-center justify-end gap-1.5 flex-wrap">
        <Link
          href={`/activities/${activityId}/edit`}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-signal hover:bg-signal-soft transition-colors min-h-[32px] inline-flex items-center gap-1"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Modifier
        </Link>
        <button
          type="button"
          onClick={handleArchive}
          disabled={loading}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-500 hover:text-ink-800 hover:bg-ink-100 transition-colors min-h-[32px] inline-flex items-center gap-1"
        >
          <Archive className="w-3.5 h-3.5" />
          Archiver
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={loading}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors min-h-[32px] inline-flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer
        </button>
      </div>
    </div>
  );
}
