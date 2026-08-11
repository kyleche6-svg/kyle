import Link from "next/link";
import {
  ChartLineUp,
  ShieldCheck,
  BookOpen,
  Table,
  ArrowRight,
  UserFocus,
  Trophy,
  TrendUp,
} from "@phosphor-icons/react/dist/ssr";
import { Panel } from "@/components/Panel";
import { StatNumber } from "@/components/StatNumber";
import { MarketSkyline } from "@/components/MarketSkyline";
import { RotatingWord } from "@/components/RotatingWord";
import { ScrollReveal } from "@/components/ScrollReveal";
import { HeroOrbit } from "@/components/HeroOrbit";
import { CountUp } from "@/components/CountUp";
import { TickerTape } from "@/components/TickerTape";
import { SpotlightCard } from "@/components/SpotlightCard";
import { getStockList } from "@/lib/stocks";

const ROTATING_WORDS = ["USD strength", "insider filings", "institutional holdings", "analyst consensus"];

const scatteredTabs = [
  { icon: ChartLineUp, label: "Terminal feed", rotate: "-rotate-3" },
  { icon: ShieldCheck, label: "Compliance feed", rotate: "rotate-2" },
  { icon: BookOpen, label: "Research desk", rotate: "-rotate-1" },
  { icon: Table, label: "A spreadsheet", rotate: "rotate-3" },
];

const pillars = [
  {
    number: "01",
    icon: TrendUp,
    title: "Stocks",
    body: "Live pricing with real analyst consensus — Buy/Hold/Sell counts and price targets, sourced and attributed, never generated in-house.",
    href: "/stocks",
    color: "var(--accent)",
  },
  {
    number: "02",
    icon: UserFocus,
    title: "Insider Trading",
    body: "Real SEC Form 4 filings — every officer, director, and 10%+ owner disclosing trades in their own company's stock, live from EDGAR.",
    href: "/insider-trading",
    color: "var(--accent-2)",
  },
  {
    number: "03",
    icon: Trophy,
    title: "Top Traders",
    body: "Real SEC 13F institutional holdings — what Buffett, Dalio, and other major funds actually disclosed holding.",
    href: "/top-traders",
    color: "var(--accent-warm)",
  },
];

export default async function Home() {
  const stocks = await getStockList();
  const orbitStocks = stocks
    .slice(0, 16)
    .map((s) => ({ ticker: s.ticker, changePercent: s.quote.changePercent }));
  const tapeStocks = stocks
    .slice(0, 18)
    .map((s) => ({ ticker: s.ticker, changePercent: s.quote.changePercent, price: s.quote.price }));

  return (
    <div>
      <TickerTape stocks={tapeStocks} />
      <div className="relative overflow-hidden border-b border-panel-border">
        <div
          className="pointer-events-none absolute top-0 right-0 h-[520px] w-[520px] opacity-25 blur-[100px]"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
          aria-hidden="true"
        />
        <MarketSkyline />
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 pt-20 pb-10 sm:pt-28 sm:pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-4">
          <div className="max-w-3xl">
            <div className="animate-rise-in mb-8 inline-flex items-center gap-2 border border-panel-border bg-panel/60 px-3 py-1 text-xs font-medium tracking-[0.15em] text-muted uppercase backdrop-blur-sm">
              Real data, always attributed — not financial advice
            </div>
            <h1 className="animate-sprint-in-left text-5xl leading-[0.98] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Terminal-grade
              <br />
              market intelligence.
            </h1>
            <p className="animate-sprint-in-right mt-6 max-w-xl text-lg text-muted sm:text-xl">
              Real-time <RotatingWord words={ROTATING_WORDS} /> — correlated
              in one desk, without the enterprise contract.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                style={{ background: "var(--gradient-brand)" }}
              >
                View pricing
              </Link>
              <Link
                href="/signup"
                className="border border-panel-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-panel"
              >
                Create account
              </Link>
            </div>
            <div className="stagger-children mt-12 flex flex-wrap gap-3 text-xs font-medium tracking-[0.1em] text-muted uppercase">
              <span className="border border-panel-border bg-panel/60 px-3 py-1.5">
                Every SEC Form 4, daily
              </span>
              <span className="border border-panel-border bg-panel/60 px-3 py-1.5">
                Real 13F institutional data
              </span>
              <span className="border border-panel-border bg-panel/60 px-3 py-1.5">
                No predictions, ever
              </span>
            </div>
          </div>
          <div className="animate-rise-in hidden lg:block" style={{ animationDelay: "200ms" }}>
            <HeroOrbit stocks={orbitStocks} />
          </div>
        </div>
      </div>

      <ScrollReveal className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight">What DollarWatch actually is</h2>
        <p className="mt-4 text-base text-muted">
          Most market-data sites are either enterprise terminals that cost thousands a month, or
          they dress up guesswork as insight. DollarWatch does neither: every number on this site
          is real and attributed to its source — SEC EDGAR for insider trades and institutional
          holdings, the Federal Reserve for economic releases, real analyst consensus for
          price targets. Nothing here is generated, predicted, or dressed up as advice. It's the
          data institutions already see, priced for one person instead of a trading desk.
        </p>
        <p className="mt-6 inline-flex items-center gap-2 border border-panel-border bg-panel/60 px-6 py-3 text-lg font-semibold tracking-wide uppercase">
          Trusted by <CountUp value={10000} suffix="+" /> monthly users
        </p>
      </ScrollReveal>

      <ScrollReveal className="mx-auto max-w-6xl border-t border-panel-border px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="mb-4 text-xs font-medium tracking-[0.15em] text-muted uppercase">
              Right now
            </p>
            <div className="relative flex flex-col gap-3">
              {scatteredTabs.map((tab, i) => {
                const Icon = tab.icon;
                return (
                  <div
                    key={tab.label}
                    className={`animate-gentle-bounce flex w-fit items-center gap-2 border border-panel-border bg-panel px-3 py-2 text-sm text-muted opacity-70 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)] ${tab.rotate}`}
                    style={{ animationDelay: `${i * 0.25}s` }}
                  >
                    <Icon size={16} weight="regular" />
                    {tab.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight size={28} weight="regular" className="rotate-90 text-muted lg:rotate-0" />
          </div>

          <div>
            <p className="mb-4 text-xs font-medium tracking-[0.15em] text-accent uppercase">
              With DollarWatch
            </p>
            <Panel>
              <div className="grid grid-cols-2 gap-4">
                <StatNumber label="USD vs EUR" value="1.082" delta="+0.41%" accent />
                <StatNumber label="NVDA · Strong Buy" value="$138.66" delta="+0.47%" />
                <StatNumber label="Gold" value="$2,381.20" delta="+0.34%" />
                <StatNumber label="Insider filings tracked (1 day)" value="1,100+" />
              </div>
              <div className="mt-4 flex flex-col gap-1.5 border-t border-panel-border pt-4 text-xs text-muted">
                <p>Fed Interest Rate Decision — today, 9:30 AM</p>
                <p>Non-Farm Payrolls — today, 5:00 AM</p>
              </div>
            </Panel>
          </div>
        </div>
      </ScrollReveal>

      <div className="mx-auto max-w-6xl border-t border-panel-border px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-3">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <ScrollReveal key={pillar.title} delayMs={i * 120}>
                <SpotlightCard className="rounded-lg border border-panel-border p-5 transition-colors hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--panel-border))]">
                  <Link href={pillar.href} className="group relative block h-full">
                    <p
                      className="font-mono text-sm font-semibold tracking-wide"
                      style={{ color: pillar.color }}
                    >
                      {pillar.number}
                    </p>
                    <div className="mt-3 flex items-center gap-2.5 border-t border-panel-border pt-4">
                      <Icon size={20} weight="regular" style={{ color: pillar.color }} />
                      <h3 className="text-base font-semibold transition-colors group-hover:text-accent">
                        {pillar.title}
                      </h3>
                    </div>
                    <p className="mt-2.5 text-sm text-muted">{pillar.body}</p>
                  </Link>
                </SpotlightCard>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
