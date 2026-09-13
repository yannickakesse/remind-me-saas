import React from "react";
import Image from "next/image";

interface RemindMeLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  useImage?: boolean;
}

export function RemindMeLogo({
  size = "md",
  showText = true,
  className = "",
  useImage = false,
}: RemindMeLogoProps) {
  const iconDimensions = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  }[size];

  const textStyles = {
    sm: "text-base font-bold tracking-tight",
    md: "text-lg font-bold tracking-tight",
    lg: "text-2xl font-bold tracking-tight",
    xl: "text-3xl font-extrabold tracking-tight",
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Brand Icon (Squircle badge with 3D multi-activity nodes) */}
      <div
        className={`relative ${iconDimensions} rounded-2xl bg-[#131b2e] shadow-md shadow-ink-950/20 flex items-center justify-center overflow-hidden border border-white/10 shrink-0 select-none group-hover:scale-105 transition-transform duration-200`}
      >
        {useImage ? (
          <Image
            src="/brand/logo.jpg"
            alt="Remind Me Logo"
            width={80}
            height={80}
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[82%] h-[82%]"
          >
            <defs>
              <linearGradient id="bgGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1E1E24" />
                <stop offset="1" stopColor="#0B0F17" />
              </linearGradient>
              <linearGradient id="goldGlow" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F59E0B" />
                <stop offset="1" stopColor="#D97706" />
              </linearGradient>
              <linearGradient id="amberGlow" x1="60" y1="60" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCD34D" />
                <stop offset="1" stopColor="#E5A91E" />
              </linearGradient>
              <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Background subtle base */}
            <rect width="100" height="100" rx="22" fill="url(#bgGrad)" />

            {/* Connecting orbital arcs */}
            <path
              d="M 32 45 A 28 28 0 0 1 42 28"
              stroke="#F59E0B"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.9"
            />
            <path
              d="M 68 36 A 28 28 0 0 1 76 56"
              stroke="#FCD34D"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d="M 66 70 A 28 28 0 0 1 36 68"
              stroke="#D97706"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.95"
            />

            {/* Center black metallic core sphere */}
            <circle cx="50" cy="50" r="10" fill="#0B0F19" stroke="#334155" strokeWidth="1.5" />
            <circle cx="47" cy="47" r="3.5" fill="#E5A91E" opacity="0.8" />

            {/* Top Node: Activity/Calendar Sphere */}
            <circle cx="50" cy="24" r="11" fill="url(#goldGlow)" filter="url(#nodeShadow)" />
            <circle cx="47" cy="21" r="3.5" fill="#FEF3C7" opacity="0.9" />

            {/* Bottom-Left Node: Semicircle Finance/Income */}
            <path
              d="M 23 64 A 12 12 0 0 1 45 64 Z"
              fill="url(#goldGlow)"
              filter="url(#nodeShadow)"
            />

            {/* Bottom-Right Node: Rounded Square Tasks/Organization */}
            <rect
              x="62"
              y="54"
              width="20"
              height="20"
              rx="6"
              fill="url(#amberGlow)"
              filter="url(#nodeShadow)"
            />
          </svg>
        )}
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`${textStyles} text-ink-950 font-sans tracking-tight`}>
              Remind <span className="text-signal">Me</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
