"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(window.navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3500);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowReconnected(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div
        role="alert"
        className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-ink-950 font-semibold text-xs py-2 px-4 text-center shadow-md animate-in slide-in-from-top duration-200 flex items-center justify-center gap-1.5"
      >
        <AlertTriangle className="w-4 h-4 text-ink-950 shrink-0" />
        <span>Vous êtes actuellement hors-ligne. L'application reste consultable.</span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        className="fixed top-0 left-0 right-0 z-50 bg-positive text-white font-semibold text-xs py-2 px-4 text-center shadow-md animate-in slide-in-from-top duration-200 flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
        <span>Connexion rétablie avec succès.</span>
      </div>
    );
  }

  return null;
}
