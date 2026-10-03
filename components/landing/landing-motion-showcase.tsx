"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Volume2,
  Bell,
  Calendar,
  Wallet,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers,
  BarChart3,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

interface MotionScene {
  id: string;
  badge: string;
  title: string;
  description: string;
  icon: any;
  durationMs: number;
}

const SCENES: MotionScene[] = [
  {
    id: "planning",
    badge: "01. Planification Intelligente",
    title: "Détection & Résolution de Conflits à 0 ms",
    description: "Vos 4 activités s'alignent automatiquement. Remind Me prévient tout chevauchement d'agenda en temps réel.",
    icon: Calendar,
    durationMs: 6500,
  },
  {
    id: "finances",
    badge: "02. Trésorerie & Encaissements",
    title: "Suivi des Paiements & Solde Net en Direct",
    description: "Encaissez vos prestations en 1 clic. Vos revenus attendus se transforment instantanément en trésorerie disponible.",
    icon: Wallet,
    durationMs: 6500,
  },
  {
    id: "voice",
    badge: "03. Rappels Vocaux IA",
    title: "Notifications Push & Alertes Vocales",
    description: "Ne ratez plus jamais une facture ou un rendez-vous grâce aux alertes prédictives vocales et multi-canaux.",
    icon: Volume2,
    durationMs: 6500,
  },
  {
    id: "analytics",
    badge: "04. Rentabilité Horaire",
    title: "Courbes & Analytics de Performance Réelle",
    description: "Visualisez d'un coup d'œil vos revenus vs dépenses et votre taux horaire réel sur l'ensemble de vos projets.",
    icon: BarChart3,
    durationMs: 6500,
  },
];

export function LandingMotionShowcase() {
  const { t } = useLanguage();
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isConflictResolved, setIsConflictResolved] = useState(false);
  const [isPaymentCollected, setIsPaymentCollected] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const currentScene: MotionScene = (SCENES[activeSceneIndex] || SCENES[0]) as MotionScene;

  // Gestion de la boucle automatique du Motion Design
  useEffect(() => {
    if (!isPlaying || !currentScene) return;

    const intervalStep = 50; // ms
    const duration = currentScene.durationMs || 6000;
    const totalSteps = duration / intervalStep;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Passer à la scène suivante
          setActiveSceneIndex((idx) => (idx + 1) % SCENES.length);
          // Réinitialiser les états interactifs contextuels
          setIsConflictResolved(false);
          setIsPaymentCollected(false);
          setIsVoicePlaying(false);
          return 0;
        }
        return prev + 100 / totalSteps;
      });
    }, intervalStep);

    return () => clearInterval(timer);
  }, [isPlaying, currentScene, activeSceneIndex]);

  // Jouer une tonalité audio futuriste de rappel vocal (Web Audio API)
  function playVoiceReminderBeep() {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      setIsVoicePlaying(true);

      // Accord harmonique doux (Son Remind Me)
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.08, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.7);
      });

      // Synthèse vocale browser native
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          "Rappel Remind Me : Facture client Famille M de 50 000 FCFA arrive à échéance aujourd'hui."
        );
        utterance.lang = "fr-FR";
        utterance.rate = 1.05;
        utterance.onend = () => setIsVoicePlaying(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setIsVoicePlaying(false), 2500);
      }
    } catch (e) {
      console.warn("Audio not allowed yet:", e);
      setIsVoicePlaying(false);
    }
  }

  function handleSelectScene(index: number) {
    setActiveSceneIndex(index);
    setProgress(0);
    setIsConflictResolved(false);
    setIsPaymentCollected(false);
    setIsVoicePlaying(false);
  }

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background Glow & Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-signal/15 via-gold/10 to-positive/10 blur-3xl pointer-events-none -z-10 rounded-full" />

      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-signal-soft/80 border border-signal/30 text-signal font-extrabold text-xs uppercase tracking-wider mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          Motion Design &amp; Démo Interactive
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-ink-950 tracking-tight">
          Voyez Remind Me <span className="bg-gradient-to-r from-signal via-gold to-gold-dark bg-clip-text text-transparent">en action</span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-ink-600 max-w-2xl mx-auto">
          Une expérience fluide, conçue pour synchroniser vos activités multiples, sécuriser vos encaissements et vous alerter au bon moment.
        </p>
      </div>

      {/* Main Interactive Motion Design Container */}
      <div className="rounded-3xl border border-ink-200/90 bg-canvas-raised/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all">
        {/* Top Control Bar */}
        <div className="p-4 sm:p-5 border-b border-ink-100 bg-canvas/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Navigation des 4 Scènes */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {SCENES.map((scene, idx) => {
              const isCurrent = activeSceneIndex === idx;
              const Icon = scene.icon;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => handleSelectScene(idx)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? "bg-signal text-white shadow-xs scale-[1.02]"
                      : "bg-canvas-raised border border-ink-200 text-ink-700 hover:bg-ink-100 hover:text-ink-950"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{scene.badge.split(". ")[1] || scene.badge}</span>
                </button>
              );
            })}
          </div>

          {/* Boutons de Contrôle Play/Pause & Reset */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-200 bg-canvas-raised text-xs font-semibold text-ink-800 hover:bg-ink-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-signal" /> : <Play className="w-3.5 h-3.5 text-positive" />}
              <span>{isPlaying ? "Pause" : "Lecture auto"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProgress(0);
                setIsConflictResolved(false);
                setIsPaymentCollected(false);
                setIsVoicePlaying(false);
              }}
              title="Rejouer cette étape"
              className="p-1.5 rounded-xl border border-ink-200 bg-canvas-raised text-ink-600 hover:text-ink-950 hover:bg-ink-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar of the Current Motion Scene */}
        <div className="w-full h-1 bg-ink-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-signal to-gold transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dynamic Motion Stage */}
        <div className="p-6 sm:p-10 lg:p-12 min-h-[460px] flex flex-col justify-between">
          {/* Scene Header */}
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold bg-signal-soft text-signal mb-2">
              {currentScene.badge}
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
              {currentScene.title}
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-ink-600 leading-relaxed">
              {currentScene.description}
            </p>
          </div>

          {/* Animated Visual Canvas depending on scene */}
          <div className="my-8 relative min-h-[260px] flex items-center justify-center">
            {/* ============================================================
                SCENE 1: CALENDRIER & RÉSOLUTION AUTOMATIQUE DE CONFLIT
                ============================================================ */}
            {activeSceneIndex === 0 && (
              <div className="w-full max-w-2xl bg-canvas border border-ink-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-signal animate-pulse" />
                    <span className="text-xs font-bold text-ink-950">Mardi 14 Octobre 2026 — Emploi du temps synchronisé</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-positive-soft text-positive border border-positive/30">
                    {isConflictResolved ? "0 Conflit détecté" : "Analyse des plannings en cours"}
                  </span>
                </div>

                {/* Timeline Cards with Motion shift */}
                <div className="space-y-2.5">
                  {/* Activité 1 : Salariat */}
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between transition-transform duration-500 hover:scale-[1.01]">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs">
                        09:00 - 13:00
                      </span>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-blue-950">Contrat Salarié — Tech Lead</div>
                        <div className="text-[10px] text-blue-700">Société Alpha • Présentiel</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-950">Fixe</span>
                  </div>

                  {/* Activité 2 : Conflit initial puis réorganisation fluide */}
                  <div
                    className={`p-3.5 rounded-2xl transition-all duration-500 flex items-center justify-between ${
                      isConflictResolved
                        ? "bg-emerald-50 border border-emerald-200 translate-x-0"
                        : "bg-amber-50 border border-amber-300 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold text-white transition-colors duration-300 shadow-xs ${
                          isConflictResolved ? "bg-emerald-600" : "bg-amber-600"
                        }`}
                      >
                        {isConflictResolved ? "14:30 - 16:30" : "12:30 - 14:30 (Chevauchement)"}
                      </span>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-ink-950">Coaching SpeakPro — Mission Freelance</div>
                        <div className="text-[10px] text-ink-500">
                          {isConflictResolved ? "Créneau optimisé automatiquement" : "Conflit potentiel détecté avec le repas d'équipe"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsConflictResolved(!isConflictResolved)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1 ${
                        isConflictResolved
                          ? "bg-positive text-white"
                          : "bg-signal text-white hover:bg-signal/90 animate-bounce"
                      }`}
                    >
                      {isConflictResolved ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Résolu
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" /> Réaligner
                        </>
                      )}
                    </button>
                  </div>

                  {/* Activité 3 : Prestation Client */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-xs">
                        17:00 - 19:00
                      </span>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-ink-950">Suivis Personnalisés — Famille O.</div>
                        <div className="text-[10px] text-ink-500">Consulting • Facturation horaire</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-700">35 000 XOF</span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================
                SCENE 2: FINANCES & ENCAISSEMENT INSTANTANÉ (0ms)
                ============================================================ */}
            {activeSceneIndex === 1 && (
              <div className="w-full max-w-2xl bg-canvas border border-ink-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
                {/* 3 Cartes KPI Live */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-canvas-raised border border-ink-200">
                    <span className="text-[10px] font-semibold text-ink-500 uppercase">En attente</span>
                    <div className="text-sm sm:text-base font-extrabold text-amber-600 mt-1 transition-all">
                      {isPaymentCollected ? "85 000 XOF" : "185 000 XOF"}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-canvas-raised border border-ink-200">
                    <span className="text-[10px] font-semibold text-ink-500 uppercase">Total Reçu</span>
                    <div className="text-sm sm:text-base font-extrabold text-positive mt-1 transition-all">
                      {isPaymentCollected ? "100 000 XOF" : "0 XOF"}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-canvas-raised border border-ink-200">
                    <span className="text-[10px] font-semibold text-ink-500 uppercase">Solde Net</span>
                    <div className="text-sm sm:text-base font-extrabold text-ink-950 mt-1 transition-all">
                      {isPaymentCollected ? "+74 894 XOF" : "-25 106 XOF"}
                    </div>
                  </div>
                </div>

                {/* Encaissement Action Row */}
                <div className="p-4 rounded-2xl bg-canvas-raised border border-ink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-signal to-gold text-white flex items-center justify-center font-extrabold shadow-xs">
                      100k
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-ink-950">Prestation Client — Suivis Octobre 2026</div>
                      <div className="text-[10px] text-ink-500">Échéance aujourd'hui • 100 000 XOF</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPaymentCollected(!isPaymentCollected)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                      isPaymentCollected
                        ? "bg-positive text-white"
                        : "bg-signal text-white hover:bg-signal/90 animate-pulse"
                    }`}
                  >
                    {isPaymentCollected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Encaissé (+100k XOF)
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" /> Encaisser en 1 clic
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================
                SCENE 3: NOTIFICATIONS PUSH & RAPPEL VOCAL IA
                ============================================================ */}
            {activeSceneIndex === 2 && (
              <div className="w-full max-w-xl bg-canvas border border-ink-200 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-signal animate-bounce" />
                    <span className="text-xs font-bold text-ink-950">Notification Push &amp; Synthèse Vocale</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-signal-soft text-signal">
                    Haute Priorité
                  </span>
                </div>

                {/* Simulated Notification Card */}
                <div className="p-4 rounded-2xl bg-canvas-raised border border-ink-200 shadow-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-signal text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-ink-950">Échéance de Facture — Famille M.</h4>
                      <p className="text-xs text-ink-600 mt-0.5">
                        Rappel programmé : Le règlement de 50 000 XOF doit être perçu aujourd'hui avant 18h00.
                      </p>
                    </div>
                  </div>

                  {/* Interactive Sound Wave and Audio Player */}
                  <div className="p-3 rounded-xl bg-ink-950 text-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 h-5">
                        {[12, 24, 16, 28, 10, 20, 14].map((h, i) => (
                          <span
                            key={i}
                            className={`w-1 rounded-full bg-signal transition-all duration-200 ${
                              isVoicePlaying ? "animate-pulse" : "opacity-40"
                            }`}
                            style={{ height: isVoicePlaying ? `${h}px` : "6px" }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-mono text-ink-200">
                        {isVoicePlaying ? "Lecture vocale en cours..." : "Alerte vocale disponible"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={playVoiceReminderBeep}
                      className="px-3 py-1.5 rounded-lg bg-signal text-white text-xs font-bold hover:bg-signal/90 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isVoicePlaying ? "En écoute" : "Écouter l'alerte"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================
                SCENE 4: ANALYTICS & RENTABILITÉ HORAIRE (COURBES)
                ============================================================ */}
            {activeSceneIndex === 3 && (
              <div className="w-full max-w-2xl bg-canvas border border-ink-200 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-ink-950">Évolution Mensuelle — Revenus vs Dépenses</h4>
                    <p className="text-[11px] text-ink-500">Taux horaire moyen : 18 500 XOF / heure</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-positive-soft text-positive border border-positive/30">
                    +34% de Rentabilité
                  </span>
                </div>

                {/* Animated SVG Graph Curve */}
                <div className="relative h-40 w-full bg-canvas-raised rounded-2xl border border-ink-100 p-3 overflow-hidden">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D97706" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#D97706" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Area under Income curve */}
                    <path
                      d="M 0 100 Q 100 80, 200 45 T 400 15 L 400 120 L 0 120 Z"
                      fill="url(#incomeGrad)"
                    />
                    {/* Income Line */}
                    <path
                      d="M 0 100 Q 100 80, 200 45 T 400 15"
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Expense Line */}
                    <path
                      d="M 0 90 Q 100 95, 200 85 T 400 80"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />

                    {/* Interactive glowing node */}
                    <circle cx="400" cy="15" r="5" fill="#D97706" className="animate-ping" />
                    <circle cx="400" cy="15" r="5" fill="#D97706" />
                  </svg>
                </div>

                {/* Graph Legend */}
                <div className="flex items-center justify-between text-xs text-ink-600 pt-1">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-signal rounded-full" />
                      <span className="font-semibold text-ink-950">Revenus cumulés</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-danger rounded-full" />
                      <span className="text-ink-500">Dépenses réelles</span>
                    </div>
                  </div>
                  <span className="font-bold text-positive">+125 000 XOF Net</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Callout */}
          <div className="pt-4 border-t border-ink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-ink-600">
              <ShieldCheck className="w-4 h-4 text-positive" />
              <span>Toutes les simulations sont interconnectées en temps réel avec votre compte.</span>
            </div>
            <a
              href="/register"
              className="inline-flex items-center gap-1.5 font-bold text-signal hover:underline"
            >
              Créer mon compte gratuitement <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
