// Mascotte du guide vocal : un petit visage rond aux couleurs de Remind Me.
// Au repos il cligne des yeux ; quand il parle, sa bouche s'anime et ses antennes s'allument.
export function GuideMascot({ speaking = false, className = "" }: { speaking?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <style>{`
        @keyframes rm-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes rm-talk { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes rm-glow { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        .rm-eye { transform-box: fill-box; transform-origin: center; animation: rm-blink 4.5s infinite; }
        .rm-mouth-talk { transform-box: fill-box; transform-origin: center; animation: rm-talk 0.32s ease-in-out infinite; }
        .rm-antenna-on { animation: rm-glow 0.9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .rm-eye, .rm-mouth-talk, .rm-antenna-on { animation: none; }
        }
      `}</style>

      {/* Antenne */}
      <line x1="24" y1="6" x2="24" y2="11" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="5" r="2.6" fill="#F59E0B" className={speaking ? "rm-antenna-on" : ""} />

      {/* Tête */}
      <rect x="8" y="11" width="32" height="29" rx="13" fill="#FFFBEB" stroke="#D97706" strokeWidth="2" />
      {/* Oreilles */}
      <rect x="4.5" y="21" width="4" height="9" rx="2" fill="#F59E0B" />
      <rect x="39.5" y="21" width="4" height="9" rx="2" fill="#F59E0B" />

      {/* Yeux */}
      <ellipse className="rm-eye" cx="18.5" cy="23.5" rx="2.6" ry="3.1" fill="#1C1917" />
      <ellipse className="rm-eye" cx="29.5" cy="23.5" rx="2.6" ry="3.1" fill="#1C1917" />
      <circle cx="19.3" cy="22.4" r="0.9" fill="#fff" />
      <circle cx="30.3" cy="22.4" r="0.9" fill="#fff" />

      {/* Joues */}
      <circle cx="14.5" cy="29.5" r="2.2" fill="#FDBA74" opacity="0.7" />
      <circle cx="33.5" cy="29.5" r="2.2" fill="#FDBA74" opacity="0.7" />

      {/* Bouche : sourire au repos, bouche qui parle pendant la lecture */}
      {speaking ? (
        <ellipse className="rm-mouth-talk" cx="24" cy="31.5" rx="3.6" ry="2.6" fill="#9A3412" />
      ) : (
        <path d="M19.5 30.2 Q24 34.2 28.5 30.2" fill="none" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
