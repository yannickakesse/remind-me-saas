"use client";

import Link from "next/link";
import { RemindMeLogo } from "./remindme-logo";
import { useTheme } from "@/components/theme/theme-provider";
import { useLanguage } from "@/components/i18n/language-provider";

export function LandingFooter() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <footer className="bg-canvas border-t border-ink-200/60 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="inline-block group">
              <RemindMeLogo size="sm" showText={true} />
            </Link>
            <p className="text-xs text-ink-500 leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="text-xs text-ink-500 font-mono">
              &copy; {new Date().getFullYear()} Remind Me Inc.
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950">
              {t("footer.col_product")}
            </h4>
            <ul className="space-y-2 text-xs text-ink-700">
              <li>
                <a href="#features" className="hover:text-signal transition-colors">
                  {t("footer.link_features")}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-signal transition-colors">
                  {t("footer.link_how")}
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-signal transition-colors">
                  {t("footer.link_pricing")}
                </a>
              </li>
              <li>
                <a href="#product-demo" className="hover:text-signal transition-colors">
                  {t("footer.link_demo")}
                </a>
              </li>
            </ul>
          </div>

          {/* Authentication Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950">
              {t("footer.col_access")}
            </h4>
            <ul className="space-y-2 text-xs text-ink-700">
              <li>
                <Link href="/login" className="hover:text-signal transition-colors">
                  {t("footer.link_login")}
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-signal transition-colors">
                  {t("footer.link_register")}
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-signal transition-colors">
                  {t("footer.link_forgot")}
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1 text-positive font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-positive" />
                  {t("footer.rls_active")}
                </span>
              </li>
            </ul>
          </div>

          {/* Theme & Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-950">
              {t("footer.col_theme")}
            </h4>
            <div className="space-y-2">
              <label className="text-xs text-ink-500 block">{t("footer.theme_label")}</label>
              <div className="inline-flex items-center bg-ink-100 p-1 rounded-lg gap-1 text-xs">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    theme === "light" ? "bg-canvas-raised font-semibold text-ink-950 shadow-sm" : "text-ink-700"
                  }`}
                >
                  {t("footer.theme_light")}
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    theme === "dark" ? "bg-canvas-raised font-semibold text-ink-950 shadow-sm" : "text-ink-700"
                  }`}
                >
                  {t("footer.theme_dark")}
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    theme === "system" ? "bg-canvas-raised font-semibold text-ink-950 shadow-sm" : "text-ink-700"
                  }`}
                >
                  {t("footer.theme_system")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-ink-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-500">
          <div>
            {t("footer.signature")}
          </div>
          <div className="flex items-center gap-6">
            <span>{t("footer.gdpr")}</span>
            <span>{t("footer.tls")}</span>
            <span>{t("footer.rls")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
