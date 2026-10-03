"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Sparkles,
  Layers,
  Calendar,
  Wallet,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

interface VideoChapter {
  time: number;
  label: string;
  badge: string;
  icon: any;
}

const CHAPTERS: VideoChapter[] = [
  {
    time: 0,
    label: "Le Défi Multi-Activités",
    badge: "00:00",
    icon: Layers,
  },
  {
    time: 12,
    label: "Agenda Unifié & Zéro Conflit",
    badge: "00:12",
    icon: Calendar,
  },
  {
    time: 25,
    label: "Trésorerie & Encaissements",
    badge: "00:25",
    icon: Wallet,
  },
  {
    time: 38,
    label: "Rentabilité & Sérénité",
    badge: "00:38",
    icon: TrendingUp,
  },
];

export function LandingVideoShowcase() {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(45);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compte à rebours de 3 secondes avant démarrage automatique de la vidéo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Assurer le mode silencieux pour contourner la restriction de lecture automatique des navigateurs
    video.muted = true;
    setIsMuted(true);

    let remaining = 3;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        setCountdown(null);
        clearInterval(interval);
        // Lancer la lecture automatique après exactement 3 secondes
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              console.log("Lecture automatique en attente d'interaction:", err);
            });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Synchronisation des événements vidéo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setCountdown(null);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  // Gestion du plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    setCountdown(null);

    if (video.paused) {
      video.play().catch((err) => console.error(err));
    } else {
      video.pause();
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
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const jumpToChapter = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    setCountdown(null);
    video.currentTime = time;
    setCurrentTime(time);
    if (video.paused) {
      video.play().catch((err) => console.error(err));
    }
  };

  const restartVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    setCountdown(null);
    video.currentTime = 0;
    setCurrentTime(0);
    video.play().catch((err) => console.error(err));
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch((err) => console.error(err));
    } else {
      document.exitFullscreen?.().catch((err) => console.error(err));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Déterminer le chapitre actif
  const currentChapter: VideoChapter = (CHAPTERS.slice().reverse().find((chap) => currentTime >= chap.time) || CHAPTERS[0]) as VideoChapter;

  return (
    <section id="motion-design" className="pt-2 pb-20 lg:pb-28 relative overflow-hidden bg-canvas">
      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[1000px] h-[550px] bg-gradient-to-tr from-signal/20 via-gold/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cadre Cockpit Vidéo Premium */}
        <div
          ref={containerRef}
          onMouseMove={() => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => {
              if (isPlaying) setShowControls(false);
            }, 3000);
          }}
          onMouseLeave={() => {
            if (isPlaying) setShowControls(false);
          }}
          className="relative group rounded-3xl overflow-hidden bg-ink-950 border border-ink-800 shadow-2xl transition-all duration-300 ring-1 ring-white/10"
        >
          {/* Barre supérieure style application / Mac OS */}
          <div className="bg-ink-900/90 border-b border-white/10 px-4 py-2.5 flex items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              </div>
              <span className="text-[11px] font-mono text-ink-400 ml-2 hidden sm:inline-block">
                remindme.io • motion-design-officiel.mp4
              </span>
            </div>

            <div className="flex items-center gap-2">
              {countdown !== null ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-signal-soft text-signal border border-signal/20 animate-pulse">
                  <Clock className="w-3 h-3" />
                  <span>Démarrage auto dans {countdown}s...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-positive-soft text-positive border border-positive/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                  <span>{isPlaying ? "En lecture" : "En pause"}</span>
                </span>
              )}

              <span className="hidden md:inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-white">
                45 SECONDES • 16:9
              </span>
            </div>
          </div>

          {/* Lecteur Vidéo */}
          <div className="relative aspect-video w-full flex items-center justify-center bg-black cursor-pointer select-none" onClick={togglePlay}>
            <video
              ref={videoRef}
              playsInline
              muted={isMuted}
              loop
              autoPlay
              preload="auto"
              className="w-full h-full object-contain bg-black"
            >
              <source src="/remindme-intro.mp4" type="video/mp4" />
              Votre navigateur ne prend pas en charge la lecture de vidéos HTML5.
            </video>

            {/* Bouton Play central si la vidéo est en pause */}
            {!isPlaying && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-signal text-white flex items-center justify-center shadow-xl shadow-signal/40 hover:scale-105 active:scale-95 transition-transform cursor-pointer ring-4 ring-white/30"
                  aria-label="Lire la vidéo"
                >
                  <Play className="w-9 h-9 sm:w-11 sm:h-11 ml-1 fill-white" />
                </button>
                {countdown !== null && (
                  <p className="mt-3 text-xs sm:text-sm font-semibold text-white/90 drop-shadow">
                    Lancement automatique dans {countdown}s
                  </p>
                )}
              </div>
            )}

            {/* Bannière flottante pour activer le son en 1 clic */}
            {isMuted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="absolute top-4 right-4 z-25 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-signal hover:bg-signal-dark text-white text-xs font-bold backdrop-blur-md border border-white/20 shadow-xl cursor-pointer transition-all hover:scale-105 animate-bounce"
              >
                <VolumeX className="w-4 h-4" />
                <span>Activer le son 🔊</span>
              </button>
            )}
          </div>

          {/* Barre de contrôles personnalisée */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-5 bg-gradient-to-t from-black via-black/85 to-transparent transition-opacity duration-300 ${
              showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Scrubber Timeline */}
            <div className="relative mb-3 flex items-center group/scrubber">
              <input
                type="range"
                min={0}
                max={duration || 45}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 sm:h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-signal hover:h-2.5 transition-all"
              />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 sm:h-2 bg-gradient-to-r from-signal to-gold rounded-lg pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Boutons d'actions */}
            <div className="flex items-center justify-between text-white text-xs sm:text-sm font-medium">
              <div className="flex items-center gap-2.5 sm:gap-3.5">
                {/* Play / Pause */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title={isPlaying ? "Mettre en pause" : "Lire"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />}
                </button>

                {/* Restart */}
                <button
                  type="button"
                  onClick={restartVideo}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Recommencer"
                >
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title={isMuted ? "Activer le son" : "Couper le son"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-signal" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>

                {/* Timestamp */}
                <span className="font-mono text-xs sm:text-sm text-ink-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Titre du chapitre en cours & Plein écran */}
              <div className="flex items-center gap-3">
                {currentChapter && (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-white text-xs font-bold backdrop-blur-sm border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                    {currentChapter.label}
                  </span>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                >
                  <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Chapitres Cliquables Directs */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {CHAPTERS.map((chap) => {
            const Icon = chap.icon;
            const isChapterActive = currentChapter.time === chap.time;

            return (
              <button
                key={chap.time}
                type="button"
                onClick={() => jumpToChapter(chap.time)}
                className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isChapterActive
                    ? "bg-canvas-raised border-signal shadow-md ring-1 ring-signal/30 -translate-y-0.5"
                    : "bg-canvas-raised/60 border-ink-200 hover:border-ink-300 hover:bg-canvas-raised"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isChapterActive ? "bg-signal text-white shadow-xs" : "bg-ink-100 text-ink-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span
                    className={`inline-block text-[10px] font-extrabold uppercase tracking-wider ${
                      isChapterActive ? "text-signal" : "text-ink-500"
                    }`}
                  >
                    {chap.badge}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-ink-950 truncate leading-snug">
                    {chap.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
