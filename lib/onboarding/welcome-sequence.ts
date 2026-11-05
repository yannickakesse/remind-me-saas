// Ordre d'affichage des pop-ups d'accueil, sans chevauchement :
// 1. Vidéo de présentation  2. Salutation  3. Invitation aux rappels vocaux

export const MOTION_MODAL_KEY = "remindme_motion_popup_last_shown";
export const MOTION_MODAL_COOLDOWN_MS = 2.5 * 24 * 60 * 60 * 1000; // 2.5 jours (~60h)

// Émis uniquement à la fermeture du pop-up vidéo (pas à la fin de la lecture)
export const INTRO_VIDEO_CLOSED_EVENT = "remindme:intro-video-closed";
const WELCOME_DONE_EVENT = "remindme:welcome-done";

/** La vidéo de présentation doit-elle s'ouvrir lors de ce chargement ? */
/**
 * La vidéo de présentation n'est plus jouée dans l'application (elle reste sur la page d'accueil publique) :
 * plus rien n'attend sa fermeture.
 */
export function isIntroVideoDue(): boolean {
  return false;
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
