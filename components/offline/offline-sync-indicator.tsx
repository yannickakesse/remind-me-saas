"use client";

import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { processOfflineSyncQueue } from "@/lib/offline/sync-queue";
import { useToast } from "@/components/ui/toast";

export function OfflineSyncIndicator() {
  const { push: showToast } = useToast();
  const [isOffline, setIsOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOffline(!navigator.onLine);

    async function handleOnline() {
      setIsOffline(false);
      setSyncing(true);
      try {
        const result = await processOfflineSyncQueue();
        if (result.succeeded > 0) {
          setJustSynced(true);
          showToast(`Connexion rétablie : ${result.succeeded} modification(s) synchronisée(s).`, "success");
          setTimeout(() => setJustSynced(false), 4000);
        }
      } catch {
      } finally {
        setSyncing(false);
      }
    }

    function handleOffline() {
      setIsOffline(true);
      showToast("Mode hors-ligne actif. Vos saisies sont enregistrées localement.", "info");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToast]);

  if (!isOffline && !syncing && !justSynced) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 pointer-events-none">
      {isOffline && (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-slate-950 font-bold text-xs shadow-lg shadow-black/30 backdrop-blur-md border border-amber-300/40">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Mode hors-ligne — Données conservées localement</span>
        </div>
      )}

      {syncing && (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/90 text-white font-bold text-xs shadow-lg shadow-black/30 backdrop-blur-md">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Synchronisation des modifications...</span>
        </div>
      )}

      {justSynced && !syncing && !isOffline && (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-600/90 text-white font-bold text-xs shadow-lg shadow-black/30 backdrop-blur-md animate-out fade-out duration-1000">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Données synchronisées avec succès !</span>
        </div>
      )}
    </div>
  );
}
