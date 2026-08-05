import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkLoginLimit, checkGeneralLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function logViolation(details: Record<string, string>) {
  console.warn(JSON.stringify({ event: "rate_limit_violation", ...details }));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Stripe calls this directly; rate-limiting it against a per-user/IP bucket
  // would risk dropping legitimate webhook events.
  if (pathname === "/api/stripe/webhook") {
    return NextResponse.next();
  }

  const ip = getClientIp(request);

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
  matcher: ["/api/:path*"],
};
