// Real SEC 13F institutional holdings — free, no key required. Quarterly
// filings from data.sec.gov (submissions) and sec.gov (filing documents),
// covering large institutional investment managers ("13F filers"): funds
// managing $100M+ must disclose US equity holdings within 45 days of
// quarter-end. That 45-day lag is a hard SEC filing rule, not a data-source
// limitation — there is no faster "up to date" for this kind of data.
const SEC_USER_AGENT = "DollarWatch research tool (contact: support@dollarwatch.app)";

export const TRACKED_FUNDS = [
  { name: "Berkshire Hathaway", manager: "Warren Buffett", cik: "0001067983" },
  { name: "Bridgewater Associates", manager: "Ray Dalio", cik: "0001350694" },
  { name: "Renaissance Technologies", manager: "Jim Simons", cik: "0001037389" },
  { name: "Scion Asset Management", manager: "Michael Burry", cik: "0001649339" },
  { name: "Duquesne Family Office", manager: "Stanley Druckenmiller", cik: "0001536411" },
  { name: "Pershing Square Capital", manager: "Bill Ackman", cik: "0001336528" },
  { name: "Soros Fund Management", manager: "George Soros", cik: "0001029160" },
  { name: "Citadel Advisors", manager: "Ken Griffin", cik: "0001423053" },
] as const;

export type FundHolding = { issuer: string; cusip: string; valueUsd: number; weight: number };
export type FundPortfolio = {
  name: string;
  manager: string;
  cik: string;
  filingDate: string | null;
  totalValueUsd: number;
  holdings: FundHolding[];
};

async function secJson(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT },
    next: { revalidate: 21600 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function secText(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT },
    next: { revalidate: 21600 },
  });
  if (!res.ok) return null;
  return res.text();
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match ? match[1].trim() : null;
}

function parseInfoTable(xml: string): { issuer: string; cusip: string; value: number }[] {
  const blocks = xml.match(/<infoTable>[\s\S]*?<\/infoTable>/g) ?? [];
  return blocks
    .map((block) => {
      const issuer = extractTag(block, "nameOfIssuer");
      const cusip = extractTag(block, "cusip");
      const value = extractTag(block, "value");
      if (!issuer || !cusip || !value) return null;
      // SEC 13F "value" was reported in thousands of dollars prior to a 2023
      // rule change; filings since then (all filings this app fetches, being
      // the most recent per filer) report the value directly in whole dollars.
      return { issuer, cusip, value: parseInt(value, 10) };
    })
    .filter((row): row is { issuer: string; cusip: string; value: number } => row !== null);
}

async function fetchLatestPortfolio(
  fund: (typeof TRACKED_FUNDS)[number],
  holdingsLimit = 10,
): Promise<FundPortfolio> {
  const empty: FundPortfolio = {
    name: fund.name,
    manager: fund.manager,
    cik: fund.cik,
    filingDate: null,
    totalValueUsd: 0,
    holdings: [],
  };

  const submissions = await secJson(`https://data.sec.gov/submissions/CIK${fund.cik}.json`);
  const recent = submissions?.filings?.recent;
  if (!recent?.form) return empty;

  let accessionNumber: string | null = null;
  let filingDate: string | null = null;
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === "13F-HR") {
      accessionNumber = recent.accessionNumber[i];
      filingDate = recent.filingDate[i];
      break;
    }
  }
  if (!accessionNumber) return empty;

  const cikNumeric = fund.cik.replace(/^0+/, "");
  const accessionNoDashes = accessionNumber.replace(/-/g, "");
  const index = await secJson(
    `https://www.sec.gov/Archives/edgar/data/${cikNumeric}/${accessionNoDashes}/index.json`,
  );
  const items: { name: string }[] = index?.directory?.item ?? [];
  const infoTableFile = items.find((item) => item.name.endsWith(".xml") && item.name !== "primary_doc.xml");
  if (!infoTableFile) return { ...empty, filingDate };

  const xml = await secText(
    `https://www.sec.gov/Archives/edgar/data/${cikNumeric}/${accessionNoDashes}/${infoTableFile.name}`,
  );
  if (!xml) return { ...empty, filingDate };

  const rows = parseInfoTable(xml);
  const byIssuer = new Map<string, { issuer: string; cusip: string; value: number }>();
  for (const row of rows) {
    const key = row.cusip;
    const existing = byIssuer.get(key);
    if (existing) existing.value += row.value;
    else byIssuer.set(key, { ...row });
  }

  const merged = Array.from(byIssuer.values()).sort((a, b) => b.value - a.value);
  const totalValueUsd = merged.reduce((sum, r) => sum + r.value, 0);

  return {
    name: fund.name,
    manager: fund.manager,
    cik: fund.cik,
    filingDate,
    totalValueUsd,
    holdings: merged.slice(0, holdingsLimit).map((r) => ({
      issuer: r.issuer,
      cusip: r.cusip,
      valueUsd: r.value,
      weight: totalValueUsd > 0 ? r.value / totalValueUsd : 0,
    })),
  };
}

export async function getTopTraderPortfolios(): Promise<FundPortfolio[]> {
  return Promise.all(TRACKED_FUNDS.map((fund) => fetchLatestPortfolio(fund)));
}

export async function getFundPortfolioByCik(cik: string): Promise<FundPortfolio | null> {
  const fund = TRACKED_FUNDS.find((f) => f.cik === cik);
  if (!fund) return null;
  return fetchLatestPortfolio(fund, 30);
}

export type FilingHistoryEntry = { filingDate: string; accessionNumber: string; edgarUrl: string };

// Every past 13F-HR this filer has on record with the SEC — real filing
// history, not just the single latest snapshot shown elsewhere on the page.
export async function getFilingHistory(cik: string, limit = 8): Promise<FilingHistoryEntry[]> {
  const submissions = await secJson(`https://data.sec.gov/submissions/CIK${cik}.json`);
  const recent = submissions?.filings?.recent;
  if (!recent?.form) return [];

  const cikNumeric = cik.replace(/^0+/, "");
  const entries: FilingHistoryEntry[] = [];

  for (let i = 0; i < recent.form.length && entries.length < limit; i++) {
    if (recent.form[i] !== "13F-HR") continue;
    const accessionNumber: string = recent.accessionNumber[i];
    const accessionNoDashes = accessionNumber.replace(/-/g, "");
    entries.push({
      filingDate: recent.filingDate[i],
      accessionNumber,
      edgarUrl: `https://www.sec.gov/Archives/edgar/data/${cikNumeric}/${accessionNoDashes}/${accessionNumber}-index.htm`,
    });
  }

  return entries;
}
