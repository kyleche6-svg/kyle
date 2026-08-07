import "dotenv/config";
import pg from "pg";

// Real, comprehensive SEC Form 4 backfill — pulls SEC's daily index (every
// filing for a given day, no cap, unlike the "current filings" feed which
// hard-caps at 100 regardless of requested count) and stores results in
// the InsiderTrade table so the app can display them instantly instead of
// hitting SEC live on every page view.
//
// Run manually: node scripts/scrape-insider-trades.mjs [YYYYMMDD] [maxFilings]
// Defaults to the most recent business day and no cap (all filings for
// that day). Paced with a delay between filing-detail requests to stay a
// good citizen of SEC's rate limits (10 req/sec max, and we got blocked
// once already today from lighter usage — a full day here is ~2x that
// request volume).

const UA = "DollarWatch research tool (contact: support@dollarwatch.app)";

function fmtDate(d) {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

function quarterOf(d) {
  return `QTR${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

async function secText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  return res.text();
}

async function secJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  return res.json();
}

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}>\\s*(?:<value>)?([^<]*)`, "i"));
  const value = match?.[1]?.trim();
  return value ? decodeXmlEntities(value) : null;
}

const TRANSACTION_CODE_LABELS = {
  P: { label: "Open market purchase", direction: "buy" },
  S: { label: "Open market sale", direction: "sell" },
  A: { label: "Grant/award", direction: "other" },
  D: { label: "Disposition to issuer", direction: "sell" },
  F: { label: "Tax withholding", direction: "other" },
  M: { label: "Option exercise", direction: "other" },
  G: { label: "Gift", direction: "other" },
};

async function findMostRecentDailyIndex() {
  // Walk backward from today until we find a QTR directory listing that
  // has a form.*.idx file (skips weekends/holidays with no filings).
  for (let daysAgo = 0; daysAgo < 10; daysAgo++) {
    const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const year = d.getUTCFullYear();
    const qtr = quarterOf(d);
    const index = await secJson(`https://www.sec.gov/Archives/edgar/daily-index/${year}/${qtr}/index.json`);
    const items = index?.directory?.item ?? [];
    const dateStr = fmtDate(d);
    const match = items.find((i) => i.name === `form.${dateStr}.idx`);
    if (match) return { dateStr, year, qtr };
  }
  return null;
}

async function fetchFilingDetail(cik, accessionNoDashes, filedDateIso) {
  const index = await secJson(`https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/index.json`);
  const items = index?.directory?.item ?? [];
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
  const trades = [];

  for (let i = 0; i < transactionBlocks.length; i++) {
    const b = transactionBlocks[i][0];
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
      externalId: `${accessionNoDashes}-${i}`,
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
      filedDate: filedDateIso,
      filingUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/`,
    });
  }

  return trades;
}

const dateArg = process.argv[2];
const maxFilingsArg = process.argv[3] ? parseInt(process.argv[3], 10) : Infinity;

let dateStr, year, qtr;
if (dateArg) {
  dateStr = dateArg;
  const d = new Date(`${dateArg.slice(0, 4)}-${dateArg.slice(4, 6)}-${dateArg.slice(6, 8)}`);
  year = d.getUTCFullYear();
  qtr = quarterOf(d);
} else {
  const found = await findMostRecentDailyIndex();
  if (!found) {
    console.error("Could not find a recent daily index.");
    process.exit(1);
  }
  ({ dateStr, year, qtr } = found);
}

console.log(`Fetching SEC daily index for ${dateStr}...`);
const idx = await secText(`https://www.sec.gov/Archives/edgar/daily-index/${year}/${qtr}/form.${dateStr}.idx`);
if (!idx) {
  console.error("Failed to fetch daily index.");
  process.exit(1);
}

const lines = idx.split("\n");
const form4Lines = lines.filter((l) => l.startsWith("4 ") || /^4\s{2,}/.test(l));
console.log(`Found ${form4Lines.length} Form 4 filings for ${dateStr}.`);

const filings = [];
for (const line of form4Lines) {
  // Fixed-width columns: Form Type | Company Name | CIK | Date Filed | File Name
  const cikMatch = line.match(/\s(\d{4,10})\s+\d{8}\s+/);
  const fileNameMatch = line.match(/(edgar\/data\/\d+\/\S+\.txt)\s*$/);
  if (!cikMatch || !fileNameMatch) continue;

  const cik = cikMatch[1];
  // .txt submission file path -> derive the accession-number directory
  const accessionMatch = fileNameMatch[1].match(/\/(\d{10}-\d{2}-\d{6})\.txt$/);
  if (!accessionMatch) continue;

  filings.push({ cik, accessionNoDashes: accessionMatch[1].replace(/-/g, "") });
}

const capped = filings.slice(0, maxFilingsArg);
console.log(`Processing ${capped.length} filings (paced, this will take a while)...`);

const filedDateIso = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
const allTrades = [];
let processed = 0;

for (const f of capped) {
  try {
    const trades = await fetchFilingDetail(f.cik, f.accessionNoDashes, filedDateIso);
    allTrades.push(...trades);
  } catch {
    // skip filings that fail to parse (e.g. paper filings, malformed XML)
  }
  processed += 1;
  if (processed % 50 === 0) {
    console.log(`  ...${processed}/${capped.length} filings processed, ${allTrades.length} trades so far`);
  }
  await new Promise((resolve) => setTimeout(resolve, 120));
}

console.log(`Done fetching: ${allTrades.length} total transaction rows from ${processed} filings.`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let inserted = 0;
let updated = 0;
let skipped = 0;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

for (const t of allTrades) {
  // A handful of filings return an oddly-suffixed transactionDate (seen:
  // "2026-08-04-05:00", likely a stray timezone offset from a
  // non-standard Form 4 XML variant) that Postgres can't parse as a date.
  // Skip those rather than let one bad record crash the whole batch.
  if (!ISO_DATE.test(t.transactionDate) || !ISO_DATE.test(t.filedDate)) {
    skipped += 1;
    continue;
  }

  const result = await client.query(
    `INSERT INTO "InsiderTrade" (id, ticker, "issuerName", "ownerName", relationship, "transactionDate", "transactionCode", direction, shares, "pricePerShare", "sharesOwnedAfter", "filedDate", "filingUrl", "externalId")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7::"InsiderDirection", $8, $9, $10, $11, $12, $13)
     ON CONFLICT ("externalId") DO NOTHING
     RETURNING id`,
    [
      t.ticker,
      t.issuerName,
      t.ownerName,
      t.relationship,
      t.transactionDate,
      t.transactionCode,
      t.direction,
      t.shares,
      t.pricePerShare,
      t.sharesOwnedAfter,
      t.filedDate,
      t.filingUrl,
      t.externalId,
    ],
  );
  if (result.rows.length > 0) inserted += 1;
  else updated += 1;
}

console.log(`Done: ${inserted} new trades inserted, ${updated} already existed, ${skipped} skipped (malformed date).`);
await client.end();
