import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/shared/expense-form";
import { updateExpense } from "../../../actions";

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: expense }, { data: activities }, { data: currencies }] = await Promise.all([
    supabase.from("expenses").select("*").eq("id", params.id).eq("user_id", user!.id).single(),
    supabase
      .from("activities")
      .select("id, name, color")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase.from("currencies").select("code, symbol").order("code"),
  ]);

  if (!expense) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-950">Modifier la dépense</h1>
      </div>
      <ExpenseForm
        activities={activities ?? []}
        currencies={currencies ?? []}
        action={updateExpense.bind(null, expense.id)}
        submitLabel="Enregistrer"
        initial={{
          activityId: expense.activity_id ?? "",
          label: expense.label,
          category: expense.category ?? "",
          amount: String(expense.amount),
          currency: expense.currency,
          dueDate: expense.due_date,
          notes: expense.notes ?? "",
        }}
      />
    </div>
  );
}
