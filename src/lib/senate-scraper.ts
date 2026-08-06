// Live scraper for efdsearch.senate.gov — the Senate's own real-time
// financial disclosure search system. Unlike the historical GitHub dataset
// this replaces (timothycarambat/senate-stock-watcher-data, which stopped
// updating in 2020), this hits the primary source directly, so it's current
// as of whenever it's last run — bounded only by the STOCK Act's own 45-day
// filing window, not by a stale third-party mirror.
//
// This is an unofficial integration against a public government site with
// no published API: session/CSRF handling and page structure were reverse
// engineered by hand (see chat history) and can silently break if the site
// changes. No robots.txt restricts this. Be a good citizen: low request
// volume, a descriptive User-Agent, and don't run this on a tight loop.

const BASE_URL = "https://efdsearch.senate.gov";
const USER_AGENT = "DollarWatch research tool (contact: support@dollarwatch.app)";

export type ScrapedTrade = {
  externalId: string;
  politicianName: string;
  ticker: string;
  direction: "buy" | "sell";
  amountRangeLow: number;
  amountRangeHigh: number;
  transactionDate: Date;
  filedDate: Date;
  ptrLink: string;
};

type CookieJar = Record<string, string>;

function updateJar(jar: CookieJar, res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    const [pair] = cookie.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
}

function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function extractCsrfToken(html: string): string | null {
  const match = html.match(/name=["']csrfmiddlewaretoken["'] value=["']([^"']+)["']/);
  return match ? match[1] : null;
}

// Step 1: establish a session and accept the site's required "prohibition
// on obtaining and use of financial disclosure reports" agreement — a real
// checkbox gate the site itself requires before search access, not a
// CAPTCHA or paywall.
async function bootstrapSession(): Promise<{ jar: CookieJar; csrfToken: string }> {
  const jar: CookieJar = {};

  const searchPage = await fetch(`${BASE_URL}/search/`, {
    headers: { "User-Agent": USER_AGENT },
  });
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
  if (!jar.sessionid) {
    throw new Error("efdsearch did not grant a session after accepting the agreement.");
  }

  // Refetch the search page under the new session to get a fresh CSRF token
  // scoped to this session, used for the actual data query.
  const searchPage2 = await fetch(`${BASE_URL}/search/`, {
    headers: { "User-Agent": USER_AGENT, Cookie: cookieHeader(jar) },
  });
  updateJar(jar, searchPage2);
  const html2 = await searchPage2.text();
  const csrfToken2 = extractCsrfToken(html2);
  if (!csrfToken2) throw new Error("Could not find CSRF token after establishing session.");

  return { jar, csrfToken: csrfToken2 };
}

type FilingRow = { name: string; linkHtml: string; filedDate: string };

// Step 2: query the DataTables JSON endpoint the site's own search page
// uses, filtered to Periodic Transaction Reports (report_type 11) from
// senators (filer_type 1) within a date range.
async function searchPtrFilings(
  jar: CookieJar,
  csrfToken: string,
  startDate: Date,
  endDate: Date,
): Promise<FilingRow[]> {
  const fmt = (d: Date) =>
    `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}/${d.getUTCFullYear()}`;

  const rows: FilingRow[] = [];
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

    const json: { data: string[][] } = await res.json();
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

function parseFilingLink(linkHtml: string): { uuid: string; reportDate: string } | null {
  const hrefMatch = linkHtml.match(/href="\/search\/view\/ptr\/([a-f0-9-]+)\/"/);
  const dateMatch = linkHtml.match(/for (\d{2}\/\d{2}\/\d{4})/);
  if (!hrefMatch || !dateMatch) return null;
  return { uuid: hrefMatch[1], reportDate: dateMatch[1] };
}

function parseDate(raw: string): Date | null {
  const [month, day, year] = raw.split("/").map((n) => parseInt(n, 10));
  if (!month || !day || !year) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmountRange(raw: string): { low: number; high: number } | null {
  const numbers = raw.match(/[\d,]+/g);
  if (!numbers || numbers.length === 0) return null;
  const parsed = numbers.map((n) => parseInt(n.replace(/,/g, ""), 10));
  if (raw.toLowerCase().includes("over") || parsed.length === 1) {
    return { low: parsed[0], high: parsed[0] * 2 };
  }
  return { low: parsed[0], high: parsed[1] ?? parsed[0] };
}

function parseDirection(type: string): "buy" | "sell" | null {
  const normalized = type.toLowerCase();
  if (normalized.startsWith("purchase")) return "buy";
  if (normalized.startsWith("sale")) return "sell";
  return null;
}

function formatPoliticianName(rawName: string): string {
  // Search rows give "Last, First (Senator)" — flip to "First Last" to
  // match how the rest of the app displays/links politician names.
  const withoutOffice = rawName.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const [last, first] = withoutOffice.split(",").map((s) => s.trim());
  return first && last ? `${first} ${last}` : withoutOffice;
}

// Step 3: fetch and parse one filing's transaction table. Some filings
// (older or edge-case ones) are scanned PDFs instead of an HTML table —
// those are skipped rather than guessed at.
async function fetchFilingTransactions(
  jar: CookieJar,
  uuid: string,
  politicianName: string,
  filedDate: Date,
): Promise<ScrapedTrade[]> {
  const res = await fetch(`${BASE_URL}/search/view/ptr/${uuid}/`, {
    headers: { "User-Agent": USER_AGENT, Cookie: cookieHeader(jar) },
  });
  if (!res.ok) return [];

  const html = await res.text();
  const rowMatches = [...html.matchAll(/<tr>\s*<td>(\d+)<\/td>([\s\S]*?)<\/tr>/g)];

  const trades: ScrapedTrade[] = [];
  for (const match of rowMatches) {
    const rowIndex = match[1];
    const cellsHtml = match[2];
    const cells = [...cellsHtml.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) =>
      c[1].replace(/<[^>]+>/g, "").trim(),
    );
    // Expected: [Transaction Date, Owner, Ticker, Asset Name, Asset Type, Type, Amount, Comment]
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

export type ScrapeResult = {
  filingsFound: number;
  filingsParsed: number;
  filingsSkipped: number;
  trades: ScrapedTrade[];
};

// Full pipeline: bootstrap a session, search for PTR filings submitted
// within the given window, and parse each one's transactions.
export async function scrapeSenateTrades(daysBack = 14): Promise<ScrapeResult> {
  const { jar, csrfToken } = await bootstrapSession();

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const filingRows = await searchPtrFilings(jar, csrfToken, startDate, endDate);

  const trades: ScrapedTrade[] = [];
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
      continue;
    }

    trades.push(...filingTrades);
    parsed += 1;

    // Be a good citizen — small delay between filing-detail requests
    // rather than firing them all at once.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return { filingsFound: filingRows.length, filingsParsed: parsed, filingsSkipped: skipped, trades };
}
