import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import PresenceTracker from "@/components/layout/PresenceTracker";
import SurveyWidget from "@/components/survey/SurveyWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IE World Cup 2026",
  description: "Track matches, predict scores and find classmates watching together",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WC2026",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <head>
        {/* apple-touch-icon not reliably emitted by Next.js metadata.icons for all iOS */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 pb-20`}
      >
        <SessionProvider session={session}>
          <PresenceTracker />
          <Header />
          <main className="mx-auto max-w-2xl px-4 py-6">
            {children}
          </main>
          <MobileNav />
          <SurveyWidget />
        </SessionProvider>
      </body>
    </html>
  );
}
