import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { generateElevenLabsAudio } from "@/lib/voice/elevenlabs";
import type { VoiceLanguage, VoiceType } from "@/lib/voice/types";

export const dynamic = "force-dynamic";

const LANGUAGES: VoiceLanguage[] = ["fr", "en", "es", "de", "pt"];
const VOICE_TYPES: VoiceType[] = ["system", "female", "male"];

/**
 * Synthèse vocale ElevenLabs côté serveur.
 *
 * - Réservée aux utilisateurs connectés (protège les crédits ElevenLabs).
 * - Limite : 60 générations / 10 min par utilisateur (les phrases déjà générées sont en cache).
 * - La clé ELEVENLABS_API_KEY ne quitte jamais le serveur ; les erreurs détaillées restent dans les logs.
 * - En cas d'échec : réponse JSON `{ success: false, reason }`, le lecteur applique alors son secours.
 */
function unavailable(reason: string, status = 200) {
  return NextResponse.json({ success: false, reason }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unavailable("unauthorized", 401);

    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 1000) : "";
    if (!text) return unavailable("empty-text", 400);

    const language: VoiceLanguage = LANGUAGES.includes(body.language) ? body.language : "fr";
    const voiceType: VoiceType = VOICE_TYPES.includes(body.voiceType) ? body.voiceType : "system";

    const rl = checkRateLimit(`voice_tts:${user.id}`, 60, 600);
    if (!rl.success) return unavailable("rate-limited", 429);

    const result = await generateElevenLabsAudio({ text, language, voiceType });
    if (!result.success || !result.audioBuffer) {
      console.warn("[API:Voice:TTS] ElevenLabs indisponible :", result.error);
      return unavailable(result.voiceId ? "provider-error" : "no-voice-for-language");
    }

    return new NextResponse(new Uint8Array(result.audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType || "audio/mpeg",
        "Content-Length": String(result.audioBuffer.length),
        // Audio propre à l'utilisateur (peut contenir son prénom) : cache navigateur uniquement
        "Cache-Control": "private, max-age=86400",
        "X-Voice-Engine": "elevenlabs",
        "X-Voice-Cached": String(Boolean(result.cached)),
      },
    });
  } catch (error: any) {
    console.warn("[API:Voice:TTS] Exception :", error?.message);
    return unavailable("server-error");
  }
}
