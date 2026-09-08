import { createClient } from "@/lib/supabase/server";
import { IncomeForm } from "@/components/shared/income-form";
import { createIncome } from "../../actions";

export default async function NewIncomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: activities }, { data: currencies }, { data: profile }] = await Promise.all([
    supabase
      .from("activities")
      .select("id, name, color")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase.from("currencies").select("code, symbol").order("code"),
    supabase.from("profiles").select("default_currency").eq("id", user!.id).single(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-950">Nouveau revenu</h1>
        <p className="text-ink-500">
          Pour une échéance récurrente liée à une activité, préférez renseigner sa rémunération dans
          la fiche de l&apos;activité — elle sera générée automatiquement ici.
        </p>
      </div>
      <IncomeForm
        activities={activities ?? []}
        currencies={currencies ?? []}
        action={createIncome}
        initial={{
          activityId: "",
          label: "",
          amount: "",
          currency: profile?.default_currency ?? currencies?.[0]?.code ?? "",
          dueDate: "",
          notes: "",
        }}
      />
    </div>
  );
}
