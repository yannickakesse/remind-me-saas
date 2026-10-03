"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileJson, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAccount } from "@/app/(app)/settings/actions";

export function DataSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex max-w-3xl flex-col gap-8 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-md">
      {/* Section 1: Téléchargement & Exportations */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-signal" />
            Téléchargement &amp; Exportation des données
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 font-medium">
            Conformément au RGPD et au principe de portabilité, vous pouvez télécharger à tout moment vos données personnelles, activités et relevés financiers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Export JSON complet */}
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 flex flex-col justify-between space-y-4 shadow-xs hover:border-signal/40 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-signal-soft text-signal">
                  <FileJson className="w-5 h-5" />
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                  JSON Complet
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-zinc-950 dark:text-white">Données Personnelles &amp; Activités</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                Archive exhaustive de votre compte : profil, activités, tâches, événements calendrier, contacts et historique des notifications.
              </p>
            </div>

            <a
              href="/api/settings/export"
              download
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-98 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Télécharger (JSON)
            </a>
          </div>

          {/* Card 2: Export CSV Financier */}
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 flex flex-col justify-between space-y-4 shadow-xs hover:border-gold/40 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  CSV Tableur
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-zinc-950 dark:text-white">Relevé Financier &amp; Trésorerie</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                Export tabulaire de l'ensemble de vos revenus, dépenses et factures, compatible Excel, Google Sheets et logiciels comptables.
              </p>
            </div>

            <a
              href="/api/finances/export"
              download
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-98 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-signal" /> Exporter le relevé (CSV)
            </a>
          </div>
        </div>
      </div>

      {/* Section 2: Gestion du Cache Local & Performance */}
      <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <h3 className="text-base font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-signal" />
            Cache Local &amp; Stockage Hors-Ligne
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 font-medium">
            Les fonds d'écran, logos et icônes sont mis en cache localement dans votre navigateur pour un affichage instantané à 0 ms. Vous pouvez vider ce cache si nécessaire pour libérer de l'espace ou forcer le rafraîchissement.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white">Cache des images &amp; fonds d'écran</h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
              Efface le stockage Service Worker et recharge instantanément les assets en mémoire.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              if ("caches" in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
              window.location.reload();
            }}
            className="shrink-0 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-950 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            🧹 Vider le cache &amp; recharger
          </button>
        </div>
      </div>

      {/* Section 3: Suppression de compte */}
      <div className="rounded-2xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-5 space-y-3">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <h3 className="text-sm font-bold">Zone de danger — Suppression du compte</h3>
        </div>
        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
          Cette action supprime définitivement et irréversiblement votre compte et l'intégralité des données associées (activités, calendrier, tâches, factures, finances et notifications).
        </p>
        <div>
          <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)} className="font-bold">
            Supprimer mon compte définitivement
          </Button>
        </div>
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
