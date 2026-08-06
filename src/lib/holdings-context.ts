import Groq from "groq-sdk";
import type { FundPortfolio } from "@/lib/institutional-holdings";

// 13F filings never include a stated reason for a position — funds
// disclose WHAT they hold, never WHY. Any "why" shown here is generated
// commentary speculating from generally known market context, explicitly
// labeled as such everywhere it's displayed. It is not the fund's own
// explanation, not sourced to the filing, and not investment advice.
export type HoldingContext = { issuer: string; note: string };

const cache = new Map<string, { notes: HoldingContext[]; expiresAt: number }>();
const CACHE_MS = 12 * 60 * 60 * 1000;

export async function getSpeculativeContext(fund: FundPortfolio, count = 5): Promise<HoldingContext[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || fund.holdings.length === 0) return [];

  const cacheKey = `${fund.cik}:${fund.filingDate}:${count}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.notes;

  const top = fund.holdings.slice(0, count);
  const client = new Groq({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You write brief, speculative one-sentence notes on why a large institutional investor might hold a given public stock, based only on generally known market/sector/macro context (e.g. sector trends, well-known events). You are NOT told the fund's actual reasoning — none exists in the public filing. Never state your guess as fact; always hedge (\"likely\", \"could reflect\", \"consistent with\"). Never suggest the user buy/sell/hold. Respond with strict JSON: an array of objects {\"issuer\": string, \"note\": string}, one per input issuer, in the same order, nothing else.",
        },
        {
          role: "user",
          content: `Fund: ${fund.name}. Holdings (issuer name, portfolio weight): ${top
            .map((h) => `${h.issuer} (${(h.weight * 100).toFixed(1)}%)`)
            .join("; ")}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return [];

    const parsed = JSON.parse(text);
    const notes: HoldingContext[] = Array.isArray(parsed) ? parsed : (parsed.notes ?? parsed.holdings ?? []);
    const valid = notes.filter(
      (n): n is HoldingContext => typeof n?.issuer === "string" && typeof n?.note === "string",
    );

    cache.set(cacheKey, { notes: valid, expiresAt: Date.now() + CACHE_MS });
    return valid;
  } catch {
    return [];
  }
}
