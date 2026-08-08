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

const ROTATING_WORDS = ["USD strength", "insider filings", "institutional holdings", "analyst consensus"];

const scatteredTabs = [
  { icon: ChartLineUp, label: "Terminal feed", rotate: "-rotate-3" },
  { icon: ShieldCheck, label: "Compliance feed", rotate: "rotate-2" },
  { icon: BookOpen, label: "Research desk", rotate: "-rotate-1" },
  { icon: Table, label: "A spreadsheet", rotate: "rotate-3" },
];

const pillars = [
  {
    icon: TrendUp,
    title: "Stocks",
    body: "Live pricing with real analyst consensus — Buy/Hold/Sell counts and price targets, sourced and attributed, never generated in-house.",
    href: "/stocks",
    color: "var(--accent)",
  },
  {
    icon: UserFocus,
    title: "Insider Trading",
    body: "Real SEC Form 4 filings — every officer, director, and 10%+ owner disclosing trades in their own company's stock, live from EDGAR.",
    href: "/insider-trading",
    color: "var(--accent-2)",
  },
  {
    icon: Trophy,
    title: "Top Traders",
    body: "Real SEC 13F institutional holdings — what Buffett, Dalio, and other major funds actually disclosed holding.",
    href: "/top-traders",
    color: "var(--accent-warm)",
  },
];

export default function Home() {
  return (
    <div>
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute top-0 right-0 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-20 left-0 h-[380px] w-[380px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent-2) 0%, transparent 70%)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-10 left-1/3 h-[260px] w-[260px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent-warm) 0%, transparent 70%)" }}
          aria-hidden="true"
        />
        <MarketSkyline />
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-14 pb-4">
          <div className="max-w-2xl">
            <div className="animate-rise-in mb-6 inline-flex items-center gap-2 rounded-full border border-panel-border bg-panel/60 px-3 py-1 text-xs font-medium tracking-wide text-muted uppercase backdrop-blur-sm">
              Real data, always attributed — not financial advice
            </div>
            <h1 className="animate-sprint-in-left text-4xl font-semibold tracking-tight">
              Terminal-grade market intelligence. Self-serve pricing.
            </h1>
            <p className="animate-sprint-in-right mt-4 text-lg text-muted">
              Real-time <RotatingWord words={ROTATING_WORDS} /> — correlated
              in one desk, without the enterprise contract.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/pricing"
                className="rounded-full px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
                style={{ background: "var(--gradient-brand)" }}
              >
                View pricing
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-panel-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-panel"
              >
                Create account
              </Link>
            </div>
            <div className="stagger-children mt-10 flex flex-wrap gap-3 text-xs font-medium tracking-wide text-muted uppercase">
              <span className="rounded-md border border-panel-border bg-panel/60 px-3 py-1.5">
                Every SEC Form 4, daily
              </span>
              <span className="rounded-md border border-panel-border bg-panel/60 px-3 py-1.5">
                Real 13F institutional data
              </span>
              <span className="rounded-md border border-panel-border bg-panel/60 px-3 py-1.5">
                No predictions, ever
              </span>
            </div>
          </div>
        </div>
      </div>

      <ScrollReveal className="mx-auto max-w-3xl px-6 py-10 text-center">
        <h2 className="text-xl font-semibold">What DollarWatch actually is</h2>
        <p className="mt-3 text-sm text-muted">
          Most market-data sites are either enterprise terminals that cost thousands a month, or
          they dress up guesswork as insight. DollarWatch does neither: every number on this site
          is real and attributed to its source — SEC EDGAR for insider trades and institutional
          holdings, the Federal Reserve for economic releases, real analyst consensus for
          price targets. Nothing here is generated, predicted, or dressed up as advice. It's the
          data institutions already see, priced for one person instead of a trading desk.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-panel-border bg-panel/60 px-6 py-3 text-xl font-semibold tracking-wide uppercase">
          Trusted by 10,000+ monthly users
        </p>
      </ScrollReveal>

      <ScrollReveal className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="mb-4 text-xs font-medium tracking-wide text-muted uppercase">
              Right now
            </p>
            <div className="relative flex flex-col gap-3">
              {scatteredTabs.map((tab, i) => {
                const Icon = tab.icon;
                return (
                  <div
                    key={tab.label}
                    className={`animate-gentle-bounce flex w-fit items-center gap-2 rounded-md border border-panel-border bg-panel px-3 py-2 text-sm text-muted opacity-70 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)] ${tab.rotate}`}
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
            <p className="mb-4 text-xs font-medium tracking-wide text-accent uppercase">
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

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <ScrollReveal key={pillar.title} delayMs={i * 120}>
                <Link href={pillar.href}>
                  <Panel className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_20px_-4px_rgba(0,0,0,0.6),0_24px_40px_-12px_rgba(0,0,0,0.5)]">
                    <Icon size={22} weight="regular" style={{ color: pillar.color }} />
                    <h3 className="mt-3 text-sm font-medium">{pillar.title}</h3>
                    <p className="mt-1.5 text-sm text-muted">{pillar.body}</p>
                  </Panel>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
