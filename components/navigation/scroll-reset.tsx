"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Remonte en haut du contenu à chaque changement de page (le défilement se fait dans <main>). */
export function ScrollReset() {
  const pathname = usePathname();
  useEffect(() => {
    const el = document.getElementById("app-scroll");
    if (el) el.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
