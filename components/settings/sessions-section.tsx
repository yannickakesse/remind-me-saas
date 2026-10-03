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
    <div className="max-w-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-md space-y-5">
      <div>
        <h3 className="text-base font-extrabold text-zinc-950 dark:text-white">Session actuelle</h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 font-medium leading-relaxed">
          Gérez votre session active ou déconnectez tous vos appareils d'un seul clic en cas de doute.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 p-4 space-y-1">
        <p className="text-sm font-bold text-zinc-950 dark:text-white">{email}</p>
        {lastSignInAt ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Dernière connexion : {new Date(lastSignInAt).toLocaleString("fr-FR")}
          </p>
        ) : null}
      </div>

      <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)} className="font-bold">
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
