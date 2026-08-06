import React, { Suspense } from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fredoka } from "next/font/google";
import "./globals.css";
import { ThemeApplier } from "../components/layout/ThemeApplier";
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
  title: "Rooky | Chess Arena",
  description: "An online chess arena with live matches",
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%231a2416"/><text x="50" y="72" text-anchor="middle" font-size="76" fill="%23f28b38">♜</text></svg>',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <SocketProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable}`}
        >
          <Providers>
            <ThemeApplier />
            <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
              <Suspense fallback={null}>
                <SideNav />
              </Suspense>
              <div style={{ flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden", height: "100%" }}>
                {children}
              </div>
            </div>
          </Providers>
        </body>
      </SocketProvider>
    </html>
  );
}

