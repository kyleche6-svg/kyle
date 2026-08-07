import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getInsiderTradesPage, getTopInsiderGainers } from "@/lib/insider-trading";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";
import { InsiderTradeTable } from "@/components/InsiderTradeTable";
import { InsiderPodium } from "@/components/InsiderPodium";

export default async function InsiderTradingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireActiveSubscription();

  const { q } = await searchParams;
  const search = q?.trim() || undefined;

  const [{ trades, total }, gainers] = await Promise.all([
    getInsiderTradesPage({ limit: 15, search }),
    search ? Promise.resolve([]) : getTopInsiderGainers(3),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="animate-sprint-in-left text-2xl font-semibold">Insider Trading</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Every SEC Form 4 filing from a full day, backfilled from SEC&apos;s daily index — company
        officers, directors, and 10%+ owners disclosing trades in their own company&apos;s stock, no
        filtering by name or company. Insiders must file within 2 business days of a transaction, so
        this reflects that window, not real-time.
      </p>

      {gainers.length === 3 && (
        <Panel title="Top reported buyers, by estimated paper gain" className="mt-6">
          <InsiderPodium gainers={gainers} />
        </Panel>
      )}

      <form method="GET" className="mt-6">
        <div className="relative max-w-sm">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search ticker, company, or insider name…"
            className="w-full rounded-md border border-panel-border bg-panel py-2 pr-3 pl-9 text-sm outline-none focus:border-accent"
          />
        </div>
      </form>

      <Panel title={`${search ? "Matching filings" : "Recent filings"} (${total})`} className="mt-4">
        <InsiderTradeTable initialTrades={trades} total={total} search={search} />
      </Panel>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
