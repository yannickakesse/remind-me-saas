"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface TourState {
  completed?: boolean;
  skipped?: boolean;
  lastStep?: number;
  completedAt?: string;
}

export async function saveTourState(state: TourState) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Non authentifié" };

  try {
    const { data: currentSettings } = await supabase
      .from("user_settings")
      .select("ui_prefs")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingUiPrefs = (currentSettings?.ui_prefs as Record<string, unknown>) || {};
    const updatedUiPrefs = {
      ...existingUiPrefs,
      tour_state: {
        ...(existingUiPrefs.tour_state as Record<string, unknown> || {}),
        ...state,
        updated_at: new Date().toISOString(),
      },
    };

    const { error } = await supabase
      .from("user_settings")
      .update({ ui_prefs: updatedUiPrefs })
      .eq("user_id", user.id);

    if (error) {
      console.error("[TourActions] Error saving tour state:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[TourActions] Exception saving tour state:", err);
    return { success: false, error: err?.message || "Erreur serveur" };
  }
}

export async function resetTourState() {
  return saveTourState({ completed: false, skipped: false, lastStep: 0 });
}
