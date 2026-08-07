import crypto from "node:crypto";
import { headers } from "next/headers";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Real email via Resend when configured. Unlike other unconfigured
// integrations in this app, there's no meaningful "mock" for actually
// delivering an email — so when RESEND_API_KEY is unset, the reset link is
// logged server-side instead, which keeps the flow testable in dev but is
// NOT a substitute for configuring this before real users rely on password
// reset.
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      JSON.stringify({
        event: "password_reset_email_not_configured",
        message: "RESEND_API_KEY not set — logging reset link instead of emailing it",
        email,
        resetUrl,
      }),
    );
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "DollarWatch <onboarding@resend.dev>",
    to: email,
    subject: "Reset your DollarWatch password",
    html: `
      <p>Someone requested a password reset for your DollarWatch account.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a> (expires in 1 hour).</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

// Deliberately NOT exported from a "use server" action file: every export
// in one of those becomes a directly RPC-callable action regardless of
// whether it's wired to a form, and this takes a raw userId with no
// authorization check of its own — callable only from within already
// auth-checked server actions (signup, resendVerificationEmail), never
// reachable from the client.
export async function sendVerificationLink(userId: string, email: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  await prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } });

  const origin = await getOrigin();
  const verifyUrl = `${origin}/verify-email?token=${rawToken}`;
  await sendVerificationEmail(email, verifyUrl);
}

export async function sendVerificationEmail(email: string, verifyUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      JSON.stringify({
        event: "verification_email_not_configured",
        message: "RESEND_API_KEY not set — logging verification link instead of emailing it",
        email,
        verifyUrl,
      }),
    );
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "DollarWatch <onboarding@resend.dev>",
    to: email,
    subject: "Verify your DollarWatch email",
    html: `
      <p>Welcome to DollarWatch — confirm this is your email address to finish setting up your account.</p>
      <p><a href="${verifyUrl}">Click here to verify your email</a> (expires in 24 hours).</p>
      <p>If you didn't create a DollarWatch account, you can safely ignore this email.</p>
    `,
  });
}

export async function sendPriceAlertEmail(
  email: string,
  ticker: string,
  direction: "above" | "below",
  targetPrice: number,
  currentPrice: number,
) {
  const apiKey = process.env.RESEND_API_KEY;
  const verb = direction === "above" ? "risen above" : "fallen below";

  if (!apiKey) {
    console.warn(
      JSON.stringify({
        event: "price_alert_email_not_configured",
        message: "RESEND_API_KEY not set — logging alert instead of emailing it",
        email,
        ticker,
        direction,
        targetPrice,
        currentPrice,
      }),
    );
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "DollarWatch <onboarding@resend.dev>",
    to: email,
    subject: `${ticker} has ${verb} $${targetPrice.toFixed(2)}`,
    html: `
      <p><strong>${ticker}</strong> has ${verb} your target of $${targetPrice.toFixed(2)} — now trading at $${currentPrice.toFixed(2)}.</p>
      <p>This is a price notification only, not a recommendation to buy or sell.</p>
    `,
  });
}
