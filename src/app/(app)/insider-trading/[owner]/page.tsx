import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getOwnerTradesPage, getOwnerHoldings } from "@/lib/insider-trading";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";
import { InsiderTradeTable } from "@/components/InsiderTradeTable";

export default async function InsiderOwnerPage({
  params,
}: {
  params: Promise<{ owner: string }>;
}) {
  await requireActiveSubscription();

  const { owner: rawOwner } = await params;
  const ownerName = decodeURIComponent(rawOwner);

  const [{ trades, total }, holdings] = await Promise.all([
    getOwnerTradesPage(ownerName, { limit: 15 }),
    getOwnerHoldings(ownerName),
  ]);

  if (total === 0) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/insider-trading"
        className="flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to insider trading
      </Link>

      <div className="mt-3">
        <h1 className="animate-sprint-in-left text-2xl font-semibold">{ownerName}</h1>
        <p className="mt-1 text-sm text-muted">{trades[0]?.relationship}</p>
      </div>

      <Panel title="Reported holdings" className="mt-6">
        <p className="mb-3 text-xs text-muted">
          Shares owned after their most recent Form 4 transaction in each company — as current as
          their last filing, not a live balance.
        </p>
        {holdings.length === 0 ? (
          <p className="text-sm text-muted">No ownership figures reported in the filings on file.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {holdings.map((h) => (
              <Link
                key={h.ticker}
                href={`/stocks/${h.ticker}`}
                className="rounded-md border border-panel-border p-3 transition-colors hover:border-accent/40"
              >
                <p className="font-mono text-sm font-medium">{h.ticker}</p>
                <p className="text-xs text-muted">{h.issuerName}</p>
                <p className="mt-1.5 font-mono text-sm tabular-nums">
                  {h.sharesOwnedAfter.toLocaleString()} shares
                </p>
                <p className="text-xs text-muted">as of {h.asOfDate}</p>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={`Filing history (${total})`} className="mt-4">
        <InsiderTradeTable initialTrades={trades} total={total} owner={ownerName} />
      </Panel>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
