import { requireActiveSubscription } from "@/lib/subscription-guard";
import { getTrackedPosts } from "@/lib/tweets";
import { Panel } from "@/components/Panel";
import { Disclaimer } from "@/components/Disclaimer";

const WINDOW_ORDER = ["-15m", "+1h", "eod"] as const;
const WINDOW_LABELS: Record<string, string> = {
  "-15m": "15 min before",
  "+1h": "1 hr after",
  eod: "End of day",
};

function formatDate(date: Date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TweetsPage() {
  await requireActiveSubscription();

  const posts = await getTrackedPosts();

  const byTicker = posts.map((post) => {
    const grouped = new Map<string, typeof post.priceSnapshots>();
    for (const snapshot of post.priceSnapshots) {
      const existing = grouped.get(snapshot.ticker) ?? [];
      existing.push(snapshot);
      grouped.set(snapshot.ticker, existing);
    }
    return { post, grouped };
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Market-Moving Tweet Tracker</h1>
      <p className="mt-1 text-sm text-muted">
        Tracked posts with tagged tickers and historical price reaction
        windows. Currently showing mock/seed data — real posts populate
        here once synced via the X API. Data and price patterns only — no
        buy/sell signals.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {byTicker.map(({ post, grouped }) => (
          <Panel key={post.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{post.trackedFigure.name}</p>
                <p className="text-xs text-muted">
                  @{post.trackedFigure.xHandle} · {post.trackedFigure.category}
                </p>
              </div>
              <p className="whitespace-nowrap text-xs text-muted">
                {formatDate(post.postedAt)}
              </p>
            </div>

            <p className="mt-3 text-sm text-foreground/90">{post.text}</p>

            {post.taggedTickers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.taggedTickers.map((ticker) => (
                  <span
                    key={ticker}
                    className="rounded-full border border-panel-border px-2.5 py-0.5 text-xs text-accent"
                  >
                    {ticker}
                  </span>
                ))}
              </div>
            )}

            {grouped.size > 0 && (
              <div className="mt-4 flex flex-col gap-3 border-t border-panel-border pt-4">
                {Array.from(grouped.entries()).map(([ticker, snapshots]) => (
                  <div key={ticker} className="flex items-center gap-4 text-xs">
                    <span className="w-16 font-medium text-foreground">{ticker}</span>
                    <div className="flex flex-1 gap-4">
                      {WINDOW_ORDER.map((windowLabel) => {
                        const snapshot = snapshots.find((s) => s.windowLabel === windowLabel);
                        return (
                          <div key={windowLabel}>
                            <p className="text-muted">{WINDOW_LABELS[windowLabel]}</p>
                            <p className="mt-0.5 tabular-nums text-foreground">
                              {snapshot ? snapshot.price.toFixed(2) : "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        ))}
      </div>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </div>
  );
}
