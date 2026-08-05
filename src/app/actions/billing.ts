"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { checkGeneralLimit } from "@/lib/rate-limit";

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

export async function createCheckoutSession() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  await enforceGeneralLimit(session.user.id, "checkout");

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error(
      "Billing is not configured yet — set STRIPE_PRICE_ID in .env",
    );
  }

  let existing = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  let stripeCustomerId = existing?.stripeCustomerId ?? undefined;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    });
    stripeCustomerId = customer.id;

    existing = await prisma.subscription.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, stripeCustomerId },
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
  if (!session?.user?.id) {
    redirect("/login");
  }

  await enforceGeneralLimit(session.user.id, "portal");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
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
