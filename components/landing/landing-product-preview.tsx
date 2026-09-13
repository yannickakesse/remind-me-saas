"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  CheckSquare,
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { FloatingEcosystem } from "./floating-ecosystem";

type PreviewTab = "cockpit" | "calendar" | "finances" | "tasks";

export function LandingProductPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("cockpit");
  const [markedPaid, setMarkedPaid] = useState(false);

  return (
    <section id="product-demo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 relative">
      {/* Floating Productivity Ecosystem Around the Dashboard */}
      <FloatingEcosystem />

      {/* Container Frame */}
      <div className="relative z-10 rounded-3xl border border-ink-200/90 bg-canvas-raised shadow-2xl shadow-ink-950/5 overflow-hidden transition-all duration-300">
        {/* Top Cockpit Browser/App Bar */}
        <div className="bg-canvas border-b border-ink-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-danger/80" />
              <span className="w-3 h-3 rounded-full bg-warning/80" />
              <span className="w-3 h-3 rounded-full bg-positive/80" />
            </div>
            <span className="text-xs font-mono text-ink-500 ml-2 hidden sm:inline-block">
              app.remindme.io/cockpit
            </span>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center bg-ink-100 p-1 rounded-xl gap-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("cockpit")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "cockpit"
                  ? "bg-canvas-raised text-signal font-semibold shadow-sm"
                  : "text-ink-700 hover:text-ink-950"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Vue Globale
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "calendar"
                  ? "bg-canvas-raised text-signal font-semibold shadow-sm"
                  : "text-ink-700 hover:text-ink-950"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendrier &amp; Conflits
            </button>
            <button
              onClick={() => setActiveTab("finances")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "finances"
                  ? "bg-canvas-raised text-gold-dark font-semibold shadow-sm"
                  : "text-ink-700 hover:text-ink-950"
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-gold-dark" />
              Trésorerie &amp; Rentabilité
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "tasks"
                  ? "bg-canvas-raised text-signal font-semibold shadow-sm"
                  : "text-ink-700 hover:text-ink-950"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Tâches par Activité
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-positive-soft text-positive">
              <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
              Temps Réel Actif
            </span>
            <div className="w-7 h-7 rounded-full bg-signal text-white text-xs font-bold flex items-center justify-center">
              YA
            </div>
          </div>
        </div>

        {/* Tab 1: Cockpit / Vue Globale */}
        {activeTab === "cockpit" && (
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-canvas animate-in fade-in duration-300">
            {/* Greeting & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-ink-950">
                  Bonjour, Yannick
                </h2>
                <p className="text-sm text-ink-500">
                  Voici le statut consolidé de vos 3 activités pour aujourd&apos;hui.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-signal-soft text-signal border border-signal/20">
                  3 Activités Actives
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-positive-soft text-positive border border-positive/20">
                  Rentabilité : +84%
                </span>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100 shadow-sm">
                <span className="text-xs text-ink-500 font-medium">Revenus Reçus (Ce mois)</span>
                <div className="text-2xl font-bold text-positive mt-1">4 150 €</div>
                <div className="text-xs text-ink-500 mt-1 flex items-center gap-1">
                  <span className="text-positive font-semibold">↑ +18%</span> vs mois précédent
                </div>
              </div>

              <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100 shadow-sm">
                <span className="text-xs text-ink-500 font-medium">Revenus en Attente</span>
                <div className="text-2xl font-bold text-gold-dark mt-1">1 250 €</div>
                <div className="text-xs text-ink-500 mt-1">2 factures à encaisser</div>
              </div>

              <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100 shadow-sm">
                <span className="text-xs text-ink-500 font-medium">Heures Réalisées</span>
                <div className="text-2xl font-bold text-ink-950 mt-1">28.5 h</div>
                <div className="text-xs text-ink-500 mt-1">Sur 35h cibles / sem.</div>
              </div>

              <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100 shadow-sm">
                <span className="text-xs text-ink-500 font-medium">Dépenses Programmées</span>
                <div className="text-2xl font-bold text-signal mt-1">912 €</div>
                <div className="text-xs text-ink-500 mt-1">Prochaine échéance dans 4 jours</div>
              </div>
            </div>

            {/* Two Column Layout: Today Timeline + Scheduled Charges */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Timeline */}
              <div className="lg:col-span-2 p-5 rounded-xl bg-canvas-raised border border-ink-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink-950 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-signal" />
                    <span>Programme du jour</span>
                    <span className="text-xs text-ink-500 font-normal">(Jeudi 10 Septembre)</span>
                  </h3>
                  <span className="text-xs font-medium text-signal">3 créneaux prévus</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-signal bg-signal-soft/30 border-y border-r border-ink-100">
                    <div className="text-xs font-mono text-signal font-semibold w-24">
                      09:00 - 12:30
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-ink-950">
                        Consultant Senior — Audit Architecture Cloud
                      </div>
                      <div className="text-xs text-ink-500">
                        Client : Société FinTech Alpha • Taux : 650 € / jour
                      </div>
                    </div>
                    <span className="text-xs font-medium text-signal px-2 py-0.5 rounded bg-signal-soft">
                      3.5 h
                    </span>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-positive bg-positive-soft/30 border-y border-r border-ink-100">
                    <div className="text-xs font-mono text-positive font-semibold w-24">
                      14:00 - 16:30
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-ink-950">
                        Enseignant Vacataire — Cours Algorithmique Avancée
                      </div>
                      <div className="text-xs text-ink-500">
                        Université Centrale • Taux : 55 € / heure
                      </div>
                    </div>
                    <span className="text-xs font-medium text-positive px-2 py-0.5 rounded bg-positive-soft">
                      2.5 h
                    </span>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-gold-dark bg-gold-soft/30 border-y border-r border-ink-100">
                    <div className="text-xs font-mono text-gold-dark font-semibold w-24">
                      17:30 - 19:00
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-ink-950">
                        SaaS Builder — Développement Feature Dépenses
                      </div>
                      <div className="text-xs text-ink-500">
                        Projet Personnel • Objectif MRR
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gold-dark px-2 py-0.5 rounded bg-gold-soft">
                      1.5 h
                    </span>
                  </div>
                </div>
              </div>

              {/* Scheduled Charges / Alert Widget */}
              <div className="p-5 rounded-xl bg-canvas-raised border border-ink-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink-950 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gold-dark" />
                    <span>Dépenses Programmées</span>
                  </h3>
                  <span className="text-[11px] text-ink-500">Cycle Auto</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-ink-100 bg-canvas space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-950">Loyer Espace Coworking</span>
                      <span className="text-xs font-bold text-ink-950">850.00 €</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-ink-500">
                      <span>Échéance : 15 Septembre</span>
                      <span className="text-gold-dark font-medium">Due dans 5j</span>
                    </div>
                    <button
                      onClick={() => setMarkedPaid(!markedPaid)}
                      className={`inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                        markedPaid
                          ? "bg-positive-soft text-positive border border-positive/30"
                          : "bg-signal-soft text-signal hover:bg-signal hover:text-white"
                      }`}
                    >
                      {markedPaid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Payée &amp; Enregistrée
                        </>
                      ) : (
                        "Marquer comme payée"
                      )}
                    </button>
                  </div>

                  <div className="p-3 rounded-lg border border-ink-100 bg-canvas space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-950">Abonnement Figma Pro</span>
                      <span className="text-xs font-bold text-ink-950">14.00 €</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-ink-500">
                      <span>Échéance : 22 Septembre</span>
                      <span className="text-positive font-medium">Planifiée</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Calendrier & Conflits */}
        {activeTab === "calendar" && (
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-canvas animate-in fade-in duration-300">
            {/* Conflict Detection Banner */}
            <div className="p-4 rounded-xl bg-danger-soft border border-danger/30 flex items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-danger text-white flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-danger">
                    Conflit d&apos;agenda détecté automatiquement !
                  </h4>
                  <p className="text-xs text-ink-700">
                    Chevauchement entre <strong>Consultant Tech (14:00 - 16:00)</strong> et{" "}
                    <strong>Cours Magistral Faculté (15:00 - 17:00)</strong> ce Vendredi.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-canvas-raised text-danger border border-danger/20 shadow-sm shrink-0">
                Alerte Préventive
              </span>
            </div>

            {/* Mini Multi-Schedule Agenda Visual */}
            <div className="rounded-xl border border-ink-100 bg-canvas-raised p-4 overflow-x-auto">
              <div className="grid grid-cols-5 gap-2 min-w-[600px] text-center">
                {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].map((day, idx) => (
                  <div key={day} className="space-y-2">
                    <div className="text-xs font-semibold text-ink-500 pb-2 border-b border-ink-100">
                      {day} {8 + idx}
                    </div>
                    <div className="space-y-1.5">
                      {idx === 0 && (
                        <div className="p-2 rounded bg-signal-soft text-signal text-left text-xs font-medium border border-signal/20">
                          09h-13h : Audit Cloud
                        </div>
                      )}
                      {idx === 1 && (
                        <>
                          <div className="p-2 rounded bg-positive-soft text-positive text-left text-xs font-medium border border-positive/20">
                            10h-12h : TP Électronique
                          </div>
                          <div className="p-2 rounded bg-signal-soft text-signal text-left text-xs font-medium border border-signal/20">
                            14h-17h : Mission Dev
                          </div>
                        </>
                      )}
                      {idx === 2 && (
                        <div className="p-2 rounded bg-gold-soft text-gold-dark text-left text-xs font-medium border border-gold/20">
                          09h-18h : Sprint Produit
                        </div>
                      )}
                      {idx === 3 && (
                        <>
                          <div className="p-2 rounded bg-signal-soft text-signal text-left text-xs font-medium border border-signal/20">
                            09h-12h30 : FinTech Alpha
                          </div>
                          <div className="p-2 rounded bg-positive-soft text-positive text-left text-xs font-medium border border-positive/20">
                            14h-16h30 : Cours Algorithme
                          </div>
                        </>
                      )}
                      {idx === 4 && (
                        <div className="inline-flex items-center gap-1.5 p-2 rounded bg-danger-soft text-danger text-left text-xs font-bold border border-danger/40 animate-pulse w-full">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>14h-16h : CONFLIT DÉTECTÉ</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Finances & Rentabilité */}
        {activeTab === "finances" && (
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-canvas animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
                <span className="text-xs text-ink-500">Chiffre d&apos;Affaires Consolidé</span>
                <div className="text-2xl font-bold text-positive mt-1">5 400.00 €</div>
                <div className="text-xs text-ink-500 mt-1">3 flux d&apos;encaissements</div>
              </div>
              <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
                <span className="text-xs text-ink-500">Charges Déductibles</span>
                <div className="text-2xl font-bold text-danger mt-1">864.00 €</div>
                <div className="text-xs text-ink-500 mt-1">Matériel, Serveurs, Loyer</div>
              </div>
              <div className="p-4 rounded-xl bg-canvas-raised border border-ink-100">
                <span className="text-xs text-ink-500">Bénéfice Net Réel</span>
                <div className="text-2xl font-bold text-gold-dark mt-1">4 536.00 €</div>
                <div className="text-xs text-positive font-semibold mt-1">Marge nette : 84%</div>
              </div>
            </div>

            {/* Profitability Table */}
            <div className="rounded-xl border border-ink-100 bg-canvas-raised overflow-hidden">
              <div className="px-4 py-3 border-b border-ink-100 bg-canvas flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-950">Rentabilité par Activité</span>
                <span className="text-xs text-gold-dark font-medium">Export CSV disponible</span>
              </div>
              <div className="divide-y divide-ink-100 text-xs">
                <div className="grid grid-cols-4 p-3 font-semibold text-ink-500 bg-canvas">
                  <div>Activité</div>
                  <div>Heures</div>
                  <div>Gains Bruts</div>
                  <div className="text-right">Taux Horaire Net</div>
                </div>
                <div className="grid grid-cols-4 p-3 items-center">
                  <div className="font-semibold text-ink-950 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-signal" />
                    Consulting Tech
                  </div>
                  <div>42 h</div>
                  <div className="font-mono font-semibold text-positive">+3 250 €</div>
                  <div className="text-right font-mono font-bold text-gold-dark">77.38 €/h</div>
                </div>
                <div className="grid grid-cols-4 p-3 items-center">
                  <div className="font-semibold text-ink-950 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-positive" />
                    Enseignement Supérieur
                  </div>
                  <div>24 h</div>
                  <div className="font-mono font-semibold text-positive">+1 320 €</div>
                  <div className="text-right font-mono font-bold text-gold-dark">55.00 €/h</div>
                </div>
                <div className="grid grid-cols-4 p-3 items-center">
                  <div className="font-semibold text-ink-950 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-gold" />
                    Coaching &amp; Projets
                  </div>
                  <div>12 h</div>
                  <div className="font-mono font-semibold text-positive">+830 €</div>
                  <div className="text-right font-mono font-bold text-gold-dark">69.16 €/h</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Tâches */}
        {activeTab === "tasks" && (
          <div className="p-4 sm:p-6 lg:p-8 space-y-4 bg-canvas animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-ink-950">Priorités du jour filtrées par activité</h4>
              <span className="text-xs text-ink-500">4 tâches restantes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-ink-100 bg-canvas-raised space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-danger-soft text-danger">
                    URGENT
                  </span>
                  <span className="text-[11px] text-ink-500">Consulting Tech</span>
                </div>
                <div className="text-sm font-semibold text-ink-950">
                  Rendre le rapport d&apos;audit sécurité Alpha
                </div>
                <div className="text-xs text-ink-500 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-ink-400" />
                  <span>Échéance : Aujourd&apos;hui 18h00</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-ink-100 bg-canvas-raised space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-signal-soft text-signal">
                    HAUTE
                  </span>
                  <span className="text-[11px] text-ink-500">Université</span>
                </div>
                <div className="text-sm font-semibold text-ink-950">
                  Préparer les sujets de l&apos;examen final M2
                </div>
                <div className="text-xs text-ink-500 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-ink-400" />
                  <span>Échéance : Demain 12h00</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
