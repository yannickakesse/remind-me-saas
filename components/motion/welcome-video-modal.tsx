"use client";

import { useState, useRef, useEffect } from "react";
import { X, Play, Pause, Volume2, VolumeX, Sparkles, ArrowRight } from "lucide-react";

const STORAGE_KEY = "remindme_motion_popup_last_shown";
const COOLDOWN_MS = 2.5 * 24 * 60 * 60 * 1000; // 2.5 jours (~60h)

export function WelcomeVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
      // Petite pause d'accueil (700ms) avant d'afficher le pop-up centré
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Lancement automatique de la vidéo après 1.5 seconde
  useEffect(() => {
    if (!isOpen) return;

    const video = videoRef.current;
    if (!video) return;

    const timer = setTimeout(() => {
      // Essayer de lire avec son en premier
      video.muted = false;
      setIsMuted(false);

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            // Si la politique du navigateur bloque l'audio sans geste utilisateur, démarrer en muet avec bannière pour activer le son
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => {
              setIsPlaying(true);
            }).catch((err) => {
              console.log("Auto-play blocked:", err);
            });
          });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
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
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 select-none"
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
            loop
            preload="auto"
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
              className="flex items-center gap-1 hover:text-signal transition-colors"
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
              className="flex items-center gap-1 hover:text-signal transition-colors"
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
          >
            <span>Passer l&apos;intro</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
