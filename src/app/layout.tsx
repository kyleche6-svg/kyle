import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-data-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dollarwatch.watch"),
  title: "DollarWatch — Terminal-Grade Market Intelligence",
  description:
    "USD strength, insider trading disclosures, and institutional holdings — correlated in one desk, self-serve pricing.",
  openGraph: {
    title: "DollarWatch — Terminal-Grade Market Intelligence",
    description:
      "Real data, always attributed — not financial advice. Stocks, insider trading, and institutional holdings in one desk.",
    url: "https://dollarwatch.watch",
    siteName: "DollarWatch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DollarWatch — Terminal-Grade Market Intelligence",
    description:
      "Real data, always attributed — not financial advice. Stocks, insider trading, and institutional holdings in one desk.",
  },
  verification: {
    google: "gwrXGpN-jB4kF9OROyS5cUIfIMhrn-NDKEBR-AcWCM8",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {/*
          IMPECCABLE DIRECTION CONTRACT (landing page, src/app/page.tsx)
          THESIS: Professional's scattered desk (terminal feed, compliance feed, research desk, spreadsheet) vs one dashboard — refuses the generic "hero stat card" SaaS default by dramatizing the before-state literally, reframed toward a professional/institutional-style audience per product-owner direction (PRODUCT.md Users, updated this session).
          OWN-WORLD: Existing DollarWatch system — bg #020617, panel #0e1223, indigo accent #5e6ad2, semantic green/red reserved for gain/loss only, Geist Mono for data, Phosphor icons.
          STORY: Visitor (a finance professional) sees their own scattered workflow collapse into one clean DollarWatch panel. Believes: terminal-grade tooling at self-serve pricing, not an enterprise sales process. Does: view pricing or create account. Honest boundary: no claim of actual institutional/bank customers — none exist yet (PRODUCT.md Evidence on Hand).
          FIRST VIEWPORT: Headline + subhead + CTA row, then the before/after strip below the fold line — scattered chip cluster (rotated, muted) -> ArrowRight -> single clean live-feeling Panel.
          FORM: Candidate 4 of 7 (problem/solution narrative), seed key 6cb51e30, assigned via concept-seed.mjs --scope surface --mode persuade. Copy reframed in-place per explicit product-owner request; structure/visual world unchanged (not a re-roll).
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
        */}
        <NavBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
