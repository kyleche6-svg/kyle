import Groq from "groq-sdk";
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
const MODEL = "llama-3.3-70b-versatile";

const GROQ_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = CHAT_TOOLS.map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}));

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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The chat assistant isn't configured yet. Set GROQ_API_KEY to enable it." },
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

  const client = new Groq({ apiKey });
  const conversation: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m: { role: "user" | "assistant"; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 512,
        messages: conversation,
        tools: GROQ_TOOLS,
      });

      const choice = response.choices[0]?.message;
      if (!choice) {
        return NextResponse.json({ reply: "I don't have an answer for that right now." });
      }

      const toolCalls = choice.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return NextResponse.json({ reply: choice.content?.trim() || "I don't have an answer for that right now." });
      }

      conversation.push({ role: "assistant", content: choice.content ?? "", tool_calls: toolCalls });

      for (const call of toolCalls) {
        let result: unknown;
        try {
          const input = JSON.parse(call.function.arguments || "{}");
          result = await executeChatTool(call.function.name, input);
        } catch {
          result = { error: "Failed to fetch that data." };
        }
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return NextResponse.json({ reply: "That took more steps than I could complete — try a more specific question." });
  } catch {
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
