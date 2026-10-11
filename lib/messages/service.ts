import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import type { Database } from "@/types/database";

export interface InternalMessageRow {
  id: string;
  user_id: string;
  sender: string;
  subject: string;
  body: string;
  category: "activity" | "financial" | "summary" | "system" | "general";
  is_read: boolean;
  read_at: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateMessageParams {
  userId: string;
  sender?: string;
  subject: string;
  body: string;
  category?: "activity" | "financial" | "summary" | "system" | "general";
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

/**
 * Formate une date de manière humaine et familière pour la messagerie :
 * "Aujourd'hui à 14:30", "Hier à 09:15", "Avant-hier", "Il y a 3 jours", etc.
 */
export function formatMessageDate(
  isoDate: string,
  timezone = "UTC",
  locale = "fr"
): string {
  try {
    const messageDT = DateTime.fromISO(isoDate, { zone: timezone });
    const nowDT = DateTime.now().setZone(timezone);

    if (!messageDT.isValid) return isoDate;

    const diffDays = Math.floor(nowDT.startOf("day").diff(messageDT.startOf("day"), "days").days);
    const timeStr = messageDT.toFormat("HH:mm");

    if (locale === "fr") {
      if (diffDays === 0) return `Aujourd'hui à ${timeStr}`;
      if (diffDays === 1) return `Hier à ${timeStr}`;
      if (diffDays === 2) return `Avant-hier à ${timeStr}`;
      if (diffDays >= 3 && diffDays <= 7) return `Il y a ${diffDays} jours`;
      return messageDT.setLocale("fr").toFormat("dd MMM yyyy à HH:mm");
    }

    if (locale === "es") {
      if (diffDays === 0) return `Hoy a las ${timeStr}`;
      if (diffDays === 1) return `Ayer a las ${timeStr}`;
      if (diffDays === 2) return `Antes de ayer a las ${timeStr}`;
      if (diffDays >= 3 && diffDays <= 7) return `Hace ${diffDays} días`;
      return messageDT.setLocale("es").toFormat("dd MMM yyyy HH:mm");
    }

    // Default: English
    if (diffDays === 0) return `Today at ${timeStr}`;
    if (diffDays === 1) return `Yesterday at ${timeStr}`;
    if (diffDays === 2) return `2 days ago`;
    if (diffDays >= 3 && diffDays <= 7) return `${diffDays} days ago`;
    return messageDT.setLocale("en").toFormat("MMM dd, yyyy 'at' HH:mm");
  } catch {
    return isoDate;
  }
}

/**
 * Crée un message interne dans la boîte de réception de l'utilisateur avec déduplication.
 */
export async function createInternalMessage(
  supabase: SupabaseClient<Database>,
  params: CreateMessageParams
): Promise<InternalMessageRow | null> {
  const {
    userId,
    sender = "Remind Me",
    subject,
    body,
    category = "general",
    metadata = {},
    idempotencyKey,
  } = params;

  try {
    // Si clé d'idempotence passée dans metadata
    if (idempotencyKey) {
      const { data: existing } = await (supabase as any)
        .from("internal_messages")
        .select("id")
        .eq("user_id", userId)
        .contains("metadata", { idempotencyKey })
        .maybeSingle();

      if (existing) {
        return null;
      }
    }

    const { data, error } = await (supabase as any)
      .from("internal_messages")
      .insert({
        user_id: userId,
        sender,
        subject,
        body,
        category,
        is_read: false,
        metadata: { ...metadata, ...(idempotencyKey ? { idempotencyKey } : {}) },
      })
      .select("*")
      .single();

    if (error) {
      console.warn("[InternalMessages] Insert error (table may be pending creation):", error.message);
      return null;
    }

    return data as InternalMessageRow;
  } catch (err: any) {
    console.warn("[InternalMessages] Exception:", err.message);
    return null;
  }
}

/**
 * Récupère les messages internes reçus pour un utilisateur.
 */
export async function getInternalMessages(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 100
): Promise<InternalMessageRow[]> {
  try {
    const { data, error } = await (supabase as any)
      .from("internal_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[InternalMessages] Fetch error:", error.message);
      return [];
    }

    return (data || []) as InternalMessageRow[];
  } catch (err) {
    return [];
  }
}

/**
 * Compte le nombre de messages non lus.
 */
export async function getUnreadMessagesCount(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  try {
    const { count, error } = await (supabase as any)
      .from("internal_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
