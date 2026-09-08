import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/shared/expense-form";
import { createExpense } from "../../actions";

export default async function NewExpensePage() {
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
        <h1 className="text-2xl font-semibold text-ink-950">Nouvelle dépense</h1>
        <p className="text-ink-500">Ponctuelle ou récurrente — à ressaisir chaque mois pour l&apos;instant.</p>
      </div>
      <ExpenseForm
        activities={activities ?? []}
        currencies={currencies ?? []}
        action={createExpense}
        initial={{
          activityId: "",
          label: "",
          category: "",
          amount: "",
          currency: profile?.default_currency ?? currencies?.[0]?.code ?? "",
          dueDate: "",
          notes: "",
        }}
      />
    </div>
  );
}
