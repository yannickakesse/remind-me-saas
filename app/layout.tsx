import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme/theme-script";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { PWARegister } from "@/components/pwa/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { NavigationProgressBar } from "@/components/ui/navigation-progress";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0B0F17" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F17" },
  ],
};

export const metadata: Metadata = {
  applicationName: "Remind Me",
  title: {
    default: "Remind Me — Multi-Activity SaaS",
    template: "%s | Remind Me",
  },
  description:
    "Gérez vos activités multiples, votre temps et vos revenus depuis un seul endroit avec rappels intelligents.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Remind Me",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/favicon-32x32.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        {/* Apple Touch Icon explicit links for iOS Safari Home Screen */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Remind Me" />

        {/* beforeInteractive : s'exécute avant l'hydratation, évite tout
            flash d'un thème incorrect (voir lib/theme/theme-script.ts). */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <Suspense fallback={null}>
              <NavigationProgressBar />
            </Suspense>
            <PWARegister />
            <PwaInstallPrompt />
            {children}
            <Analytics />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
