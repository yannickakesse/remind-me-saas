"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, Sparkles, ArrowRight } from "lucide-react";
import { stopVoiceReminder } from "@/lib/voice";
import { unlockVoiceAudio } from "@/lib/voice/tts";
import {
  INTRO_VIDEO_CLOSED_EVENT,
  MOTION_MODAL_KEY as STORAGE_KEY,
  isIntroVideoDue,
} from "@/lib/onboarding/welcome-sequence";


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

    if (isIntroVideoDue()) {
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

  // Déverrouillage automatique du son au premier geste utilisateur.
  // Seuls click / touchend / keydown comptent comme « activation » pour les
  // navigateurs mobiles (iOS, Android) : touchstart et pointerdown ne suffisent pas.
  const enableSoundOnGesture = useCallback((e: Event) => {
    // Un appui sur le bouton son est géré par toggleMute
    if ((e.target as HTMLElement | null)?.closest?.("[data-sound-toggle]")) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video
      .play()
      .then(() => {
        setIsMuted(false);
        setIsPlaying(true);
        unlockVoiceAudio();
        removeGestureListeners();
      })
      .catch(() => {
        // Toujours refusé : rester en muet et réessayer au geste suivant
        video.muted = true;
        setIsMuted(true);
      });
  }, []);

  const removeGestureListeners = useCallback(() => {
    if (typeof window === "undefined" || !gestureListenerAttachedRef.current) return;
    window.removeEventListener("click", enableSoundOnGesture, true);
    window.removeEventListener("touchend", enableSoundOnGesture, true);
    window.removeEventListener("keydown", enableSoundOnGesture, true);
    gestureListenerAttachedRef.current = false;
  }, [enableSoundOnGesture]);

  const attachGestureListeners = useCallback(() => {
    if (typeof window === "undefined" || gestureListenerAttachedRef.current) return;
    window.addEventListener("click", enableSoundOnGesture, true);
    window.addEventListener("touchend", enableSoundOnGesture, true);
    window.addEventListener("keydown", enableSoundOnGesture, true);
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
      window.dispatchEvent(new CustomEvent(INTRO_VIDEO_CLOSED_EVENT));
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
      <div className="relative w-full max-w-2xl bg-canvas-raised border-2 border-signal rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Header du Pop-up */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-signal/30 bg-canvas-raised">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-signal text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-ink-950 dark:text-white">
                Découvrez Remind Me en 45 secondes
              </h3>
              <p className="text-[10px] text-ink-500 dark:text-ink-400">Présentation officielle du SaaS</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer la vidéo"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-500 hover:text-ink-950 dark:hover:text-white hover:bg-signal/10 active:scale-95 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cadre vidéo 16:9 */}
        <div className="relative aspect-video w-full bg-canvas cursor-pointer group" onClick={togglePlay}>
          <video
            ref={videoRef}
            playsInline
            preload="auto"
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain bg-canvas"
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
              data-sound-toggle
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
              data-sound-toggle
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
        <div className="flex items-center justify-between p-4 bg-canvas-raised border-t border-signal/30">
          <p className="text-[11px] text-ink-500 dark:text-ink-400 hidden sm:block">
            Cette présentation réapparaîtra tous les 2 à 3 jours.
          </p>

          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl bg-signal hover:bg-signal-dark active:scale-95 text-white text-xs font-black shadow-md transition-all cursor-pointer"
            aria-label="Passer la présentation"
          >
            <span>Passer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
