"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { signOutEverywhere } from "@/app/(app)/settings/actions";

interface SessionsSectionProps {
  email: string;
  lastSignInAt: string | null;
}

/**
 * §22 du prompt maître demande une liste d'appareils/sessions actives.
 * Le SDK Supabase côté client ne donne accès qu'à la session courante (pas
 * de liste multi-appareils sans passer par l'API d'administration, qui
 * nécessite la clé service_role — jamais exposée côté client, §75). On
 * livre donc honnêtement ce qui est réellement disponible : la session en
 * cours, et une déconnexion globale (§22 : "déconnexion de toutes les
 * autres sessions").
 */
export function SessionsSection({ email, lastSignInAt }: SessionsSectionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="max-w-lg">
      <h3 className="mb-1 text-sm font-semibold text-ink-950">Session actuelle</h3>
      <p className="mb-4 text-sm text-ink-500">
        La liste détaillée des appareils connectés n'est pas encore disponible — en attendant,
        vous pouvez déconnecter toutes les sessions actives d'un coup.
      </p>

      <div className="mb-6 rounded-lg border border-ink-100 px-4 py-3">
        <p className="text-sm font-medium text-ink-950">{email}</p>
        {lastSignInAt ? (
          <p className="text-xs text-ink-500">
            Dernière connexion : {new Date(lastSignInAt).toLocaleString("fr-FR")}
          </p>
        ) : null}
      </div>

      <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
        Déconnecter tous les appareils
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={signOutEverywhere}
        title="Déconnecter tous les appareils ?"
        description="Vous serez déconnecté de cet appareil et de tous les autres. Vous devrez vous reconnecter partout."
        confirmLabel="Déconnecter tout"
        variant="danger"
      />
    </div>
  );
}
