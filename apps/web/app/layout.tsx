import React, { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Fredoka } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "../hooks/useSocket/socketConnection";
import Providers from "../components/Providers";
import SideNav from "../components/layout/SideNav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});
const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://chesscounty.life"),
  applicationName: "Rooky",
  title: "Rooky",
  description:
    "Play live chess, challenge friends, join tournaments, study your games, and improve with computer analysis on Rooky.",
  keywords: [
    "Rooky",
    "online chess",
    "play chess",
    "live chess",
    "chess tournaments",
    "chess analysis",
    "chess training",
  ],
  authors: [{ name: "Rooky" }],
  creator: "Rooky",
  publisher: "Rooky",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Rooky",
    title: "Rooky",
    description:
      "Play live chess, challenge friends, join tournaments, and improve with game analysis.",
  },
  twitter: {
    card: "summary",
    title: "Rooky",
    description:
      "Play live chess, challenge friends, join tournaments, and improve with game analysis.",
  },
  category: "games",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%231a2416"/><text x="50" y="72" text-anchor="middle" font-size="76" fill="%23f28b38">♜</text></svg>',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5fbeb",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <SocketProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable}`}
        >
          <Providers>
            <div className="flex flex-col md:flex-row w-full h-dvh overflow-hidden">
              <Suspense fallback={null}>
                <SideNav />
              </Suspense>
              <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden h-full">
                {children}
              </div>
            </div>
          </Providers>
        </body>
      </SocketProvider>
    </html>
  );
}
