"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, X, Sparkles, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { PLAN_ENTITLEMENTS, normalizePlan, type PlanType } from "@/lib/subscriptions/entitlements";
import { updateSubscriptionPlan } from "@/app/(app)/settings/actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
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
  const [selectedTargetPlan, setSelectedTargetPlan] = useState<PlanType | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [modalOpen, setModalOpen] = useState(false);

  function openCheckoutModal(targetPlan: PlanType) {
    if (targetPlan === activePlan) return;
    setSelectedTargetPlan(targetPlan);
    setModalOpen(true);
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
      {selectedTargetPlan && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Passer au forfait ${PLAN_ENTITLEMENTS[selectedTargetPlan].planName}`}
          description="Activez instantanément toutes les fonctionnalités et les quotas associés à cette formule."
        >
          <div className="space-y-4 my-2 p-4 rounded-xl bg-canvas border border-ink-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-600 font-medium">Forfait sélectionné :</span>
              <span className="font-bold text-ink-950">
                {PLAN_ENTITLEMENTS[selectedTargetPlan].planName}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-600 font-medium">Tarif :</span>
              <span className="font-extrabold text-ink-950 text-base">
                {billingCycle === "monthly"
                  ? `${PLAN_ENTITLEMENTS[selectedTargetPlan].priceMonthly} € / mois`
                  : `${PLAN_ENTITLEMENTS[selectedTargetPlan].priceYearly} € / an`}
              </span>
            </div>
            <div className="text-xs text-ink-500 pt-2 border-t border-ink-100 space-y-1">
              <p className="flex items-center gap-1.5 text-positive font-medium">
                <Check className="w-3.5 h-3.5" />
                Activation immédiate sans interruption de service
              </p>
              <p className="text-ink-400">
                Vos données existantes sont strictement préservées.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={isPending}
              onClick={handleConfirmPlanChange}
            >
              Confirmer et Activer
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
