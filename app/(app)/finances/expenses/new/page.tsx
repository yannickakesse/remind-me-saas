import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/shared/expense-form";
import { createExpense } from "../../actions";
import { requireCurrentUser, getCurrentProfile } from "@/lib/supabase/auth";

export default async function NewExpensePage() {
  const [user, profile] = await Promise.all([
    requireCurrentUser(),
    getCurrentProfile(),
  ]);
  const supabase = createClient();

  const [{ data: activities }, { data: currencies }] = await Promise.all([
    supabase
      .from("activities")
      .select("id, name, color")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase.from("currencies").select("code, symbol").order("code"),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">
          Nouvelle dépense
        </h1>
        <p className="text-xs text-ink-500 mt-1">
          Enregistrez un décaissement ponctuel ou une charge à régler. Pour un abonnement ou un loyer récurrent, vous pouvez aussi le programmer dans les dépenses prévisionnelles.
        </p>
      </div>

      <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/98 dark:bg-slate-900/98 backdrop-blur-md p-5 sm:p-7 shadow-xs">
        <ExpenseForm
          activities={activities ?? []}
          currencies={currencies ?? []}
          action={createExpense}
          initial={{
            activityId: "",
            label: "",
            category: "other",
            amount: "",
            currency: profile?.default_currency ?? currencies?.[0]?.code ?? "XOF",
            dueDate: new Date().toISOString().slice(0, 10),
            notes: "",
          }}
        />
      </div>
    </div>
  );
}

