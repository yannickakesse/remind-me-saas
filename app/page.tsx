import { getTr, getServerLocale } from "@/lib/i18n/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LandingView } from "@/components/landing/landing-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// Titre et description dans la langue du visiteur (onglet du navigateur, partage, moteurs de recherche)
export async function generateMetadata(): Promise<Metadata> {
  const tr = await getTr();
  const title = tr("Remind Me — Gérez votre travail, votre temps et votre argent");
  const description = tr("Un espace intelligent pour organiser vos activités, maîtriser vos échéances, éviter les conflits d’agenda et garder une vision limpide de vos finances, sans vous éparpiller.");
  return {
    title,
    description,
    authors: [{ name: "Remind Me Team" }],
    openGraph: {
      title,
      description,
      url: "https://remind-me-saas-ybkc.vercel.app",
      siteName: "Remind Me",
      locale: getServerLocale(),
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

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
