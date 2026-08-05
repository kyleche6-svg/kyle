import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
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
  title: "DollarWatch — Market Intelligence Dashboard",
  description:
    "USD strength, congressional trades, and market-moving posts in one dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {/*
          IMPECCABLE DIRECTION CONTRACT (landing page, src/app/page.tsx)
          THESIS: Scattered tabs vs one dashboard — refuses the generic "hero stat card" SaaS default by dramatizing the before-state literally.
          OWN-WORLD: Existing DollarWatch system — bg #020617, panel #0e1223, indigo accent #5e6ad2, semantic green/red reserved for gain/loss only, Geist Mono for data, Phosphor icons.
          STORY: Visitor sees their own current workflow (X, ForexFactory, a broker app, a spreadsheet — scattered, tilted, disconnected) collapse into one clean DollarWatch panel. Believes: this replaces my open tabs. Does: view pricing or create account.
          FIRST VIEWPORT: Headline + subhead + CTA row, then the before/after strip below the fold line — scattered chip cluster (rotated, muted) -> ArrowRight -> single clean live-feeling Panel.
          FORM: Candidate 4 of 7 (problem/solution narrative), seed key 6cb51e30, assigned via concept-seed.mjs --scope surface --mode persuade.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
        */}
        <NavBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
