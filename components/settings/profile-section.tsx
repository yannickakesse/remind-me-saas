"use client";

import { useRef, useState } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { profileFormSchema } from "@/lib/validation/settings";
import { updateProfile, updateAvatarUrl } from "@/app/(app)/settings/actions";
import { TIMEZONE_OPTIONS, resolveAppropriateTimezone } from "@/lib/time/timezones";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { AvatarModal } from "./avatar-modal";

interface ProfileSectionProps {
  userId: string;
  countries: { code: string; name: string }[];
  currencies: { code: string; name: string; symbol: string }[];
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    country_code: string | null;
    default_currency: string | null;
    timezone: string;
    locale: string;
    week_start: number;
    time_format: string;
  };
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 Mo — §133 : limiter la taille des images uploadées.

function initials(fullName: string | null): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function ProfileSection({ userId, countries, currencies, profile }: ProfileSectionProps) {
  const { push } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const rawName = (profile.full_name ?? "").trim();
  const nameParts = rawName.split(/\s+/);
  const initialLastName = nameParts[0] ?? "";
  const initialFirstName = nameParts.slice(1).join(" ");

  const [lastName, setLastName] = useState(initialLastName);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [countryCode, setCountryCode] = useState(profile.country_code ?? countries[0]?.code ?? "CI");
  const [currencyCode, setCurrencyCode] = useState(profile.default_currency ?? currencies[0]?.code ?? "XOF");
  const [timezone, setTimezone] = useState(
    resolveAppropriateTimezone(profile.country_code, profile.timezone)
  );
  const [locale, setLocale] = useState(profile.locale);
  const [weekStart, setWeekStart] = useState(String(profile.week_start));
  const [timeFormat, setTimeFormat] = useState(profile.time_format);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  async function handleAvatarSelect(fileOrUrl: Blob | string, isPreset: boolean) {
    setUploading(true);
    const previousUrl = avatarUrl;
    try {
      if (isPreset && typeof fileOrUrl === "string") {
        // Enregistrement d'un avatar SVG prédéfini
        setAvatarUrl(fileOrUrl);
        await updateAvatarUrl(fileOrUrl);
        push("Avatar appliqué avec succès.", "success");
      } else if (fileOrUrl instanceof Blob) {
        // Upload du blob compressé optimisé (WebP / JPEG) vers Supabase Storage
        const supabase = createClient();
        const extension = fileOrUrl.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/avatar-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, fileOrUrl, { upsert: true, contentType: fileOrUrl.type });

        if (uploadError) {
          // Si le bucket de stockage échoue ou est indisponible, fallback vers dataUrl optimisé
          console.warn("Storage upload warning, fallback to data url:", uploadError);
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            setAvatarUrl(dataUrl);
            await updateAvatarUrl(dataUrl);
          };
          reader.readAsDataURL(fileOrUrl);
        } else {
          const { data } = supabase.storage.from("avatars").getPublicUrl(path);
          setAvatarUrl(data.publicUrl);
          await updateAvatarUrl(data.publicUrl);
        }
        push("Photo de profil mise à jour avec succès.", "success");
      }
    } catch (err: any) {
      setAvatarUrl(previousUrl);
      push("Impossible de mettre à jour la photo de profil. Veuillez réessayer.", "error");
      throw err;
    } finally {
      setUploading(false);
    }
  }

  const computedFullName = [lastName.trim(), firstName.trim()].filter(Boolean).join(" ");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = profileFormSchema.safeParse({
      fullName: computedFullName,
      countryCode,
      currencyCode,
      timezone,
      locale,
      weekStart,
      timeFormat,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "fullName") {
          errors.lastName = "Le nom est obligatoire (au moins 2 caractères)";
        } else {
          errors[issue.path[0] as string] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("fullName", result.data.fullName);
      formData.set("countryCode", result.data.countryCode);
      formData.set("currencyCode", result.data.currencyCode);
      formData.set("timezone", result.data.timezone);
      formData.set("locale", result.data.locale);
      formData.set("weekStart", String(result.data.weekStart));
      formData.set("timeFormat", result.data.timeFormat);
      await updateProfile(formData);
      push("Profil enregistré.", "success");
    } catch {
      push("Impossible d'enregistrer le profil. Réessayez.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-md">
      <div className="mb-6 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Photo de profil"
            className="h-16 w-16 rounded-full object-cover ring-2 ring-zinc-300 dark:ring-zinc-700 shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-signal-soft text-lg font-bold text-signal ring-2 ring-zinc-300 dark:ring-zinc-700">
            {initials(computedFullName || profile.full_name)}
          </div>
        )}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={() => setIsAvatarModalOpen(true)}
            className="font-bold text-xs"
          >
            Changer la photo ou l&apos;avatar
          </Button>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
            Sélectionnez une photo de smartphone (compressée automatiquement) ou un avatar stylisé.
          </p>
        </div>
      </div>

      <AvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatarUrl={avatarUrl}
        onSelectAvatar={handleAvatarSelect}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nom *" htmlFor="lastName" error={fieldErrors.lastName}>
            <TextInput
              id="lastName"
              value={lastName}
              placeholder="Ex: Kouassi"
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </Field>

          <Field label="Prénom (facultatif)" htmlFor="firstName" error={fieldErrors.firstName}>
            <TextInput
              id="firstName"
              value={firstName}
              placeholder="Ex: Yannick"
              onChange={(e) => setFirstName(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Pays" htmlFor="countryCode" error={fieldErrors.countryCode}>
          <Select id="countryCode" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Devise principale" htmlFor="currencyCode" error={fieldErrors.currencyCode}>
          <Select id="currencyCode" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.symbol})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fuseau horaire" htmlFor="timezone" error={fieldErrors.timezone}>
          <Select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} ({t.offset})
              </option>
            ))}
            {!TIMEZONE_OPTIONS.some((t) => t.value === timezone) && timezone && (
              <option value={timezone}>{timezone}</option>
            )}
          </Select>
        </Field>

        <Field label="Langue de l'interface" htmlFor="locale" error={fieldErrors.locale}>
          <Select id="locale" value={locale} onChange={(e) => setLocale(e.target.value)}>
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.nativeLabel} ({l.label})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Premier jour de la semaine" htmlFor="weekStart" error={fieldErrors.weekStart}>
          <Select id="weekStart" value={weekStart} onChange={(e) => setWeekStart(e.target.value)}>
            <option value="1">Lundi</option>
            <option value="0">Dimanche</option>
          </Select>
        </Field>

        <Field label="Format de l'heure" htmlFor="timeFormat" error={fieldErrors.timeFormat}>
          <Select id="timeFormat" value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)}>
            <option value="24h">24 heures (14:00)</option>
            <option value="12h">12 heures (2:00 PM)</option>
          </Select>
        </Field>

        <Button type="submit" loading={saving} className="self-start font-bold">
          Enregistrer
        </Button>
      </form>

      {/* Carte d'Aide & Relance du Guide Interactif */}
      <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gold/15 text-gold-dark font-black text-xs">
                ?
              </span>
              Guide & Visite Interactive
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
              Besoin de revoir le fonctionnement de Remind Me ? Relancez le tour interactif pas-à-pas à tout moment.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("remindme_tour_status");
                window.dispatchEvent(new CustomEvent("remindme:start-tour"));
                push("Visite guidée relancée.", "info");
              }
            }}
            className="shrink-0"
          >
            Revoir le guide
          </Button>
        </div>
      </div>
    </div>
  );
}
