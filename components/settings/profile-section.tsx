"use client";

import { useRef, useState } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { profileFormSchema } from "@/lib/validation/settings";
import { updateProfile, updateAvatarUrl } from "@/app/(app)/settings/actions";

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

  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [countryCode, setCountryCode] = useState(profile.country_code ?? countries[0]?.code ?? "");
  const [currencyCode, setCurrencyCode] = useState(profile.default_currency ?? currencies[0]?.code ?? "");
  const [timezone, setTimezone] = useState(profile.timezone);
  const [locale, setLocale] = useState(profile.locale);
  const [weekStart, setWeekStart] = useState(String(profile.week_start));
  const [timeFormat, setTimeFormat] = useState(profile.time_format);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      push("Le fichier doit être une image.", "error");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      push("L'image doit faire moins de 2 Mo.", "error");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateAvatarUrl(data.publicUrl);
      setAvatarUrl(data.publicUrl);
      push("Photo de profil mise à jour.", "success");
    } catch {
      push("Impossible d'envoyer cette image. Réessayez.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = profileFormSchema.safeParse({
      fullName,
      countryCode,
      currencyCode,
      timezone,
      locale,
      weekStart,
      timeFormat,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[issue.path[0] as string] = issue.message;
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
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar externe (Supabase Storage), pas d'optimisation next/image nécessaire ici
          <img src={avatarUrl} alt="Photo de profil" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-signal-soft text-lg font-semibold text-signal">
            {initials(fullName)}
          </div>
        )}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Changer la photo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            aria-label="Choisir une photo de profil"
          />
          <p className="mt-1 text-xs text-ink-500">JPG ou PNG, 2 Mo maximum.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Nom complet" htmlFor="fullName" error={fieldErrors.fullName}>
          <TextInput id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>

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
          <TextInput
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Africa/Abidjan"
          />
        </Field>

        <Field label="Langue" htmlFor="locale" error={fieldErrors.locale}>
          <Select id="locale" value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="fr">Français</option>
            <option value="en">English</option>
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

        <Button type="submit" loading={saving} className="self-start">
          Enregistrer
        </Button>
      </form>
    </div>
  );
}
