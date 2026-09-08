"use client";

import { useState } from "react";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import { completeOnboarding } from "@/app/(onboarding)/onboarding/actions";

interface OnboardingWizardProps {
  countries: { code: string; name: string }[];
  currencies: { code: string; name: string; symbol: string }[];
  defaultFullName: string;
}

const STEPS = ["Identité", "Pays", "Devise", "Fuseau horaire", "Vos activités"] as const;

const ACTIVITY_COUNT_OPTIONS = [
  { value: "one", label: "Une seule activité" },
  { value: "two_to_three", label: "2 à 3 activités" },
  { value: "four_plus", label: "4 activités ou plus" },
] as const;

export function OnboardingWizard({
  countries,
  currencies,
  defaultFullName,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(defaultFullName);
  const [countryCode, setCountryCode] = useState(countries[0]?.code ?? "");
  const [currencyCode, setCurrencyCode] = useState(currencies[0]?.code ?? "");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [activityCountHint, setActivityCountHint] = useState<
    (typeof ACTIVITY_COUNT_OPTIONS)[number]["value"]
  >("two_to_three");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLastStep = step === STEPS.length - 1;

  function goNext() {
    if (step === 0 && fullName.trim().length < 2) {
      setError("Entrez votre nom complet.");
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("countryCode", countryCode);
    formData.set("currencyCode", currencyCode);
    formData.set("timezone", timezone);
    formData.set("activityCountHint", activityCountHint);

    try {
      await completeOnboarding(formData);
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    }
  }

  return (
    <div className="w-full max-w-md">
      <ol className="mb-8 flex gap-2" aria-label="Étapes de configuration">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? "bg-signal" : "bg-ink-100"
            }`}
            aria-current={i === step ? "step" : undefined}
          />
        ))}
      </ol>

      <p className="mb-1 text-sm font-medium text-signal">
        Étape {step + 1} sur {STEPS.length}
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-ink-950">
        {STEPS[step]}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {step === 0 ? (
          <Field label="Comment devons-nous vous appeler ?" htmlFor="fullName">
            <TextInput
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
            />
          </Field>
        ) : null}

        {step === 1 ? (
          <Field label="Dans quel pays êtes-vous basé ?" htmlFor="countryCode">
            <select
              id="countryCode"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {step === 2 ? (
          <Field label="Quelle est votre devise principale ?" htmlFor="currencyCode">
            <select
              id="currencyCode"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {step === 3 ? (
          <Field label="Fuseau horaire" htmlFor="timezone">
            <TextInput
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </Field>
        ) : null}

        {step === 4 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-ink-700">
              Combien d'activités ou de sources de revenus gérez-vous ?
            </legend>
            {ACTIVITY_COUNT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-md border border-ink-300 px-3 py-2 text-sm has-[:checked]:border-signal has-[:checked]:bg-signal-soft"
              >
                <input
                  type="radio"
                  name="activityCountHint"
                  value={option.value}
                  checked={activityCountHint === option.value}
                  onChange={() => setActivityCountHint(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="rounded-md border border-ink-300 px-4 py-2.5 font-medium text-ink-700"
            >
              Retour
            </button>
          ) : null}

          {isLastStep ? (
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Terminer"}
            </PrimaryButton>
          ) : (
            <PrimaryButton type="button" onClick={goNext}>
              Continuer
            </PrimaryButton>
          )}
        </div>
      </form>
    </div>
  );
}
