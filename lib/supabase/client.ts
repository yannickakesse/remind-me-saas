import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Client Supabase côté navigateur (composants "use client").
 * Ne jamais utiliser ce client pour des opérations nécessitant
 * un rôle élevé — il tourne toujours sous la clé publique + RLS.
 */
export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey
  );
}
