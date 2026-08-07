import { NextRequest, NextResponse } from "next/server";
import { checkAllAlerts } from "@/lib/price-alerts";

// Vercel Cron calls this on schedule (see vercel.json) with a bearer token
// derived from CRON_SECRET — required so this can't be hit by anyone else
// to force-fetch quotes / spam alert emails on demand.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkAllAlerts();
  return NextResponse.json(result);
}
