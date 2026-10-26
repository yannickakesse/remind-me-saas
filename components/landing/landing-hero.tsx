"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
} from "lucide-react";

export function LandingHero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(45);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    setIsMuted(true);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }

    const onTimeUpdate = () => {
      if (video) setCurrentTime(video.currentTime);
    };

    const onLoadedMetadata = () => {
      if (video && video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const onEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const restartVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <section className="relative pt-28 sm:pt-36 lg:pt-42 pb-16 sm:pb-24 overflow-hidden bg-canvas">
      {/* Lueur d'ambiance signature or/ambre historique */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[950px] h-[500px] bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Accroche supérieure */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-canvas-raised border border-ink-200/80 dark:border-ink-800 shadow-xs text-xs font-semibold text-ink-900 dark:text-ink-100">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Votre organisation en toute clarté.</span>
          </div>
        </div>

        {/* Titre principal centré fidèle à l'image */}
        <div className="text-center max-w-4xl mx-auto mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-black tracking-tight text-ink-950 dark:text-white leading-[1.08] font-sans">
            <span className="block">Gérez votre travail, votre</span>
            <span className="block">temps et votre argent.</span>
            <span className="block">En parfait contrôle.</span>
          </h1>
        </div>

        {/* Paragraphe descriptif avec accent discret */}
        <div className="flex flex-col items-center mb-8 sm:mb-10">
          <div className="w-2.5 h-2.5 bg-amber-500 mb-6 rounded-xs" />
          <p className="text-base sm:text-lg md:text-xl text-ink-700 dark:text-ink-300 max-w-2xl sm:max-w-3xl mx-auto text-center leading-relaxed font-normal">
            Un espace intelligent pour organiser vos activités, maîtriser vos échéances,
            détecter les conflits d&apos;agenda et garder une vision limpide de vos finances.
            Sans éparpillement.
          </p>
        </div>

        {/* Bouton d'action principal unique fidèle à l'image */}
        <div className="flex justify-center mb-12 sm:mb-16">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 sm:px-9 sm:py-4 rounded-full bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold text-base sm:text-lg shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 transition-all duration-150 active:scale-[0.98] group cursor-pointer"
          >
            <span>Commencer gratuitement</span>
            <span className="font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* SECTION 2 — Vidéo motion design : Élément central de présentation */}
        <div className="max-w-4xl mx-auto">
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            className="relative rounded-2xl sm:rounded-3xl border border-ink-200/90 dark:border-ink-800 bg-black shadow-2xl shadow-ink-950/15 overflow-hidden group select-none"
          >
            {/* Conteneur vidéo au ratio 16:9 */}
            <div
              className="relative aspect-video w-full flex items-center justify-center bg-black cursor-pointer"
              onClick={togglePlay}
            >
              <video
                ref={videoRef}
                playsInline
                muted={isMuted}
                loop
                preload="metadata"
                className="w-full h-full object-contain bg-black"
                poster="/brand/hero-reference.jpg"
              >
                <source src="/remindme-intro.mp4" type="video/mp4" />
                Votre navigateur ne prend pas en charge la lecture de vidéos HTML5.
              </video>

              {/* Bouton de lecture central visible si en pause */}
              {!isPlaying && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-signal text-white flex items-center justify-center shadow-xl shadow-signal/40 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-white/30"
                    aria-label="Lire la vidéo"
                  >
                    <Play className="w-8 h-8 sm:w-9 sm:h-9 ml-1 fill-white" />
                  </button>
                  <span className="mt-3.5 text-xs sm:text-sm font-medium text-white/90 drop-shadow">
                    Découvrir Remind Me en 45 secondes
                  </span>
                </div>
              )}

              {/* Indicateur sonore clairement accessible */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className={`absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-25 inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-semibold backdrop-blur-md border shadow-lg cursor-pointer transition-all duration-200 ${
                  isMuted
                    ? "bg-slate-950/80 hover:bg-slate-950 text-white border-white/20"
                    : "bg-signal text-white border-white/30"
                }`}
                aria-label={isMuted ? "Activer le son" : "Couper le son"}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                    <span>Activer le son</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                    <span>Son activé</span>
                  </>
                )}
              </button>
            </div>

            {/* Barre de contrôles soignée */}
            <div
              className={`absolute bottom-0 left-0 right-0 z-30 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${
                showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
            >
              {/* Timeline scrubber */}
              <div className="relative mb-2.5 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 45}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-1 sm:h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:h-2 transition-all"
                  aria-label="Position de lecture"
                />
              </div>

              {/* Boutons de contrôles */}
              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label={isPlaying ? "Pause" : "Lecture"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      restartVideo();
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Recommencer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label={isMuted ? "Activer le son" : "Couper le son"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <span className="font-mono text-[11px] text-white/80">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[11px] text-white/60 font-medium">
                    Remind Me Motion Preview
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Plein écran"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
