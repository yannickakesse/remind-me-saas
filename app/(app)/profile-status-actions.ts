"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { USER_STATUS_VALUES } from "@/lib/profile/status";
import { msg } from "@/lib/i18n/catalog";

/** Enregistre le statut (« Vous êtes… ») d'un utilisateur déjà inscrit. */
export async function saveProfileStatus(status: string): Promise<{ ok: boolean; error?: string }> {
  if (!USER_STATUS_VALUES.includes(status)) return { ok: false, error: msg("Choisissez ce qui vous décrit le mieux.") };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: msg("Non authentifié. Veuillez vous reconnecter.") };
  const { error } = await supabase.from("profiles").update({ status } as any).eq("id", user.id);
  if (error) return { ok: false, error: msg("Impossible d'enregistrer votre statut. Réessayez.") };
  revalidatePath("/dashboard");
  return { ok: true };
}
