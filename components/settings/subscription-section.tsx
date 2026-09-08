"use client";

import { PLAN_ENTITLEMENTS, type PlanType } from "@/lib/subscriptions/entitlements";
import type { Subscription } from "@/types/database";

interface SubscriptionSectionProps {
  subscription: Subscription | null;
}

export function SubscriptionSection({ subscription }: SubscriptionSectionProps) {
  const currentPlan = (subscription?.plan ?? "free") as PlanType;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink-950">Abonnement & Entitlements</h2>
        <p className="text-sm text-ink-500">
          Gérez votre forfait et découvrez les fonctionnalités incluses selon vos besoins.
        </p>
      </div>

      {/* Cartes comparatives des plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["free", "pro", "premium"] as PlanType[]).map((pKey) => {
          const p = PLAN_ENTITLEMENTS[pKey];
          const isCurrent = currentPlan === pKey;

          return (
            <div
              key={pKey}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                isCurrent
                  ? "border-signal bg-signal-soft/30 shadow-md ring-2 ring-signal"
                  : "border-ink-200 bg-canvas-raised hover:border-ink-300 shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-ink-950">{p.planName}</h3>
                  {isCurrent ? (
                    <span className="rounded-full bg-signal px-2.5 py-0.5 text-xs font-bold text-white">
                      Plan Actuel
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-ink-950">
                    {p.priceMonthly === 0 ? "0 €" : `${p.priceMonthly} €`}
                  </span>
                  <span className="text-xs text-ink-500 ml-1">/ mois</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-ink-700">
                  <li className="flex items-center gap-2">
                    <span className="text-positive font-bold">✓</span>
                    <span>
                      Jusqu'à <strong>{p.maxActivities === Infinity ? "Illimitées" : p.maxActivities}</strong> activités
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-positive font-bold">✓</span>
                    <span>
                      Jusqu'à <strong>{p.maxClients === Infinity ? "Illimités" : p.maxClients}</strong> contacts & clients
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-positive font-bold">✓</span>
                    <span>
                      Jusqu'à <strong>{p.maxGoals === Infinity ? "Illimités" : p.maxGoals}</strong> objectifs d'épargne
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-positive font-bold">✓</span>
                    <span>
                      Jusqu'à <strong>{p.maxBudgets === Infinity ? "Illimités" : p.maxBudgets}</strong> budgets mensuels
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={p.advancedReports ? "text-positive font-bold" : "text-ink-300"}>
                      {p.advancedReports ? "✓" : "✕"}
                    </span>
                    <span className={p.advancedReports ? "font-medium text-ink-900" : "text-ink-400"}>
                      Rapports de rentabilité horaire
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={p.multiCurrency ? "text-positive font-bold" : "text-ink-300"}>
                      {p.multiCurrency ? "✓" : "✕"}
                    </span>
                    <span className={p.multiCurrency ? "font-medium text-ink-900" : "text-ink-400"}>
                      Gestion multi-devises unifiée
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={p.aiAssistant ? "text-positive font-bold" : "text-ink-300"}>
                      {p.aiAssistant ? "✓" : "✕"}
                    </span>
                    <span className={p.aiAssistant ? "font-medium text-ink-900" : "text-ink-400"}>
                      Assistant IA & Insights prédictifs
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl bg-ink-200 py-2.5 text-xs font-bold text-ink-700 cursor-default"
                  >
                    Votre formule actuelle
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => alert("Le module de paiement Stripe sera actif en production.")}
                    className="w-full rounded-xl bg-signal py-2.5 text-xs font-bold text-white hover:bg-signal/90 transition-colors shadow-xs"
                  >
                    Passer à {p.planName}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
