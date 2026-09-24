/**
 * Utilitaire de compression et d'optimisation d'image côté client (HTML5 Canvas).
 * Permet de sélectionner une photo lourde de smartphone (jusqu'à 20 Mo)
 * et de la compresser à la volée vers une version ultra-légère (~50-120 Ko)
 * en WebP / JPEG (512x512 max).
 */

export interface OptimizeImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export const PRESET_AVATARS = [
  { id: "avatar-pro-1", label: "Consultant / Direction", bg: "from-blue-600 to-indigo-800", emoji: "💼" },
  { id: "avatar-pro-2", label: "Tech & Créatif", bg: "from-emerald-500 to-teal-800", emoji: "⚡" },
  { id: "avatar-pro-3", label: "Entrepreneur & Vision", bg: "from-amber-500 to-orange-700", emoji: "🚀" },
  { id: "avatar-pro-4", label: "Finance & Stratégie", bg: "from-purple-600 to-violet-900", emoji: "📈" },
  { id: "avatar-pro-5", label: "Design & Produit", bg: "from-pink-500 to-rose-700", emoji: "🎨" },
  { id: "avatar-pro-6", label: "International & Projets", bg: "from-cyan-500 to-blue-700", emoji: "🌐" },
  { id: "avatar-pro-7", label: "Freelance & Focus", bg: "from-slate-700 to-slate-950", emoji: "💻" },
  { id: "avatar-pro-8", label: "Coaching & Énergie", bg: "from-yellow-500 to-amber-600", emoji: "✨" },
  { id: "avatar-pro-9", label: "Commerce & Vente", bg: "from-red-500 to-rose-800", emoji: "🛍️" },
  { id: "avatar-pro-10", label: "Santé & Bien-être", bg: "from-teal-400 to-emerald-700", emoji: "🌿" },
  { id: "avatar-pro-11", label: "Conseil & Analyse", bg: "from-indigo-600 to-sky-800", emoji: "🎯" },
  { id: "avatar-pro-12", label: "Audio & Média", bg: "from-fuchsia-600 to-purple-800", emoji: "🎙️" },
];

/**
 * Compresse et redimensionne une image en WebP/JPEG via Canvas 2D
 */
export async function optimizeAvatarImage(
  file: File,
  maxDimension: number = 512,
  quality: number = 0.85
): Promise<OptimizeImageResult> {
  return new Promise((resolve, reject) => {
    // Vérification du type MIME
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Le fichier sélectionné n'est pas une image valide."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier sélectionné."));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Impossible de décoder l'image."));
      img.onload = () => {
        try {
          const width = img.width;
          const height = img.height;

          // Calcul des dimensions proportionnelles pour un carré centré
          const minDim = Math.min(width, height);
          const cropX = (width - minDim) / 2;
          const cropY = (height - minDim) / 2;

          const finalSize = Math.min(maxDimension, minDim);

          const canvas = document.createElement("canvas");
          canvas.width = finalSize;
          canvas.height = finalSize;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Impossible d'initialiser le moteur de compression graphique."));
          }

          // Lissage d'image de haute qualité
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Dessin avec recadrage carré centré
          ctx.drawImage(img, cropX, cropY, minDim, minDim, 0, 0, finalSize, finalSize);

          // Support WebP avec fallback JPEG
          const outputType = "image/webp";
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Fallback en jpeg si webp non supporté
                canvas.toBlob(
                  (jpegBlob) => {
                    if (!jpegBlob) return reject(new Error("Erreur lors de la compression de l'image."));
                    const dataUrl = canvas.toDataURL("image/jpeg", quality);
                    resolve({
                      blob: jpegBlob,
                      dataUrl,
                      width: finalSize,
                      height: finalSize,
                      sizeBytes: jpegBlob.size,
                    });
                  },
                  "image/jpeg",
                  quality
                );
                return;
              }

              const dataUrl = canvas.toDataURL("image/webp", quality);
              resolve({
                blob,
                dataUrl,
                width: finalSize,
                height: finalSize,
                sizeBytes: blob.size,
              });
            },
            outputType,
            quality
          );
        } catch (err: any) {
          reject(new Error(err?.message || "Erreur lors du traitement de l'image."));
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Génère un avatar SVG en Data URL à partir d'un preset
 */
export function generatePresetAvatarDataUrl(presetId: string): string {
  const fallback = PRESET_AVATARS[0];
  const preset = PRESET_AVATARS.find((p) => p.id === presetId) || fallback;
  const startColor = getGradientStart(preset?.id || "avatar-pro-1");
  const endColor = getGradientEnd(preset?.id || "avatar-pro-1");
  const emoji = preset?.emoji || "✨";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${startColor}" />
        <stop offset="100%" stop-color="${endColor}" />
      </linearGradient>
    </defs>
    <circle cx="100" cy="100" r="100" fill="url(#grad)" />
    <text x="100" y="125" font-size="80" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getGradientStart(id: string): string {
  switch (id) {
    case "avatar-pro-1": return "#2563EB";
    case "avatar-pro-2": return "#10B981";
    case "avatar-pro-3": return "#F59E0B";
    case "avatar-pro-4": return "#9333EA";
    case "avatar-pro-5": return "#EC4899";
    case "avatar-pro-6": return "#06B6D4";
    case "avatar-pro-7": return "#334155";
    case "avatar-pro-8": return "#EAB308";
    case "avatar-pro-9": return "#EF4444";
    case "avatar-pro-10": return "#14B8A6";
    case "avatar-pro-11": return "#4F46E5";
    case "avatar-pro-12": return "#C026D3";
    default: return "#D97706";
  }
}

function getGradientEnd(id: string): string {
  switch (id) {
    case "avatar-pro-1": return "#1E1B4B";
    case "avatar-pro-2": return "#115E59";
    case "avatar-pro-3": return "#9A3412";
    case "avatar-pro-4": return "#4C1D95";
    case "avatar-pro-5": return "#881337";
    case "avatar-pro-6": return "#1E40AF";
    case "avatar-pro-7": return "#020617";
    case "avatar-pro-8": return "#B45309";
    case "avatar-pro-9": return "#7F1D1D";
    case "avatar-pro-10": return "#064E3B";
    case "avatar-pro-11": return "#075985";
    case "avatar-pro-12": return "#581C87";
    default: return "#78350F";
  }
}
