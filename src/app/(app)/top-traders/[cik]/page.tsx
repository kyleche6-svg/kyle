import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Buildings, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getFundPortfolioByCik } from "@/lib/institutional-holdings";
import { getSpeculativeContext } from "@/lib/holdings-context";
import { searchStocks } from "@/lib/stock-search";
import { getCompanyProfile } from "@/lib/stocks";
import { Panel } from "@/components/Panel";
import { HoldingsPie } from "@/components/HoldingsPie";
import { Disclaimer } from "@/components/Disclaimer";

const COMPANY_HISTORY_COUNT = 8;

function formatCompact(value: number) {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function formatFilingDate(iso: string | null) {
  if (!iso) return "No 13F-HR on file";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// 13F filings give an issuer name (e.g. "APPLE INC"), never a ticker —
// best-effort resolve one via the same symbol search used across the rest
// of the app, so we can link to /stocks/[ticker] and show a real profile.
// No match just means no link; never guessed.
async function resolveTicker(issuer: string): Promise<{ ticker: string; companyName: string } | null> {
  const results = await searchStocks(issuer);
  const match = results[0];
  return match ? { ticker: match.ticker, companyName: match.companyName } : null;
}

export default async function TopTraderDetailPage({ params }: { params: Promise<{ cik: string }> }) {
  await requireActiveSubscription();

  const { cik } = await params;
  const fund = await getFundPortfolioByCik(cik);
  if (!fund) notFound();

  const [notes, resolvedTickers] = await Promise.all([
    getSpeculativeContext(fund, COMPANY_HISTORY_COUNT),
    Promise.all(fund.holdings.slice(0, COMPANY_HISTORY_COUNT).map((h) => resolveTicker(h.issuer))),
  ]);

  const profiles = await Promise.all(
    resolvedTickers.map((resolved) =>
      resolved ? getCompanyProfile(resolved.ticker, resolved.companyName) : Promise.resolve(null),
    ),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/top-traders"
        className="flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to top traders
      </Link>

      <div className="mt-3 flex items-start gap-3">
        <Buildings size={28} weight="light" className="mt-0.5 text-accent" />
        <div>
          <h1 className="text-2xl font-semibold">{fund.name}</h1>
          <p className="text-sm text-muted">{fund.manager}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {fund.holdings.length} disclosed US equity positions from the most recent SEC Form 13F-HR,
        filed {formatFilingDate(fund.filingDate)}. Real filing — not live, per the SEC&apos;s 45-day
        filing window.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Portfolio composition" className="lg:col-span-1">
          <HoldingsPie data={fund.holdings.slice(0, 10).map((h) => ({ ticker: h.issuer.split(" ")[0], value: h.valueUsd }))} />
          <p className="mt-2 text-center text-[11px] text-muted">Top 10 positions by disclosed 13F value.</p>
        </Panel>

        <Panel title="Full holdings" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-panel-border text-xs text-muted">
                  <th className="pb-2 pr-4 font-normal">Issuer</th>
                  <th className="pb-2 pr-4 font-normal">Value</th>
                  <th className="pb-2 font-normal">Weight</th>
                </tr>
              </thead>
              <tbody>
                {fund.holdings.map((holding) => (
                  <tr key={holding.cusip} className="border-b border-panel-border/50">
                    <td className="py-2 pr-4 font-medium">{holding.issuer}</td>
                    <td className="py-2 pr-4 font-mono text-xs tabular-nums text-muted">
                      {formatCompact(holding.valueUsd)}
                    </td>
                    <td className="py-2 font-mono text-xs tabular-nums text-muted">
                      {(holding.weight * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Top positions — context and company profile" className="mt-4">
        <p className="flex items-start gap-2 text-xs text-muted">
          <Sparkle size={13} className="mt-0.5 shrink-0 text-accent" />
          &ldquo;Possible context&rdquo; is AI-generated speculation from general market knowledge —
          13F filings never state a reason. Not the fund&apos;s own explanation, not investment advice.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {fund.holdings.slice(0, COMPANY_HISTORY_COUNT).map((holding, i) => {
            const note = notes.find((n) => n.issuer === holding.issuer)?.note;
            const resolved = resolvedTickers[i];
            const profile = profiles[i];
            return (
              <div key={holding.cusip} className="border-b border-panel-border/50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  {resolved ? (
                    <Link href={`/stocks/${resolved.ticker}`} className="font-medium hover:text-accent">
                      {holding.issuer} <span className="font-mono text-xs text-muted">({resolved.ticker})</span>
                    </Link>
                  ) : (
                    <span className="font-medium">{holding.issuer}</span>
                  )}
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {formatCompact(holding.valueUsd)} · {(holding.weight * 100).toFixed(1)}%
                  </span>
                </div>
                {profile && (
                  <p className="mt-1 text-xs text-muted">
                    {profile.sector} · {profile.industry} · {profile.employees.toLocaleString()} employees
                  </p>
                )}
                {profile?.description && (
                  <p className="mt-1 text-xs text-muted">{profile.description}</p>
                )}
                {note && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-foreground">
                    <Sparkle size={11} className="mt-0.5 shrink-0 text-accent" />
                    {note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
