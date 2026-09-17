import { cache } from "react";
import { createClient } from "./server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Récupère l'utilisateur connecté avec mise en cache par requête (React.cache).
 * Évite les multiples appels réseau redondants vers Supabase Auth au sein du même cycle de rendu.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
});

/**
 * Exige un utilisateur authentifié ou redirige immédiatement vers /login.
 */
export const requireCurrentUser = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
});

/**
 * Récupère le profil de l'utilisateur avec mise en cache par requête (React.cache).
 * Permet au layout et aux pages de partager le profil sans refaire une requête SQL.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
});
