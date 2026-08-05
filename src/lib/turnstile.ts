// Cloudflare Turnstile bot protection for signup/login. Gracefully skipped
// (returns valid) when TURNSTILE_SECRET_KEY isn't set, matching this app's
// pattern for every other external service (Stripe, Twelve Data, X API) —
// but unlike those, this one has real security consequences left
// unconfigured, so it MUST be set before real launch. Get keys at
// https://dash.cloudflare.com/?to=/:account/turnstile
export async function verifyTurnstile(
  token: string | null,
  remoteIp: string,
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;

  if (!token) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          remoteip: remoteIp,
        }),
      },
    );
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
