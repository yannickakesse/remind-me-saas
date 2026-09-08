"use client";

import { useState } from "react";

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
  const [activeId, setActiveId] = useState(defaultTabId ?? items[0]?.id ?? "");

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const nextIndex = e.key === "ArrowRight" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    const next = items[nextIndex];
    if (next) {
      setActiveId(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    }
  }

  const active = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <div>
      <div role="tablist" aria-label="Sections des paramètres" className="mb-6 flex flex-wrap gap-1 border-b border-ink-100">
        {items.map((item, index) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            role="tab"
            type="button"
            aria-selected={item.id === activeId}
            tabIndex={item.id === activeId ? 0 : -1}
            onClick={() => setActiveId(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              item.id === activeId
                ? "border-signal text-signal"
                : "border-transparent text-ink-500 hover:text-ink-950"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{active?.content}</div>
    </div>
  );
}
