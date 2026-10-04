import { NextResponse } from "next/server";
import { generateElevenLabsAudio } from "@/lib/voice/elevenlabs";
import type { VoiceLanguage, VoiceType } from "@/lib/voice/types";

export const dynamic = "force-dynamic";

/**
 * Route API Next.js Server-Side pour la synthèse vocale ElevenLabs.
 *
 * Supporte :
 * - POST avec corps JSON `{ text, language, voiceType }`
 * - GET avec paramètres d'URL `?text=...&language=...&voiceType=...` pour lecture directe en flux
 *
 * Ne divulgue JAMAIS la clé secrète ELEVENLABS_API_KEY au navigateur.
 */

async function handleTTS(params: {
  text: string;
  language?: VoiceLanguage;
  voiceType?: VoiceType;
}) {
  const { text, language = "fr", voiceType = "system" } = params;

  if (!text || !text.trim()) {
    return NextResponse.json(
      { success: false, error: "Paramètre 'text' manquant ou vide." },
      { status: 400 }
    );
  }

  // Limitation de sécurité sur la longueur maximale du texte (max 1000 caractères par phrase de rappel)
  const cleanText = text.trim().slice(0, 1000);

  const result = await generateElevenLabsAudio({
    text: cleanText,
    language,
    voiceType,
  });

  if (!result.success || !result.audioBuffer) {
    return NextResponse.json(
      {
        success: false,
        fallback: "speechSynthesis",
        error: result.error || "Génération ElevenLabs indisponible.",
      },
      { status: 200 } // Statut 200 avec fallback explicite pour que le lecteur client bascule proprement
    );
  }

  // Retourne le flux binaire MP3 avec mise en cache HTTP
  return new NextResponse(result.audioBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": result.contentType || "audio/mpeg",
      "Content-Length": String(result.audioBuffer.length),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Voice-Engine": "elevenlabs",
      "X-Voice-Cached": String(Boolean(result.cached)),
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return await handleTTS({
      text: body.text,
      language: body.language,
      voiceType: body.voiceType,
    });
  } catch (error: any) {
    console.warn("[API:Voice:TTS] Exception POST:", error);
    return NextResponse.json(
      {
        success: false,
        fallback: "speechSynthesis",
        error: error?.message || "Erreur interne de traitement vocal.",
      },
      { status: 200 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get("text") || "";
    const language = (searchParams.get("language") as VoiceLanguage) || "fr";
    const voiceType = (searchParams.get("voiceType") as VoiceType) || "system";

    return await handleTTS({
      text,
      language,
      voiceType,
    });
  } catch (error: any) {
    console.warn("[API:Voice:TTS] Exception GET:", error);
    return NextResponse.json(
      {
        success: false,
        fallback: "speechSynthesis",
        error: error?.message || "Erreur interne de traitement vocal.",
      },
      { status: 200 }
    );
  }
}
