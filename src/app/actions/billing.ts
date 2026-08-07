"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { checkGeneralLimit } from "@/lib/rate-limit";

// JWT sessions have no server-side revocation, so a session can outlive
// its User row (account deleted from another device/tab, a stale cookie
// from before a DB reset, etc.) — session.user.id would then look valid
// but reference nothing. Reads (findUnique by that id) just return null,
// harmless, but a *write* that creates a new row with that id as a foreign
// key — like the Subscription upsert below — hits a real FK constraint
// violation and crashes. Confirmed this is exactly what was happening:
// checking existence first turns that crash into a clean re-login instead.
async function requireExistingUser(userId: string, email: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    await signOut({ redirect: false });
    redirect("/login?session=expired");
  }
  return { id: userId, email };
}

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function enforceGeneralLimit(userId: string, action: string) {
  const { success } = await checkGeneralLimit(userId);
  if (!success) {
    console.warn(
      JSON.stringify({ event: "rate_limit_violation", type: action, userId }),
    );
    throw new Error("Too many requests. Slow down and try again shortly.");
  }
}

export async function createCheckoutSession(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  const user = await requireExistingUser(session.user.id, session.user.email);
  await enforceGeneralLimit(user.id, "checkout");

  const plan = formData.get("plan") === "yearly" ? "yearly" : "monthly";
  const priceId =
    plan === "yearly"
      ? process.env.STRIPE_PRICE_ID_YEARLY
      : process.env.STRIPE_PRICE_ID_MONTHLY;
  if (!priceId) {
    throw new Error(
      `Billing is not configured yet — set STRIPE_PRICE_ID_${plan.toUpperCase()} in .env`,
    );
  }

  let existing = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  let stripeCustomerId = existing?.stripeCustomerId ?? undefined;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;

    existing = await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, stripeCustomerId },
      update: { stripeCustomerId },
    });
  }

  const origin = await getOrigin();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
  });

  if (!checkoutSession.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  redirect(checkoutSession.url);
}

export async function createPortalSession() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  const user = await requireExistingUser(session.user.id, session.user.email);
  await enforceGeneralLimit(user.id, "portal");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  if (!subscription?.stripeCustomerId) {
    redirect("/pricing");
  }

  const origin = await getOrigin();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/account`,
  });

  redirect(portalSession.url);
}
