import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkLoginLimit, checkGeneralLimit, extractClientIp } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";

function logViolation(details: Record<string, string>) {
  console.warn(JSON.stringify({ event: "rate_limit_violation", ...details }));
}

const CANONICAL_HOST = "dollarwatch.watch";

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>DollarWatch — Down for maintenance</title>
<style>
  html, body { margin: 0; height: 100%; background: #07070a; color: #f7f5f2; font-family: ui-sans-serif, -apple-system, "Segoe UI", sans-serif; }
  body { display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px; }
  .card { max-width: 420px; }
  .mark { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 24px; }
  h1 { font-size: 26px; font-weight: 700; margin: 0 0 12px; }
  p { color: #928f9c; font-size: 15px; line-height: 1.5; margin: 0; }
</style>
</head>
<body>
  <div class="card">
    <div class="mark">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="14" width="4" height="8" rx="1" fill="#ff7a1a" opacity="0.55"/>
        <rect x="8" y="9" width="4" height="13" rx="1" fill="#ff7a1a" opacity="0.75"/>
        <rect x="14" y="5" width="4" height="17" rx="1" fill="#ff7a1a"/>
        <path d="M2 12 L9 6 L14 9 L22 2" stroke="#ff7a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 2 H22 V7" stroke="#ff7a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span style="font-weight:700;font-size:18px;">DollarWatch</span>
    </div>
    <h1>Down for maintenance</h1>
    <p>We're doing some quick upkeep behind the scenes. Back shortly — try again in a few minutes.</p>
  </div>
</body>
</html>`;

export async function proxy(request: NextRequest) {
  // Manual kill switch — set MAINTENANCE_MODE=true in Vercel env (no
  // redeploy needed, env changes apply on next request) to take the
  // whole site down behind a maintenance page instead of leaving
  // whatever broke visible to visitors. Deliberately not automatic:
  // taking a live site offline affects every visitor, so it's a
  // decision made in the moment, not a background policy.
  if (process.env.MAINTENANCE_MODE === "true") {
    return new NextResponse(MAINTENANCE_HTML, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8", "retry-after": "1800" },
    });
  }

  // The old default dollarwatch.vercel.app domain still works (Vercel
  // never lets you turn it off), so redirect it to the real domain
  // rather than leaving two live URLs for the same site indefinitely.
  const host = request.headers.get("host");
  if (host && host !== CANONICAL_HOST && host.endsWith(".vercel.app")) {
    const url = new URL(request.url);
    url.host = CANONICAL_HOST;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Stripe calls this directly; rate-limiting it against a per-user/IP bucket
  // would risk dropping legitimate webhook events.
  if (pathname === "/api/stripe/webhook") {
    return NextResponse.next();
  }

  const ip = extractClientIp(request.headers);

  if (pathname === "/api/auth/callback/credentials" && request.method === "POST") {
    let email = "unknown";
    try {
      const cloned = request.clone();
      const formData = await cloned.formData();
      email = String(formData.get("email") ?? "unknown");
    } catch {
      // body not readable as form data — fall back to IP-only key
    }

    const { success } = await checkLoginLimit(`${ip}:${email}`);
    if (!success) {
      logViolation({ type: "login", ip, email, path: pathname });
      return NextResponse.json(
        { error: "Too many login attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    }
    return NextResponse.next();
  }

  // Other NextAuth internal endpoints (session/csrf/providers) are polled
  // frequently by legitimate client-side auth state checks — not rate limited.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const session = await auth();
  const key = session?.user?.id ?? ip;

  const { success } = await checkGeneralLimit(key);
  if (!success) {
    logViolation({ type: "general", key, path: pathname });
    return NextResponse.json(
      { error: "Too many requests. Slow down and try again shortly." },
      { status: 429 },
    );
  }

  return NextResponse.next();
}

export const config = {
  // Broadened from "/api/:path*" so the vercel.app -> dollarwatch.watch
  // redirect above applies to every page, not just API routes. Every
  // other check in this file still exits immediately for non-API paths,
  // so this doesn't change rate-limiting behavior — only adds the host
  // check ahead of it.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
