import Link from "next/link";
import { Buildings, Sparkle, ArrowRight, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getTopTraderPortfolios, searchInstitutionalFilers } from "@/lib/institutional-holdings";
import { getSpeculativeContext } from "@/lib/holdings-context";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";

function formatCompact(value: number) {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function formatFilingDate(iso: string | null) {
  if (!iso) return "No 13F-HR on file";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default async function TopTradersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireActiveSubscription();

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [funds, searchResults] = await Promise.all([
    getTopTraderPortfolios(),
    query ? searchInstitutionalFilers(query) : Promise.resolve([]),
  ]);
  const contextByFund = await Promise.all(funds.map((fund) => getSpeculativeContext(fund)));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="animate-sprint-in-left text-2xl font-semibold">Top Traders</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Real institutional holdings from SEC Form 13F filings — what large
        investment managers ($100M+ AUM) publicly disclosed holding as of
        their most recent quarterly filing. The SEC gives filers up to 45
        days after quarter-end to file, so this reflects each fund&apos;s
        position as of that filing date, not today&apos;s live portfolio —
        there is no faster public data for this.
      </p>
      <p className="mt-2 flex items-start gap-2 rounded-md border border-panel-border bg-panel px-3 py-2 text-xs text-muted">
        <Sparkle size={14} className="mt-0.5 shrink-0 text-accent" />
        <span>
          The &ldquo;possible context&rdquo; notes are AI-generated speculation from general
          market knowledge — 13F filings never state a reason. They are not the
          fund&apos;s own explanation and not investment advice.
        </span>
      </p>

      <form method="GET" className="mt-6">
        <div className="relative max-w-sm">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search any 13F filer by name…"
            className="w-full rounded-md border border-panel-border bg-panel py-2 pr-3 pl-9 text-sm outline-none focus:border-accent"
          />
        </div>
      </form>

      {query && (
        <Panel title={`Search results for "${query}"`} className="mt-4">
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted">No 13F filers matched that name.</p>
          ) : (
            <div className="flex flex-col divide-y divide-panel-border">
              {searchResults.map((result) => (
                <Link
                  key={result.cik}
                  href={`/top-traders/${result.cik}`}
                  className="flex items-center justify-between py-2.5 text-sm transition-colors hover:text-accent"
                >
                  <span>{result.name}</span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          )}
        </Panel>
      )}

      <h2 className="mt-6 text-lg font-medium">Popular funds</h2>
      <div className="stagger-children mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {funds.map((fund, i) => {
          const notes = contextByFund[i];
          return (
            <Link key={fund.cik} href={`/top-traders/${fund.cik}`} className="block">
            <Panel>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Buildings size={22} weight="light" className="mt-0.5 text-accent" />
                  <div>
                    <p className="text-sm font-semibold">{fund.name}</p>
                    <p className="text-xs text-muted">{fund.manager}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">13F value</p>
                  <p className="font-mono text-sm font-medium tabular-nums">
                    {fund.totalValueUsd > 0 ? formatCompact(fund.totalValueUsd) : "—"}
                  </p>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted">Filed {formatFilingDate(fund.filingDate)}</p>

              {fund.holdings.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No holdings data available for this filer.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-3 border-t border-panel-border pt-3">
                  {fund.holdings.slice(0, 5).map((holding) => {
                    const note = notes.find((n) => n.issuer === holding.issuer)?.note;
                    return (
                      <div key={holding.cusip}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{holding.issuer}</span>
                          <span className="font-mono text-xs tabular-nums text-muted">
                            {formatCompact(holding.valueUsd)} · {(holding.weight * 100).toFixed(1)}%
                          </span>
                        </div>
                        {note && (
                          <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted">
                            <Sparkle size={11} className="mt-0.5 shrink-0 text-accent" />
                            {note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-4 flex items-center gap-1 text-xs font-medium text-accent">
                View full portfolio <ArrowRight size={12} weight="bold" />
              </p>
            </Panel>
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
