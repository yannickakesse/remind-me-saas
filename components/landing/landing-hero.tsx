"use client";


import { useLanguage } from "@/components/i18n/language-provider";
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
  const { tr } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(45);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Horodatage du geste qui a activé le son : évite que ce même toucher mette la vidéo en pause
  const soundUnlockedAtRef = useRef(0);

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

    // Le navigateur impose un démarrage muet : le son s'active dès le premier
    // toucher / clic n'importe où sur la page (click, touchend et keydown sont
    // les seuls gestes acceptés par les navigateurs mobiles pour autoriser le son).
    const gestureEvents = ["click", "touchend", "keydown"] as const;
    const removeGestureListeners = () =>
      gestureEvents.forEach((type) => window.removeEventListener(type, enableSoundOnGesture, true));
    function enableSoundOnGesture(e: Event) {
      // Un appui sur un bouton son est géré par toggleMute
      if ((e.target as HTMLElement | null)?.closest?.("[data-sound-toggle]")) {
        removeGestureListeners();
        return;
      }
      if (!video) return;
      video.muted = false;
      video
        .play()
        .then(() => {
          soundUnlockedAtRef.current = Date.now();
          setIsMuted(false);
          setIsPlaying(true);
          removeGestureListeners();
        })
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
        });
    }
    gestureEvents.forEach((type) => window.addEventListener(type, enableSoundOnGesture, true));

    // Lecture automatique (muette) garantie : relancée dès que la vidéo est visible
    // et au premier défilement / toucher (mode économie d'énergie iOS, onglet en arrière-plan…)
    const ensurePlaying = () => {
      if (video.paused && !video.ended) {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };
    const kickEvents = ["scroll", "touchstart", "pointerdown"] as const;
    const onFirstKick = () => {
      ensurePlaying();
      kickEvents.forEach((type) => window.removeEventListener(type, onFirstKick));
    };
    kickEvents.forEach((type) => window.addEventListener(type, onFirstKick, { passive: true }));
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) ensurePlaying();
      },
      { threshold: 0.35 }
    );
    observer.observe(video);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);

    return () => {
      removeGestureListeners();
      kickEvents.forEach((type) => window.removeEventListener(type, onFirstKick));
      observer.disconnect();
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    // Le toucher qui vient d'activer le son ne doit pas aussi mettre en pause
    if (Date.now() - soundUnlockedAtRef.current < 800) return;

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
            <span>{tr("Votre organisation en toute clarté.")}</span>
          </div>
        </div>

        {/* Titre principal centré fidèle à l'image */}
        <div className="text-center max-w-4xl mx-auto mt-8 sm:mt-0 mb-4 sm:mb-8">
          {/* Mobile : taille fluide calée sur la ligne la plus longue (~11,75em)
              pour conserver exactement 3 lignes en pyramide inversée. */}
          <h1 className="text-[clamp(1.5rem,calc((100vw_-_2rem)/11.85),3rem)] whitespace-nowrap sm:whitespace-normal sm:text-5xl md:text-6xl lg:text-[68px] font-black tracking-tight text-ink-950 dark:text-white leading-[1.08] font-sans">
            <span className="block">{tr("Gérez votre travail, votre")}</span>
            <span className="block">{tr("temps et votre argent.")}</span>
            <span className="block">{tr("En parfait contrôle.")}</span>
          </h1>
        </div>

        {/* Paragraphe descriptif avec accent discret */}
        <div className="flex flex-col items-center mb-8 sm:mb-10">
          {/* Accent décoratif conservé uniquement à partir de sm (retiré sur mobile) */}
          <div className="hidden sm:block w-2.5 h-2.5 bg-amber-500 mb-6 rounded-xs" />
          <p className="text-[17px] sm:text-lg md:text-xl text-ink-700 dark:text-ink-300 max-w-2xl sm:max-w-3xl mx-auto text-center leading-relaxed font-normal">
            {tr("Un espace intelligent pour organiser vos activités, maîtriser vos échéances, détecter les conflits d'agenda et garder une vision limpide de vos finances. Sans éparpillement.")}</p>
        </div>

        {/* Bouton d'action principal unique fidèle à l'image */}
        <div className="flex justify-center mb-12 sm:mb-16">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 sm:px-9 sm:py-4 rounded-full bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold text-base sm:text-lg shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 transition-all duration-150 active:scale-[0.98] group cursor-pointer"
          >
            <span>{tr("Commencer gratuitement")}</span>
            <span className="font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* SECTION 2 — Vidéo motion design : Élément central de présentation */}
        <div className="max-w-4xl mx-auto">
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            className="relative rounded-2xl sm:rounded-3xl border border-ink-200/90 dark:border-ink-800 bg-white shadow-2xl shadow-ink-950/15 overflow-hidden group select-none"
          >
            {/* Conteneur vidéo au ratio 16:9 */}
            <div
              className="relative aspect-video w-full flex items-center justify-center bg-white cursor-pointer"
              onClick={togglePlay}
            >
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted={isMuted}
                loop
                preload="metadata"
                className="w-full h-full object-contain bg-white"
                poster="/brand/hero-reference.jpg"
              >
                <source src="/remindme-intro.mp4" type="video/mp4" />
                {tr("Votre navigateur ne prend pas en charge la lecture de vidéos HTML5.")}</video>

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
                    aria-label={tr("Lire la vidéo")}
                  >
                    <Play className="w-8 h-8 sm:w-9 sm:h-9 ml-1 fill-white" />
                  </button>
                  <span className="mt-3.5 text-xs sm:text-sm font-medium text-white/90 drop-shadow">
                    {tr("Découvrir Remind Me en 45 secondes")}</span>
                </div>
              )}

              {/* Indicateur sonore clairement accessible */}
              <button
                type="button"
                data-sound-toggle
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className={`absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-25 inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-semibold backdrop-blur-md border shadow-lg cursor-pointer transition-all duration-200 ${
                  isMuted
                    ? "bg-slate-950/80 hover:bg-slate-950 text-white border-white/20"
                    : "bg-signal text-white border-white/30"
                }`}
                aria-label={isMuted ? tr("Activer le son") : tr("Couper le son")}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                    <span>{tr("Activer le son")}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                    <span>{tr("Son activé")}</span>
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
                  aria-label={tr("Position de lecture")}
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
                    title={tr("Recommencer")}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    data-sound-toggle
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label={isMuted ? tr("Activer le son") : tr("Couper le son")}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <span className="font-mono text-[11px] text-white/80">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[11px] text-white/60 font-medium">
                    {tr("Remind Me Motion Preview")}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title={tr("Plein écran")}
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
