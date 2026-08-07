// Real SEC Form 4 insider trading feed — company officers/directors/10%+
// owners disclosing trades in their own company's stock, sourced live from
// SEC EDGAR's "latest filings" feed (free, no key). Same real-disclosure
// category as the 13F and STOCK Act data already in this app.
const SEC_USER_AGENT = "DollarWatch research tool (contact: support@dollarwatch.app)";

export type InsiderTrade = {
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

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>\\s*(?:<value>)?([^<]*)`, "i");
  const match = xml.match(regex);
  const value = match?.[1]?.trim();
  return value || null;
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

export async function getRecentInsiderTrades(limit = 40): Promise<InsiderTrade[]> {
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
