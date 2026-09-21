"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { triggerInteractiveTour } from "@/components/onboarding/interactive-product-tour";

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
    icon: Briefcase,
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

const DEFAULT_GUIDE: PageGuideInfo = PAGE_GUIDES["/dashboard"]!;

export function HelpCenterButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"page" | "concepts" | "faq">("page");
  const pathname = usePathname() || "/dashboard";

  // Trouver le guide correspondant à la route active
  const baseRoute = Object.keys(PAGE_GUIDES).find((route) =>
    pathname === route || pathname.startsWith(route + "/")
  ) || "/dashboard";

  const currentGuide: PageGuideInfo = PAGE_GUIDES[baseRoute] ?? DEFAULT_GUIDE;
  const GuideIcon = currentGuide.icon;

  function handleStartTour() {
    setIsOpen(false);
    triggerInteractiveTour();
  }

  return (
    <>
      {/* Bouton d'aide permanent '?' */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-1.5 rounded-lg border border-ink-200 bg-canvas-raised px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:border-gold/60 hover:bg-gold/10 hover:text-gold-dark dark:hover:text-gold-light transition-all shadow-2xs active:scale-95"
        title="Centre d'aide & Comment ça marche ? (Besoin d'aide ?)"
        aria-label="Ouvrir le centre d'aide"
        data-tour="help-center-btn"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-gold-dark dark:text-gold-light font-extrabold text-xs group-hover:scale-110 transition-transform">
          ?
        </span>
        <span className="hidden sm:inline">Aide</span>
      </button>

      {/* Modal / Drawer Centre d'Aide */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
        >
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-ink-200 bg-canvas-raised shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 bg-canvas/60">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-gold to-gold-dark text-white shadow-gold-subtle font-extrabold text-sm">
                  ?
                </span>
                <div>
                  <h2 id="help-title" className="text-lg font-extrabold text-ink-950 tracking-tight">
                    Centre d'Aide Remind Me
                  </h2>
                  <p className="text-xs text-ink-500">
                    Comprendre, maîtriser et tirer le meilleur de votre plateforme.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Onglets de navigation */}
            <div className="flex border-b border-ink-100 bg-canvas/40 px-5 pt-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("page")}
                className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === "page"
                    ? "border-gold text-gold-dark dark:text-gold-light"
                    : "border-transparent text-ink-500 hover:text-ink-900"
                }`}
              >
                <GuideIcon className="h-3.5 w-3.5" /> Guide de cette page
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("concepts")}
                className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === "concepts"
                    ? "border-gold text-gold-dark dark:text-gold-light"
                    : "border-transparent text-ink-500 hover:text-ink-900"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" /> Les Concepts Clés
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("faq")}
                className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === "faq"
                    ? "border-gold text-gold-dark dark:text-gold-light"
                    : "border-transparent text-ink-500 hover:text-ink-900"
                }`}
              >
                <QuestionIcon className="h-3.5 w-3.5" /> FAQ & Visite
              </button>
            </div>

            {/* Contenu avec défilement */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* TAB 1: GUIDE DE LA PAGE ACTIVE */}
              {activeTab === "page" && (
                <div className="space-y-4 animate-in fade-in-50 duration-150">
                  <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-gold-dark dark:text-gold-light font-bold text-sm">
                      <GuideIcon className="h-4 w-4" />
                      <span>{currentGuide.title}</span>
                    </div>
                    <p className="text-xs text-ink-700 leading-relaxed">
                      {currentGuide.summary}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                      Fonctionnalités essentielles à connaître :
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {currentGuide.tips.map((tip, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-ink-200 bg-canvas/60 p-3.5 space-y-1 hover:border-ink-300 transition-colors"
                        >
                          <p className="text-xs font-bold text-ink-950 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-positive shrink-0" />
                            {tip.title}
                          </p>
                          <p className="text-xs text-ink-600 leading-relaxed pl-5">
                            {tip.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LES CONCEPTS CLÉS FINANCIERS & ORGANISATIONNELS */}
              {activeTab === "concepts" && (
                <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                  <p className="text-xs text-ink-600">
                    Remind Me repose sur des règles de gestion simples et transparentes :
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-ink-200 bg-canvas/60 p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-gold-dark font-bold text-xs">
                        <TrendingUp className="h-4 w-4" />
                        Revenu Attendu vs Encaissé
                      </div>
                      <p className="text-[11px] text-ink-600 leading-relaxed">
                        <strong>Attendu :</strong> Argent que vous devez recevoir selon la fréquence de vos activités.<br />
                        <strong>Encaissé :</strong> Argent effectivement payé par votre client et validé dans Remind Me.
                      </p>
                    </div>

                    <div className="rounded-xl border border-ink-200 bg-canvas/60 p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-danger font-bold text-xs">
                        <TrendingDown className="h-4 w-4" />
                        Dépense Programmée vs Payée
                      </div>
                      <p className="text-[11px] text-ink-600 leading-relaxed">
                        <strong>Programmée :</strong> Facture future ou abonnement récurrent à payer.<br />
                        <strong>Payée :</strong> Facture décaissée, inscrite définitivement dans votre historique de trésorerie.
                      </p>
                    </div>

                    <div className="rounded-xl border border-ink-200 bg-canvas/60 p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-positive font-bold text-xs">
                        <Wallet className="h-4 w-4" />
                        Solde Net Réel
                      </div>
                      <p className="text-[11px] text-ink-600 leading-relaxed">
                        Calculé par la formule stricte :<br />
                        <span className="font-mono text-[10px] bg-canvas px-1.5 py-0.5 rounded border border-ink-200">
                          Revenus Encaissés − Dépenses Payées
                        </span><br />
                        Aucune estimation incertaine n'entre dans ce calcul.
                      </p>
                    </div>

                    <div className="rounded-xl border border-ink-200 bg-canvas/60 p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-signal font-bold text-xs">
                        <PiggyBank className="h-4 w-4" />
                        Budgets & Épargne
                      </div>
                      <p className="text-[11px] text-ink-600 leading-relaxed">
                        <strong>Budget :</strong> Plafond de dépense mensuel surveillé en temps réel.<br />
                        <strong>Épargne :</strong> Cagnottes et objectifs financiers à atteindre.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FAQ & RELANCE DE VISITE GUIDÉE */}
              {activeTab === "faq" && (
                <div className="space-y-4 animate-in fade-in-50 duration-150">
                  <div className="rounded-xl border border-ink-200 bg-canvas-raised p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-bold text-ink-950 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-gold" />
                        Visite Guidée Interactive
                      </h4>
                      <p className="text-xs text-ink-500 mt-0.5">
                        Relancez le tour pas-à-pas avec mise en avant dynamique des éléments.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartTour}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-dark px-3 py-1.5 text-xs font-bold text-white shadow-gold-subtle hover:brightness-110 active:scale-95 transition-all shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Lancer la visite
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                      Questions Fréquentes :
                    </h4>
                    <div className="space-y-2">
                      <div className="rounded-xl border border-ink-200 bg-canvas/40 p-3 text-xs space-y-1">
                        <p className="font-bold text-ink-900">
                          Comment activer les alertes sonores de rappels de tâches ?
                        </p>
                        <p className="text-ink-600 text-[11px]">
                          Rendez-vous dans <strong>Paramètres → Notifications</strong> et activez l'interrupteur sonore. Vous pouvez tester le carillon avec le bouton dédié.
                        </p>
                      </div>

                      <div className="rounded-xl border border-ink-200 bg-canvas/40 p-3 text-xs space-y-1">
                        <p className="font-bold text-ink-900">
                          Comment exporter mes finances au format Excel / CSV ?
                        </p>
                        <p className="text-ink-600 text-[11px]">
                          Sur la page <strong>Finances</strong> ou <strong>Rapports</strong>, cliquez sur le bouton <strong>"Exporter CSV"</strong>. Le fichier généré intègre un formatage compatible avec Excel en français (délimiteur point-virgule et BOM UTF-8).
                        </p>
                      </div>

                      <div className="rounded-xl border border-ink-200 bg-canvas/40 p-3 text-xs space-y-1">
                        <p className="font-bold text-ink-900">
                          Mes données sont-elles sécurisées et isolées ?
                        </p>
                        <p className="text-ink-600 text-[11px]">
                          Oui, chaque compte utilisateur dispose de règles d'isolation strictes (Row-Level Security PostgreSQL). Aucune autre personne ne peut accéder à vos activités, tâches ou finances.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer avec action */}
            <div className="flex items-center justify-between border-t border-ink-100 bg-canvas/60 px-5 py-3">
              <span className="text-[11px] text-ink-500">
                Remind Me • Multi-activités, planning et rentabilité
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-ink-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-ink-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
