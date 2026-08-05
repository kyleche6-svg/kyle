// Fetches real posts from the X API for each tracked figure and stores new
// ones in the Post table, with simple cashtag/keyword ticker tagging.
//
// Run on a conservative interval (e.g. hourly via cron / Vercel Cron) — never
// per page request, since the X API is pay-per-use with no free allowance.
//
// Price-reaction snapshots (-15m / +1h / eod) need captures at three offsets
// from each post's timestamp. That requires a scheduler invoking this script
// (or a dedicated snapshot script) repeatedly around each post's posted time —
// out of scope for this pass. This script only ingests and tags posts; wiring
// the three-window snapshot capture is a documented follow-up.
import "dotenv/config";
import pg from "pg";

const bearerToken = process.env.X_BEARER_TOKEN;
if (!bearerToken) {
  console.error("X_BEARER_TOKEN is not set — nothing to sync.");
  process.exit(1);
}

const WATCHLIST = [
  "DXY", "EUR/USD", "USD/JPY", "GBP/USD", "USD/CNY",
  "XAU/USD", "WTI/USD", "XAG/USD",
  "NVDA", "AAPL", "MSFT", "XOM", "TSLA", "JPM", "META", "GOOGL",
];

function tagTickers(text) {
  const found = new Set();
  for (const ticker of WATCHLIST) {
    const bare = ticker.split("/")[0];
    const cashtag = `$${bare}`;
    if (text.includes(cashtag) || new RegExp(`\\b${bare}\\b`, "i").test(text)) {
      found.add(ticker);
    }
  }
  return Array.from(found);
}

async function fetchRecentPosts(xHandle) {
  const userRes = await fetch(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(xHandle)}`,
    { headers: { Authorization: `Bearer ${bearerToken}` } },
  );
  if (!userRes.ok) throw new Error(`Failed to resolve @${xHandle}: ${userRes.status}`);
  const userData = await userRes.json();
  const userId = userData.data?.id;
  if (!userId) throw new Error(`No X user id for @${xHandle}`);

  const tweetsRes = await fetch(
    `https://api.x.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at`,
    { headers: { Authorization: `Bearer ${bearerToken}` } },
  );
  if (!tweetsRes.ok) throw new Error(`Failed to fetch posts for @${xHandle}: ${tweetsRes.status}`);
  const tweetsData = await tweetsRes.json();
  return tweetsData.data ?? [];
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: figures } = await client.query('SELECT id, "xHandle" FROM "TrackedFigure"');

let inserted = 0;
for (const figure of figures) {
  let posts;
  try {
    posts = await fetchRecentPosts(figure.xHandle);
  } catch (err) {
    console.error(`Skipping @${figure.xHandle}:`, err.message);
    continue;
  }

  for (const post of posts) {
    const { rows: existing } = await client.query(
      'SELECT id FROM "Post" WHERE "xPostId" = $1',
      [post.id],
    );
    if (existing.length > 0) continue;

    const tickers = tagTickers(post.text);
    await client.query(
      `INSERT INTO "Post" (id, "trackedFigureId", "xPostId", text, "postedAt", "taggedTickers")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)`,
      [figure.id, post.id, post.text, new Date(post.created_at), tickers],
    );
    inserted++;
  }
}

console.log(`Synced. Inserted ${inserted} new posts.`);
await client.end();
