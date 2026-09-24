"use client";

import { useState, useRef } from "react";
import { X, Upload, Sparkles, Check, Image as ImageIcon, Loader2, RefreshCw } from "lucide-react";
import {
  PRESET_AVATARS,
  optimizeAvatarImage,
  generatePresetAvatarDataUrl,
  type OptimizeImageResult,
} from "@/lib/media/avatar-optimizer";

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl: string | null;
  onSelectAvatar: (fileOrUrl: Blob | string, isPreset: boolean) => Promise<void>;
}

export function AvatarModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  onSelectAvatar,
}: AvatarModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "presets">("upload");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [optimizedImage, setOptimizedImage] = useState<OptimizeImageResult | null>(null);
  const [originalFileSize, setOriginalFileSize] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function resetState() {
    setOptimizedImage(null);
    setOriginalFileSize(null);
    setSelectedPresetId(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setProcessing(true);
    setOriginalFileSize(file.size);

    try {
      // Optimisation via Canvas 2D
      const result = await optimizeAvatarImage(file, 512, 0.85);
      setOptimizedImage(result);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la préparation de votre photo.");
      setOptimizedImage(null);
    } finally {
      setProcessing(false);
    }
  }

  async function handleConfirm() {
    setError(null);
    setSaving(true);
    try {
      if (activeTab === "upload" && optimizedImage) {
        await onSelectAvatar(optimizedImage.blob, false);
      } else if (activeTab === "presets" && selectedPresetId) {
        const dataUrl = generatePresetAvatarDataUrl(selectedPresetId);
        await onSelectAvatar(dataUrl, true);
      }
      handleClose();
    } catch (err: any) {
      setError(err?.message || "Impossible d'enregistrer la photo.");
    } finally {
      setSaving(false);
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-ink-200 bg-canvas-raised p-5 sm:p-6 shadow-2xl text-ink-950 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-ink-200">
          <div>
            <h3 className="text-base font-bold text-ink-950">Photo de profil</h3>
            <p className="text-xs text-ink-500">Personnalisez votre avatar ou importez une photo</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-canvas border border-ink-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
              activeTab === "upload"
                ? "bg-canvas-raised text-ink-950 shadow-xs border border-ink-200 font-bold"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Importer une photo
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("presets");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
              activeTab === "presets"
                ? "bg-canvas-raised text-ink-950 shadow-xs border border-ink-200 font-bold"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            Choisir un avatar
          </button>
        </div>

        {/* Tab Content: Upload */}
        {activeTab === "upload" && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileSelect}
              className="hidden"
            />

            {optimizedImage ? (
              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-ink-200 bg-canvas space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optimizedImage.dataUrl}
                  alt="Prévisualisation"
                  className="w-28 h-28 rounded-full object-cover shadow-md ring-4 ring-canvas-raised"
                />
                <div className="text-center space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-positive-soft text-positive border border-positive/30">
                    <Check className="w-3 h-3" /> Photo optimisée avec succès
                  </span>
                  {originalFileSize && (
                    <p className="text-[11px] text-ink-500">
                      Taille originale : <strong>{formatBytes(originalFileSize)}</strong> ➔ Compressée :{" "}
                      <strong className="text-ink-900">{formatBytes(optimizedImage.sizeBytes)}</strong>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs text-signal font-semibold hover:underline pt-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Choisir une autre photo
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-ink-300 hover:border-signal bg-canvas/60 hover:bg-canvas cursor-pointer transition-all space-y-3 text-center"
              >
                {processing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-signal animate-spin" />
                    <span className="text-xs font-semibold text-ink-700">Compression automatique...</span>
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-signal-soft text-signal">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink-900">
                        Cliquez pour choisir une photo depuis votre appareil
                      </div>
                      <div className="text-[11px] text-ink-500 mt-0.5">
                        JPG, PNG, WebP acceptés • Jusqu&apos;à 20 Mo (optimisé automatiquement)
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Presets */}
        {activeTab === "presets" && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-60 overflow-y-auto p-1">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`group relative flex flex-col items-center justify-center aspect-square rounded-2xl bg-gradient-to-br ${preset.bg} text-2xl shadow-xs transition-all active:scale-95 ${
                      isSelected
                        ? "ring-4 ring-signal scale-105 shadow-md"
                        : "hover:scale-105 opacity-90 hover:opacity-100"
                    }`}
                    title={preset.label}
                  >
                    <span>{preset.emoji}</span>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 bg-signal text-white rounded-full p-0.5 shadow-xs">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedPresetId && (
              <p className="text-xs text-center font-medium text-ink-700">
                Avatar sélectionné :{" "}
                <strong className="text-ink-950">
                  {PRESET_AVATARS.find((p) => p.id === selectedPresetId)?.label}
                </strong>
              </p>
            )}
          </div>
        )}

        {/* Error message if any */}
        {error && (
          <div className="p-2.5 rounded-lg border border-danger/30 bg-danger-soft text-xs text-danger font-medium">
            {error}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-ink-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-100 rounded-xl transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={
              saving ||
              (activeTab === "upload" && !optimizedImage) ||
              (activeTab === "presets" && !selectedPresetId)
            }
            onClick={handleConfirm}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-signal text-white text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement...
              </>
            ) : (
              "Confirmer & Appliquer"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
