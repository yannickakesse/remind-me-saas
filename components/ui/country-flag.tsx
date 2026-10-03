"use client";

import React from "react";

interface CountryFlagProps {
  code: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  rounded?: boolean;
}

const SIZE_MAP = {
  xs: "w-4 h-2.5",
  sm: "w-5 h-3.5",
  md: "w-6 h-4",
  lg: "w-8 h-5.5",
  xl: "w-10 h-7",
};

export function CountryFlag({
  code,
  size = "md",
  className = "",
  rounded = true,
}: CountryFlagProps) {
  const normalized = (code || "").toUpperCase().trim();
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const radiusClass = rounded ? "rounded-xs" : "";

  // Render authentic SVG flags
  switch (normalized) {
    // FRANCE / FR
    case "FR":
    case "FRA":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="300" height="600" fill="#002654" />
          <rect x="300" width="300" height="600" fill="#FFFFFF" />
          <rect x="600" width="300" height="600" fill="#CE1126" />
        </svg>
      );

    // USA / EN
    case "EN":
    case "US":
    case "USA":
      return (
        <svg
          viewBox="0 0 7410 3900"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="7410" height="3900" fill="#B22234" />
          <path
            d="M0,450H7410M0,1050H7410M0,1650H7410M0,2250H7410M0,2850H7410M0,3450H7410"
            stroke="#FFF"
            strokeWidth="300"
          />
          <rect width="2964" height="2100" fill="#3C3B6E" />
          <g fill="#FFF">
            <circle cx="494" cy="350" r="120" />
            <circle cx="988" cy="350" r="120" />
            <circle cx="1482" cy="350" r="120" />
            <circle cx="1976" cy="350" r="120" />
            <circle cx="2470" cy="350" r="120" />
            <circle cx="741" cy="700" r="120" />
            <circle cx="1235" cy="700" r="120" />
            <circle cx="1729" cy="700" r="120" />
            <circle cx="2223" cy="700" r="120" />
            <circle cx="494" cy="1050" r="120" />
            <circle cx="988" cy="1050" r="120" />
            <circle cx="1482" cy="1050" r="120" />
            <circle cx="1976" cy="1050" r="120" />
            <circle cx="2470" cy="1050" r="120" />
            <circle cx="741" cy="1400" r="120" />
            <circle cx="1235" cy="1400" r="120" />
            <circle cx="1729" cy="1400" r="120" />
            <circle cx="2223" cy="1400" r="120" />
            <circle cx="494" cy="1750" r="120" />
            <circle cx="988" cy="1750" r="120" />
            <circle cx="1482" cy="1750" r="120" />
            <circle cx="1976" cy="1750" r="120" />
            <circle cx="2470" cy="1750" r="120" />
          </g>
        </svg>
      );

    // UNITED KINGDOM / GB
    case "GB":
    case "UK":
      return (
        <svg
          viewBox="0 0 60 30"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <g>
            <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="3" />
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
          </g>
        </svg>
      );

    // SPAIN / ES
    case "ES":
    case "ESP":
      return (
        <svg
          viewBox="0 0 750 500"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="750" height="500" fill="#AA151B" />
          <rect y="125" width="750" height="250" fill="#F1BF00" />
          <g transform="translate(200, 250) scale(0.6)">
            <rect x="-40" y="-50" width="80" height="100" rx="20" fill="#AA151B" stroke="#000" strokeWidth="3" />
            <rect x="-30" y="-40" width="60" height="80" rx="10" fill="#F1BF00" />
            <circle cx="0" cy="0" r="15" fill="#AA151B" />
          </g>
        </svg>
      );

    // GERMANY / DE
    case "DE":
    case "DEU":
      return (
        <svg
          viewBox="0 0 5 3"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="5" height="3" y="0" fill="#000" />
          <rect width="5" height="2" y="1" fill="#DD0000" />
          <rect width="5" height="1" y="2" fill="#FFCE00" />
        </svg>
      );

    // BRAZIL / PT / BR
    case "PT":
    case "BR":
    case "BRA":
      return (
        <svg
          viewBox="0 0 720 504"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="720" height="504" fill="#009c3b" />
          <polygon points="360,40 680,252 360,464 40,252" fill="#ffdf00" />
          <circle cx="360" cy="252" r="110" fill="#002776" />
          <path d="M 255,270 Q 360,210 465,270" stroke="#fff" strokeWidth="16" fill="none" />
        </svg>
      );

    // ITALY / IT
    case "IT":
    case "ITA":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="300" height="600" fill="#009246" />
          <rect x="300" width="300" height="600" fill="#FFFFFF" />
          <rect x="600" width="300" height="600" fill="#CE2B37" />
        </svg>
      );

    // NETHERLANDS / NL
    case "NL":
    case "NLD":
      return (
        <svg
          viewBox="0 0 9 6"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="9" height="6" fill="#21468B" />
          <rect width="9" height="4" fill="#FFF" />
          <rect width="9" height="2" fill="#AE1C28" />
        </svg>
      );

    // RUSSIA / RU
    case "RU":
    case "RUS":
      return (
        <svg
          viewBox="0 0 9 6"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="9" height="6" fill="#D52B1E" />
          <rect width="9" height="4" fill="#0039A6" />
          <rect width="9" height="2" fill="#FFF" />
        </svg>
      );

    // CHINA / ZH / CN
    case "ZH":
    case "CN":
    case "CHN":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="900" height="600" fill="#DE2910" />
          <polygon
            points="150,50 180,140 100,85 200,85 120,140"
            fill="#FFDE00"
          />
          <polygon points="300,50 310,80 285,60 315,60 290,80" fill="#FFDE00" />
          <polygon points="360,100 370,130 345,110 375,110 350,130" fill="#FFDE00" />
          <polygon points="360,180 370,210 345,190 375,190 350,210" fill="#FFDE00" />
          <polygon points="300,240 310,270 285,250 315,250 290,270" fill="#FFDE00" />
        </svg>
      );

    // JAPAN / JA / JP
    case "JA":
    case "JP":
    case "JPN":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="900" height="600" fill="#FFFFFF" />
          <circle cx="450" cy="300" r="180" fill="#BC002D" />
        </svg>
      );

    // SAUDI ARABIA / AR / SA
    case "AR":
    case "SA":
    case "SAU":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="900" height="600" fill="#006C35" />
          <path
            d="M250,420 H650 L630,400 H270 Z"
            fill="#FFFFFF"
          />
          <circle cx="300" cy="410" r="15" fill="#006C35" />
          <rect x="350" y="240" width="200" height="60" rx="30" fill="#FFFFFF" opacity="0.9" />
          <rect x="370" y="255" width="160" height="30" rx="15" fill="#006C35" />
        </svg>
      );

    // INDIA / HI / IN
    case "HI":
    case "IN":
    case "IND":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="900" height="200" fill="#FF9933" />
          <rect y="200" width="900" height="200" fill="#FFFFFF" />
          <rect y="400" width="900" height="200" fill="#138808" />
          <circle cx="450" cy="300" r="70" stroke="#000080" strokeWidth="12" fill="none" />
          <circle cx="450" cy="300" r="15" fill="#000080" />
        </svg>
      );

    // CÔTE D'IVOIRE / CI
    case "CI":
    case "CIV":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="300" height="600" fill="#F77F00" />
          <rect x="300" width="300" height="600" fill="#FFFFFF" />
          <rect x="600" width="300" height="600" fill="#009E60" />
        </svg>
      );

    // SÉNÉGAL / SN
    case "SN":
    case "SEN":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="300" height="600" fill="#00853F" />
          <rect x="300" width="300" height="600" fill="#FDEF42" />
          <rect x="600" width="300" height="600" fill="#E31B23" />
          <polygon
            points="450,220 470,280 530,280 480,315 500,375 450,340 400,375 420,315 370,280 430,280"
            fill="#00853F"
          />
        </svg>
      );

    // CAMEROON / CM
    case "CM":
    case "CMR":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="300" height="600" fill="#007A5E" />
          <rect x="300" width="300" height="600" fill="#CE1126" />
          <rect x="600" width="300" height="600" fill="#FCD116" />
          <polygon
            points="450,220 470,280 530,280 480,315 500,375 450,340 400,375 420,315 370,280 430,280"
            fill="#FCD116"
          />
        </svg>
      );

    // CANADA / CA
    case "CA":
    case "CAN":
      return (
        <svg
          viewBox="0 0 1000 500"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="250" height="500" fill="#FF0000" />
          <rect x="250" width="500" height="500" fill="#FFFFFF" />
          <rect x="750" width="250" height="500" fill="#FF0000" />
          <path
            d="M500,120 L520,200 L580,180 L550,240 L610,270 L550,310 L560,350 L510,330 L505,400 L495,400 L490,330 L440,350 L450,310 L390,270 L450,240 L420,180 L480,200 Z"
            fill="#FF0000"
          />
        </svg>
      );

    // BENIN / BJ
    case "BJ":
    case "BEN":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="360" height="600" fill="#008751" />
          <rect x="360" width="540" height="300" fill="#FCD116" />
          <rect x="360" y="300" width="540" height="300" fill="#E8112D" />
        </svg>
      );

    // TOGO / TG
    case "TG":
    case "TGO":
      return (
        <svg
          viewBox="0 0 1000 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="1000" height="120" fill="#006A4E" />
          <rect y="120" width="1000" height="120" fill="#FFCE00" />
          <rect y="240" width="1000" height="120" fill="#006A4E" />
          <rect y="360" width="1000" height="120" fill="#FFCE00" />
          <rect y="480" width="1000" height="120" fill="#006A4E" />
          <rect width="360" height="360" fill="#D21034" />
          <polygon
            points="180,90 205,160 275,160 220,200 240,270 180,230 120,270 140,200 85,160 155,160"
            fill="#FFFFFF"
          />
        </svg>
      );

    // BURKINA FASO / BF
    case "BF":
    case "BFA":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="900" height="300" fill="#EF2B2D" />
          <rect y="300" width="900" height="300" fill="#009E49" />
          <polygon
            points="450,210 475,275 540,275 490,315 510,380 450,340 390,380 410,315 360,275 425,275"
            fill="#FCD116"
          />
        </svg>
      );

    // MALI / ML
    case "ML":
    case "MLI":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="300" height="600" fill="#14B53A" />
          <rect x="300" width="300" height="600" fill="#FCD116" />
          <rect x="600" width="300" height="600" fill="#CE1126" />
        </svg>
      );

    // MOROCCO / MA
    case "MA":
    case "MAR":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="900" height="600" fill="#C1272D" />
          <polygon
            points="450,180 485,280 580,280 505,340 535,440 450,380 365,440 395,340 320,280 415,280"
            stroke="#006233"
            strokeWidth="12"
            fill="none"
          />
        </svg>
      );

    // BELGIUM / BE
    case "BE":
    case "BEL":
      return (
        <svg
          viewBox="0 0 900 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="300" height="600" fill="#000000" />
          <rect x="300" width="300" height="600" fill="#FDDA24" />
          <rect x="600" width="300" height="600" fill="#EF3340" />
        </svg>
      );

    // SWITZERLAND / CH
    case "CH":
    case "CHE":
      return (
        <svg
          viewBox="0 0 600 600"
          className={`${sizeClasses} ${radiusClass} shrink-0 shadow-2xs border border-black/10 inline-block overflow-hidden ${className}`}
        >
          <rect width="600" height="600" fill="#D52B1E" />
          <rect x="250" y="100" width="100" height="400" fill="#FFFFFF" />
          <rect x="100" y="250" width="400" height="100" fill="#FFFFFF" />
        </svg>
      );

    // Generic Globe fallback
    default:
      return (
        <span
          className={`inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase ${sizeClasses} ${radiusClass} border border-slate-300 dark:border-slate-700 shrink-0 text-slate-700 dark:text-slate-200 ${className}`}
        >
          {normalized.slice(0, 2) || "🌐"}
        </span>
      );
  }
}
