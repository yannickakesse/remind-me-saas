"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, X, Sparkles, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { PLAN_ENTITLEMENTS, normalizePlan, type PlanType } from "@/lib/subscriptions/entitlements";
import { updateSubscriptionPlan, initiateBictorysCheckoutAction } from "@/app/(app)/settings/actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getAppUrl } from "@/lib/auth/url";
import type { Subscription } from "@/types/database";

export interface SubscriptionSectionProps {
  subscription?: Subscription | null;
  plan?: "free" | "pro" | "premium" | string;
  status?: string;
}

export function SubscriptionSection({ subscription, plan, status }: SubscriptionSectionProps) {
  const { push } = useToast();
  const initialPlan = normalizePlan(plan ?? subscription?.plan);
  const [activePlan, setActivePlan] = useState<PlanType>(initialPlan);

  useEffect(() => {
    setActivePlan(normalizePlan(plan ?? subscription?.plan));
  }, [plan, subscription]);

  const [isPending, startTransition] = useTransition();
  const [isBictorysPending, setIsBictorysPending] = useState(false);
  const [selectedTargetPlan, setSelectedTargetPlan] = useState<PlanType | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [modalOpen, setModalOpen] = useState(false);

  function openCheckoutModal(targetPlan: PlanType) {
    if (targetPlan === activePlan) return;
    setSelectedTargetPlan(targetPlan);
    setModalOpen(true);
  }

  async function handleBictorysPayment() {
    if (!selectedTargetPlan || selectedTargetPlan === "free") return;
    setIsBictorysPending(true);

    try {
      const baseUrl = getAppUrl();
      const res = await initiateBictorysCheckoutAction({
        targetPlan: selectedTargetPlan,
        billingCycle,
        baseUrl,
      });

      if (res && res.success && res.checkoutUrl) {
        push("Redirection vers Bictorys (Wave, Orange Money, MTN, Moov)...", "info");
        window.location.href = res.checkoutUrl;
      } else {
        setIsBictorysPending(false);
        push(res?.error || "Impossible d'initialiser le paiement Bictorys.", "error");
      }
    } catch (err: any) {
      setIsBictorysPending(false);
      push(err?.message || "Erreur de connexion avec Bictorys.", "error");
    }
  }

  function handleConfirmPlanChange() {
    if (!selectedTargetPlan) return;
    const targetPlan = selectedTargetPlan;

    startTransition(async () => {
      try {
        const res = await updateSubscriptionPlan(targetPlan);
        if (res && res.success) {
          setActivePlan(targetPlan);
          setModalOpen(false);
          push(
            `Félicitations ! Votre compte est maintenant activé sur le forfait ${PLAN_ENTITLEMENTS[targetPlan].planName}.`,
            "success"
          );
        } else {
          push(res?.error || "Une erreur est survenue lors de la mise à niveau.", "error");
        }
      } catch (err: any) {
        push(err?.message || "Une erreur est survenue.", "error");
      }
    });
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-950 flex items-center gap-2">
            <Zap className="w-5 h-5 text-signal" />
            Abonnement & Entitlements
          </h2>
          <p className="text-xs text-ink-500 mt-1">
            Gérez votre forfait, testez les montées de gamme et découvrez les fonctionnalités incluses.
          </p>
        </div>

        {/* Toggle Mensuel / Annuel */}
        <div className="inline-flex items-center rounded-xl bg-ink-100 p-1 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              billingCycle === "monthly"
                ? "bg-canvas-raised text-ink-950 shadow-xs"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            Facturation mensuelle
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1 ${
              billingCycle === "yearly"
                ? "bg-canvas-raised text-ink-950 shadow-xs"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            Annuelle
            <span className="rounded-full bg-positive-soft px-1.5 py-0.2 text-[9px] font-bold text-positive">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Cartes comparatives des 3 forfaits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["free", "pro", "premium"] as PlanType[]).map((pKey) => {
          const p = PLAN_ENTITLEMENTS[pKey];
          const isCurrent = activePlan === pKey;
          const isHigher =
            (activePlan === "free" && (pKey === "pro" || pKey === "premium")) ||
            (activePlan === "pro" && pKey === "premium");

          const priceDisplay =
            billingCycle === "monthly"
              ? p.priceMonthly === 0
                ? "0 €"
                : `${p.priceMonthly} €`
              : p.priceYearly === 0
              ? "0 €"
              : `${Math.round(p.priceYearly / 12)} €`;

          return (
            <div
              key={pKey}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition-all relative ${
                isCurrent
                  ? "border-signal bg-signal-soft/30 shadow-md ring-2 ring-signal"
                  : pKey === "premium"
                  ? "border-gold/40 bg-canvas-raised hover:border-gold shadow-xs"
                  : "border-ink-200 bg-canvas-raised hover:border-ink-300 shadow-xs"
              }`}
            >
              {pKey === "premium" && !isCurrent && (
                <div className="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-gold to-gold-dark px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Recommandé
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-ink-950">{p.planName}</h3>
                  {isCurrent && (
                    <span className="rounded-full bg-signal px-2.5 py-0.5 text-xs font-bold text-white">
                      Plan Actuel
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-ink-950">{priceDisplay}</span>
                  <span className="text-xs text-ink-500 ml-1">/ mois</span>
                </div>
                {billingCycle === "yearly" && p.priceYearly > 0 && (
                  <p className="text-[10px] text-ink-500 mt-0.5">
                    Facturé {p.priceYearly} € par an
                  </p>
                )}

                {/* Liste des quotas et droits */}
                <ul className="mt-6 space-y-2.5 text-xs text-ink-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    <span>
                      {p.maxActivities === Infinity ? (
                        <strong>Activités illimitées</strong>
                      ) : (
                        <>Jusqu'à <strong>{p.maxActivities}</strong> activités</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    <span>
                      {p.maxClients === Infinity ? (
                        <strong>Contacts & clients illimités</strong>
                      ) : (
                        <>Jusqu'à <strong>{p.maxClients}</strong> contacts & clients</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    <span>
                      {p.maxGoals === Infinity ? (
                        <strong>Objectifs d'épargne illimités</strong>
                      ) : (
                        <>Jusqu'à <strong>{p.maxGoals}</strong> objectifs d'épargne</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    <span>
                      {p.maxBudgets === Infinity ? (
                        <strong>Budgets mensuels illimités</strong>
                      ) : (
                        <>Jusqu'à <strong>{p.maxBudgets}</strong> budgets mensuels</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {p.hourlyProfitability ? (
                      <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    ) : (
                      <X className="w-3.5 h-3.5 text-ink-300 shrink-0" />
                    )}
                    <span className={p.hourlyProfitability ? "font-medium text-ink-900" : "text-ink-400"}>
                      Rapports de rentabilité horaire
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {p.multiCurrency ? (
                      <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    ) : (
                      <X className="w-3.5 h-3.5 text-ink-300 shrink-0" />
                    )}
                    <span className={p.multiCurrency ? "font-medium text-ink-900" : "text-ink-400"}>
                      Gestion multi-devises unifiée
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {p.aiAssistant ? (
                      <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    ) : (
                      <X className="w-3.5 h-3.5 text-ink-300 shrink-0" />
                    )}
                    <span className={p.aiAssistant ? "font-medium text-ink-900" : "text-ink-400"}>
                      Assistant IA & Insights prédictifs
                    </span>
                  </li>
                </ul>
              </div>

              {/* Bouton d'action contextuel */}
              <div className="mt-8">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl bg-ink-200 py-2.5 text-xs font-bold text-ink-700 cursor-default"
                  >
                    Votre formule actuelle
                  </button>
                ) : isHigher ? (
                  <button
                    type="button"
                    onClick={() => openCheckoutModal(pKey)}
                    className="w-full rounded-xl bg-signal py-2.5 text-xs font-bold text-white hover:bg-signal/90 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Passer {pKey === "pro" ? "en Pro" : "au Premium"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCheckoutModal(pKey)}
                    className="w-full rounded-xl border border-ink-200 bg-canvas py-2.5 text-xs font-bold text-ink-700 hover:bg-ink-100 transition-colors cursor-pointer"
                  >
                    Changer pour {p.planName}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale de confirmation et de mise à niveau */}
      {selectedTargetPlan && (() => {
        const target = PLAN_ENTITLEMENTS[selectedTargetPlan];
        const isDowngrade =
          (activePlan === "premium" && (selectedTargetPlan === "pro" || selectedTargetPlan === "free")) ||
          (activePlan === "pro" && selectedTargetPlan === "free");

        return (
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={`Passer au forfait ${target.planName} ?`}
            description="En mode test, aucun paiement réel ne sera prélevé."
          >
            <div className="space-y-4 my-2">
              {/* Carte Récapitulative */}
              <div className="p-4 rounded-xl bg-canvas border border-ink-100 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600 font-medium">Formule choisie :</span>
                  <span className="font-bold text-ink-950 text-base">{target.planName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600 font-medium">Tarif (Mode Test) :</span>
                  <span className="font-extrabold text-ink-950 text-base">
                    {billingCycle === "monthly"
                      ? `${target.priceMonthly} € / mois`
                      : `${target.priceYearly} € / an`}
                  </span>
                </div>
              </div>

              {/* Droits inclus */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  Vous aurez accès à :
                </p>
                <ul className="space-y-1.5 text-xs text-ink-700 bg-canvas-raised p-3.5 rounded-xl border border-ink-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    <span>
                      {target.maxActivities === Infinity ? "Activités illimitées" : `${target.maxActivities} activités`}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    <span>
                      {target.maxClients === Infinity ? "Contacts & clients illimités" : `${target.maxClients} contacts et clients`}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    <span>
                      {target.maxGoals === Infinity ? "Objectifs d'épargne illimités" : `${target.maxGoals} objectifs d'épargne`}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                    <span>
                      {target.maxBudgets === Infinity ? "Budgets mensuels illimités" : `${target.maxBudgets} budgets mensuels`}
                    </span>
                  </li>
                  {target.hourlyProfitability && (
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                      <span>Rapport de rentabilité horaire</span>
                    </li>
                  )}
                  {target.multiCurrency && (
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                      <span>Gestion multi-devises unifiée</span>
                    </li>
                  )}
                  {target.aiAssistant && (
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                      <span>Assistant IA & insights prédictifs</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Avertissement Downgrade bienveillant & rassurant */}
              {isDowngrade ? (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3.5 text-xs text-ink-700 space-y-1">
                  <p className="font-bold text-warning-dark flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-warning-dark" />
                    Conservation garantie de vos données
                  </p>
                  <p className="text-[11px] leading-relaxed text-ink-600">
                    Vos activités, clients, budgets et objectifs existants restent précieusement conservés et <strong>ne seront jamais supprimés</strong>. Si vos données dépassent les quotas du forfait {target.planName}, vous devrez simplement repasser sous la limite avant de pouvoir créer de nouveaux éléments.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-positive/20 bg-positive/5 p-3 text-xs text-positive font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-positive shrink-0" />
                  Activation immédiate et déblocage de toutes vos nouvelles fonctionnalités.
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-ink-100">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending || isBictorysPending}
                onClick={() => setModalOpen(false)}
              >
                Annuler
              </Button>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  loading={isPending}
                  disabled={isPending || isBictorysPending}
                  onClick={handleConfirmPlanChange}
                  className="text-xs"
                >
                  ⚡ Tester sans payer (Mode Démo)
                </Button>

                {selectedTargetPlan !== "free" && (
                  <Button
                    type="button"
                    variant="primary"
                    loading={isBictorysPending}
                    disabled={isPending || isBictorysPending}
                    onClick={handleBictorysPayment}
                    className="bg-signal hover:bg-signal/90 text-xs font-bold"
                  >
                    💳 Payer via Bictorys (Wave / Orange / MTN / CB)
                  </Button>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
