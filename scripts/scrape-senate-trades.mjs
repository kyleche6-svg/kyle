import "dotenv/config";
import pg from "pg";

// Live scraper for efdsearch.senate.gov — see src/lib/senate-scraper.ts for
// the full write-up of why this exists and its limitations. This script is
// a standalone plain-JS runner (this repo's scripts avoid importing TS app
// code directly) that duplicates that same pipeline and upserts results
// into the Trade table, keyed by externalId so re-running never duplicates
// rows.
//
// Run manually: node scripts/scrape-senate-trades.mjs [daysBack]
// (defaults to 14 days back if not given)

const BASE_URL = "https://efdsearch.senate.gov";
const USER_AGENT = "DollarWatch research tool (contact: support@dollarwatch.app)";

function updateJar(jar, res) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    const [pair] = cookie.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

function extractCsrfToken(html) {
  const match = html.match(/name=["']csrfmiddlewaretoken["'] value=["']([^"']+)["']/);
  return match ? match[1] : null;
}

async function bootstrapSession() {
  const jar = {};

  const searchPage = await fetch(`${BASE_URL}/search/`, { headers: { "User-Agent": USER_AGENT } });
  updateJar(jar, searchPage);
  const html = await searchPage.text();
  const csrfToken = extractCsrfToken(html);
  if (!csrfToken) throw new Error("Could not find CSRF token on efdsearch search page.");

  const agreementRes = await fetch(`${BASE_URL}/search/home/`, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
      Referer: `${BASE_URL}/search/`,
    },
    body: new URLSearchParams({ csrfmiddlewaretoken: csrfToken, prohibition_agreement: "1" }),
    redirect: "manual",
  });
  updateJar(jar, agreementRes);
  if (!jar.sessionid) throw new Error("efdsearch did not grant a session after accepting the agreement.");

  const searchPage2 = await fetch(`${BASE_URL}/search/`, { headers: { "User-Agent": USER_AGENT, Cookie: cookieHeader(jar) } });
  updateJar(jar, searchPage2);
  const html2 = await searchPage2.text();
  const csrfToken2 = extractCsrfToken(html2);
  if (!csrfToken2) throw new Error("Could not find CSRF token after establishing session.");

  return { jar, csrfToken: csrfToken2 };
}

async function searchPtrFilings(jar, csrfToken, startDate, endDate) {
  const fmt = (d) =>
    `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}/${d.getUTCFullYear()}`;

  const rows = [];
  let start = 0;
  const pageSize = 100;

  for (;;) {
    const body = new URLSearchParams({
      draw: "1",
      start: String(start),
      length: String(pageSize),
      report_types: "[11]",
      filer_types: "[1]",
      submitted_start_date: `${fmt(startDate)} 00:00:00`,
      submitted_end_date: `${fmt(endDate)} 23:59:59`,
      candidate_state: "",
      senator_state: "",
      office_id: "",
      first_name: "",
      last_name: "",
      csrfmiddlewaretoken: csrfToken,
    });

    const res = await fetch(`${BASE_URL}/search/report/data/`, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieHeader(jar),
        Referer: `${BASE_URL}/search/`,
        "X-Requested-With": "XMLHttpRequest",
      },
      body,
    });
    if (!res.ok) break;

    const json = await res.json();
    if (!json.data || json.data.length === 0) break;

    for (const row of json.data) {
      const [, , name, linkHtml, filedDate] = row;
      rows.push({ name, linkHtml, filedDate });
    }

    if (json.data.length < pageSize) break;
    start += pageSize;
  }

  return rows;
}

function parseFilingLink(linkHtml) {
  const hrefMatch = linkHtml.match(/href="\/search\/view\/ptr\/([a-f0-9-]+)\/"/);
  const dateMatch = linkHtml.match(/for (\d{2}\/\d{2}\/\d{4})/);
  if (!hrefMatch || !dateMatch) return null;
  return { uuid: hrefMatch[1], reportDate: dateMatch[1] };
}

function parseDate(raw) {
  const [month, day, year] = raw.split("/").map((n) => parseInt(n, 10));
  if (!month || !day || !year) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmountRange(raw) {
  const numbers = raw.match(/[\d,]+/g);
  if (!numbers || numbers.length === 0) return null;
  const parsed = numbers.map((n) => parseInt(n.replace(/,/g, ""), 10));
  if (raw.toLowerCase().includes("over") || parsed.length === 1) {
    return { low: parsed[0], high: parsed[0] * 2 };
  }
  return { low: parsed[0], high: parsed[1] ?? parsed[0] };
}

function parseDirection(type) {
  const normalized = type.toLowerCase();
  if (normalized.startsWith("purchase")) return "buy";
  if (normalized.startsWith("sale")) return "sell";
  return null;
}

function formatPoliticianName(rawName) {
  const withoutOffice = rawName.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const [last, first] = withoutOffice.split(",").map((s) => s.trim());
  return first && last ? `${first} ${last}` : withoutOffice;
}

async function fetchFilingTransactions(jar, uuid, politicianName, filedDate) {
  const res = await fetch(`${BASE_URL}/search/view/ptr/${uuid}/`, {
    headers: { "User-Agent": USER_AGENT, Cookie: cookieHeader(jar) },
  });
  if (!res.ok) return [];

  const html = await res.text();
  const rowMatches = [...html.matchAll(/<tr>\s*<td>(\d+)<\/td>([\s\S]*?)<\/tr>/g)];

  const trades = [];
  for (const match of rowMatches) {
    const rowIndex = match[1];
    const cellsHtml = match[2];
    const cells = [...cellsHtml.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => c[1].replace(/<[^>]+>/g, "").trim());
    if (cells.length < 7) continue;

    const [transactionDateRaw, , tickerRaw, , , typeRaw, amountRaw] = cells;
    const ticker = tickerRaw.trim().toUpperCase();
    if (!ticker || !/^[A-Z]{1,6}$/.test(ticker)) continue;

    const direction = parseDirection(typeRaw);
    if (!direction) continue;

    const transactionDate = parseDate(transactionDateRaw);
    if (!transactionDate) continue;

    const amounts = parseAmountRange(amountRaw);
    if (!amounts) continue;

    trades.push({
      externalId: `${uuid}-${rowIndex}`,
      politicianName,
      ticker,
      direction,
      amountRangeLow: amounts.low,
      amountRangeHigh: amounts.high,
      transactionDate,
      filedDate,
      ptrLink: `${BASE_URL}/search/view/ptr/${uuid}/`,
    });
  }

  return trades;
}

const daysBack = parseInt(process.argv[2] ?? "14", 10);

console.log(`Scraping efdsearch.senate.gov for PTR filings from the last ${daysBack} days...`);

const { jar, csrfToken } = await bootstrapSession();

const endDate = new Date();
const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

const filingRows = await searchPtrFilings(jar, csrfToken, startDate, endDate);
console.log(`Found ${filingRows.length} filings.`);

const allTrades = [];
let parsed = 0;
let skipped = 0;

for (const row of filingRows) {
  const parsedLink = parseFilingLink(row.linkHtml);
  const filedDate = parseDate(row.filedDate);
  if (!parsedLink || !filedDate) {
    skipped += 1;
    continue;
  }

  const politicianName = formatPoliticianName(row.name);
  const filingTrades = await fetchFilingTransactions(jar, parsedLink.uuid, politicianName, filedDate);

  if (filingTrades.length === 0) {
    skipped += 1;
  } else {
    allTrades.push(...filingTrades);
    parsed += 1;
  }

  await new Promise((resolve) => setTimeout(resolve, 300));
}

console.log(`Parsed ${parsed} filings (${skipped} skipped), ${allTrades.length} total transaction rows.`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let inserted = 0;
let updated = 0;

for (const t of allTrades) {
  const result = await client.query(
    `INSERT INTO "Trade" (id, "politicianName", ticker, direction, "amountRangeLow", "amountRangeHigh", "filedDate", "transactionDate", "externalId", "ptrLink")
     VALUES (gen_random_uuid()::text, $1, $2, $3::"TradeDirection", $4, $5, $6, $7, $8, $9)
     ON CONFLICT ("externalId") DO UPDATE SET
       "politicianName" = EXCLUDED."politicianName",
       "amountRangeLow" = EXCLUDED."amountRangeLow",
       "amountRangeHigh" = EXCLUDED."amountRangeHigh",
       "filedDate" = EXCLUDED."filedDate"
     RETURNING (xmax = 0) AS inserted`,
    [
      t.politicianName,
      t.ticker,
      t.direction,
      t.amountRangeLow,
      t.amountRangeHigh,
      t.filedDate,
      t.transactionDate,
      t.externalId,
      t.ptrLink,
    ],
  );
  if (result.rows[0]?.inserted) inserted += 1;
  else updated += 1;
}

console.log(`Done: ${inserted} new trades inserted, ${updated} existing trades updated.`);
await client.end();
