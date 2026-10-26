import React from "react";
import Image from "next/image";

interface RemindMeLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export function RemindMeLogo({
  size = "md",
  showText = true,
  className = "",
}: RemindMeLogoProps) {
  const iconDimensions = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  }[size];

  const textStyles = {
    sm: "text-lg font-bold tracking-tight",
    md: "text-xl font-bold tracking-tight",
    lg: "text-2xl font-bold tracking-tight",
    xl: "text-3xl font-extrabold tracking-tight",
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon : Badge circulaire fidèle au logo officiel du SaaS */}
      <div
        className={`relative ${iconDimensions} rounded-full overflow-hidden border border-ink-900/10 dark:border-white/10 shrink-0 select-none group-hover:scale-105 transition-transform duration-200 shadow-sm`}
      >
        <Image
          src="/icons/icon-192x192.png"
          alt="Remind Me Logo"
          width={80}
          height={80}
          priority
          className="w-full h-full object-cover"
        />
      </div>

      {/* Brand Text : Remind en noir, Me en jaune orangé */}
      {showText && (
        <span className={`${textStyles} font-sans leading-none`}>
          <span className="text-ink-950 dark:text-white">Remind</span>
          <span className="text-[#F59E0B] dark:text-amber-400">Me</span>
        </span>
      )}
    </div>
  );
}
