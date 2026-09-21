import { redirect } from "next/navigation";

export default function NewExpensePage() {
  redirect("/finances?tab=scheduled&action=new");
}
