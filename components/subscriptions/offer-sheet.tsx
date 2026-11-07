"use client";

/**
 * Présentation des offres Remind Me : une fenêtre premium, honnête et facile à fermer.
 * - Prix réels (dollars, montants de PLAN_ENTITLEMENTS), aucune réduction inventée.
 * - Conditions claires : paiement unique, sans renouvellement automatique.
 * - Rythme et moments : lib/subscriptions/offer-rules.ts (jour 1, puis tous les 2 jours ; fin d'essai ; fin de période).
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, X, Sparkles, ShieldCheck, Clock } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { GuideMascot } from "@/components/onboarding/guide-mascot";
import { usePopupSlot } from "@/lib/ui/popup-queue";
import { PLAN_ENTITLEMENTS, yearlyDiscountPercent } from "@/lib/subscriptions/entitlements";
import { formatUsd } from "@/lib/subscriptions/pricing";
import { pickOffer, isOfferBlockedPath, type OfferVariant, type OfferMemory } from "@/lib/subscriptions/offer-rules";

export interface PlanInfo {
  plan: "free" | "pro" | "premium";
  paidPlan: "free" | "pro" | "premium";
  isTrial: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  periodEnd: string | null;
}

const STORAGE_KEY = "remindme_offer_memory";
/** Délai après l'arrivée sur une page : on ne coupe jamais l'utilisateur dès l'ouverture. */
const SETTLE_DELAY_MS = 25_000;

function readMemory(): OfferMemory {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as OfferMemory;
  } catch {
    return {};
  }
}
function writeMemory(m: OfferMemory) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {}
}
/** Une saisie est en cours (champ actif ou formulaire modifié) : pas d'interruption. */
function isUserTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function OfferSheet({ info, forceVariant }: { info: PlanInfo; /** Aperçu : affiche directement cette offre. */ forceVariant?: OfferVariant }) {
  const { tr, locale } = useLanguage();
  const pathname = usePathname() || "";
  const search = useSearchParams()?.toString() || "";
  const [variant, setVariant] = useState<OfferVariant | null>(forceVariant ?? null);
  const visible = usePopupSlot("offer", variant !== null);
  const recorded = useRef(false);

  // Décide, après un temps d'installation, si une offre doit apparaître sur cette page
  useEffect(() => {
    if (variant || isOfferBlockedPath(pathname, search)) return;
    const timer = setTimeout(() => {
      if (isUserTyping() || document.visibilityState !== "visible") return;
      const next = pickOffer(
        {
          now: Date.now(),
          plan: info.plan,
          paidPlan: info.paidPlan,
          isTrial: info.isTrial,
          trialDaysLeft: info.trialDaysLeft,
          periodEnd: info.periodEnd,
        },
        readMemory()
      );
      if (next) setVariant(next);
    }, SETTLE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname, search, info, variant]);

  // Mémorise l'affichage dès qu'elle est réellement à l'écran
  useEffect(() => {
    if (!visible || !variant || recorded.current) return;
    recorded.current = true;
    const m = readMemory();
    writeMemory({ lastShownAt: Date.now(), shownCount: (m.shownCount ?? 0) + 1, lastVariant: variant });
  }, [visible, variant]);

  const close = () => setVariant(null);
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!visible || !variant) return null;

  const pro = PLAN_ENTITLEMENTS.pro;
  const premium = PLAN_ENTITLEMENTS.premium;
  const discount = yearlyDiscountPercent();
  const dateFmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale || "fr", { day: "numeric", month: "long" }) : "";

  const target = variant === "premium" || (variant === "renew" && info.paidPlan === "premium") ? "premium" : "pro";
  const p = target === "premium" ? premium : pro;

  const content: Record<OfferVariant, { eyebrow: string; title: string; subtitle: string; benefits: string[]; cta: string }> = {
    welcome: {
      eyebrow: tr("Votre compte est gratuit"),
      title: tr("Et il le restera."),
      subtitle: tr("Quand vous voudrez aller plus loin, Pro et Premium sont là, sans engagement."),
      benefits: [
        tr("Rentabilité de chaque activité, à l'heure près"),
        tr("Analyses intelligentes de vos budgets et objectifs"),
        tr("Jusqu'à {n} activités et {c} clients", { n: pro.maxActivities, c: pro.maxClients }),
      ],
      cta: tr("Découvrir les offres"),
    },
    pro: {
      eyebrow: tr("Remind Me Pro"),
      title: tr("Voyez ce que chaque activité vous rapporte vraiment."),
      subtitle: tr("Des analyses claires pour décider plus vite."),
      benefits: [
        tr("Rentabilité de chaque activité, à l'heure près"),
        tr("Analyses intelligentes de vos budgets et objectifs"),
        tr("Jusqu'à {n} activités et {c} clients", { n: pro.maxActivities, c: pro.maxClients }),
      ],
      cta: tr("Passer à Pro"),
    },
    premium: {
      eyebrow: tr("Remind Me Premium"),
      title: tr("Plus aucune limite."),
      subtitle: tr("Pour ceux qui mènent beaucoup de choses de front."),
      benefits: [
        tr("Activités, clients, budgets et objectifs illimités"),
        tr("Toutes les fonctions Pro incluses"),
        tr("Bientôt inclus : assistant IA et voix à votre prénom"),
      ],
      cta: tr("Passer à Premium"),
    },
    trial_ending: {
      eyebrow: info.trialDaysLeft > 1 ? tr("Essai Pro : encore {n} jours", { n: info.trialDaysLeft }) : tr("Essai Pro : dernier jour"),
      title: tr("Gardez vos outils Pro."),
      subtitle: tr("Sans rien faire, vous repassez au forfait Gratuit le {date}. Toutes vos données sont conservées.", { date: dateFmt(info.trialEndsAt) }),
      benefits: [
        tr("Rentabilité de chaque activité, à l'heure près"),
        tr("Analyses intelligentes de vos budgets et objectifs"),
        tr("Jusqu'à {n} activités et {c} clients", { n: pro.maxActivities, c: pro.maxClients }),
      ],
      cta: tr("Continuer avec Pro"),
    },
    renew: {
      eyebrow: tr("Votre forfait {plan}", { plan: tr(p.planName) }),
      title: tr("Se termine le {date}.", { date: dateFmt(info.periodEnd) }),
      subtitle: tr("Renouvelez dès maintenant : la nouvelle période s'ajoute à la suite, aucun jour n'est perdu."),
      benefits: target === "premium"
        ? [tr("Activités, clients, budgets et objectifs illimités"), tr("Toutes les fonctions Pro incluses"), tr("Bientôt inclus : assistant IA et voix à votre prénom")]
        : [tr("Rentabilité de chaque activité, à l'heure près"), tr("Analyses intelligentes de vos budgets et objectifs"), tr("Jusqu'à {n} activités et {c} clients", { n: pro.maxActivities, c: pro.maxClients })],
      cta: tr("Renouveler"),
    },
  };
  const c = content[variant];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="offer-title">
      <button type="button" aria-label={tr("Fermer")} onClick={close} className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px] animate-in fade-in duration-200" />

      <div className="relative w-full max-w-[440px] overflow-hidden rounded-t-[28px] sm:rounded-[28px] bg-canvas-raised dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300 pb-[env(safe-area-inset-bottom,0px)]">
        {/* Bandeau d'ouverture */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#214E3B] via-[#1A3E2F] to-[#153326] px-6 pb-7 pt-6 text-white">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#D99A24]/25 blur-2xl" />
          <button type="button" onClick={close} aria-label={tr("Fermer")} className="absolute right-3.5 top-3.5 rounded-full bg-white/10 p-1.5 text-white/80 hover:bg-white/20 hover:text-white">
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20">
              <GuideMascot className="h-9 w-9" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F5D9A0] ring-1 ring-white/15">
              {variant === "trial_ending" || variant === "renew" ? <Clock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {c.eyebrow}
            </span>
          </div>
          <h2 id="offer-title" className="relative mt-4 text-[22px] font-extrabold leading-tight tracking-tight sm:text-2xl">{c.title}</h2>
          <p className="relative mt-1.5 text-sm leading-relaxed text-white/80">{c.subtitle}</p>
        </div>

        {/* Avantages */}
        <ul className="space-y-2.5 px-6 pt-5">
          {c.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-ink-800 dark:text-ink-100">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {/* Prix et conditions */}
        <div className="mx-6 mt-5 rounded-2xl border border-ink-200/80 dark:border-white/10 bg-ivory/70 dark:bg-white/[0.03] px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold text-ink-600 dark:text-ink-300">{tr(p.planName)}</p>
            <p className="tabular-nums">
              <span className="text-2xl font-extrabold text-ink-950 dark:text-white">{formatUsd(p.priceMonthly)}</span>
              <span className="ml-1 text-xs text-ink-500">{tr("/ mois")}</span>
            </p>
          </div>
          <p className="mt-0.5 text-right text-[11px] text-ink-500">
            {tr("ou {amount} par an (−{d} %)", { amount: formatUsd(p.priceYearly), d: discount })}
          </p>
          <p className="mt-2 flex items-start gap-1.5 border-t border-ink-200/70 dark:border-white/10 pt-2 text-[11px] leading-relaxed text-ink-500">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" />
            {tr("Paiement unique, sans renouvellement automatique. Mobile money ou carte. Vos données restent toujours à vous.")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-6 pb-6 pt-5">
          <Link
            href="/settings?tab=subscription"
            onClick={close}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#214E3B] text-sm font-bold text-white shadow-lg shadow-[#214E3B]/25 transition-colors hover:bg-[#1A3E2F]"
          >
            {c.cta}
          </Link>
          <button type="button" onClick={close} className="h-10 rounded-2xl text-sm font-semibold text-ink-600 hover:bg-ink-100/70 dark:text-ink-300 dark:hover:bg-white/5">
            {tr("Plus tard")}
          </button>
        </div>
      </div>
    </div>
  );
}
