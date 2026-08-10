// Real SEC Form 4 insider trading feed — company officers/directors/10%+
// owners disclosing trades in their own company's stock, sourced live from
// SEC EDGAR's "latest filings" feed (free, no key). Same real-disclosure
// category as the 13F data elsewhere in this app.
import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/market-data";
import { TRENDING_TICKERS } from "@/lib/stocks";

const SEC_USER_AGENT = "DollarWatch research tool (contact: support@dollarwatch.app)";

export type InsiderTrade = {
  id: string;
  filedDate: string;
  ticker: string;
  issuerName: string;
  ownerName: string;
  relationship: string;
  transactionDate: string;
  transactionCode: string;
  direction: "buy" | "sell" | "other";
  shares: number;
  pricePerShare: number | null;
  sharesOwnedAfter: number | null;
  filingUrl: string;
};

const TRANSACTION_CODE_LABELS: Record<string, { label: string; direction: InsiderTrade["direction"] }> = {
  P: { label: "Open market purchase", direction: "buy" },
  S: { label: "Open market sale", direction: "sell" },
  A: { label: "Grant/award", direction: "other" },
  D: { label: "Disposition to issuer", direction: "sell" },
  F: { label: "Tax withholding", direction: "other" },
  M: { label: "Option exercise", direction: "other" },
  G: { label: "Gift", direction: "other" },
};

async function secJson(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": SEC_USER_AGENT }, next: { revalidate: 900 } });
  if (!res.ok) return null;
  return res.json();
}

async function secText(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": SEC_USER_AGENT }, next: { revalidate: 900 } });
  if (!res.ok) return null;
  return res.text();
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>\\s*(?:<value>)?([^<]*)`, "i");
  const match = xml.match(regex);
  const value = match?.[1]?.trim();
  return value ? decodeXmlEntities(value) : null;
}

async function fetchFilingDetail(cik: string, accessionNoDashes: string, filedDate: string): Promise<InsiderTrade[]> {
  const index = await secJson(`https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/index.json`);
  const items: { name: string }[] = index?.directory?.item ?? [];
  const xmlFile = items.find((item) => item.name.toLowerCase().endsWith(".xml"));
  if (!xmlFile) return [];

  const xml = await secText(`https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/${xmlFile.name}`);
  if (!xml) return [];

  const ticker = extractTag(xml, "issuerTradingSymbol");
  const issuerName = extractTag(xml, "issuerName");
  const ownerName = extractTag(xml, "rptOwnerName");
  if (!ticker || !issuerName || !ownerName) return [];

  const isDirector = extractTag(xml, "isDirector") === "true";
  const isOfficer = extractTag(xml, "isOfficer") === "true";
  const isTenPercentOwner = extractTag(xml, "isTenPercentOwner") === "true";
  const officerTitle = extractTag(xml, "officerTitle");
  const relationshipParts = [
    isOfficer ? officerTitle || "Officer" : null,
    isDirector ? "Director" : null,
    isTenPercentOwner ? "10%+ Owner" : null,
  ].filter(Boolean);
  const relationship = relationshipParts.length > 0 ? relationshipParts.join(", ") : "Reporting person";

  const transactionBlocks = [...xml.matchAll(/<nonDerivativeTransaction>[\s\S]*?<\/nonDerivativeTransaction>/g)];
  const trades: InsiderTrade[] = [];

  for (const block of transactionBlocks) {
    const b = block[0];
    const transactionDate = extractTag(b, "transactionDate");
    const transactionCode = extractTag(b, "transactionCode");
    const sharesRaw = extractTag(b, "transactionShares");
    const priceRaw = extractTag(b, "transactionPricePerShare");
    const sharesOwnedRaw = extractTag(b, "sharesOwnedFollowingTransaction");

    if (!transactionDate || !transactionCode || !sharesRaw) continue;
    const shares = parseFloat(sharesRaw);
    if (!Number.isFinite(shares) || shares <= 0) continue;

    const coded = TRANSACTION_CODE_LABELS[transactionCode];

    trades.push({
      id: `${accessionNoDashes}-${trades.length}`,
      filedDate,
      ticker: ticker.toUpperCase(),
      issuerName,
      ownerName,
      relationship,
      transactionDate,
      transactionCode: coded?.label ?? transactionCode,
      direction: coded?.direction ?? "other",
      shares,
      pricePerShare: priceRaw ? parseFloat(priceRaw) : null,
      sharesOwnedAfter: sharesOwnedRaw ? parseFloat(sharesOwnedRaw) : null,
      filingUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/`,
    });
  }

  return trades;
}

// Pulls a full day's Form 4 filings from SEC's daily index — unlike the
// "getcurrent" feed above (hard-capped at ~100 entries across ALL form
// types), this is a real per-day index with no cap. Runs against
// yesterday's date via the daily cron (see /api/cron/backfill-insider-
// trades) since SEC's daily index for "today" isn't finalized until the
// day closes. Idempotent: re-running the same date just no-ops on
// filings already stored (externalId is a stable natural key).
function quarterOf(monthIndex0: number): number {
  return Math.floor(monthIndex0 / 3) + 1;
}

// Default cap sized to Vercel's 60s function budget (Hobby plan) — a
// full trading day can carry 900+ Form 4 filings, and each one needs its
// own SEC fetch, so processing every filing daily isn't possible inside
// one serverless invocation. ~120 filings/day keeps this comfortably
// under the time limit; the page copy is honest about this being a
// recent slice, not literally every filing.
export async function backfillDailyIndex(
  date: Date,
  maxFilings = 120,
): Promise<{ filingsFound: number; filingsProcessed: number; tradesWritten: number }> {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed
  const day = date.getUTCDate();
  const quarter = quarterOf(month);
  const dateStr = `${year}${String(month + 1).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  const filedDateIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const idx = await secText(
    `https://www.sec.gov/Archives/edgar/daily-index/${year}/QTR${quarter}/form.${dateStr}.idx`,
  );
  if (!idx) return { filingsFound: 0, filingsProcessed: 0, tradesWritten: 0 };

  // Fixed-width index file — one line per filing. Form 4 lines start with
  // "4" then whitespace (never "4/A" etc., which starts "4/A").
  const filings = [...idx.matchAll(/^4\s+.*?(\d{7,10})\s+\d{8}\s+edgar\/data\/\d+\/([\d-]+)\.txt\s*$/gm)].map(
    (m) => ({ cik: m[1], accessionNoDashes: m[2].replace(/-/g, "") }),
  );
  const toProcess = filings.slice(0, maxFilings);

  let tradesWritten = 0;
  const BATCH = 8; // bounded concurrency — sequential would blow the function's time budget, full parallel risks a 429 from SEC
  for (let i = 0; i < toProcess.length; i += BATCH) {
    const batch = toProcess.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map((f) => fetchFilingDetail(f.cik, f.accessionNoDashes, filedDateIso)),
    );
    const trades = batchResults.flat();
    await Promise.all(
      trades.map(async (trade) => {
        await prisma.insiderTrade.upsert({
          where: { externalId: trade.id },
          create: {
            externalId: trade.id,
            ticker: trade.ticker,
            issuerName: trade.issuerName,
            ownerName: trade.ownerName,
            relationship: trade.relationship,
            transactionDate: new Date(trade.transactionDate),
            transactionCode: trade.transactionCode,
            direction: trade.direction,
            shares: trade.shares,
            pricePerShare: trade.pricePerShare,
            sharesOwnedAfter: trade.sharesOwnedAfter,
            filedDate: new Date(trade.filedDate),
            filingUrl: trade.filingUrl,
          },
          update: {},
        });
        tradesWritten++;
      }),
    );
  }

  return { filingsFound: filings.length, filingsProcessed: toProcess.length, tradesWritten };
}

export async function getRecentInsiderTrades(limit = 100): Promise<InsiderTrade[]> {
  const feed = await secText(
    "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&company=&dateb=&owner=include&count=100&output=atom",
  );
  if (!feed) return [];

  const entries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((m) => m[1])
    .filter((entry) => /term="4"/.test(entry));

  const seenAccessions = new Set<string>();
  const parsed = entries
    .map((entry) => {
      const link = entry.match(/href="([^"]+)"/)?.[1];
      const filedDate = entry.match(/Filed:&lt;\/b&gt;\s*(\d{4}-\d{2}-\d{2})/)?.[1];
      const cikMatch = link?.match(/\/data\/(\d+)\//);
      const accessionMatch = link?.match(/\/([\d-]+)-index\.htm/);
      if (!link || !filedDate || !cikMatch || !accessionMatch) return null;
      return { cik: cikMatch[1], accessionNoDashes: accessionMatch[1].replace(/-/g, ""), filedDate };
    })
    .filter((x): x is { cik: string; accessionNoDashes: string; filedDate: string } => x !== null)
    // The SEC's own "getcurrent" feed lists the same accession number more
    // than once (e.g. once per reporting owner on a jointly-filed Form 4) —
    // dedupe here rather than showing/fetching the same filing twice.
    .filter((f) => {
      if (seenAccessions.has(f.accessionNoDashes)) return false;
      seenAccessions.add(f.accessionNoDashes);
      return true;
    })
    .slice(0, limit);

  const results = await Promise.all(
    parsed.map((f) => fetchFilingDetail(f.cik, f.accessionNoDashes, f.filedDate)),
  );

  return results.flat();
}

// Comprehensive, DB-backed version — reads results backfilled by
// scripts/scrape-insider-trades.mjs from SEC's daily index (every filing
// for a day, no 100-entry cap). Falls back to the live-capped feed above
// only if the backfill hasn't been run yet, so this always returns
// something real rather than an empty page.
export async function getInsiderTrades(limit = 200, ticker?: string): Promise<InsiderTrade[]> {
  const rows = await prisma.insiderTrade.findMany({
    where: ticker ? { ticker } : undefined,
    orderBy: [{ filedDate: "desc" }, { transactionDate: "desc" }],
    take: limit,
  });

  if (rows.length === 0) {
    const live = await getRecentInsiderTrades(100);
    return ticker ? live.filter((t) => t.ticker === ticker) : live;
  }

  return rows.map((r) => ({
    id: r.id,
    filedDate: r.filedDate.toISOString().slice(0, 10),
    ticker: r.ticker,
    issuerName: r.issuerName,
    ownerName: r.ownerName,
    relationship: r.relationship,
    transactionDate: r.transactionDate.toISOString().slice(0, 10),
    transactionCode: r.transactionCode,
    direction: r.direction,
    shares: r.shares,
    pricePerShare: r.pricePerShare,
    sharesOwnedAfter: r.sharesOwnedAfter,
    filingUrl: r.filingUrl,
  }));
}

function mapRow(r: {
  id: string;
  filedDate: Date;
  ticker: string;
  issuerName: string;
  ownerName: string;
  relationship: string;
  transactionDate: Date;
  transactionCode: string;
  direction: InsiderTrade["direction"];
  shares: number;
  pricePerShare: number | null;
  sharesOwnedAfter: number | null;
  filingUrl: string;
}): InsiderTrade {
  return {
    id: r.id,
    filedDate: r.filedDate.toISOString().slice(0, 10),
    ticker: r.ticker,
    issuerName: r.issuerName,
    ownerName: r.ownerName,
    relationship: r.relationship,
    transactionDate: r.transactionDate.toISOString().slice(0, 10),
    transactionCode: r.transactionCode,
    direction: r.direction,
    shares: r.shares,
    pricePerShare: r.pricePerShare,
    sharesOwnedAfter: r.sharesOwnedAfter,
    filingUrl: r.filingUrl,
  };
}

export type InsiderTradePage = { trades: InsiderTrade[]; total: number };

// Paginated + searchable — backs the insider-trading list page and its
// "Load more" button. Search matches ticker or owner name, either as a
// substring, so "cook" finds Tim Cook and "AAPL" finds Apple filings.
export async function getInsiderTradesPage(
  { limit = 15, offset = 0, search }: { limit?: number; offset?: number; search?: string } = {},
): Promise<InsiderTradePage> {
  const where = search
    ? {
        OR: [
          { ticker: { equals: search.toUpperCase() } },
          { ownerName: { contains: search, mode: "insensitive" as const } },
          { issuerName: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [rows, total] = await Promise.all([
    prisma.insiderTrade.findMany({
      where,
      // id as a final tiebreaker — filedDate/transactionDate alone aren't
      // unique (hundreds of filings share the same day), and skip/take
      // pagination over a non-unique order isn't guaranteed stable across
      // queries, which showed up live as duplicate rows across pages.
      orderBy: [{ filedDate: "desc" }, { transactionDate: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit,
    }),
    prisma.insiderTrade.count({ where }),
  ]);

  // Empty DB table (backfill never run against this database, e.g. a
  // freshly provisioned production DB) — fall back to SEC's live feed
  // rather than showing an empty page. Only for the first, unfiltered
  // page: the live feed can't be searched or paginated the same way, and
  // an empty *filtered* result (a real "no matches") must stay empty.
  if (total === 0 && !search && offset === 0) {
    const totalRows = await prisma.insiderTrade.count();
    if (totalRows === 0) {
      const live = await getRecentInsiderTrades(limit);
      return { trades: live, total: live.length };
    }
  }

  return { trades: rows.map(mapRow), total };
}

// One insider's full filing history — backs /insider-trading/[owner].
export async function getOwnerTradesPage(
  ownerName: string,
  { limit = 15, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<InsiderTradePage> {
  const where = { ownerName };
  const [rows, total] = await Promise.all([
    prisma.insiderTrade.findMany({
      where,
      orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit,
    }),
    prisma.insiderTrade.count({ where }),
  ]);
  return { trades: rows.map(mapRow), total };
}

export type OwnerHolding = {
  ticker: string;
  issuerName: string;
  sharesOwnedAfter: number;
  asOfDate: string;
};

// "What are they holding" — the most recent sharesOwnedAfter this insider
// reported for each company they've filed on. This is exactly what SEC
// Form 4 discloses (ownership after the transaction), not a live brokerage
// balance — it's only as current as their last filing.
export async function getOwnerHoldings(ownerName: string): Promise<OwnerHolding[]> {
  const rows = await prisma.insiderTrade.findMany({
    where: { ownerName, sharesOwnedAfter: { not: null } },
    orderBy: [{ transactionDate: "desc" }],
    select: { ticker: true, issuerName: true, sharesOwnedAfter: true, transactionDate: true },
  });

  const latestByTicker = new Map<string, OwnerHolding>();
  for (const r of rows) {
    if (latestByTicker.has(r.ticker)) continue; // already have a more recent row (desc order)
    latestByTicker.set(r.ticker, {
      ticker: r.ticker,
      issuerName: r.issuerName,
      sharesOwnedAfter: r.sharesOwnedAfter!,
      asOfDate: r.transactionDate.toISOString().slice(0, 10),
    });
  }
  return Array.from(latestByTicker.values());
}

export type InsiderGainer = {
  ownerName: string;
  estimatedGainUsd: number;
  totalSharesBought: number;
  tickers: string[];
};

// "Who's making the most money" — a real, backward-looking calculation,
// not a signal: current market value of shares an insider actually bought
// (real reported purchase price, per Form 4) minus what they paid, summed
// across their reported buys. Same category as the return-distribution
// stats on stock pages — arithmetic on real historical data, not a claim
// about anyone's actual realized profit (we don't know if/when they sold).
//
// Bounded for cost: only the highest-dollar-value (owner, ticker) buy
// groups are considered, and quotes are fetched once per unique ticker
// among those — a real-time quote per distinct company in the whole
// dataset would be far more API calls than this needs for a top-3 podium.
// Recomputing this on every page view was the real cause of /insider-trading
// taking 1-4+ seconds to load — up to 60 live quote fetches to Twelve Data,
// every single request. A top-3 leaderboard doesn't need to be that fresh;
// cached in-process for 15 minutes, same pattern as the Daily Brief cache.
const GAINERS_CACHE_MS = 15 * 60 * 1000;
let gainersCache: { computedAt: number; gainers: InsiderGainer[] } | null = null;

export async function getTopInsiderGainers(limit = 3): Promise<InsiderGainer[]> {
  if (gainersCache && Date.now() - gainersCache.computedAt < GAINERS_CACHE_MS) {
    return gainersCache.gainers.slice(0, limit);
  }

  const gainers = await computeTopInsiderGainers();
  gainersCache = { computedAt: Date.now(), gainers };
  return gainers.slice(0, limit);
}

async function computeTopInsiderGainers(): Promise<InsiderGainer[]> {
  const rawBuys = await prisma.insiderTrade.findMany({
    where: { direction: "buy", pricePerShare: { not: null } },
    select: { ownerName: true, ticker: true, shares: true, pricePerShare: true },
  });

  const groups = new Map<string, { ownerName: string; ticker: string; shares: number; cost: number }>();
  for (const b of rawBuys) {
    const key = `${b.ownerName}::${b.ticker}`;
    const existing = groups.get(key);
    const cost = b.shares * b.pricePerShare!;
    if (existing) {
      existing.shares += b.shares;
      existing.cost += cost;
    } else {
      groups.set(key, { ownerName: b.ownerName, ticker: b.ticker, shares: b.shares, cost });
    }
  }

  const topGroups = Array.from(groups.values())
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 60);

  const uniqueTickers = Array.from(new Set(topGroups.map((g) => g.ticker)));
  const quotes = await Promise.all(
    uniqueTickers.map(async (ticker) => {
      const trending = TRENDING_TICKERS.find((t) => t.ticker === ticker);
      const quote = await getQuote(ticker, trending?.companyName ?? ticker, trending?.basePrice ?? 100);
      return [ticker, quote.price] as const;
    }),
  );
  const priceByTicker = new Map(quotes);

  const byOwner = new Map<string, InsiderGainer>();
  for (const g of topGroups) {
    const currentPrice = priceByTicker.get(g.ticker);
    if (currentPrice === undefined) continue;
    const gain = g.shares * currentPrice - g.cost;

    const existing = byOwner.get(g.ownerName);
    if (existing) {
      existing.estimatedGainUsd += gain;
      existing.totalSharesBought += g.shares;
      if (!existing.tickers.includes(g.ticker)) existing.tickers.push(g.ticker);
    } else {
      byOwner.set(g.ownerName, {
        ownerName: g.ownerName,
        estimatedGainUsd: gain,
        totalSharesBought: g.shares,
        tickers: [g.ticker],
      });
    }
  }

  return Array.from(byOwner.values()).sort((a, b) => b.estimatedGainUsd - a.estimatedGainUsd);
}
