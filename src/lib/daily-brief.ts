import Groq from "groq-sdk";
import { CURRENCY_PAIRS, COMMODITIES, getQuote } from "@/lib/market-data";
import { getEconomicEvents } from "@/lib/economic-calendar";
import { getStockList } from "@/lib/stocks";
import { getInsiderTrades } from "@/lib/insider-trading";

export type DailyBrief = {
  dateLabel: string;
  headline: string;
  sections: { heading: string; body: string }[];
  generatedAt: string;
};

// One generation per UTC calendar day, shared across every visitor — this
// writes real prose from an LLM, so unlike everything else in this app it
// costs money per generation. Caching by date, not by request, keeps that
// to at most one Groq call/day regardless of traffic.
let cache: { dateKey: string; brief: DailyBrief } | null = null;

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

async function generateBrief(): Promise<DailyBrief> {
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const data = await gatherMarketData();
  const summary = buildDataSummary(data);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      dateLabel,
      headline: "Daily brief unavailable",
      sections: [
        {
          heading: "Not configured",
          body: "The daily market brief needs GROQ_API_KEY set to generate — see the other market data pages for live figures in the meantime.",
        },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  try {
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
      dateLabel,
      headline: typeof parsed.headline === "string" ? parsed.headline : "Daily Market Brief",
      sections: sections.filter(
        (s: unknown): s is { heading: string; body: string } =>
          typeof (s as { heading?: unknown })?.heading === "string" &&
          typeof (s as { body?: unknown })?.body === "string",
      ),
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("daily brief generation failed", err);
    return {
      dateLabel,
      headline: "Daily brief temporarily unavailable",
      sections: [
        {
          heading: "Generation failed",
          body: "Couldn't generate today's brief — try again shortly, or check the other market data pages for live figures.",
        },
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}

export async function getDailyBrief(): Promise<DailyBrief> {
  const key = todayKey();
  if (cache && cache.dateKey === key) return cache.brief;

  const brief = await generateBrief();
  cache = { dateKey: key, brief };
  return brief;
}
