import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/shared/onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: countries }, { data: currencies }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, onboarding_completed")
        .eq("id", user.id)
        .single(),
      supabase.from("countries").select("code, name").order("name"),
      supabase.from("currencies").select("code, name, symbol").order("name"),
    ]);

  if (profile?.onboarding_completed) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <OnboardingWizard
        countries={countries ?? []}
        currencies={currencies ?? []}
        defaultFullName={profile?.full_name ?? ""}
      />
    </main>
  );
}
