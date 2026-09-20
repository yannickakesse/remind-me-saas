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
 * Joue la sonnerie de rappel Remind Me (Carillon harmonique 2 tons D5 -> A5)
 */
export function playNotificationChime(volume: number = 0.35): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // --- Note 1 : Ré (D5 - 587.33 Hz) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(volume, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.5);

    // --- Note 2 : La (A5 - 880 Hz) avec harmonique ---
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, now + 0.12);

    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(volume * 0.9, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.12);
    osc2.stop(now + 0.85);
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
    await ctx.resume();
  }
  playNotificationChime(0.4);
  return true;
}
