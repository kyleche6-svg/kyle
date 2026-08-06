import Link from "next/link";
import {
  ChartLineUp,
  ShieldCheck,
  BookOpen,
  Table,
  ArrowRight,
  Bank,
  ChatCircleText,
  TrendUp,
} from "@phosphor-icons/react/dist/ssr";
import { Panel } from "@/components/Panel";
import { StatNumber } from "@/components/StatNumber";
import { MarketSkyline } from "@/components/MarketSkyline";

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
  },
  {
    icon: Bank,
    title: "Politicians",
    body: "Congressional trade disclosures (STOCK Act filings), tracked as a feed and monthly leaderboard.",
    href: "/politicians",
  },
  {
    icon: ChatCircleText,
    title: "Tweets",
    body: "Market-moving posts correlated to tickers, with historical price-reaction windows.",
    href: "/tweets",
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
        <MarketSkyline />
        <div className="relative mx-auto max-w-6xl px-6 pt-14 pb-4">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight">
              Terminal-grade market intelligence. Self-serve pricing.
            </h1>
            <p className="mt-4 text-lg text-muted">
              USD strength, congressional trade disclosures, and
              market-moving signals — correlated in one desk, without the
              enterprise contract.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/pricing"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
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
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="mb-4 text-xs font-medium tracking-wide text-muted uppercase">
              Right now
            </p>
            <div className="relative flex flex-col gap-3">
              {scatteredTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <div
                    key={tab.label}
                    className={`flex w-fit items-center gap-2 rounded-md border border-panel-border bg-panel px-3 py-2 text-sm text-muted opacity-70 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)] ${tab.rotate}`}
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
                <StatNumber label="Congress buys (30d)" value="142" delta="+18" />
              </div>
              <div className="mt-4 flex flex-col gap-1.5 border-t border-panel-border pt-4 text-xs text-muted">
                <p>Fed Interest Rate Decision — today, 9:30 AM</p>
                <p>Non-Farm Payrolls — today, 5:00 AM</p>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Link key={pillar.title} href={pillar.href}>
                <Panel className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_20px_-4px_rgba(0,0,0,0.6),0_24px_40px_-12px_rgba(0,0,0,0.5)]">
                  <Icon size={22} weight="regular" className="text-accent" />
                  <h3 className="mt-3 text-sm font-medium">{pillar.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{pillar.body}</p>
                </Panel>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
