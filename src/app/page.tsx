import Link from "next/link";
import {
  XLogo,
  Calendar,
  ChartLine,
  Table,
  ArrowRight,
  Bank,
  ChatCircleText,
  TrendUp,
} from "@phosphor-icons/react/dist/ssr";
import { Panel } from "@/components/Panel";
import { StatNumber } from "@/components/StatNumber";

const scatteredTabs = [
  { icon: XLogo, label: "X / Twitter", rotate: "-rotate-3" },
  { icon: Calendar, label: "ForexFactory", rotate: "rotate-2" },
  { icon: ChartLine, label: "Broker app", rotate: "-rotate-1" },
  { icon: Table, label: "A spreadsheet", rotate: "rotate-3" },
];

const pillars = [
  {
    icon: TrendUp,
    title: "Stocks",
    body: "Live prices with real analyst consensus — Buy/Hold/Sell counts and price targets, never app-generated calls.",
    href: "/stocks",
  },
  {
    icon: Bank,
    title: "Politicians",
    body: "Congressional stock trade disclosures, feed and monthly leaderboard.",
    href: "/politicians",
  },
  {
    icon: ChatCircleText,
    title: "Tweets",
    body: "Market-moving posts tagged to tickers, with historical price-reaction windows.",
    href: "/tweets",
  },
];

export default function Home() {
  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-4">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight">
            Everything you check before the market opens. One dashboard.
          </h1>
          <p className="mt-4 text-lg text-muted">
            USD strength, congressional trading disclosures, and
            market-moving posts — tracked and correlated, so you stop
            switching tabs.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/pricing"
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              View pricing
            </Link>
            <Link
              href="/signup"
              className="rounded-md border border-panel-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-panel"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
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
              </div>
              <div className="mt-4 border-t border-panel-border pt-4 text-xs text-muted">
                Fed Interest Rate Decision — today, 9:30 AM
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Link key={pillar.title} href={pillar.href}>
                <Panel className="h-full transition-colors hover:border-accent/40">
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
