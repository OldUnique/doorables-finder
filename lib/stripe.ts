import Stripe from "stripe";

let stripeClient: Stripe | null = null;

// Lazily create the Stripe client so builds do not need STRIPE_SECRET_KEY.
export function getStripe() {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2024-06-20" as any,
  });
  return stripeClient;
}
