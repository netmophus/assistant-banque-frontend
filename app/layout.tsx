import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Miznas Pilot — L'IA au service de la décision bancaire",
  description: "Plateforme d'intelligence artificielle pour les institutions bancaires de la zone UEMOA. Analyse de crédit, recouvrement, états financiers PCB et formation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          defaultTheme="default"
          storageKey="bankia-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
