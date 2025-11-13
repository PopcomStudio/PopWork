import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/error-boundary";
import { ProfileProvider } from "@/features/settings/contexts/profile-context";
import { TranslationProvider } from "@/features/translation/contexts/translation-context";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PopWork - Gestion d'agence web collaborative",
  description: "Application de gestion d'agence web pour optimiser vos projets, clients et équipes. Interface moderne et intuitive pour les professionnels du digital.",
  keywords: ["gestion agence", "projets web", "collaboration", "clients", "équipe"],
  authors: [{ name: "PopWork Team" }],
  openGraph: {
    title: "PopWork - Gestion d'agence web",
    description: "Optimisez la gestion de votre agence web avec PopWork",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TranslationProvider>
              <ProfileProvider>
                {children}
                <Toaster />
              </ProfileProvider>
            </TranslationProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
