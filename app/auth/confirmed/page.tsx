"use client";

import Link from "next/link";
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { RemindMeLogo } from "@/components/landing/remindme-logo";

export default function ConfirmedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-canvas">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/" className="inline-flex items-center group">
            <RemindMeLogo size="md" showText={true} />
          </Link>
        </div>

        {/* Card de Confirmation Réussie */}
        <div className="rounded-3xl border border-ink-200 dark:border-ink-100/15 bg-canvas-raised p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          {/* Badge & Icone Succès */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-positive to-positive/80 text-white shadow-lg shadow-positive/20">
            <CheckCircle2 className="h-9 w-9" strokeWidth={2.2} />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-positive-soft text-positive text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Adresse e-mail vérifiée avec succès</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-ink-950">
              Votre compte est activé !
            </h1>

            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
              Félicitations, votre inscription sur <strong>Remind Me</strong> est maintenant finalisée. Vous avez désormais un accès complet à votre centre de contrôle multi-activités, planning et finances.
            </p>
          </div>

          {/* Rappel bienveillant */}
          <div className="rounded-2xl border border-ink-100 dark:border-ink-100/10 bg-canvas/60 p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-ink-950">
              <ShieldCheck className="h-4 w-4 text-signal shrink-0" />
              <span>Informations de connexion :</span>
            </div>
            <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed pl-6">
              Connectez-vous directement avec <strong>votre adresse e-mail</strong> et <strong>le mot de passe</strong> que vous avez défini lors de votre inscription.
            </p>
          </div>

          {/* Bouton Principal de Connexion */}
          <div className="pt-2">
            <Link
              href="/login?confirmed=true"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-6 py-3.5 text-sm font-bold text-white shadow-gold hover:brightness-110 active:scale-98 transition-all tap-active"
            >
              <span>Se connecter à Remind Me</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-ink-400">
          Remind Me • Vos activités, votre temps et votre argent sous contrôle.
        </p>
      </div>
    </main>
  );
}
