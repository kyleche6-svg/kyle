import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOhlcSeries, CHART_TIMEFRAMES, type ChartTimeframe } from "@/lib/market-data";
import { TRENDING_TICKERS } from "@/lib/stocks";
import { checkGeneralLimit, getRequestIp } from "@/lib/rate-limit";

function isTimeframe(value: string | null): value is ChartTimeframe {
  return !!value && (CHART_TIMEFRAMES as string[]).includes(value);
}

// Same gating as every other stock-detail data point — chart history is
// subscription content, not just the initial server-rendered page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (subscription?.status !== "active") {
    return NextResponse.json({ error: "Active subscription required." }, { status: 403 });
  }

  const ip = await getRequestIp();
  const { success } = await checkGeneralLimit(`chart:${session.user.id}:${ip}`);
  if (!success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();
  if (!/^[A-Z.]{1,6}$/.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker." }, { status: 400 });
  }

  const timeframeParam = req.nextUrl.searchParams.get("timeframe");
  const timeframe: ChartTimeframe = isTimeframe(timeframeParam) ? timeframeParam : "3M";

  const trending = TRENDING_TICKERS.find((t) => t.ticker === ticker);
  const basePrice = trending?.basePrice ?? 100;

  const ohlc = await getOhlcSeries(ticker, basePrice, timeframe);
  return NextResponse.json({ ohlc });
}
