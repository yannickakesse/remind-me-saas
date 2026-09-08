import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Client Supabase côté navigateur (composants "use client").
 * Ne jamais utiliser ce client pour des opérations nécessitant
 * un rôle élevé — il tourne toujours sous la clé publique + RLS.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
