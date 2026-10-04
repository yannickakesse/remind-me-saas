import crypto from "crypto";
import type { VoiceLanguage, VoiceType } from "./types";
import { getElevenLabsVoiceId } from "./voices-config";

export interface ElevenLabsTTSOptions {
  text: string;
  language?: VoiceLanguage;
  voiceType?: VoiceType;
  modelId?: string;
}

export interface ElevenLabsTTSResult {
  success: boolean;
  audioBuffer?: Buffer;
  contentType?: string;
  cached?: boolean;
  voiceId?: string;
  error?: string;
}

// Cache LRU en mémoire pour éviter les appels redondants et économiser les crédits API
interface CacheEntry {
  buffer: Buffer;
  contentType: string;
  createdAt: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 300;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Calcule une empreinte SHA-256 unique pour le texte, la voix et le modèle.
 */
function computeCacheKey(text: string, voiceId: string, modelId: string): string {
  const normalized = text.trim();
  return crypto
    .createHash("sha256")
    .update(`${voiceId}:${modelId}:${normalized}`)
    .digest("hex");
}

/**
 * Nettoie les entrées expirées ou excédentaires du cache mémoire.
 */
function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of MEMORY_CACHE.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      MEMORY_CACHE.delete(key);
    }
  }

  if (MEMORY_CACHE.size > MAX_CACHE_ENTRIES) {
    // Supprimer les plus anciennes entrées
    const keysToDelete = Array.from(MEMORY_CACHE.keys()).slice(0, 50);
    for (const k of keysToDelete) {
      MEMORY_CACHE.delete(k);
    }
  }
}

/**
 * Service Serveur ElevenLabs pour la synthèse vocale Text-to-Speech de Remind Me.
 *
 * RÈGLES DE CONCEPTION :
 * - Fonctionne EXCLUSIVEMENT côté serveur (aucun secret exposé au client).
 * - Cache mémoire SHA-256 pour réduire la latence à 0 ms sur les phrases récurrentes.
 * - Confinement total des erreurs : ne bloque jamais le système de notifications en cas de panne API.
 */
export async function generateElevenLabsAudio(
  options: ElevenLabsTTSOptions
): Promise<ElevenLabsTTSResult> {
  const {
    text,
    language = "fr",
    voiceType = "system",
    modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
  } = options;

  if (!text || !text.trim()) {
    return { success: false, error: "Le texte à synthétiser est vide." };
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "ELEVENLABS_API_KEY non configurée dans les variables d'environnement serveur.",
    };
  }

  const voiceId = getElevenLabsVoiceId(language, voiceType);
  if (!voiceId) {
    return {
      success: false,
      error: `Aucun Voice ID configuré pour la langue '${language}' et le type '${voiceType}'.`,
    };
  }

  // 1. Vérification du cache
  const cacheKey = computeCacheKey(text, voiceId, modelId);
  const cached = MEMORY_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return {
      success: true,
      audioBuffer: cached.buffer,
      contentType: cached.contentType,
      cached: true,
      voiceId,
    };
  }

  // 2. Appel de l'API ElevenLabs avec timeout sécurisé de 12 secondes
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(
        `[ElevenLabs] API Error (${response.status}):`,
        errText || response.statusText
      );
      return {
        success: false,
        error: `Erreur ElevenLabs (${response.status}) : ${errText || response.statusText}`,
        voiceId,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "audio/mpeg";

    // 3. Stockage en cache
    pruneCache();
    MEMORY_CACHE.set(cacheKey, {
      buffer: audioBuffer,
      contentType,
      createdAt: Date.now(),
    });

    return {
      success: true,
      audioBuffer,
      contentType,
      cached: false,
      voiceId,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    const msg = isTimeout
      ? "Délai d'attente dépassé (timeout 12s) lors de l'appel ElevenLabs."
      : err?.message || "Erreur réseau inconnue lors de la génération ElevenLabs.";

    console.warn("[ElevenLabs] Synthesize exception:", msg);
    return {
      success: false,
      error: msg,
      voiceId,
    };
  }
}
