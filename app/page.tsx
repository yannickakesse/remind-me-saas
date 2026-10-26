import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LandingView } from "@/components/landing/landing-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Remind Me — Gérez votre travail, votre temps et votre argent",
  description:
    "Un espace intelligent pour organiser vos activités, maîtriser vos échéances, éviter les conflits d’agenda et garder une vision limpide de vos finances, sans vous éparpiller.",
  keywords: [
    "SaaS",
    "gestion multi-activités",
    "pluriactifs",
    "consultants",
    "freelances",
    "trésorerie",
    "calendrier sans conflit",
    "suivi du temps",
    "rappels intelligents",
  ],
  authors: [{ name: "Remind Me Team" }],
  openGraph: {
    title: "Remind Me — Gérez votre travail, votre temps et votre argent",
    description:
      "Un espace intelligent pour organiser vos activités, maîtriser vos échéances, éviter les conflits d’agenda et garder une vision limpide de vos finances, sans vous éparpiller.",
    url: "https://remind-me-saas.vercel.app",
    siteName: "Remind Me",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Remind Me — Gérez votre travail, votre temps et votre argent",
    description:
      "Un espace intelligent pour organiser vos activités, maîtriser vos échéances, éviter les conflits d’agenda et garder une vision limpide de vos finances, sans vous éparpiller.",
  },
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
