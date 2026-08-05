import "dotenv/config";
import pg from "pg";

// Fictional politician names — not real people — since this is mock data
// standing in for future real Senate eFD ingestion (see plan notes).
const POLITICIANS = [
  "Sen. Dana Whitfield",
  "Rep. Marcus Lin",
  "Sen. Priya Kanth",
  "Rep. Owen Castellano",
  "Sen. Grace Okonkwo",
  "Rep. Bill Truscott",
];

const TICKERS = ["NVDA", "AAPL", "MSFT", "XOM", "TSLA", "JPM", "META", "GOOGL"];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateWithinDays(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

const AMOUNT_BRACKETS = [
  [1001, 15000],
  [15001, 50000],
  [50001, 100000],
  [100001, 250000],
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query('DELETE FROM "Trade"');

const rows = [];
for (let i = 0; i < 60; i++) {
  const politicianName = randomFrom(POLITICIANS);
  const ticker = randomFrom(TICKERS);
  const direction = Math.random() > 0.4 ? "buy" : "sell";
  const [low, high] = randomFrom(AMOUNT_BRACKETS);
  const transactionDate = randomDateWithinDays(60);
  const filedDate = new Date(transactionDate);
  filedDate.setDate(filedDate.getDate() + 1 + Math.floor(Math.random() * 30));

  rows.push({ politicianName, ticker, direction, low, high, filedDate, transactionDate });
}

for (const row of rows) {
  await client.query(
    `INSERT INTO "Trade" (id, "politicianName", ticker, direction, "amountRangeLow", "amountRangeHigh", "filedDate", "transactionDate")
     VALUES (gen_random_uuid()::text, $1, $2, $3::"TradeDirection", $4, $5, $6, $7)`,
    [row.politicianName, row.ticker, row.direction, row.low, row.high, row.filedDate, row.transactionDate],
  );
}

console.log(`Seeded ${rows.length} mock trades.`);
await client.end();
