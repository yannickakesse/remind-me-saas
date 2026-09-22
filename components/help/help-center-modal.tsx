"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  HelpCircle,
  X,
  Sparkles,
  BookOpen,
  HelpCircle as QuestionIcon,
  Wallet,
  Calendar,
  Briefcase,
  CheckSquare,
  BarChart3,
  Bell,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CheckCircle2,
  Users,
  Info,
} from "lucide-react";
import { triggerInteractiveTour, triggerContextualTour } from "@/components/onboarding/interactive-product-tour";

interface PageGuideInfo {
  title: string;
  subtitle: string;
  icon: any;
  summary: string;
  tips: { title: string; desc: string }[];
}

const PAGE_GUIDES: Record<string, PageGuideInfo> = {
  "/dashboard": {
    title: "Guide du Tableau de Bord",
    subtitle: "Votre vue d'ensemble quotidienne",
    icon: Briefcase,
    summary:
      "Le tableau de bord synthétise toutes vos activités, vos priorités du jour et la santé réelle de votre trésorerie en une seule page.",
    tips: [
      {
        title: "Solde Net Réel",
        desc: "Correspond exactement aux Revenus Encaissés moins les Dépenses Réellement Payées. Les revenus en attente n'augmentent pas votre solde.",
      },
      {
        title: "Panneau 'Nécessite votre attention'",
        desc: "Regroupe automatiquement vos factures échues, tâches en retard et alertes de conflits d'horaires.",
      },
      {
        title: "Actions Rapides",
        desc: "Permet de créer directement une activité, une tâche ou une dépense sans changer de page.",
      },
    ],
  },
  "/activities": {
    title: "Guide des Activités",
    subtitle: "Vos différents métiers et missions",
    icon: Briefcase,
    summary:
      "Une activité représente un travail salarié, un contrat freelance, une entreprise ou un coaching avec sa propre rémunération et fréquence.",
    tips: [
      {
        title: "Couleur de Référence",
        desc: "La couleur choisie lors de la création de l'activité colore automatiquement tous vos créneaux dans le calendrier.",
      },
      {
        title: "Fréquence & Rémunération",
        desc: "Détermine comment Remind Me anticipe vos paiements attendus (mensuel, par session, par projet, horaire).",
      },
      {
        title: "Modification du Montant",
        desc: "Si vous ajustez le prix d'une activité, la nouvelle valeur s'applique aux futurs paiements sans altérer l'historique déjà encaissé.",
      },
    ],
  },
  "/calendar": {
    title: "Guide du Calendrier & Planning",
    subtitle: "4 vues pour maîtriser votre temps",
    icon: Calendar,
    summary:
      "Retrouvez toutes vos séances d'activités récurrentes, vos rendez-vous et les échéances de vos dépenses programmées.",
    tips: [
      {
        title: "Détection des Conflits",
        desc: "Si deux activités se chevauchent dans le même créneau, un badge rouge d'alerte s'affiche instantanément.",
      },
      {
        title: "Dépenses Programmées dans le Planning",
        desc: "Vos factures à payer apparaissent sous forme de pastilles ambrées à la date de leur échéance.",
      },
      {
        title: "Navigation Rapide",
        desc: "Basculez entre les vues Mois, Semaine, Jour et Agenda selon votre besoin de granularité.",
      },
    ],
  },
  "/tasks": {
    title: "Guide des Tâches & Rappels",
    subtitle: "Gestion agile de vos priorités",
    icon: CheckSquare,
    summary:
      "Suivez vos tâches par activité et niveau d'urgence. Programmez des rappels sonores pour ne jamais être pris au dépourvu.",
    tips: [
      {
        title: "Cycle de Vie",
        desc: "Une tâche commence 'À faire', passe 'En cours' quand vous la débutez, et devient 'Terminée' une fois achevée.",
      },
      {
        title: "Rappels Sonores Réels",
        desc: "Définissez un rappel (ex: 15 min avant) : vous entendrez le carillon Remind Me et recevrez une notification au moment exact.",
      },
      {
        title: "Bouton Reporter",
        desc: "Décalez rapidement une tâche à demain ou à la semaine prochaine en 1 clic.",
      },
    ],
  },
  "/finances": {
    title: "Guide Financier & Trésorerie",
    subtitle: "Le modèle financier de Remind Me",
    icon: Wallet,
    summary:
      "Un suivi financier ultra-rigoureux qui bannit les approximations : distinguez l'attendu du réel en toute clarté.",
    tips: [
      {
        title: "Revenu Attendu vs Encaissé",
        desc: "Un revenu prévu n'est pas encore acquis. Cliquez sur '✓ Marquer comme encaissé' pour l'ajouter au solde net réel.",
      },
      {
        title: "Dépense Programmée vs Payée",
        desc: "Prévoyez vos loyers et abonnements. Dès qu'une dépense est décaissée, marquez-la comme payée pour l'inscrire à l'historique.",
      },
      {
        title: "Budgets Mensuels",
        desc: "Fixez des plafonds par catégorie. La jauge progresse uniquement au rythme de vos dépenses réellement payées.",
      },
      {
        title: "Épargne & Objectifs",
        desc: "Mettez de l'argent de côté pour vos projets et suivez votre pourcentage de progression.",
      },
    ],
  },
  "/clients": {
    title: "Guide Clients & Organisations",
    subtitle: "Votre carnet d'adresses professionnel",
    icon: Users,
    summary:
      "Structurez vos relations d'affaires : créez des organisations (entreprises clientes, écoles, institutions) et rattachez-y des contacts.",
    tips: [
      {
        title: "Liaison aux Activités",
        desc: "Associez vos activités à un client pour regrouper tous les revenus et rapports liés à ce partenaire.",
      },
      {
        title: "Coordonnées Directes",
        desc: "Numéros de téléphone et emails accessibles en un clic pour vos relances.",
      },
    ],
  },
  "/reports": {
    title: "Guide des Rapports & Rentabilité",
    subtitle: "Analysez la valeur de votre temps",
    icon: BarChart3,
    summary:
      "Générez des analyses détaillées basées exclusivement sur vos transactions réelles et évaluez votre rentabilité horaire.",
    tips: [
      {
        title: "Rentabilité par Heure Investie",
        desc: "Calcule vos revenus réels divisés par les heures enregistrées dans le calendrier pour identifier vos activités les plus profitables.",
      },
      {
        title: "Évolution Mensuelle Réelle",
        desc: "Graphiques précis mois par mois construits à partir des dates effectives d'encaissement et de paiement.",
      },
      {
        title: "Export CSV Conforme",
        desc: "Téléchargez l'intégralité de vos écritures comptables avec métadonnées et synthèse certifiée.",
      },
    ],
  },
  "/notifications": {
    title: "Guide des Notifications & Alertes",
    subtitle: "Restez informé en temps réel",
    icon: Bell,
    summary:
      "Le centre de notifications centralise toutes vos alertes : tâches à échéance, séances du planning, rappels de paiement et factures échues.",
    tips: [
      {
        title: "Alertes Audio & Carillon",
        desc: "Une notification sonore retentit à l'heure précise configurée pour vos rappels de tâches et rendez-vous.",
      },
      {
        title: "Actions Directes",
        desc: "Validez un encaissement ou marquez une tâche comme terminée directement depuis le volet des notifications.",
      },
      {
        title: "Push Mobile",
        desc: "Activez les notifications push dans vos Paramètres pour recevoir vos alertes même lorsque l'application est en arrière-plan.",
      },
    ],
  },
  "/settings": {
    title: "Guide des Paramètres",
    subtitle: "Personnalisation & Notifications",
    icon: Bell,
    summary:
      "Gérez vos informations de compte, vos devises par défaut, vos fuseaux horaires et configurez vos canaux de notifications.",
    tips: [
      {
        title: "Alertes Audio & Push Mobile",
        desc: "Testez votre sonnerie avec le bouton dédié et activez les notifications push pour vos appareils mobiles.",
      },
      {
        title: "Thème & Apparence",
        desc: "Basculez entre le mode Clair, Sombre ou Système selon votre préférence visuelle.",
      },
      {
        title: "Relance du Guide Interactif",
        desc: "Vous pouvez à tout moment relancer la visite guidée pour vous remémorer les fonctionnalités de l'application.",
      },
    ],
  },
};

const ROUTE_TO_SECTION: Record<string, string> = {
  "/dashboard": "dashboard",
  "/activities": "activities",
  "/calendar": "calendar",
  "/tasks": "tasks",
  "/finances": "finances",
  "/clients": "clients",
  "/reports": "reports",
  "/notifications": "notifications",
  "/settings": "settings",
};

const DEFAULT_GUIDE: PageGuideInfo = PAGE_GUIDES["/dashboard"]!;

export function HelpCenterButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"page" | "concepts" | "faq">("page");
  const pathname = usePathname() || "/dashboard";

  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fermeture par la touche Escape et verrouillage du défilement d'arrière-plan
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    // Focus automatique sur le premier élément interactif du modal
    const timer = setTimeout(() => {
      const focusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerButtonRef.current?.focus();
    };
  }, [isOpen]);

  // Trouver le guide correspondant à la route active
  const baseRoute =
    Object.keys(PAGE_GUIDES).find(
      (route) => pathname === route || pathname.startsWith(route + "/")
    ) || "/dashboard";

  const currentGuide: PageGuideInfo = PAGE_GUIDES[baseRoute] ?? DEFAULT_GUIDE;
  const GuideIcon = currentGuide.icon;

  function handleStartTour() {
    setIsOpen(false);
    triggerInteractiveTour();
  }

  function handleStartContextualTour() {
    setIsOpen(false);
    const sectionKey = ROUTE_TO_SECTION[baseRoute] || "finances";
    if (sectionKey === "dashboard") {
      triggerInteractiveTour();
    } else {
      triggerContextualTour(sectionKey);
    }
  }

  return (
    <>
      {/* Bouton d'aide permanent '?' */}
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="help-center-modal"
        className="group flex items-center gap-1.5 rounded-lg border border-ink-200 bg-canvas-raised px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:border-gold/60 hover:bg-gold/10 hover:text-gold-dark dark:hover:text-gold-light transition-all shadow-2xs active:scale-95 tap-active"
        title="Centre d'aide & Guide d'utilisation"
        aria-label="Ouvrir le centre d'aide"
        data-tour="help-center-btn"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-gold-dark dark:text-gold-light font-extrabold text-xs group-hover:scale-110 transition-transform">
          ?
        </span>
        <span className="hidden sm:inline">Aide</span>
      </button>

      {/* Rendu du Modal / Drawer via Portal vers document.body pour échapper aux stacking contexts */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            id="help-center-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden"
          >
            {/* Backdrop / Arrière-plan flouté et sombre */}
            <div
              className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Conteneur du Panneau (Bottom Sheet sur Mobile, Modal Centré sur Desktop) */}
            <div
              ref={modalRef}
              className="relative z-10 flex flex-col w-full sm:max-w-2xl max-h-[88dvh] sm:max-h-[85vh] bg-canvas-raised border-t sm:border border-ink-200 dark:border-ink-100/15 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            >
              {/* Poignée tactile mobile (Drag Handle Pill) */}
              <div className="sm:hidden flex items-center justify-center pt-2.5 pb-1 bg-canvas/60">
                <div className="w-10 h-1 rounded-full bg-ink-300 dark:bg-ink-700" />
              </div>

              {/* En-tête du panneau */}
              <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-100/10 px-4 py-3 sm:px-6 sm:py-4 bg-canvas/70">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-r from-gold to-gold-dark text-white shadow-gold-subtle font-black text-xs sm:text-sm shrink-0">
                    ?
                  </span>
                  <div className="min-w-0">
                    <h2
                      id="help-title"
                      className="text-sm sm:text-base font-extrabold text-ink-950 tracking-tight flex items-center gap-2 truncate"
                    >
                      <span>Centre d'Aide</span>
                      <span className="hidden sm:inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-gold/15 text-gold-dark dark:text-gold-light border border-gold/30">
                        {currentGuide.title}
                      </span>
                    </h2>
                    <p className="text-[11px] sm:text-xs text-ink-500 truncate">
                      {currentGuide.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-100/10 hover:text-ink-950 transition-colors shrink-0"
                  aria-label="Fermer le centre d'aide"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Onglets de navigation */}
              <div className="flex border-b border-ink-100 dark:border-ink-100/10 bg-canvas/40 px-4 sm:px-6 pt-2 gap-1.5 sm:gap-2 text-xs font-semibold overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab("page")}
                  className={`flex items-center gap-1.5 pb-2.5 px-2.5 sm:px-3 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === "page"
                      ? "border-gold text-gold-dark dark:text-gold-light font-bold"
                      : "border-transparent text-ink-500 hover:text-ink-900 dark:hover:text-ink-300"
                  }`}
                >
                  <GuideIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>Guide de la page</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("concepts")}
                  className={`flex items-center gap-1.5 pb-2.5 px-2.5 sm:px-3 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === "concepts"
                      ? "border-gold text-gold-dark dark:text-gold-light font-bold"
                      : "border-transparent text-ink-500 hover:text-ink-900 dark:hover:text-ink-300"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span>Concepts Clés</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("faq")}
                  className={`flex items-center gap-1.5 pb-2.5 px-2.5 sm:px-3 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === "faq"
                      ? "border-gold text-gold-dark dark:text-gold-light font-bold"
                      : "border-transparent text-ink-500 hover:text-ink-900 dark:hover:text-ink-300"
                  }`}
                >
                  <QuestionIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>FAQ & Visite</span>
                </button>
              </div>

              {/* Contenu avec défilement propre */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
                {/* ONGLET 1: GUIDE DE LA PAGE ACTIVE */}
                {activeTab === "page" && (
                  <div className="space-y-4 animate-in fade-in-50 duration-150">
                    <div className="rounded-2xl border border-gold/30 bg-gold/5 dark:bg-gold/10 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-gold-dark dark:text-gold-light font-bold text-sm">
                          <GuideIcon className="h-4 w-4 shrink-0" />
                          <span>{currentGuide.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleStartContextualTour}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-3.5 py-2 text-xs font-bold text-white shadow-gold-subtle hover:brightness-110 active:scale-95 transition-all shrink-0 tap-active"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Visite guidée de cette page</span>
                        </button>
                      </div>
                      <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed">
                        {currentGuide.summary}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                        Points clés à retenir :
                      </h3>
                      <div className="grid grid-cols-1 gap-2.5">
                        {currentGuide.tips.map((tip, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-ink-200 dark:border-ink-100/10 bg-canvas/60 dark:bg-canvas/40 p-3.5 space-y-1 hover:border-ink-300 dark:hover:border-ink-100/20 transition-colors"
                          >
                            <p className="text-xs font-bold text-ink-950 flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-positive shrink-0" />
                              <span>{tip.title}</span>
                            </p>
                            <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed pl-5.5">
                              {tip.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ONGLET 2: LES CONCEPTS CLÉS FINANCIERS & ORGANISATIONNELS */}
                {activeTab === "concepts" && (
                  <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                    <p className="text-xs text-ink-600 dark:text-ink-400">
                      Remind Me applique des règles de gestion financière strictes et transparentes pour vous éviter les approximations :
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-ink-200 dark:border-ink-100/10 bg-canvas/60 dark:bg-canvas/40 p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-gold-dark dark:text-gold-light font-bold text-xs">
                          <TrendingUp className="h-4 w-4 shrink-0" />
                          <span>Revenu Attendu vs Encaissé</span>
                        </div>
                        <p className="text-[11px] text-ink-600 dark:text-ink-400 leading-relaxed">
                          <strong>Attendu :</strong> Montant théorique calculé selon vos fréquences d'activité.<br />
                          <strong>Encaissé :</strong> Argent réellement reçu sur votre compte bancaire.
                        </p>
                      </div>

                      <div className="rounded-xl border border-ink-200 dark:border-ink-100/10 bg-canvas/60 dark:bg-canvas/40 p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-danger font-bold text-xs">
                          <TrendingDown className="h-4 w-4 shrink-0" />
                          <span>Dépense Programmée vs Payée</span>
                        </div>
                        <p className="text-[11px] text-ink-600 dark:text-ink-400 leading-relaxed">
                          <strong>Programmée :</strong> Échéance future ou abonnement récurrent à anticiper.<br />
                          <strong>Payée :</strong> Facture décaissée et enregistrée en trésorerie.
                        </p>
                      </div>

                      <div className="rounded-xl border border-ink-200 dark:border-ink-100/10 bg-canvas/60 dark:bg-canvas/40 p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-positive font-bold text-xs">
                          <Wallet className="h-4 w-4 shrink-0" />
                          <span>Solde Net Réel</span>
                        </div>
                        <p className="text-[11px] text-ink-600 dark:text-ink-400 leading-relaxed">
                          Calculé par la formule exacte :<br />
                          <span className="inline-block font-mono text-[10px] bg-canvas px-1.5 py-0.5 rounded border border-ink-200 dark:border-ink-100/20 my-0.5">
                            Revenus Encaissés − Dépenses Payées
                          </span>
                        </p>
                      </div>

                      <div className="rounded-xl border border-ink-200 dark:border-ink-100/10 bg-canvas/60 dark:bg-canvas/40 p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-signal font-bold text-xs">
                          <PiggyBank className="h-4 w-4 shrink-0" />
                          <span>Budgets & Épargne</span>
                        </div>
                        <p className="text-[11px] text-ink-600 dark:text-ink-400 leading-relaxed">
                          <strong>Budget :</strong> Plafond mensuel par catégorie.<br />
                          <strong>Épargne :</strong> Cagnottes et objectifs financiers progressifs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ONGLET 3: FAQ & RELANCE DE VISITE GUIDÉE */}
                {activeTab === "faq" && (
                  <div className="space-y-4 animate-in fade-in-50 duration-150">
                    <div className="rounded-2xl border border-gold/30 bg-gold/5 dark:bg-gold/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <h4 className="text-xs font-bold text-ink-950 flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-gold shrink-0" />
                          <span>Visite Guidée Interactive Complète</span>
                        </h4>
                        <p className="text-xs text-ink-500 mt-0.5">
                          Découvrez les fonctionnalités de Remind Me étape par étape.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartTour}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-3.5 py-2 text-xs font-bold text-white shadow-gold-subtle hover:brightness-110 active:scale-95 transition-all shrink-0 tap-active"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Lancer la visite</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                        Questions Fréquentes :
                      </h4>
                      <div className="space-y-2">
                        <div className="rounded-xl border border-ink-200 dark:border-ink-100/10 bg-canvas/40 p-3 text-xs space-y-1">
                          <p className="font-bold text-ink-900 dark:text-ink-100">
                            Comment fonctionnent les rappels sonores de tâches ?
                          </p>
                          <p className="text-ink-600 dark:text-ink-400 text-[11px]">
                            Rendez-vous dans <strong>Paramètres → Notifications</strong> pour activer la sonnerie. Le carillon retentira automatiquement à l'heure programmée de vos tâches et rendez-vous.
                          </p>
                        </div>

                        <div className="rounded-xl border border-ink-200 dark:border-ink-100/10 bg-canvas/40 p-3 text-xs space-y-1">
                          <p className="font-bold text-ink-900 dark:text-ink-100">
                            Comment exporter mes finances au format Excel / CSV ?
                          </p>
                          <p className="text-ink-600 dark:text-ink-400 text-[11px]">
                            Sur la page <strong>Finances</strong> ou <strong>Rapports</strong>, cliquez sur le bouton <strong>"Exporter CSV"</strong>. Le fichier généré intègre un formatage compatible Excel en français (séparateur point-virgule).
                          </p>
                        </div>

                        <div className="rounded-xl border border-ink-200 dark:border-ink-100/10 bg-canvas/40 p-3 text-xs space-y-1">
                          <p className="font-bold text-ink-900 dark:text-ink-100">
                            Mes données d'activités et financières sont-elles sécurisées ?
                          </p>
                          <p className="text-ink-600 dark:text-ink-400 text-[11px]">
                            Oui, chaque compte utilisateur est strictement isolé grâce à la sécurité Row-Level Security (RLS) de PostgreSQL. Seul votre compte peut lire et modifier vos données.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer avec action de fermeture */}
              <div className="flex items-center justify-between border-t border-ink-100 dark:border-ink-100/10 bg-canvas/80 px-4 py-3 sm:px-6 sm:py-3.5 pb-safe">
                <span className="text-[11px] text-ink-500 hidden sm:inline">
                  Remind Me • Multi-activités, planning et rentabilité
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full sm:w-auto rounded-xl bg-ink-950 dark:bg-ink-100 text-canvas dark:text-ink-950 px-4 py-2 text-xs font-bold hover:opacity-90 active:scale-95 transition-all text-center"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
