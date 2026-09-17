import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IncomeForm } from "@/components/shared/income-form";
import { updateIncome } from "../../../actions";
import { requireCurrentUser } from "@/lib/supabase/auth";

export default async function EditIncomePage({ params }: { params: { id: string } }) {
  const user = await requireCurrentUser();
  const supabase = createClient();

  const [{ data: income }, { data: activities }, { data: currencies }] = await Promise.all([
    supabase.from("income").select("*").eq("id", params.id).eq("user_id", user.id).single(),
    supabase
      .from("activities")
      .select("id, name, color")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase.from("currencies").select("code, symbol").order("code"),
  ]);

  if (!income) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-950">Modifier le revenu</h1>
        {income.compensation_id ? (
          <p className="text-sm text-ink-500">
            Échéance générée automatiquement depuis la rémunération de l&apos;activité — vous pouvez
            ajuster le montant réellement dû, mais elle ne peut pas être supprimée.
          </p>
        ) : null}
      </div>
      <IncomeForm
        activities={activities ?? []}
        currencies={currencies ?? []}
        action={updateIncome.bind(null, income.id)}
        submitLabel="Enregistrer"
        initial={{
          activityId: income.activity_id ?? "",
          label: income.label,
          amount: String(income.amount),
          currency: income.currency,
          dueDate: income.due_date,
          notes: income.notes ?? "",
        }}
      />
    </div>
  );
}
