import { Resend } from "resend";

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
