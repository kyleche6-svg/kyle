import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkLoginLimit, checkGeneralLimit, extractClientIp } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";

function logViolation(details: Record<string, string>) {
  console.warn(JSON.stringify({ event: "rate_limit_violation", ...details }));
}

const CANONICAL_HOST = "dollarwatch.watch";

export async function proxy(request: NextRequest) {
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
