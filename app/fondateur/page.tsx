import type { Metadata } from "next";
import { getTr } from "@/lib/i18n/server";
import { FounderView } from "@/components/landing/founder-view";

// Page publique « Le fondateur », ouverte depuis le pied de page de la landing
export async function generateMetadata(): Promise<Metadata> {
  const tr = await getTr();
  const title = tr("Le fondateur");
  const description = tr("Fondateur de Remind Me et de Speak Pro Academy");
  return {
    title,
    description,
    openGraph: { title, description, url: "https://tryremind-me.vercel.app/fondateur", siteName: "Remind Me", type: "profile", images: ["/brand/founder-yannick.jpg"] },
  };
}

export default function FounderPage() {
  return <FounderView />;
}
