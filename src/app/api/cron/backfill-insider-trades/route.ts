import { NextRequest, NextResponse } from "next/server";
import { backfillDailyIndex } from "@/lib/insider-trading";

// Runs daily via Vercel Cron (see vercel.json) with a bearer token
// derived from CRON_SECRET, same pattern as check-alerts — required so
// this can't be hit by anyone else to force a scrape run on demand.
// Backfills *yesterday's* daily index, not today's — SEC doesn't
// finalize a day's index until the day closes, so "today" would be
// incomplete if fetched today.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const result = await backfillDailyIndex(yesterday);
  return NextResponse.json(result);
}
