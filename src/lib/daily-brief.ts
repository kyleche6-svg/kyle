import Groq from "groq-sdk";
import { CURRENCY_PAIRS, COMMODITIES, getQuote } from "@/lib/market-data";
import { getEconomicEvents } from "@/lib/economic-calendar";
import { getStockList } from "@/lib/stocks";
import { getInsiderTrades } from "@/lib/insider-trading";
import { prisma } from "@/lib/prisma";

export type DailyBrief = {
  dateLabel: string;
  headline: string;
  sections: { heading: string; body: string }[];
  generatedAt: string;
};

// One generation per UTC calendar day, shared across every visitor — this
// writes real prose from an LLM, so unlike everything else in this app it
// costs money (and burns a daily token quota) per generation. Persisted
// in the database, not a module-level variable: on Vercel each
// serverless cold start gets its own process memory, so an in-memory
// cache alone doesn't stop concurrent/repeated cold starts from each
// re-generating — this previously exhausted the Groq free-tier daily
// token limit well before the day was over.
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function gatherMarketData() {
  const [currencyQuotes, commodityQuotes, economicEvents, stocks, trades] = await Promise.all([
    Promise.all(CURRENCY_PAIRS.map((p) => getQuote(p.symbol, p.label, p.basePrice))),
    Promise.all(COMMODITIES.map((c) => getQuote(c.symbol, c.label, c.basePrice))),
    getEconomicEvents(),
    getStockList(),
    getInsiderTrades(15),
  ]);

  const gainers = [...stocks].sort((a, b) => b.quote.changePercent - a.quote.changePercent).slice(0, 5);
  const losers = [...stocks].sort((a, b) => a.quote.changePercent - b.quote.changePercent).slice(0, 5);

  const today = new Date();
  const todaysEvents = economicEvents.filter(
    (e) => e.eventTime.toDateString() === today.toDateString(),
  );

  return { currencyQuotes, commodityQuotes, todaysEvents, gainers, losers, trades };
}

function buildDataSummary(data: Awaited<ReturnType<typeof gatherMarketData>>): string {
  const lines: string[] = [];

  lines.push("CURRENCY PAIRS (USD strength):");
  for (const q of data.currencyQuotes) {
    lines.push(`- ${q.symbol}: ${q.price.toFixed(3)} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`);
  }

  lines.push("\nCOMMODITIES:");
  for (const q of data.commodityQuotes) {
    lines.push(`- ${q.label}: $${q.price.toFixed(2)} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`);
  }

  lines.push("\nECONOMIC CALENDAR TODAY:");
  if (data.todaysEvents.length === 0) {
    lines.push("- No high/medium-impact events scheduled today in our calendar.");
  } else {
    for (const e of data.todaysEvents) {
      lines.push(
        `- ${e.eventName} (${e.currency}, ${e.impact} impact): forecast ${e.forecast ?? "n/a"}, previous ${e.previous ?? "n/a"}, actual ${e.actual ?? "pending"}`,
      );
    }
  }

  lines.push("\nTOP STOCK GAINERS TODAY:");
  for (const s of data.gainers) {
    lines.push(`- ${s.ticker} (${s.companyName}): ${s.quote.changePercent >= 0 ? "+" : ""}${s.quote.changePercent.toFixed(2)}%, analyst consensus: ${s.consensus}`);
  }

  lines.push("\nTOP STOCK LOSERS TODAY:");
  for (const s of data.losers) {
    lines.push(`- ${s.ticker} (${s.companyName}): ${s.quote.changePercent.toFixed(2)}%, analyst consensus: ${s.consensus}`);
  }

  lines.push("\nRECENT INSIDER TRADING (SEC Form 4, real, most recent filings):");
  if (data.trades.length === 0) {
    lines.push("- No recent filings in our data.");
  } else {
    for (const t of data.trades.slice(0, 10)) {
      lines.push(
        `- ${t.ownerName} (${t.relationship} of ${t.issuerName}) — ${t.transactionCode} of ${t.shares.toLocaleString()} shares of ${t.ticker}${t.pricePerShare ? ` at $${t.pricePerShare.toFixed(2)}` : ""}, filed ${t.filedDate}`,
      );
    }
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a financial news writer for DollarWatch, producing a daily market brief.

Hard rules, no exceptions:
- Use ONLY the data given to you below. Never invent a headline, event, number, or claim not present in that data.
- Never predict where any price, index, or rate is headed. Describe only what the data already shows (today's moves, scheduled events, disclosed trades) — never what will happen next.
- Never recommend buying, selling, or holding anything, and never rank securities by attractiveness.
- If a section's data is sparse or empty, say so plainly and keep that section short — do not pad it with invented content.
- Write in a clear, professional news-desk tone — factual and readable, not hype, not clickbait.
- Return strict JSON: {"headline": string, "sections": [{"heading": string, "body": string}]}. Produce 4-5 sections covering: currency/commodity moves, today's economic calendar, notable stock movers, and recent insider trading filings. Each body should be 2-4 sentences of plain prose, not a bullet list.`;

function dateLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function unavailableBrief(headline: string, heading: string, body: string): DailyBrief {
  return { dateLabel: dateLabel(), headline, sections: [{ heading, body }], generatedAt: new Date().toISOString() };
}

// Throws on any failure instead of returning a fallback — the fallback
// is decided by the caller, which also decides whether the result is
// worth persisting (a real generation is; a rate-limit/config failure
// is not, so the next request can retry instead of being stuck with
// today's failure cached for the rest of the day).
async function generateBrief(): Promise<DailyBrief> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const data = await gatherMarketData();
  const summary = buildDataSummary(data);

  const client = new Groq({ apiKey });
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1400,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Today's data:\n\n${summary}` },
    ],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("empty response");

  const parsed = JSON.parse(text);
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];

  return {
    dateLabel: dateLabel(),
    headline: typeof parsed.headline === "string" ? parsed.headline : "Daily Market Brief",
    sections: sections.filter(
      (s: unknown): s is { heading: string; body: string } =>
        typeof (s as { heading?: unknown })?.heading === "string" &&
        typeof (s as { body?: unknown })?.body === "string",
    ),
    generatedAt: new Date().toISOString(),
  };
}

export async function getDailyBrief(): Promise<DailyBrief> {
  const key = todayKey();

  const cached = await prisma.dailyBriefCache.findUnique({ where: { dateKey: key } }).catch(() => null);
  if (cached) {
    return {
      dateLabel: dateLabel(),
      headline: cached.headline,
      sections: cached.sections as { heading: string; body: string }[],
      generatedAt: cached.generatedAt.toISOString(),
    };
  }

  let brief: DailyBrief;
  try {
    brief = await generateBrief();
  } catch (err) {
    console.error("daily brief generation failed", err);
    return unavailableBrief(
      "Daily brief temporarily unavailable",
      "Generation failed",
      "Couldn't generate today's brief — try again shortly, or check the other market data pages for live figures.",
    );
  }

  await prisma.dailyBriefCache
    .upsert({
      where: { dateKey: key },
      create: { dateKey: key, headline: brief.headline, sections: brief.sections, generatedAt: new Date(brief.generatedAt) },
      update: { headline: brief.headline, sections: brief.sections, generatedAt: new Date(brief.generatedAt) },
    })
    .catch((err) => console.error("failed to persist daily brief", err));

  return brief;
}
