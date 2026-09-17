import { cookies } from "next/headers";
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

  // Optimisation de vitesse : si aucun cookie Supabase n'est présent,
  // ne pas faire d'appel réseau distant vers Supabase Auth.
  const cookieStore = cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") || c.name.includes("auth-token"));

  if (hasAuthCookie) {
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        user = { id: authUser.id, email: authUser.email };
      }
    } catch {
      user = null;
    }
  }

  return <LandingView user={user} />;
}
