"use client";

import { useState } from "react";
import {
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  BellRing,
  Sparkles,
} from "lucide-react";

export function LandingProductPreview() {
  const [activeTab, setActiveTab] = useState<"cockpit" | "calendar" | "tasks">("cockpit");

  return (
    <section id="product" className="py-20 sm:py-28 bg-white dark:bg-[#0E141E] border-t border-[#17211D]/8 dark:border-white/10 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête de section sobre et expressif */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#214E3B]/10 dark:bg-[#214E3B]/30 text-[#214E3B] dark:text-emerald-300 text-xs font-semibold mb-4">
            <Layers className="w-3.5 h-3.5" />
            <span>Le Produit</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#17211D] dark:text-white tracking-tight font-sans">
            Une vision claire de tout ce qui vous engage.
          </h2>

          <p className="text-base sm:text-lg text-[#17211D]/75 dark:text-ink-300 mt-4 leading-relaxed font-normal">
            Vos activités, votre planning et vos finances réunis dans une interface sobre,
            pensée pour alléger votre charge mentale et sécuriser chaque journée.
          </p>

          {/* Onglets de démonstration interactifs */}
          <div className="mt-8 inline-flex p-1 rounded-full bg-[#F7F6F2] dark:bg-[#17211D] border border-[#17211D]/10 dark:border-white/10 shadow-xs max-w-full overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("cockpit")}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "cockpit"
                  ? "bg-[#214E3B] text-white shadow-xs"
                  : "text-[#17211D]/70 dark:text-ink-300 hover:text-[#17211D] dark:hover:text-white"
              }`}
            >
              Activités & Finances
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "calendar"
                  ? "bg-[#214E3B] text-white shadow-xs"
                  : "text-[#17211D]/70 dark:text-ink-300 hover:text-[#17211D] dark:hover:text-white"
              }`}
            >
              Calendrier sans conflit
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "tasks"
                  ? "bg-[#214E3B] text-white shadow-xs"
                  : "text-[#17211D]/70 dark:text-ink-300 hover:text-[#17211D] dark:hover:text-white"
              }`}
            >
              Tâches & Rappels étagés
            </button>
          </div>
        </div>

        {/* Cadre de présentation du produit */}
        <div className="rounded-2xl sm:rounded-3xl bg-[#F7F6F2] dark:bg-[#141C28] border border-[#17211D]/10 dark:border-white/10 p-4 sm:p-8 lg:p-10 shadow-xl shadow-black/5">
          {/* VUE 1 : Activités & Trésorerie */}
          {activeTab === "cockpit" && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
              {/* Résumé financier épuré */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[#17211D]/60 dark:text-ink-400 mb-1.5 font-medium">
                    <span>Revenus encaissés ce mois</span>
                    <span className="w-2 h-2 rounded-full bg-[#159A68]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#159A68] font-mono tracking-tight">
                    +3 580 €
                  </div>
                  <div className="text-[11px] text-[#17211D]/50 dark:text-ink-400 mt-1">
                    3 factures réglées
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[#17211D]/60 dark:text-ink-400 mb-1.5 font-medium">
                    <span>Sommes attendues (sous 15j)</span>
                    <Clock className="w-3.5 h-3.5 text-[#D99A24]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#17211D] dark:text-white font-mono tracking-tight">
                    +2 400 €
                  </div>
                  <div className="text-[11px] text-[#17211D]/50 dark:text-ink-400 mt-1">
                    2 échéances confirmées
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-[#17211D]/60 dark:text-ink-400 mb-1.5 font-medium">
                    <span>Charges prévisionnelles</span>
                    <Wallet className="w-3.5 h-3.5 text-[#17211D]/40" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#17211D]/75 dark:text-ink-200 font-mono tracking-tight">
                    -620 €
                  </div>
                  <div className="text-[11px] text-[#17211D]/50 dark:text-ink-400 mt-1">
                    Abonnements & outils pro
                  </div>
                </div>
              </div>

              {/* Vos activités en cours */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17211D]/60 dark:text-ink-400">
                    Vos activités actives (3 / 3)
                  </h3>
                  <span className="text-xs text-[#214E3B] dark:text-emerald-400 font-medium">
                    Toutes à jour
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Activité 1 */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 shadow-xs flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#214E3B]/10 text-[#214E3B] dark:text-emerald-300 font-bold">
                          Conseil
                        </span>
                        <span className="text-xs font-mono font-semibold text-[#17211D]/70 dark:text-ink-300">
                          120 €/h
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#17211D] dark:text-white">
                        Cabinet Conseil & Stratégie
                      </h4>
                      <p className="text-xs text-[#17211D]/60 dark:text-ink-300 mt-1 leading-relaxed">
                        Accompagnement direction et audit opérationnel.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#17211D]/5 dark:border-white/5 flex items-center justify-between text-xs">
                      <span className="text-[#17211D]/60 dark:text-ink-400">Ce mois : 14h</span>
                      <span className="font-mono font-bold text-[#159A68]">+1 680 €</span>
                    </div>
                  </div>

                  {/* Activité 2 */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 shadow-xs flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#D99A24]/15 text-[#D99A24] font-bold">
                          Formation
                        </span>
                        <span className="text-xs font-mono font-semibold text-[#17211D]/70 dark:text-ink-300">
                          950 €/j
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#17211D] dark:text-white">
                        Ateliers & Enseignement Sup
                      </h4>
                      <p className="text-xs text-[#17211D]/60 dark:text-ink-300 mt-1 leading-relaxed">
                        Sessions de formation en management et design.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#17211D]/5 dark:border-white/5 flex items-center justify-between text-xs">
                      <span className="text-[#17211D]/60 dark:text-ink-400">2 sessions</span>
                      <span className="font-mono font-bold text-[#159A68]">+1 900 €</span>
                    </div>
                  </div>

                  {/* Activité 3 */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 shadow-xs flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 font-bold">
                          Création
                        </span>
                        <span className="text-xs font-mono font-semibold text-[#17211D]/70 dark:text-ink-300">
                          Forfait
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#17211D] dark:text-white">
                        Direction Artistique Freelance
                      </h4>
                      <p className="text-xs text-[#17211D]/60 dark:text-ink-300 mt-1 leading-relaxed">
                        Refonte de marque et identité visuelle.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#17211D]/5 dark:border-white/5 flex items-center justify-between text-xs">
                      <span className="text-[#17211D]/60 dark:text-ink-400">À facturer</span>
                      <span className="font-mono font-bold text-[#17211D] dark:text-white">+2 400 €</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VUE 2 : Calendrier sans conflit */}
          {activeTab === "calendar" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Badge intelligent de sérénité */}
              <div className="flex items-center gap-2.5 p-3.5 sm:p-4 rounded-xl bg-[#214E3B]/10 dark:bg-[#214E3B]/25 border border-[#214E3B]/20 text-xs sm:text-sm font-medium text-[#214E3B] dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-[#214E3B] dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Détecteur d’agenda actif :</strong> Aucun conflit horaire identifié entre vos 3 activités cette semaine.
                </span>
              </div>

              {/* Grille planning épurée */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Jour 1 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#17211D] dark:text-white pb-2 border-b border-[#17211D]/5 dark:border-white/5">
                    <span>Mardi 28 Octobre</span>
                    <span className="text-[10px] font-mono text-[#17211D]/50">3 créneaux</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-[#214E3B]/8 border-l-4 border-[#214E3B] text-xs">
                      <div className="font-bold text-[#214E3B] dark:text-emerald-300">09:00 - 11:30</div>
                      <div className="text-[#17211D] dark:text-white font-medium mt-0.5">Comité de direction (Conseil)</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#D99A24]/10 border-l-4 border-[#D99A24] text-xs">
                      <div className="font-bold text-[#D99A24]">14:00 - 17:00</div>
                      <div className="text-[#17211D] dark:text-white font-medium mt-0.5">Atelier Design Sprint (Formation)</div>
                    </div>
                  </div>
                </div>

                {/* Jour 2 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#17211D] dark:text-white pb-2 border-b border-[#17211D]/5 dark:border-white/5">
                    <span>Mercredi 29 Octobre</span>
                    <span className="text-[10px] font-mono text-[#17211D]/50">Focus</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-slate-500/10 border-l-4 border-slate-600 text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-300">10:00 - 13:00</div>
                      <div className="text-[#17211D] dark:text-white font-medium mt-0.5">Production livrable (Direction Art.)</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#214E3B]/8 border-l-4 border-[#214E3B] text-xs">
                      <div className="font-bold text-[#214E3B] dark:text-emerald-300">15:30 - 16:30</div>
                      <div className="text-[#17211D] dark:text-white font-medium mt-0.5">Point d'étape client (Conseil)</div>
                    </div>
                  </div>
                </div>

                {/* Jour 3 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#17211D] dark:text-white pb-2 border-b border-[#17211D]/5 dark:border-white/5">
                    <span>Jeudi 30 Octobre</span>
                    <span className="text-[10px] font-mono text-[#17211D]/50">Libre PM</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-[#D99A24]/10 border-l-4 border-[#D99A24] text-xs">
                      <div className="font-bold text-[#D99A24]">09:30 - 12:30</div>
                      <div className="text-[#17211D] dark:text-white font-medium mt-0.5">Session Masterclass (Formation)</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      ✓ Après-midi protégée pour la gestion & facturation
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VUE 3 : Tâches & Rappels étagés */}
          {activeTab === "tasks" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#17211D]/60 dark:text-ink-400">
                  Échéances prioritaires avec rappels étagés
                </span>
                <span className="text-xs text-[#D99A24] font-semibold flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5" />
                  Rappels J-7, J-3, J-1 actifs
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[#214E3B]/10 text-[#214E3B] dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#17211D] dark:text-white">
                        Envoi facture mensuelle N°2026-04 (Cabinet Conseil)
                      </h4>
                      <p className="text-xs text-[#17211D]/60 dark:text-ink-400 mt-0.5">
                        Échéance dans 2 jours • Rappel J-1 programmé demain à 08:30
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="font-mono text-xs font-bold text-[#159A68] bg-[#159A68]/10 px-2.5 py-1 rounded-full">
                      +1 680 €
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[#D99A24]/15 text-[#D99A24] flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#17211D] dark:text-white">
                        Validation programme pédagogique Q1 (Ateliers Sup)
                      </h4>
                      <p className="text-xs text-[#17211D]/60 dark:text-ink-400 mt-0.5">
                        Échéance dans 5 jours • Rappel J-3 envoyé ce matin
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-medium text-[#17211D]/70 dark:text-ink-300 bg-[#F7F6F2] dark:bg-[#111822] px-2.5 py-1 rounded-full border border-[#17211D]/8">
                      Priorité normale
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#1A2332] border border-[#17211D]/8 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#17211D] dark:text-white line-through opacity-70">
                        Livrable charte graphique v1 (Direction Art.)
                      </h4>
                      <p className="text-xs text-[#17211D]/50 dark:text-ink-400 mt-0.5">
                        Terminé hier • Validé par le client
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ Terminé
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
