"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAccount } from "@/app/(app)/settings/actions";

/** §97-98 du prompt maître — export de données + suppression de compte. */
export function DataSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-ink-950">Exporter mes données</h3>
        <p className="mb-3 text-sm text-ink-500">
          Téléchargez une copie complète de vos données (profil, activités, tâches, finances,
          notifications) au format JSON.
        </p>
        <a
          href="/api/settings/export"
          className="inline-flex items-center justify-center rounded-md border border-ink-300 bg-canvas-raised px-3 py-1.5 text-sm font-medium text-ink-950 transition-colors hover:bg-ink-100"
        >
          Télécharger mes données
        </a>
      </div>

      <div className="rounded-lg border border-danger/30 bg-danger-soft p-4">
        <h3 className="mb-1 text-sm font-semibold text-danger">Supprimer mon compte</h3>
        <p className="mb-3 text-sm text-ink-700">
          Cette action supprime définitivement votre compte et toutes les données associées
          (activités, calendrier, tâches, finances, notifications). Cette action est irréversible.
        </p>
        <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
          Supprimer mon compte
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={deleteAccount}
        title="Supprimer définitivement votre compte ?"
        description="Cette action supprime immédiatement et irréversiblement votre compte et toutes les données associées. Il n'y a pas de retour en arrière possible."
        confirmLabel="Supprimer définitivement"
        variant="danger"
      />
    </div>
  );
}
