"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, Sparkles, ArrowRight } from "lucide-react";
import { stopVoiceReminder } from "@/lib/voice";
import { unlockVoiceAudio } from "@/lib/voice/tts";

const STORAGE_KEY = "remindme_motion_popup_last_shown";
const COOLDOWN_MS = 2.5 * 24 * 60 * 60 * 1000; // 2.5 jours (~60h)

export function WelcomeVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasStartedRef = useRef(false);
  const gestureListenerAttachedRef = useRef(false);

  // Vérification de la fréquence d'affichage à l'ouverture
  useEffect(() => {
    if (typeof window === "undefined") return;

    const lastShownStr = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    let shouldShow = false;
    if (!lastShownStr) {
      shouldShow = true;
    } else {
      const lastShown = parseInt(lastShownStr, 10);
      if (isNaN(lastShown) || now - lastShown > COOLDOWN_MS) {
        shouldShow = true;
      }
    }

    if (shouldShow) {
      // Pause ergonomique de 500ms avant d'afficher le pop-up centré
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Écoute des demandes manuelles de réouverture (Centre d'aide, Paramètres)
  useEffect(() => {
    function handleOpenManual() {
      hasStartedRef.current = false;
      setIsOpen(true);
    }
    window.addEventListener("remindme:open-intro-video", handleOpenManual);
    return () => window.removeEventListener("remindme:open-intro-video", handleOpenManual);
  }, []);

  // Déverrouillage automatique du son au premier geste utilisateur
  const enableSoundOnGesture = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      try {
        video.muted = false;
        setIsMuted(false);
        unlockVoiceAudio();
      } catch {}
    }
    removeGestureListeners();
  }, []);

  const removeGestureListeners = useCallback(() => {
    if (typeof window === "undefined" || !gestureListenerAttachedRef.current) return;
    window.removeEventListener("pointerdown", enableSoundOnGesture, true);
    window.removeEventListener("touchstart", enableSoundOnGesture, true);
    window.removeEventListener("keydown", enableSoundOnGesture, true);
    gestureListenerAttachedRef.current = false;
  }, [enableSoundOnGesture]);

  const attachGestureListeners = useCallback(() => {
    if (typeof window === "undefined" || gestureListenerAttachedRef.current) return;
    window.addEventListener("pointerdown", enableSoundOnGesture, { capture: true, once: true });
    window.addEventListener("touchstart", enableSoundOnGesture, { capture: true, once: true });
    window.addEventListener("keydown", enableSoundOnGesture, { capture: true, once: true });
    gestureListenerAttachedRef.current = true;
  }, [enableSoundOnGesture]);

  // Fermeture et arrêt complet de la vidéo
  const handleClose = useCallback(() => {
    setIsOpen(false);
    removeGestureListeners();

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      (window as any).__REMINDME_VIDEO_PLAYING = false;
      window.dispatchEvent(new CustomEvent("remindme:video-closed"));
    }

    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
        video.currentTime = 0;
      } catch {}
    }
  }, [removeGestureListeners]);

  // Support touche Échap
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Lancement automatique et robuste de la vidéo dès l'ouverture du modal
  useEffect(() => {
    if (!isOpen) return;

    // 1. Couper toute synthèse vocale ou rappel en cours pour éviter toute interférence
    stopVoiceReminder(false);
    if (typeof window !== "undefined") {
      (window as any).__REMINDME_VIDEO_PLAYING = true;
      window.dispatchEvent(new CustomEvent("remindme:video-active"));
    }

    const video = videoRef.current;
    if (!video || hasStartedRef.current) return;

    const timer = setTimeout(() => {
      hasStartedRef.current = true;

      // Tenter d'abord la lecture avec le son activé
      video.muted = false;
      setIsMuted(false);

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsMuted(false);
          })
          .catch(() => {
            // Politique autoplay stricte du navigateur : démarrer en muet et écouter le premier geste
            video.muted = true;
            setIsMuted(true);
            video
              .play()
              .then(() => {
                setIsPlaying(true);
                // Rétablir le son dès la première interaction autorisée de l'utilisateur
                attachGestureListeners();
              })
              .catch((err) => {
                console.debug("[WelcomeVideoModal] Autoplay muet également bloqué:", err);
                setIsPlaying(false);
              });
          });
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      removeGestureListeners();
      if (typeof window !== "undefined") {
        (window as any).__REMINDME_VIDEO_PLAYING = false;
      }
    };
  }, [isOpen, attachGestureListeners, removeGestureListeners]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (typeof window !== "undefined") {
      (window as any).__REMINDME_VIDEO_PLAYING = false;
      window.dispatchEvent(new CustomEvent("remindme:video-closed"));
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          stopVoiceReminder(false);
        })
        .catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
    if (!video.muted) {
      unlockVoiceAudio();
      removeGestureListeners();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Présentation Remind Me"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Header du Pop-up */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-zinc-900/90 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-signal text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white">
                Découvrez Remind Me en 45 secondes
              </h3>
              <p className="text-[10px] text-zinc-400">Présentation officielle du SaaS</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer la vidéo"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cadre vidéo 16:9 */}
        <div className="relative aspect-video w-full bg-black cursor-pointer group" onClick={togglePlay}>
          <video
            ref={videoRef}
            playsInline
            preload="auto"
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain bg-black"
          >
            <source src="/remindme-intro.mp4" type="video/mp4" />
          </video>

          {/* Bouton Play si en pause */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-signal text-white flex items-center justify-center shadow-xl shadow-signal/40 group-hover:scale-105 transition-transform">
                <Play className="h-8 w-8 ml-1 fill-white" />
              </div>
            </div>
          )}

          {/* Bouton pour activer le son si muet */}
          {isMuted && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-signal hover:bg-signal-dark text-white text-xs font-bold shadow-lg cursor-pointer transition-all hover:scale-105 animate-bounce"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Activer le son 🔊</span>
            </button>
          )}

          {/* Contrôle rapide son & pause en bas de vidéo */}
          <div className="absolute bottom-2 left-3 right-3 z-20 flex items-center justify-between text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-sm">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="flex items-center gap-1 hover:text-signal transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? "Pause" : "Lecture"}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="flex items-center gap-1 hover:text-signal transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isMuted ? "Son coupé" : "Son activé"}</span>
            </button>
          </div>
        </div>

        {/* Footer avec bouton Passer (Skip) */}
        <div className="flex items-center justify-between p-4 bg-zinc-900/90 border-t border-white/10">
          <p className="text-[11px] text-zinc-400 hidden sm:block">
            Cette présentation réapparaîtra tous les 2 à 3 jours.
          </p>

          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl bg-signal hover:bg-signal-dark active:scale-95 text-white text-xs font-black shadow-md transition-all cursor-pointer"
            aria-label="Passer l'introduction et continuer"
          >
            <span>Passer l&apos;intro</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
