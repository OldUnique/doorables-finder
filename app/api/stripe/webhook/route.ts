import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "../../../../lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function findUserIdByEmail(email: string) {
  if (!email) return null;

  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  return data?.id ?? null;
}

async function setSubscriptionActive(userId: string, active: boolean) {
  await supabaseAdmin
    .from("users")
    .update({ is_subscribed: active })
    .eq("id", userId);
}

async function getUserIdFromCheckoutSession(session: Stripe.Checkout.Session) {
  // BEST METHOD (we’ll improve later)
  const metadataUserId = getString(session.metadata?.user_id);
  if (metadataUserId) return metadataUserId;

  // fallback: match by email
  const email =
    session.customer_details?.email ||
    session.customer_email ||
    "";

  if (email) {
    const userId = await findUserIdByEmail(email);
    if (userId) return userId;
  }

  return null;
}

async function getUserIdFromSubscription(subscription: Stripe.Subscription) {
  const metadataUserId = getString(subscription.metadata?.user_id);
  if (metadataUserId) return metadataUserId;

  if (typeof subscription.customer === "string") {
    const customer = await stripe.customers.retrieve(subscription.customer);

    if (!customer.deleted) {
      const email = customer.email;
      if (email) {
        const userId = await findUserIdByEmail(email);
        if (userId) return userId;
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing config" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = await getUserIdFromCheckoutSession(session);

        if (userId) {
          await setSubscriptionActive(userId, true);
        }

        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const userId = await getUserIdFromSubscription(sub);

        if (userId) {
          const isActive =
            sub.status === "active" ||
            sub.status === "trialing" ||
            sub.status === "past_due";

          await setSubscriptionActive(userId, isActive);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const userId = await getUserIdFromSubscription(sub);

        if (userId) {
          await setSubscriptionActive(userId, false);
        }

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}