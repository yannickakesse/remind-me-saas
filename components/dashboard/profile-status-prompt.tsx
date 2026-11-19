"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { USER_STATUSES } from "@/lib/profile/status";
import { saveProfileStatus } from "@/app/(app)/profile-status-actions";

/** Demandé une seule fois aux comptes créés avant la question « Vous êtes… » de l'inscription. */
export function ProfileStatusPrompt() {
  const { tr } = useLanguage();
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  if (state === "done") return null;

  const save = async () => {
    if (!value) return setError(tr("Choisissez ce qui vous décrit le mieux."));
    setState("saving");
    const res = await saveProfileStatus(value);
    if (res.ok) setState("done");
    else {
      setState("idle");
      setError(res.error ? tr(res.error) : tr("Une erreur est survenue."));
    }
  };

  return (
    <section className="rounded-2xl border border-[#E6E2D9] bg-white p-4 dark:border-[#2A3647] dark:bg-[#1A2332] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3EF] text-[#214E3B] dark:bg-[#16302A] dark:text-[#7FD1AE]">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#17211D] dark:text-[#F3F1EC]">{tr("Vous êtes…")}</p>
          <p className="mt-0.5 text-xs text-[#4A524D] dark:text-[#B7C0CC]">
            {tr("Une seule question, pour adapter Remind Me à votre situation.")}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              aria-label={tr("Vous êtes…")}
              className="h-11 flex-1 rounded-xl border border-[#E6E2D9] bg-white px-3 text-sm text-[#17211D] dark:border-[#2A3647] dark:bg-[#111822] dark:text-[#F3F1EC]"
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
            <button
              type="button"
              onClick={save}
              disabled={state === "saving"}
              className="h-11 rounded-xl bg-[#214E3B] px-5 text-sm font-semibold text-white hover:bg-[#1A3F30] disabled:opacity-60 dark:bg-[#2F6B52]"
            >
              {tr("Enregistrer")}
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
        </div>
      </div>
    </section>
  );
}
