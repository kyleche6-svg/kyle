export type RealTrade = {
  id: string;
  politicianName: string;
  ticker: string;
  direction: "buy" | "sell";
  amountRangeLow: number;
  amountRangeHigh: number;
  transactionDate: Date;
  filedDate: Date;
  ptrLink: string;
};

type RawTransaction = {
  transaction_date: string;
  owner: string;
  ticker: string;
  asset_description: string;
  asset_type: string;
  type: string;
  amount: string;
  comment: string;
  senator: string;
  ptr_link: string;
};

const SOURCE_URL =
  "https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions.json";

function parseDirection(type: string): "buy" | "sell" | null {
  const normalized = type.toLowerCase();
  if (normalized.startsWith("purchase")) return "buy";
  if (normalized.startsWith("sale")) return "sell";
  return null;
}

// Amounts arrive as "$1,001 - $15,000" or occasionally an open-ended top
// bracket like "Over $50,000,000" — the STOCK Act only requires a
// disclosed range, never an exact figure, so an open top bracket is treated
// as a wide fixed band rather than invented as a precise number.
function parseAmountRange(raw: string): { low: number; high: number } | null {
  const numbers = raw.match(/[\d,]+/g);
  if (!numbers || numbers.length === 0) return null;

  const parsed = numbers.map((n) => parseInt(n.replace(/,/g, ""), 10));
  if (raw.toLowerCase().includes("over") || parsed.length === 1) {
    return { low: parsed[0], high: parsed[0] * 2 };
  }
  return { low: parsed[0], high: parsed[1] ?? parsed[0] };
}

function parseDate(raw: string): Date | null {
  const [month, day, year] = raw.split("/").map((n) => parseInt(n, 10));
  if (!month || !day || !year) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

let cache: { data: RealTrade[]; fetchedAt: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

// Real US Senate stock-trade disclosures — the Senate's Ethics office
// (efdsearch.senate.gov) requires members to file a Periodic Transaction
// Report within 45 days of any trade over $1,000 under the STOCK Act. This
// dataset (timothycarambat/senate-stock-watcher-data) scrapes and republishes
// those filings as JSON; it covers the Senate only — no equivalent free,
// reliable House feed was available as of this integration (House Stock
// Watcher's public bucket was down). No filing date is provided per
// transaction upstream, so filedDate is approximated as the transaction
// date — a known limitation, not a claim of exact filing timing.
async function fetchAllRealTrades(): Promise<RealTrade[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache.data;

  const res = await fetch(SOURCE_URL, { next: { revalidate: 43200 } });
  if (!res.ok) return cache?.data ?? [];

  const raw: RawTransaction[] = await res.json();
  const trades: RealTrade[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ticker = r.ticker?.trim().toUpperCase();
    if (!ticker || ticker === "--" || ticker === "N/A" || !/^[A-Z]{1,6}$/.test(ticker)) continue;

    const direction = parseDirection(r.type);
    if (!direction) continue;

    const amounts = parseAmountRange(r.amount);
    if (!amounts) continue;

    const transactionDate = parseDate(r.transaction_date);
    if (!transactionDate) continue;

    trades.push({
      id: `${r.senator}-${ticker}-${r.transaction_date}-${i}`,
      politicianName: r.senator,
      ticker,
      direction,
      amountRangeLow: amounts.low,
      amountRangeHigh: amounts.high,
      transactionDate,
      filedDate: transactionDate,
      ptrLink: r.ptr_link,
    });
  }

  trades.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  cache = { data: trades, fetchedAt: Date.now() };
  return trades;
}

export async function getRecentRealTrades(limit = 50): Promise<RealTrade[]> {
  const all = await fetchAllRealTrades();
  return all.slice(0, limit);
}

export async function getRealTradesForPolitician(politicianName: string): Promise<RealTrade[]> {
  const all = await fetchAllRealTrades();
  return all.filter((t) => t.politicianName === politicianName);
}

export async function getAllRealPoliticians(): Promise<{ name: string; tradeCount: number }[]> {
  const all = await fetchAllRealTrades();
  const counts = new Map<string, number>();
  for (const t of all) counts.set(t.politicianName, (counts.get(t.politicianName) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([name, tradeCount]) => ({ name, tradeCount }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRealMonthlyBuyLeaderboard(limit = 10): Promise<{ ticker: string; buyCount: number }[]> {
  const all = await fetchAllRealTrades();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const counts = new Map<string, number>();
  for (const t of all) {
    if (t.direction !== "buy" || t.transactionDate < startOfMonth) continue;
    counts.set(t.ticker, (counts.get(t.ticker) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([ticker, buyCount]) => ({ ticker, buyCount }))
    .sort((a, b) => b.buyCount - a.buyCount)
    .slice(0, limit);
}

export function getRealPoliticianPortfolio(trades: RealTrade[]) {
  const byTicker = new Map<
    string,
    { ticker: string; buyTotal: number; sellTotal: number; buyCount: number; sellCount: number }
  >();

  for (const trade of trades) {
    const midpoint = (trade.amountRangeLow + trade.amountRangeHigh) / 2;
    const existing = byTicker.get(trade.ticker) ?? {
      ticker: trade.ticker,
      buyTotal: 0,
      sellTotal: 0,
      buyCount: 0,
      sellCount: 0,
    };

    if (trade.direction === "buy") {
      existing.buyTotal += midpoint;
      existing.buyCount += 1;
    } else {
      existing.sellTotal += midpoint;
      existing.sellCount += 1;
    }
    byTicker.set(trade.ticker, existing);
  }

  return Array.from(byTicker.values())
    .map((row) => ({ ...row, netEstimate: row.buyTotal - row.sellTotal }))
    .sort((a, b) => Math.abs(b.netEstimate) - Math.abs(a.netEstimate));
}
