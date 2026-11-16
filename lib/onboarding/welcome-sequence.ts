// Ordre d'affichage des pop-ups d'accueil, sans chevauchement :
// 1. Vidéo de présentation  2. Salutation  3. Invitation aux rappels vocaux

export const MOTION_MODAL_KEY = "remindme_motion_popup_last_shown";
export const MOTION_MODAL_COOLDOWN_MS = 2.5 * 24 * 60 * 60 * 1000; // 2.5 jours (~60h)

// Émis uniquement à la fermeture du pop-up vidéo (pas à la fin de la lecture)
export const INTRO_VIDEO_CLOSED_EVENT = "remindme:intro-video-closed";
const WELCOME_DONE_EVENT = "remindme:welcome-done";

/** Vidéo regardée jusqu'au bout au moins une fois : elle ne se rouvre plus d'elle-même. */
export const INTRO_WATCHED_KEY = "remindme_intro_video_watched";

/**
 * La vidéo de présentation doit-elle s'ouvrir lors de ce chargement ?
 * Première entrée dans l'application : oui. Ensuite, tous les 2 à 3 jours tant qu'elle
 * n'a pas été regardée jusqu'au bout. Toujours disponible depuis le Centre d'aide.
 */
export function isIntroVideoDue(): boolean {
  try {
    if (localStorage.getItem(INTRO_WATCHED_KEY)) return false;
    const lastShownStr = localStorage.getItem(MOTION_MODAL_KEY);
    if (!lastShownStr) return true;
    const lastShown = parseInt(lastShownStr, 10);
    return isNaN(lastShown) || Date.now() - lastShown > MOTION_MODAL_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Signale que la salutation est terminée (ou qu'elle ne s'affichera pas). */
export function markWelcomeDone() {
  if (typeof window === "undefined") return;
  (window as any).__REMINDME_WELCOME_DONE = true;
  window.dispatchEvent(new CustomEvent(WELCOME_DONE_EVENT));
}

/** Exécute `cb` une fois la salutation terminée. Retourne une fonction d'annulation. */
export function onWelcomeDone(cb: () => void): () => void {
  if ((window as any).__REMINDME_WELCOME_DONE) {
    const t = setTimeout(cb, 0);
    return () => clearTimeout(t);
  }
  window.addEventListener(WELCOME_DONE_EVENT, cb, { once: true });
  return () => window.removeEventListener(WELCOME_DONE_EVENT, cb);
}
