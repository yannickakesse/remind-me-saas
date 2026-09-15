import { createClient } from "@/lib/supabase/server";
import { LandingView } from "@/components/landing/landing-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Remind Me — Gérez votre travail, votre temps et votre argent. En parfait contrôle.",
  description:
    "Le premier centre de contrôle tout-en-un pour indépendants, consultants, enseignants et pluriactifs. Gestion multi-activités, calendrier intelligent avec détection des conflits, trésorerie et dépenses programmées.",
};

export default async function HomePage() {
  let user: { id: string; email?: string } | null = null;
  
  try {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      user = { id: authUser.id, email: authUser.email };
    }
  } catch {
    // Mode hors connexion ou non connecté
    user = null;
  }

  return <LandingView user={user} />;
}
