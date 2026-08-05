import Stripe from "stripe";

// Falls back to a placeholder at build time so routes that reference `stripe`
// can still be statically analyzed before real keys are configured in .env.
// Any actual Stripe API call made with the placeholder will fail with an
// auth error at runtime, which is the correct behavior until real keys are set.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");
