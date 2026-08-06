import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkChatLimit, checkChatGlobalLimit, getRequestIp } from "@/lib/rate-limit";
import { CHAT_TOOLS, executeChatTool } from "@/lib/chat-tools";

const SYSTEM_PROMPT = `You are the DollarWatch assistant, embedded in the DollarWatch market-intelligence app.

Hard rules, no exceptions:
- Only answer using data you retrieve through the provided tools (live quotes, real third-party analyst consensus, disclosed politician trades, economic calendar, company profiles/stats/news, historical return frequency). Do not use outside knowledge about companies, markets, or events.
- Never tell the user to buy, sell, or hold anything. Never say a stock "will" go up or down, and never state or imply a probability of future profit. You may relay real analyst consensus/price targets and backward-looking historical frequency data, but always frame both as third-party or historical information, not your own recommendation.
- If asked for investment advice, a prediction, or "what should I buy", decline briefly and redirect to the real data you can show (quote, analyst consensus, news, historical frequency).
- If a tool has no data for what's asked, say so plainly rather than guessing.
- Keep answers concise and end with a short reminder that this is informational, not financial advice, whenever you discuss a specific security.`;

const MAX_TOOL_ROUNDS = 4;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });
  if (subscription?.status !== "active") {
    return NextResponse.json({ error: "Active subscription required." }, { status: 403 });
  }

  const ip = await getRequestIp();
  const [userLimit, globalLimit] = await Promise.all([
    checkChatLimit(`${session.user.id}:${ip}`),
    checkChatGlobalLimit(),
  ]);
  if (!userLimit.success) {
    return NextResponse.json({ error: "Too many messages — please slow down and try again in a bit." }, { status: 429 });
  }
  if (!globalLimit.success) {
    return NextResponse.json(
      { error: "The assistant is at capacity right now — please try again later." },
      { status: 429 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The chat assistant isn't configured yet. Set ANTHROPIC_API_KEY to enable it." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  for (const m of messages) {
    if (
      typeof m !== "object" ||
      m === null ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.length === 0 ||
      m.content.length > 2000
    ) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
  }

  const client = new Anthropic({ apiKey });
  const conversation: Anthropic.MessageParam[] = messages.map((m: { role: "user" | "assistant"; content: string }) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        tools: CHAT_TOOLS,
        messages: conversation,
      });

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      if (toolUseBlocks.length === 0) {
        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim();
        return NextResponse.json({ reply: text || "I don't have an answer for that right now." });
      }

      conversation.push({ role: "assistant", content: response.content });

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          let result: unknown;
          try {
            result = await executeChatTool(block.name, block.input as Record<string, unknown>);
          } catch {
            result = { error: "Failed to fetch that data." };
          }
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        }),
      );

      conversation.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({ reply: "That took more steps than I could complete — try a more specific question." });
  } catch {
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
