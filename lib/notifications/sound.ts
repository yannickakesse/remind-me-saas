/**
 * Moteur Audio & Synthétiseur de Sonnerie de Notification Remind Me
 * Utilise la Web Audio API standard : fonctionne sans aucun téléchargement
 * de fichier externe, avec une sonnerie harmonique et agréable.
 */

const SOUND_PREF_KEY = "remindme_sound_notifications_enabled";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioCtxClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    return audioCtx;
  } catch (err) {
    console.warn("[RemindMe Audio] AudioContext initialization failed:", err);
    return null;
  }
}

/**
 * Vérifie si les sonneries sont activées dans le stockage local
 */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem(SOUND_PREF_KEY);
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
}

/**
 * Active ou désactive les sonneries audio
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_PREF_KEY, enabled ? "true" : "false");
    window.dispatchEvent(new CustomEvent("remindme_sound_pref_changed", { detail: { enabled } }));
  } catch {}
}

/**
 * Joue la sonnerie officielle de notification Remind Me
 * Arpège cristallin 3 tons (E5 -> A5 -> E6) harmonieux et percussif
 */
export function playNotificationChime(volume: number = 0.4): void {
  if (!isSoundEnabled()) return;

  // 1. Tenter d'abord la lecture directe du fichier audio HD
  if (typeof window !== "undefined" && typeof Audio !== "undefined") {
    try {
      const audio = new Audio("/sounds/notification.wav");
      audio.volume = Math.min(1, Math.max(0, volume));
      audio.play().catch(() => {
        // En cas de blocage d'autoplay ou d'erreur réseau, fallback sur la Web Audio API
        playSynthesizedChime(volume);
      });
      return;
    } catch {
      // Fallback direct
    }
  }

  playSynthesizedChime(volume);
}

/**
 * Synthétiseur de secours Web Audio API haute fidélité
 */
function playSynthesizedChime(volume: number = 0.4): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Définition des 3 notes du carillon Remind Me (E5, A5, E6)
    const notes = [
      { delay: 0.00, freq: 659.25, dur: 0.45, gainRatio: 0.75, type: "sine" as OscillatorType },
      { delay: 0.09, freq: 880.00, dur: 0.55, gainRatio: 0.85, type: "triangle" as OscillatorType },
      { delay: 0.20, freq: 1318.51, dur: 0.90, gainRatio: 1.0, type: "sine" as OscillatorType },
    ];

    notes.forEach((note) => {
      const noteTime = now + note.delay;

      // Oscillateur principal
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(volume * note.gainRatio, noteTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + note.dur + 0.05);

      // Harmonique cristalline d'attaque percussive (cloche / verre)
      const harmonicOsc = ctx.createOscillator();
      const harmonicGain = ctx.createGain();

      harmonicOsc.type = "sine";
      harmonicOsc.frequency.setValueAtTime(note.freq * 2.01, noteTime);

      harmonicGain.gain.setValueAtTime(0, noteTime);
      harmonicGain.gain.linearRampToValueAtTime(volume * note.gainRatio * 0.35, noteTime + 0.003);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.15);

      harmonicOsc.connect(harmonicGain);
      harmonicGain.connect(ctx.destination);

      harmonicOsc.start(noteTime);
      harmonicOsc.stop(noteTime + 0.2);
    });
  } catch (err) {
    console.warn("[RemindMe Audio] Failed to play chime:", err);
  }
}

/**
 * Teste la sonnerie et force le déverrouillage audio du navigateur
 */
export async function testChimeSound(): Promise<boolean> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    await ctx.resume().catch(() => {});
  }
  playNotificationChime(0.45);
  return true;
}
