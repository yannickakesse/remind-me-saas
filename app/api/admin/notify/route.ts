import { NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/admin/notifier";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, email, fullName, details } = body;

    if (!type) {
      return NextResponse.json({ error: "Paramètre type requis" }, { status: 400 });
    }

    const result = await notifyAdmin({
      type,
      email,
      fullName,
      details,
    });

    return NextResponse.json({
      success: true,
      channels: result,
    });
  } catch (error: any) {
    console.error("[API:Admin:Notify] Erreur:", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
