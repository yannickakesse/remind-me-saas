"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileJson, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAccount } from "@/app/(app)/settings/actions";

export function DataSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {/* Section 1: Téléchargement & Exportations */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-ink-950 flex items-center gap-2">
            <Download className="w-4 h-4 text-signal" />
            Téléchargement & Exportation des données
          </h3>
          <p className="text-xs text-ink-500 mt-1">
            Conformément au RGPD et au principe de portabilité, vous pouvez télécharger à tout moment vos données personnelles, activités et relevés financiers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Export JSON complet */}
          <div className="p-4 rounded-2xl border border-ink-200 bg-canvas-raised flex flex-col justify-between space-y-4 shadow-xs hover:border-signal/40 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-signal-soft text-signal">
                  <FileJson className="w-5 h-5" />
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ink-100 text-ink-700">
                  JSON Complet
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-950">Données Personnelles & Activités</h4>
              <p className="text-xs text-ink-500 leading-relaxed">
                Archive exhaustive de votre compte : profil, activités, tâches, événements calendrier, contacts et historique des notifications.
              </p>
            </div>

            <a
              href="/api/settings/export"
              download
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-ink-950 text-white text-xs font-semibold hover:bg-ink-900 active:scale-98 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Télécharger (JSON)
            </a>
          </div>

          {/* Card 2: Export CSV Financier */}
          <div className="p-4 rounded-2xl border border-ink-200 bg-canvas-raised flex flex-col justify-between space-y-4 shadow-xs hover:border-gold/40 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-gold/20 text-gold-dark">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold/15 text-gold-dark">
                  CSV Tableur
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink-950">Relevé Financier & Trésorerie</h4>
              <p className="text-xs text-ink-500 leading-relaxed">
                Export tabulaire de l'ensemble de vos revenus, dépenses et factures, compatible Excel, Google Sheets et logiciels comptables.
              </p>
            </div>

            <a
              href="/api/finances/export"
              download
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-ink-300 bg-canvas text-ink-950 text-xs font-semibold hover:bg-ink-100 active:scale-98 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-gold-dark" /> Exporter le relevé (CSV)
            </a>
          </div>
        </div>
      </div>

      {/* Section 2: Suppression de compte */}
      <div className="rounded-2xl border border-danger/30 bg-danger-soft/40 p-5 space-y-3">
        <div className="flex items-center gap-2 text-danger">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <h3 className="text-sm font-bold">Zone de danger — Suppression du compte</h3>
        </div>
        <p className="text-xs text-ink-700 leading-relaxed">
          Cette action supprime définitivement et irréversiblement votre compte et l'intégralité des données associées (activités, calendrier, tâches, factures, finances et notifications).
        </p>
        <div>
          <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
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
