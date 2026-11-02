"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { TodayFocus } from "@/components/dashboard/today-focus";

// Aperçu du VRAI tableau de bord Remind Me : mêmes composants que dans l'application,
// alimentés par un jeu de données de démonstration (non cliquable).
export function LandingDashboardPreview() {
  // Rendu après montage : les créneaux de démo dépendent de l'heure locale du visiteur
  const [demo, setDemo] = useState<ReturnType<typeof buildDemo> | null>(null);
  useEffect(() => setDemo(buildDemo()), []);

  return (
    <div
      aria-hidden="true"
      className="relative isolate overflow-hidden rounded-[28px] border border-ink-200/80 dark:border-ink-800 shadow-xl shadow-ink-950/10"
    >
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/backgrounds/dashboard-bg.jpg')" }}
      />
      <div className="pointer-events-none select-none p-2 sm:p-5 space-y-3 sm:space-y-4">
        {demo ? (
          <>
            <div className="rounded-3xl border border-ink-200/90 dark:border-ink-800/90 bg-canvas-raised/95 dark:bg-slate-900/95 backdrop-blur-md p-4 sm:p-5 shadow-xs">
              <DashboardHeader userName="Awa" timezone={demo.timezone} />
            </div>
            <DashboardKpis
              incomeExpected={85000}
              incomeReceived={240000}
              expensesPaid={62000}
              net={178000}
              currency="XOF"
            />
            <TodayFocus
              todayEvents={demo.events}
              urgentTasks={demo.tasks}
              timezone={demo.timezone}
              locale="fr"
              todayIso={demo.todayIso}
            />
          </>
        ) : (
          <div className="h-[560px] rounded-3xl bg-canvas-raised/80 animate-pulse" />
        )}
      </div>
    </div>
  );
}

function buildDemo() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const today = DateTime.now().setZone(timezone).startOf("day");
  const at = (h: number, m = 0) => today.set({ hour: h, minute: m }).toISO()!;

  return {
    timezone,
    todayIso: today.toISODate()!,
    events: [
      {
        id: "demo-1",
        title: "Cours de mathématiques",
        starts_at: at(8),
        ends_at: at(10),
        status: "planned",
        activity: { name: "Enseignement", color: "#1E3A5F" },
      },
      {
        id: "demo-2",
        title: "Atelier client",
        starts_at: at(17, 30),
        ends_at: at(19),
        status: "planned",
        activity: { name: "Conseil", color: "#D97706" },
      },
    ],
    tasks: [
      {
        id: "demo-t1",
        title: "Envoyer la facture d'octobre",
        priority: "high" as const,
        due_date: today.toISODate()!,
        status: "todo",
      },
    ],
  };
}
