import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

import { NextUIProvider } from "@nextui-org/react";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Infergram",
  icons: {
    icon: "/favicon.ico",
  },
  authors: [
    { name: "Sanay George Varghese", url: "https://sanayvarghese.github.io" },
  ],
  creator: "Sanay George Varghese",
  keywords: [
    "infergram",
    "infergram.io",
    "infergram.live",
    "multiplayer game",
    "multiplayer",
    "game",
    "online game",
    "skribbl",
    "skribble",
    "skribbl alternative",
  ],
  applicationName: "Infergram",

  description:
    "Welcome to Infergram: Where images spark words and friends compete! Guess hidden phrases, race the clock, and challenge your crew in this multiplayer game. Join now and see who can infer the most!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body
        className={cn(
          "min-h-screen bg-background dark font-sans antialiased",
          inter.variable
        )}
      >
        <Toaster position="bottom-center" />
        <NextUIProvider className="min-h-screen">
          <main className=" mx-auto w-full sm:w-[90%]">{children}</main>
        </NextUIProvider>
        <Footer />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
