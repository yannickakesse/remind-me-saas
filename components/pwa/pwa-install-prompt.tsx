"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  X,
  Share,
  PlusSquare,
  Sparkles,
  Smartphone,
  Download,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

const DISMISS_STORAGE_KEY = "remindme_pwa_install_dismissed_at";
const DISMISS_DURATION_DAYS = 7; // Masquer 7 jours après fermeture

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const { push } = useToast();

  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"ios" | "android" | "desktop">("ios");

  // Ne pas afficher sur les pages d'impression PDF
  const isPrintPage = pathname?.includes("/print");

  // Détection du mode standalone et de la plateforme
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Détection si l'application est déjà installée / exécutée en PWA
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsStandalone(standaloneMode);
    if (standaloneMode) return;

    // 2. Détection de la plateforme utilisateur
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);
    if (isIosDevice) {
      setActiveGuideTab("ios");
    } else if (isAndroidDevice) {
      setActiveGuideTab("android");
    } else {
      setActiveGuideTab("desktop");
    }

    // 3. Vérification de la mémorisation de fermeture (Dismissed state)
    const lastDismissed = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed, 10);
      const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < DISMISS_DURATION_DAYS) {
        // Déjà fermé récemment
        return;
      }
    }

    // 4. Capture de l'événement natif Android / Chrome `beforeinstallprompt`
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Affichage discret après 2.5 secondes pour une expérience fluide et non intrusive
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  // Écoute des déclencheurs globaux (ex: clic depuis Paramètres ou Aide)
  useEffect(() => {
    const handleOpenGuide = () => {
      setShowGuideModal(true);
    };

    window.addEventListener("open-pwa-install-guide", handleOpenGuide);
    return () => {
      window.removeEventListener("open-pwa-install-guide", handleOpenGuide);
    };
  }, []);

  // Action de fermeture de la bannière
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    } catch {
      // Ignorer si localStorage désactivé
    }
  }, []);

  // Action principale au clic sur "Installer / Ajouter à l'écran d'accueil"
  const handleInstallClick = async () => {
    // Si nous avons l'événement natif Chromium (Android, Chrome, Edge)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          push("Remind Me est en cours d'installation sur votre écran d'accueil !", "success");
          handleDismiss();
        }
        setDeferredPrompt(null);
        return;
      } catch (err) {
        console.debug("Native prompt error:", err);
      }
    }

    // Sinon, afficher le guide visuel étape par étape (particulièrement pour iOS Safari)
    setShowGuideModal(true);
  };

  // Si standalone ou page d'impression, ne rien afficher
  if (isStandalone || isPrintPage) {
    return null;
  }

  // Déterminer la position verticale par rapport à la bottom nav bar mobile
  const isAppDashboard =
    pathname &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/activities") ||
      pathname.startsWith("/calendar") ||
      pathname.startsWith("/tasks") ||
      pathname.startsWith("/finances") ||
      pathname.startsWith("/clients") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/notifications") ||
      pathname.startsWith("/settings"));

  return (
    <>
      {/* 1. Bannière Flottante Discrète en Bas d'Écran */}
      {isVisible && (
        <aside
          aria-label="Invitation d'installation de l'application"
          className={`fixed z-40 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md transition-all duration-500 ease-out ${
            isAppDashboard ? "bottom-20 md:bottom-6" : "bottom-4 md:bottom-6"
          }`}
        >
          <div className="relative overflow-hidden rounded-2xl border border-ink-200/80 bg-canvas-raised/95 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-ink-950/5 dark:ring-white/10 transition-all hover:shadow-signal/10 hover:border-signal/40">
            {/* Décoration d'ambiance lumineuse discrète */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-signal/10 blur-2xl" />
            <div className="pointer-events-none absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-gold/10 blur-2xl" />

            {/* Bouton de fermeture (Croix X) */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Fermer la notification d'installation"
              className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700 active:scale-90 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-6">
              {/* Icône App Remind Me */}
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-1.5 shadow-md ring-1 ring-white/15">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="Remind Me"
                  width={36}
                  height={36}
                  className="rounded-lg object-contain"
                />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-signal ring-2 ring-canvas-raised">
                  <Sparkles className="h-2.5 w-2.5 text-white" />
                </span>
              </div>

              {/* Textes explicatifs clairs & chaleureux */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-ink-950 truncate tracking-tight">
                    Installer Remind Me
                  </h4>
                  <span className="rounded-full bg-signal-soft px-1.5 py-0.5 text-[9px] font-semibold text-signal uppercase tracking-wider">
                    Gratuit
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-600">
                  {isIOS
                    ? "Ajoutez Remind Me sur votre écran d'accueil iPhone/iPad pour un accès direct en 1 clic."
                    : "Installez l'application sur votre écran d'accueil pour une expérience rapide et fluide."}
                </p>

                {/* Boutons d'action */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-signal px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-signal-hover active:scale-95 transition-all"
                  >
                    {isIOS ? (
                      <>
                        <Share className="h-3.5 w-3.5" />
                        <span>Ajouter à l'écran</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        <span>Installer l'app</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition-colors"
                  >
                    Plus tard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Modal Interactif Guide d'Installation Pas-à-Pas (iOS Safari / Android / Desktop) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setShowGuideModal(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-canvas-raised border border-ink-200 shadow-2xl overflow-hidden z-10 animate-in slide-in-from-bottom-8 duration-300">
            {/* Header du Modal */}
            <div className="flex items-center justify-between border-b border-ink-100 p-5 bg-canvas">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-soft text-signal">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-950">
                    Installer sur votre écran d'accueil
                  </h3>
                  <p className="text-xs text-ink-500">
                    Accès rapide, affichage plein écran et alertes instantanées
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 active:scale-90 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sélecteur d'appareil (iOS / Android / Ordinateur) */}
            <div className="flex border-b border-ink-100 bg-ink-50/50 p-1.5 gap-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveGuideTab("ios")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
                  activeGuideTab === "ios"
                    ? "bg-canvas-raised text-signal font-bold shadow-xs border border-ink-200"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                iPhone / iPad
              </button>

              <button
                type="button"
                onClick={() => setActiveGuideTab("android")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
                  activeGuideTab === "android"
                    ? "bg-canvas-raised text-signal font-bold shadow-xs border border-ink-200"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Android
              </button>

              <button
                type="button"
                onClick={() => setActiveGuideTab("desktop")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
                  activeGuideTab === "desktop"
                    ? "bg-canvas-raised text-signal font-bold shadow-xs border border-ink-200"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                PC / Mac
              </button>
            </div>

            {/* Contenu étape par étape selon l'onglet actif */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {activeGuideTab === "ios" && (
                <div className="space-y-3.5">
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                    💡 <strong>Astuce Safari :</strong> Sur iPhone et iPad, l'installation se fait directement depuis le navigateur Safari en 3 petites étapes.
                  </div>

                  {/* Étape 1 iOS */}
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-canvas p-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-white text-xs font-bold">
                      1
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-ink-950 flex items-center gap-1.5">
                        Appuyez sur le bouton <strong>Partager</strong>{" "}
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-ink-100 text-ink-700">
                          <Share className="h-3.5 w-3.5" />
                        </span>
                      </p>
                      <p className="text-[11px] text-ink-600 leading-relaxed">
                        L'icône de partage se situe en bas au centre de votre écran Safari sur iPhone (ou en haut à droite sur iPad).
                      </p>
                    </div>
                  </div>

                  {/* Étape 2 iOS */}
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-canvas p-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-white text-xs font-bold">
                      2
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-ink-950 flex items-center gap-1.5">
                        Sélectionnez <strong>« Sur l'écran d'accueil »</strong>{" "}
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-ink-100 text-ink-700">
                          <PlusSquare className="h-3.5 w-3.5" />
                        </span>
                      </p>
                      <p className="text-[11px] text-ink-600 leading-relaxed">
                        Faites défiler le menu d'actions vers le bas jusqu'à trouver l'option avec un carré et un « + ».
                      </p>
                    </div>
                  </div>

                  {/* Étape 3 iOS */}
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-canvas p-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-white text-xs font-bold">
                      3
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-ink-950">
                        Touchez <strong>« Ajouter »</strong> en haut à droite
                      </p>
                      <p className="text-[11px] text-ink-600 leading-relaxed">
                        L'icône Remind Me s'affiche désormais sur votre écran d'accueil comme une application native.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeGuideTab === "android" && (
                <div className="space-y-3.5">
                  {deferredPrompt ? (
                    <div className="rounded-2xl border border-signal/20 bg-signal-soft/30 p-4 text-center space-y-3">
                      <p className="text-xs font-semibold text-ink-950">
                        Votre navigateur prend en charge l'installation directe en un clic !
                      </p>
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-signal-hover active:scale-95 transition-all"
                      >
                        <Download className="h-4 w-4" />
                        Installer directement l'application
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-canvas p-3.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-white text-xs font-bold">
                          1
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-ink-950">
                            Ouvrez le menu <strong>⋮</strong> (3 points)
                          </p>
                          <p className="text-[11px] text-ink-600">
                            Situé en haut à droite de Google Chrome, Brave ou Samsung Internet.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-canvas p-3.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-white text-xs font-bold">
                          2
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-ink-950">
                            Appuyez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>
                          </p>
                          <p className="text-[11px] text-ink-600">
                            Validez la boîte de dialogue pour créer le raccourci sur votre téléphone.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeGuideTab === "desktop" && (
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-canvas p-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-white text-xs font-bold">
                      1
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-ink-950">
                        Dans la barre d'adresse de Chrome ou Edge
                      </p>
                      <p className="text-[11px] text-ink-600">
                        Cliquez sur la petite icône d'écran ou de flèche d'installation située tout à droite de l'URL.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-canvas p-3.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-white text-xs font-bold">
                      2
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-ink-950">
                        Cliquez sur <strong>« Installer »</strong>
                      </p>
                      <p className="text-[11px] text-ink-600">
                        Remind Me s'ouvrira dans sa propre fenêtre indépendante sur votre bureau.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Avantages de l'application installée */}
              <div className="border-t border-ink-100 pt-3">
                <p className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">
                  Pourquoi installer Remind Me ?
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    <span>Lancement instantané</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    <span>Mode plein écran</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    <span>Notifications push fiables</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    <span>0 Mo d'espace requis</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer du Modal */}
            <div className="border-t border-ink-100 p-4 bg-canvas flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowGuideModal(false);
                  handleDismiss();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-signal text-white text-xs font-bold hover:bg-signal-hover active:scale-95 transition-all text-center"
              >
                C'est compris !
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
