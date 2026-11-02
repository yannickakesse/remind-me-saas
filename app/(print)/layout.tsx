// Documents imprimables (rapports, relevés, calendrier) : hors du cadre de l'application
// (barre latérale, navigation mobile, pop-ups), pour une impression A4 propre.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 print:bg-white">{children}</div>;
}
