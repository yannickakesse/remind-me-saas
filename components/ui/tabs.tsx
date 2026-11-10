"use client";


import { useLanguage } from "@/components/i18n/language-provider";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
}

/**
 * Onglets génériques — navigation clavier (flèches, §116 du prompt maître).
 * Utilisé pour structurer Paramètres (§69) en sections, sans routing dédié :
 * plus simple à maintenir pour une première version, migrable vers des
 * sous-routes plus tard si besoin sans changer l'API des sections.
 */
export function Tabs({ items, defaultTabId }: TabsProps) {
  const { tr } = useLanguage();
  const [activeId, setActiveId] = useState(defaultTabId ?? items[0]?.id ?? "");

  // Un lien vers « ?tab=… » alors que la page est déjà ouverte (ex. « Voir les offres »
  // depuis l'onglet Notifications) doit bien basculer sur l'onglet demandé.
  const tabParam = useSearchParams()?.get("tab");
  useEffect(() => {
    if (tabParam && items.some((item) => item.id === tabParam)) setActiveId(tabParam);
  }, [tabParam, items]);

  // L'adresse suit l'onglet choisi : un lien vers un autre onglet change donc toujours l'URL
  function selectTab(id: string) {
    setActiveId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(window.history.state, "", url);
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const nextIndex = e.key === "ArrowRight" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    const next = items[nextIndex];
    if (next) {
      selectTab(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    }
  }

  const active = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Tab bar in solid opaque pill container */}
      <div className="w-full max-w-full overflow-x-auto no-scrollbar pb-1">
        <div
          role="tablist"
          aria-label={tr("Sections des paramètres")}
          className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-canvas-raised/98 dark:bg-slate-900/98 border border-ink-200/90 dark:border-ink-800/90 shadow-xs min-w-max"
        >
          {items.map((item, index) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectTab(item.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap tap-active cursor-pointer ${
                  isActive
                    ? "bg-signal text-white shadow-xs scale-[1.02]"
                    : "text-ink-600 dark:text-ink-300 hover:text-ink-950 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-ink-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content in solid high-contrast card */}
      <div
        role="tabpanel"
        className="w-full min-w-0 bg-canvas-raised/98 dark:bg-slate-900/98 border border-ink-200/90 dark:border-ink-800/90 p-5 sm:p-7 rounded-3xl shadow-sm text-ink-950 dark:text-white"
      >
        {active?.content}
      </div>
    </div>
  );
}
