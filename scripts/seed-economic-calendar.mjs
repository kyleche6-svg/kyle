// Mock ForexFactory-style economic calendar — no official free API exists
// for this (only third-party scrapers), so mock-seeded for now, matching
// the same documented-follow-up pattern as the politician trades feature.
import "dotenv/config";
import pg from "pg";

const EVENT_TEMPLATES = [
  { eventName: "CPI m/m", currency: "USD", impact: "high", forecast: "0.3%", previous: "0.2%" },
  { eventName: "Non-Farm Payrolls", currency: "USD", impact: "high", forecast: "185K", previous: "175K" },
  { eventName: "Fed Interest Rate Decision", currency: "USD", impact: "high", forecast: "4.50%", previous: "4.50%" },
  { eventName: "Unemployment Rate", currency: "USD", impact: "medium", forecast: "4.1%", previous: "4.0%" },
  { eventName: "Retail Sales m/m", currency: "USD", impact: "medium", forecast: "0.4%", previous: "0.2%" },
  { eventName: "ECB Interest Rate Decision", currency: "EUR", impact: "high", forecast: "3.25%", previous: "3.25%" },
  { eventName: "German ZEW Economic Sentiment", currency: "EUR", impact: "medium", forecast: "15.2", previous: "12.8" },
  { eventName: "Eurozone Flash GDP q/q", currency: "EUR", impact: "high", forecast: "0.2%", previous: "0.3%" },
  { eventName: "BOE Interest Rate Decision", currency: "GBP", impact: "high", forecast: "4.75%", previous: "4.75%" },
  { eventName: "UK CPI y/y", currency: "GBP", impact: "high", forecast: "2.4%", previous: "2.6%" },
  { eventName: "BOJ Interest Rate Decision", currency: "JPY", impact: "high", forecast: "0.25%", previous: "0.25%" },
  { eventName: "Japan Trade Balance", currency: "JPY", impact: "medium", forecast: "-¥450B", previous: "-¥620B" },
  { eventName: "China Manufacturing PMI", currency: "CNY", impact: "medium", forecast: "50.2", previous: "49.8" },
  { eventName: "Crude Oil Inventories", currency: "USD", impact: "low", forecast: "-1.2M", previous: "2.4M" },
  { eventName: "Consumer Confidence", currency: "USD", impact: "low", forecast: "104.5", previous: "102.1" },
];

function randomActual(forecast) {
  const numMatch = forecast.match(/-?[\d.]+/);
  if (!numMatch) return forecast;
  const num = parseFloat(numMatch[0]);
  const variance = num * (Math.random() * 0.2 - 0.1);
  const newNum = (num + variance).toFixed(1);
  return forecast.replace(numMatch[0], newNum);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query('DELETE FROM "EconomicEvent"');

const now = new Date();
let inserted = 0;

for (let i = 0; i < 15; i++) {
  const template = EVENT_TEMPLATES[i % EVENT_TEMPLATES.length];
  const eventTime = new Date(now);
  // Spread across the last 3 days and next 4 days
  eventTime.setDate(eventTime.getDate() + (Math.floor(Math.random() * 7) - 3));
  eventTime.setHours(8 + Math.floor(Math.random() * 9), [0, 15, 30, 45][Math.floor(Math.random() * 4)]);

  const isPast = eventTime < now;
  const actual = isPast ? randomActual(template.forecast) : null;

  await client.query(
    `INSERT INTO "EconomicEvent" (id, "eventName", currency, impact, "eventTime", actual, forecast, previous)
     VALUES (gen_random_uuid()::text, $1, $2, $3::"EventImpact", $4, $5, $6, $7)`,
    [template.eventName, template.currency, template.impact, eventTime, actual, template.forecast, template.previous],
  );
  inserted++;
}

console.log(`Seeded ${inserted} mock economic calendar events.`);
await client.end();
