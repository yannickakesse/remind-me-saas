"use client";

import { useState } from "react";
import { Modal } from "./modal";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  /** Explique les conséquences pour les actions critiques (§67 du prompt maître). */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style "danger" pour delete/archive/cancel/logout all/delete account. */
  variant?: "default" | "danger";
}

/**
 * Confirmation générique pour toute action destructive (§67) : delete,
 * archive, déconnexion de toutes les sessions, suppression de compte...
 * Gère elle-même l'état loading pendant l'appel serveur, pour ne jamais
 * permettre une double soumission (§109).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant === "danger" ? "danger" : "primary"} onClick={handleConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
