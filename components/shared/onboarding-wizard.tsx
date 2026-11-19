"use client";
import { USER_STATUSES } from "@/lib/profile/status";
import { msg } from "@/lib/i18n/catalog";


import { useLanguage } from "@/components/i18n/language-provider";
import { useState } from "react";
import { Field, TextInput, PrimaryButton } from "@/components/ui/field";
import { completeOnboarding } from "@/app/(onboarding)/onboarding/actions";
import { TIMEZONE_OPTIONS, resolveAppropriateTimezone } from "@/lib/time/timezones";
import { JourneyVoice } from "@/components/onboarding/journey-voice";

interface OnboardingWizardProps {
  countries: { code: string; name: string }[];
  currencies: { code: string; name: string; symbol: string }[];
  defaultFullName: string;
}

const STEPS = [msg("Identité"), "Pays", "Devise", "Fuseau horaire", msg("Vos activités")] as const;
/** Phrase du robot pour chaque étape (même ordre que STEPS). */
const STEP_VOICES = ["journey_identity", "journey_country", "journey_currency", "journey_timezone", "journey_activity_count"] as const;

const ACTIVITY_COUNT_OPTIONS = [
  { value: "one", label: msg("Une seule activité") },
  { value: "two_to_three", label: msg("2 à 3 activités") },
  { value: "four_plus", label: msg("4 activités ou plus") },
] as const;

export function OnboardingWizard({
  countries,
  currencies,
  defaultFullName,
}: OnboardingWizardProps) {
  const { tr } = useLanguage();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(defaultFullName);
  const [userStatus, setUserStatus] = useState<string>("");
  const [countryCode, setCountryCode] = useState(countries[0]?.code ?? "CI");
  const [currencyCode, setCurrencyCode] = useState(currencies[0]?.code ?? "XOF");
  const [timezone, setTimezone] = useState(() => {
    let detected: string | null = null;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (_) {}
    return resolveAppropriateTimezone(countries[0]?.code ?? "CI", detected);
  });
  const [activityCountHint, setActivityCountHint] = useState<
    (typeof ACTIVITY_COUNT_OPTIONS)[number]["value"]
  >("two_to_three");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLastStep = step === STEPS.length - 1;

  function goNext() {
    if (step === 0 && fullName.trim().length < 2) {
      setError(tr("Entrez votre nom complet."));
      return;
    }
    if (step === 0 && !userStatus) {
      setError(tr("Choisissez ce qui vous décrit le mieux."));
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
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("status", userStatus);
    formData.set("countryCode", countryCode);
    formData.set("currencyCode", currencyCode);
    formData.set("timezone", timezone);
    formData.set("activityCountHint", activityCountHint);

    try {
      await completeOnboarding(formData);
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error ? err.message : tr("Une erreur est survenue.")
      );
    }
  }

  return (
    <div className="w-full max-w-md">
      <JourneyVoice key={step} id={STEP_VOICES[step] ?? STEP_VOICES[0]} once={false} delay={step === 0 ? 900 : 350} />
      <ol className="mb-8 flex gap-2" aria-label={tr("Étapes de configuration")}>
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
        {tr("Étape")}{" "}{step + 1} sur {STEPS.length}
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-ink-950">
        {STEPS[step]}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {step === 0 ? (
          <>
            <Field label={tr("Comment devons-nous vous appeler ?")} htmlFor="fullName">
              <TextInput
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label={tr("Vous êtes…")} htmlFor="userStatus">
              <select
                id="userStatus"
                value={userStatus}
                onChange={(e) => setUserStatus(e.target.value)}
                className="w-full rounded-xl border border-ink-200/90 dark:border-white/10 bg-canvas-raised dark:bg-slate-900 px-3.5 py-2.5 text-ink-950 dark:text-white focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
              >
                <option value="" disabled>
                  {tr("Choisissez…")}
                </option>
                {USER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {tr(s.label)}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <Field label={tr("Dans quel pays êtes-vous basé ?")} htmlFor="countryCode">
            <select
              id="countryCode"
              value={countryCode}
              onChange={(e) => {
                const newCode = e.target.value;
                setCountryCode(newCode);
                if (newCode === "CI") {
                  setCurrencyCode("XOF");
                  setTimezone("Africa/Abidjan");
                } else if (newCode === "SN" || newCode === "ML" || newCode === "BF" || newCode === "TG" || newCode === "BJ") {
                  setCurrencyCode("XOF");
                  setTimezone(resolveAppropriateTimezone(newCode));
                } else if (newCode === "CM" || newCode === "GA" || newCode === "CG") {
                  setCurrencyCode("XAF");
                  setTimezone(resolveAppropriateTimezone(newCode));
                } else if (newCode === "FR") {
                  setCurrencyCode("EUR");
                  setTimezone("Europe/Paris");
                }
              }}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {tr(c.name)}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {step === 2 ? (
          <Field label={tr("Quelle est votre devise principale ?")} htmlFor="currencyCode">
            <select
              id="currencyCode"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {tr(c.name)} ({c.symbol})
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {step === 3 ? (
          <Field label={tr("Fuseau horaire")} htmlFor="timezone">
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-md border border-ink-300 bg-canvas-raised px-3 py-2"
            >
              {TIMEZONE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {tr(t.label)} ({t.offset})
                </option>
              ))}
              {!TIMEZONE_OPTIONS.some((t) => t.value === timezone) && timezone && (
                <option value={timezone}>{timezone}</option>
              )}
            </select>
          </Field>
        ) : null}

        {step === 4 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-ink-700">
              {tr("Combien d'activités ou de sources de revenus gérez-vous ?")}</legend>
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
                {tr(option.label)}
              </label>
            ))}
          </fieldset>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {tr(error)}
          </p>
        ) : null}

        <div className="flex gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="rounded-md border border-ink-300 px-4 py-2.5 font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-50"
            >
              {tr("Retour")}</button>
          ) : null}

          {isLastStep ? (
            <PrimaryButton type="submit" loading={submitting} disabled={submitting}>
              {submitting ? tr("Enregistrement...") : tr("Terminer")}
            </PrimaryButton>
          ) : (
            <PrimaryButton type="button" onClick={goNext}>
              {tr("Continuer")}</PrimaryButton>
          )}
        </div>
      </form>
    </div>
  );
}
