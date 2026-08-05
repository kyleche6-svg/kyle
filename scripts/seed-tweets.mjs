import "dotenv/config";
import pg from "pg";

// Fictional tracked figures with clearly-marked [MOCK] post text — not real
// quotes attributed to real people. Real ingestion (wired via X_BEARER_TOKEN
// in src/lib/x-api.ts) will replace this with actual tracked accounts' posts.
const FIGURES = [
  { name: "MarketMover One", xHandle: "mockfigure1", category: "Fed official (mock)" },
  { name: "MarketMover Two", xHandle: "mockfigure2", category: "Tech CEO (mock)" },
  { name: "MarketMover Three", xHandle: "mockfigure3", category: "Politician (mock)" },
];

const POST_TEMPLATES = [
  { text: "[MOCK] Placeholder commentary suggesting a shift in rate policy direction.", tickers: ["DXY", "EUR/USD"] },
  { text: "[MOCK] Placeholder remark about a major tech company's chip supply.", tickers: ["NVDA"] },
  { text: "[MOCK] Placeholder statement referencing energy policy and oil markets.", tickers: ["WTI/USD"] },
  { text: "[MOCK] Placeholder comment on trade tariffs affecting a national currency.", tickers: ["USD/CNY"] },
];

const WINDOWS = ["-15m", "+1h", "eod"];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query('DELETE FROM "PriceSnapshot"');
await client.query('DELETE FROM "Post"');
await client.query('DELETE FROM "TrackedFigure"');

for (const figure of FIGURES) {
  const { rows } = await client.query(
    `INSERT INTO "TrackedFigure" (id, name, "xHandle", category)
     VALUES (gen_random_uuid()::text, $1, $2, $3) RETURNING id`,
    [figure.name, figure.xHandle, figure.category],
  );
  const figureId = rows[0].id;

  const postCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < postCount; i++) {
    const template = randomFrom(POST_TEMPLATES);
    const postedAt = new Date();
    postedAt.setDate(postedAt.getDate() - Math.floor(Math.random() * 14));

    const { rows: postRows } = await client.query(
      `INSERT INTO "Post" (id, "trackedFigureId", "xPostId", text, "postedAt", "taggedTickers")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5) RETURNING id`,
      [
        figureId,
        `mock-${figureId}-${i}-${Date.now()}`,
        template.text,
        postedAt,
        template.tickers,
      ],
    );
    const postId = postRows[0].id;

    for (const ticker of template.tickers) {
      const basePrice = ticker === "DXY" ? 104 : ticker.startsWith("USD") || ticker.includes("USD") ? 1 : 100;
      let price = basePrice;
      for (const windowLabel of WINDOWS) {
        price = price * (1 + (Math.random() - 0.45) * 0.02);
        await client.query(
          `INSERT INTO "PriceSnapshot" (id, "postId", ticker, "windowLabel", price)
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4)`,
          [postId, ticker, windowLabel, price],
        );
      }
    }
  }
}

console.log("Seeded mock tracked figures, posts, and price snapshots.");
await client.end();
