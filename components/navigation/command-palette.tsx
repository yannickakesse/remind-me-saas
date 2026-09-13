"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  TrendingUp,
  TrendingDown,
  Briefcase,
  User,
  Wallet,
  PiggyBank,
  BarChart3,
  Calendar,
  Settings,
  Search,
  X,
  LucideIcon,
} from "lucide-react";

interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  color?: string | null;
}

interface SearchCategory {
  category: string;
  items: SearchResultItem[];
}

interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  { id: "task-new", title: "Nouvelle tâche", subtitle: "Ajouter une tâche à faire", href: "/tasks/new", icon: CheckSquare, iconColor: "text-amber-700", iconBg: "bg-amber-100/70" },
  { id: "income-new", title: "Nouveau revenu", subtitle: "Saisir un paiement attendu ou reçu", href: "/finances/income/new", icon: TrendingUp, iconColor: "text-emerald-700", iconBg: "bg-emerald-100/70" },
  { id: "expense-new", title: "Nouvelle dépense", subtitle: "Enregistrer une dépense perso ou pro", href: "/finances/expenses/new", icon: TrendingDown, iconColor: "text-rose-700", iconBg: "bg-rose-100/70" },
  { id: "activity-new", title: "Nouvelle activité", subtitle: "Créer une activité et ses horaires", href: "/activities/new", icon: Briefcase, iconColor: "text-indigo-700", iconBg: "bg-indigo-100/70" },
  { id: "contact-new", title: "Nouveau contact", subtitle: "Ajouter un client ou collaborateur", href: "/clients/contacts/new", icon: User, iconColor: "text-cyan-700", iconBg: "bg-cyan-100/70" },
  { id: "budgets-view", title: "Gérer les budgets", subtitle: "Consulter les plafonds mensuels", href: "/finances?tab=budgets", icon: Wallet, iconColor: "text-gold-dark", iconBg: "bg-gold-soft" },
  { id: "savings-view", title: "Objectifs d'épargne", subtitle: "Suivre vos projets et réserves", href: "/finances?tab=savings", icon: PiggyBank, iconColor: "text-gold-dark", iconBg: "bg-gold-soft" },
  { id: "reports-view", title: "Rapports & Rentabilité", subtitle: "Voir le taux horaire net par activité", href: "/reports", icon: BarChart3, iconColor: "text-gold-dark", iconBg: "bg-gold-soft" },
  { id: "calendar-view", title: "Ouvrir le calendrier", subtitle: "Voir votre planning du mois", href: "/calendar", icon: Calendar, iconColor: "text-blue-700", iconBg: "bg-blue-100/70" },
  { id: "settings-view", title: "Paramètres du compte", subtitle: "Profil, devise, sécurité, abonnement", href: "/settings", icon: Settings, iconColor: "text-ink-700", iconBg: "bg-ink-100" },
];

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Écouteur de raccourci global Ctrl+K ou Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Recherche avec debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error("Erreur de recherche:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(href: string) {
    setIsOpen(false);
    router.push(href);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-ink-200 bg-canvas px-3 py-1.5 text-xs text-ink-500 hover:border-ink-300 hover:text-ink-700 transition-colors"
        title="Recherche globale (Ctrl+K)"
      >
        <span className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Rechercher...
        </span>
        <kbd className="rounded border border-ink-200 bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">
          Ctrl K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-ink-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-ink-200 bg-canvas-raised shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Champ de saisie */}
        <div className="relative flex items-center border-b border-ink-200 px-4 py-3">
          <svg className="h-5 w-5 text-ink-400 shrink-0 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tapez un nom d'activité, tâche, contact, montant..."
            className="w-full bg-transparent text-sm text-ink-950 placeholder-ink-400 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-ink-400 hover:text-ink-700 ml-2"
            >
              Effacer
            </button>
          ) : (
            <kbd className="rounded border border-ink-200 bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">
              ESC
            </kbd>
          )}
        </div>

        {/* Corps des résultats */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-xs text-ink-500">
              Recherche en cours...
            </div>
          ) : query.trim().length >= 2 ? (
            results.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-500">
                Aucun résultat trouvé pour « {query} ».
              </div>
            ) : (
              results.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    {cat.category}
                  </span>
                  <div className="space-y-0.5">
                    {cat.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item.href)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-signal-soft/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.color ? (
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          ) : null}
                          <span className="text-sm font-medium text-ink-950 truncate">{item.title}</span>
                        </div>
                        {item.subtitle ? (
                          <span className="text-xs text-ink-500 shrink-0 ml-2">{item.subtitle}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )
          ) : (
            /* Actions rapides par défaut */
            <div className="space-y-1">
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                Actions Rapides & Navigation
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleSelect(action.href)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-canvas transition-colors border border-transparent hover:border-ink-200"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${action.iconBg} ${action.iconColor}`}>
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-950">{action.title}</p>
                        <p className="text-[10px] text-ink-500 truncate">{action.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pied de dialogue */}
        <div className="border-t border-ink-100 bg-canvas px-4 py-2 text-[10px] text-ink-400 flex items-center justify-between">
          <span>Utilisez <strong>Ctrl+K</strong> pour ouvrir à tout moment</span>
          <span><strong>ESC</strong> pour fermer</span>
        </div>
      </div>
    </div>
  );
}
