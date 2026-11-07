"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

/** Page « Le fondateur » (/fondateur), ouverte depuis le pied de page. Informations fournies par le fondateur. */
export const FOUNDER = {
  name: "Yannick Akesse",
  photo: "/brand/founder-yannick.jpg",
  website: "https://speakproacademy.net",
  websiteLabel: "speakproacademy.net",
};

export function FounderProfile() {
  const { tr } = useLanguage();
  const roles = [tr("Entrepreneur"), tr("Coach en anglais"), tr("Vibe coder"), tr("Boutique en ligne")];

  return (
    <section className="pt-28 pb-20 sm:pt-36 sm:pb-24 bg-canvas transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-white transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          {tr("Retour à l'accueil")}
        </Link>
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
            {tr("Le fondateur")}
          </span>
        </div>

        <div className="rounded-3xl border border-ink-200/80 dark:border-ink-800 bg-canvas-raised shadow-sm p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
          <div className="shrink-0">
            <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full p-1 bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
              <Image
                src={FOUNDER.photo}
                alt={FOUNDER.name}
                width={160}
                height={160}
                className="h-full w-full rounded-full object-cover border-4 border-canvas-raised"
              />
            </div>
          </div>

          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">{FOUNDER.name}</h2>
            <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-400">
              {tr("Fondateur de Remind Me et de Speak Pro Academy")}
            </p>
            <p className="text-xs text-ink-500 mt-0.5">{tr("Entrepreneur et créateur d'entreprises")}</p>

            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
              {roles.map((r) => (
                <span key={r} className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1 text-[11px] font-semibold text-ink-700 dark:text-ink-200">
                  {r}
                </span>
              ))}
            </div>

            <p className="mt-5 text-sm sm:text-base leading-relaxed text-ink-700 dark:text-ink-300">
              {tr("Coach en anglais, chef d'entreprise et vibe coder, je mène plusieurs activités de front : Speak Pro Academy, une boutique en ligne et de nouveaux projets. J'ai créé Remind Me pour réunir au même endroit les activités, les rendez-vous et l'argent de celles et ceux qui, comme moi, font plusieurs métiers à la fois.")}
            </p>

            <a
              href={FOUNDER.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-950 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              {FOUNDER.websiteLabel}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
