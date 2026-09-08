import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-canvas text-center">
      <div className="mx-auto max-w-md space-y-6">
        <span className="inline-block text-6xl font-black text-signal tracking-tighter">
          404
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-ink-950">Page introuvable</h1>
          <p className="text-sm text-ink-500">
            La page que vous recherchez n'existe pas, a été déplacée ou est temporairement inaccessible.
          </p>
        </div>
        <div>
          <Link href="/dashboard" className={buttonClasses("primary", "md")}>
            Retour au Tableau de Bord
          </Link>
        </div>
      </div>
    </div>
  );
}
