"use client";

/**
 * Ce que la voix peut réellement faire selon l'appareil, application ouverte ou fermée.
 * Règle : ne jamais promettre une voix automatique que le système ne garantit pas.
 */
import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

type Device = "iphone-app" | "iphone-browser" | "android" | "desktop";

function detectDevice(): Device {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches) ||
    (navigator as any).standalone === true;
  if (isIOS) return standalone ? "iphone-app" : "iphone-browser";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function ClosedAppVoiceInfo() {
  const { tr } = useLanguage();
  const [device, setDevice] = useState<Device | null>(null);
  useEffect(() => setDevice(detectDevice()), []);

  const lines: Record<Device, { title: string; open: string; closed: string; tip?: string }> = {
    "iphone-app": {
      title: tr("Sur cet iPhone (application installée)"),
      open: tr("Application ouverte : Remind Me prononce vos rappels. Le mode silencieux peut couper le son."),
      closed: tr("Application fermée ou en arrière-plan : vous recevez une notification avec le son d'iOS. Touchez-la pour ouvrir Remind Me et entendre le rappel."),
    },
    "iphone-browser": {
      title: tr("Sur cet iPhone (navigateur)"),
      open: tr("Onglet affiché : Remind Me prononce vos rappels."),
      closed: tr("Onglet fermé : aucune notification. Sur iPhone, les notifications ne fonctionnent qu'avec l'application installée."),
      tip: tr("Pour les activer : Safari → Partager → Sur l'écran d'accueil, puis ouvrez Remind Me depuis l'icône."),
    },
    android: {
      title: tr("Sur ce téléphone Android"),
      open: tr("Application ouverte : Remind Me prononce vos rappels."),
      closed: tr("Application fermée ou en arrière-plan : vous recevez une notification avec le son et la vibration du téléphone. Touchez « Écouter » pour entendre le rappel."),
    },
    desktop: {
      title: tr("Sur cet ordinateur"),
      open: tr("Onglet ouvert : Remind Me prononce vos rappels, même s'il n'est pas au premier plan la plupart du temps."),
      closed: tr("Navigateur fermé : vous recevez une notification seulement si le navigateur continue de tourner en arrière-plan. Aucune voix."),
    },
  };

  if (!device) return null;
  const d = lines[device];
  return (
    <div className="rounded-xl border border-signal/25 bg-signal/5 p-3 text-xs text-ink-700 dark:text-ink-200">
      <p className="mb-1.5 flex items-center gap-1.5 font-bold text-ink-950 dark:text-white">
        <Info className="h-3.5 w-3.5 text-signal" /> {d.title}
      </p>
      <ul className="space-y-1">
        <li>🔊 {d.open}</li>
        <li>🔔 {d.closed}</li>
        {d.tip && <li>💡 {d.tip}</li>}
      </ul>
      <p className="mt-1.5 text-[11px] text-ink-500">
        {tr("Aucune application web ne peut parler quand elle est fermée : c'est une limite des téléphones, pas un réglage.")}
      </p>
    </div>
  );
}
